import type Database from 'better-sqlite3';
import type { PromptTemplate } from '../../types.js';
import {
  BUILTIN_PROMPT_TEMPLATE,
  BUILTIN_PROMPT_TEMPLATE_ID,
  BUILTIN_PROMPT_TEMPLATE_NAME,
} from '../../defaultPromptTemplate.js';
import { genId } from '../helpers.js';

export interface PromptTemplateRow {
  id: string;
  name: string;
  description: string;
  content: string;
  categories?: string;
  is_active: number;
  is_builtin: number;
  created_at: string;
  updated_at: string;
}

export function formatPromptTemplateRow(row: PromptTemplateRow): PromptTemplate {
  let categories: string[] = ['all'];
  if (row.categories) {
    try {
      const parsed = JSON.parse(row.categories);
      if (Array.isArray(parsed)) {
        // 显式空数组 = 未绑定分类（仅存盘备用）；['all'] = 通用兜底；缺失/非法回退 ['all'] 保持旧库兼容
        categories = parsed.filter((c): c is string => typeof c === 'string');
      }
    } catch {
      categories = ['all'];
    }
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    content: row.content,
    categories,
    isActive: row.is_active === 1,
    isBuiltin: row.is_builtin === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function seedBuiltinPromptTemplate(database: Database.Database): void {
  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT OR IGNORE INTO prompt_templates
        (id, name, description, content, categories, is_active, is_builtin, created_at, updated_at)
       VALUES (?, ?, ?, ?, '["all"]', 1, 1, ?, ?)`
    )
    .run(
      BUILTIN_PROMPT_TEMPLATE_ID,
      BUILTIN_PROMPT_TEMPLATE_NAME,
      '项目内置的通用深层解读指令，可复制为新模板后调整。',
      BUILTIN_PROMPT_TEMPLATE,
      now,
      now
    );

  const activeRow = database
    .prepare('SELECT id FROM prompt_templates WHERE is_active = 1 LIMIT 1')
    .get();
  if (!activeRow) {
    database
      .prepare('UPDATE prompt_templates SET is_active = 1 WHERE id = ?')
      .run(BUILTIN_PROMPT_TEMPLATE_ID);
  }
}

export class PromptRepo {
  constructor(private db: Database.Database) {}

  async listPromptTemplates(): Promise<PromptTemplate[]> {
    const rows = this.db
      .prepare('SELECT * FROM prompt_templates ORDER BY is_active DESC, updated_at DESC')
      .all() as PromptTemplateRow[];
    return rows.map(formatPromptTemplateRow);
  }

  async getActivePromptTemplate(category?: string): Promise<PromptTemplate | null> {
    const rows = this.db
      .prepare('SELECT * FROM prompt_templates WHERE is_active = 1 ORDER BY updated_at DESC')
      .all() as PromptTemplateRow[];

    // 未绑定任何分类（categories = []）的模板只是存盘备用，不参与任何测评调度，
    // 避免“active 但空分类”的模板被兜底逻辑选中后全局接管。
    const items = rows.map(formatPromptTemplateRow).filter((item) => item.categories.length > 0);

    if (items.length === 0) {
      const fallback = this.db
        .prepare('SELECT * FROM prompt_templates ORDER BY is_builtin DESC, updated_at DESC LIMIT 1')
        .get() as PromptTemplateRow | undefined;
      return fallback ? formatPromptTemplateRow(fallback) : null;
    }

    if (category) {
      // 1. Exact match in categories array
      const exactMatch = items.find((item) => item.categories.includes(category));
      if (exactMatch) return exactMatch;
    }

    // 2. Fallback to template supporting 'all'
    const allMatch = items.find((item) => item.categories.includes('all'));
    if (allMatch) return allMatch;

    // 3. Fallback to first active template
    return items[0] ?? null;
  }

  async getPromptTemplateById(id: string): Promise<PromptTemplate | null> {
    const row = this.db
      .prepare('SELECT * FROM prompt_templates WHERE id = ?')
      .get(id) as PromptTemplateRow | undefined;
    return row ? formatPromptTemplateRow(row) : null;
  }

  /**
   * 校验分类是否有重复覆盖冲突（同一分类只能被一个生效模板覆盖）
   */
  getCategoryConflicts(
    targetId: string,
    targetCategories: string[]
  ): { category: string; conflictingTemplateId: string; conflictingTemplateName: string }[] {
    const activeRows = this.db
      .prepare('SELECT * FROM prompt_templates WHERE is_active = 1 AND id != ?')
      .all(targetId) as PromptTemplateRow[];

    const conflicts: { category: string; conflictingTemplateId: string; conflictingTemplateName: string }[] = [];

    for (const row of activeRows) {
      const activeItem = formatPromptTemplateRow(row);
      const isTargetAll = targetCategories.includes('all');
      const isOtherAll = activeItem.categories.includes('all');

      if (isTargetAll || isOtherAll) {
        conflicts.push({
          category: isTargetAll ? 'all' : activeItem.categories.join('/'),
          conflictingTemplateId: activeItem.id,
          conflictingTemplateName: activeItem.name,
        });
      } else {
        for (const cat of targetCategories) {
          if (activeItem.categories.includes(cat)) {
            conflicts.push({
              category: cat,
              conflictingTemplateId: activeItem.id,
              conflictingTemplateName: activeItem.name,
            });
          }
        }
      }
    }

    return conflicts;
  }

  async createPromptTemplate(input: {
    name: string;
    description: string;
    content: string;
    categories?: string[];
  }): Promise<PromptTemplate> {
    const id = genId('prm');
    const now = new Date().toISOString();
    const categoriesJson = JSON.stringify(
      Array.isArray(input.categories) ? input.categories : []
    );

    this.db
      .prepare(
        `INSERT INTO prompt_templates
          (id, name, description, content, categories, is_active, is_builtin, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?)`
      )
      .run(id, input.name, input.description, input.content, categoriesJson, now, now);

    const row = this.db
      .prepare('SELECT * FROM prompt_templates WHERE id = ?')
      .get(id) as PromptTemplateRow | undefined;
    if (!row) throw new Error('prompt template create failed');
    return formatPromptTemplateRow(row);
  }

  async updatePromptTemplate(
    id: string,
    patch: { name?: string; description?: string; content?: string; categories?: string[] }
  ): Promise<PromptTemplate | null> {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (patch.name !== undefined) {
      sets.push('name = ?');
      params.push(patch.name);
    }
    if (patch.description !== undefined) {
      sets.push('description = ?');
      params.push(patch.description);
    }
    if (patch.content !== undefined) {
      sets.push('content = ?');
      params.push(patch.content);
    }
    if (patch.categories !== undefined) {
      sets.push('categories = ?');
      params.push(JSON.stringify(Array.isArray(patch.categories) ? patch.categories : []));
    }
    sets.push('updated_at = ?');
    params.push(new Date().toISOString(), id);

    const info = this.db.prepare(`UPDATE prompt_templates SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    if (info.changes === 0) return null;

    const row = this.db
      .prepare('SELECT * FROM prompt_templates WHERE id = ?')
      .get(id) as PromptTemplateRow | undefined;
    return row ? formatPromptTemplateRow(row) : null;
  }

  async activatePromptTemplate(id: string): Promise<PromptTemplate | null> {
    const target = this.db
      .prepare('SELECT * FROM prompt_templates WHERE id = ?')
      .get(id) as PromptTemplateRow | undefined;
    if (!target) return null;

    const targetItem = formatPromptTemplateRow(target);

    const activateTx = this.db.transaction(() => {
      // If activating an 'all' template, deactivate all others
      if (targetItem.categories.includes('all')) {
        this.db.prepare('UPDATE prompt_templates SET is_active = 0 WHERE is_active = 1').run();
      } else {
        // Deactivate templates that have overlapping categories or 'all'
        const activeRows = this.db
          .prepare('SELECT * FROM prompt_templates WHERE is_active = 1')
          .all() as PromptTemplateRow[];
        for (const activeRow of activeRows) {
          const activeItem = formatPromptTemplateRow(activeRow);
          const hasOverlap =
            activeItem.categories.includes('all') ||
            activeItem.categories.some((cat) => targetItem.categories.includes(cat));
          if (hasOverlap && activeItem.id !== id) {
            this.db.prepare('UPDATE prompt_templates SET is_active = 0 WHERE id = ?').run(activeItem.id);
          }
        }
      }
      this.db
        .prepare('UPDATE prompt_templates SET is_active = 1, updated_at = ? WHERE id = ?')
        .run(new Date().toISOString(), id);
    });
    activateTx();

    const row = this.db
      .prepare('SELECT * FROM prompt_templates WHERE id = ?')
      .get(id) as PromptTemplateRow | undefined;
    return row ? formatPromptTemplateRow(row) : null;
  }

  async deletePromptTemplate(id: string): Promise<'deleted' | 'not_found' | 'active' | 'builtin'> {
    const row = this.db
      .prepare('SELECT * FROM prompt_templates WHERE id = ?')
      .get(id) as PromptTemplateRow | undefined;
    if (!row) return 'not_found';
    if (row.is_active) return 'active';
    if (row.is_builtin) return 'builtin';

    this.db.prepare('DELETE FROM prompt_templates WHERE id = ?').run(id);
    return 'deleted';
  }
}
