import type Database from 'better-sqlite3';
import type { PromptTemplate } from '../../types.js';
import type { PromptVersionContract } from '../../../shared/apiContracts.js';
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
  agent_id?: string;
  active_version_id?: string | null;
  active_version_num?: number | null;
  remark?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PromptVersionRow {
  id: string;
  template_id: string;
  version_num: number;
  system_prompt: string;
  user_prompt_template: string;
  model_params: string;
  change_summary: string;
  created_by: string;
  remark: string;
  admin_notes: string;
  created_at: string;
}

export function formatPromptTemplateRow(row: PromptTemplateRow): PromptTemplate {
  let categories: string[] = ['all'];
  if (row.categories) {
    try {
      const parsed = JSON.parse(row.categories);
      if (Array.isArray(parsed)) {
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
    agentId: row.agent_id || 'agent_dossier_analyst',
    activeVersionId: row.active_version_id ?? null,
    activeVersionNum: row.active_version_num ?? null,
    remark: row.remark || '',
    adminNotes: row.admin_notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function formatPromptVersionRow(row: PromptVersionRow): PromptVersionContract {
  let modelParams: Record<string, unknown> = {};
  try {
    if (row.model_params) {
      modelParams = JSON.parse(row.model_params);
    }
  } catch {
    modelParams = {};
  }
  return {
    id: row.id,
    templateId: row.template_id,
    versionNum: row.version_num,
    systemPrompt: row.system_prompt,
    userPromptTemplate: row.user_prompt_template || '',
    modelParams,
    changeSummary: row.change_summary,
    createdBy: row.created_by,
    remark: row.remark || '',
    adminNotes: row.admin_notes || '',
    createdAt: row.created_at,
  };
}

export function seedBuiltinPromptTemplate(database: Database.Database): void {
  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT OR IGNORE INTO prompt_templates
        (id, name, description, content, categories, is_active, is_builtin, agent_id, remark, admin_notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, '["all"]', 1, 1, 'agent_dossier_analyst', '内置核心解构模板', '迁移初始', ?, ?)`
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

  async listPromptTemplates(agentId?: string): Promise<PromptTemplate[]> {
    let sql = `
      SELECT t.*, v.version_num as active_version_num
      FROM prompt_templates t
      LEFT JOIN prompt_versions v ON t.active_version_id = v.id
    `;
    const params: unknown[] = [];
    if (agentId) {
      sql += ' WHERE t.agent_id = ?';
      params.push(agentId);
    }
    sql += ' ORDER BY t.is_active DESC, t.updated_at DESC';

    const rows = this.db.prepare(sql).all(...params) as PromptTemplateRow[];
    return rows.map(formatPromptTemplateRow);
  }

  async getActivePromptTemplate(category?: string, agentId = 'agent_dossier_analyst'): Promise<PromptTemplate | null> {
    const rows = this.db
      .prepare(`
        SELECT t.*, v.version_num as active_version_num
        FROM prompt_templates t
        LEFT JOIN prompt_versions v ON t.active_version_id = v.id
        WHERE t.is_active = 1 AND t.agent_id = ?
        ORDER BY t.updated_at DESC
      `)
      .all(agentId) as PromptTemplateRow[];

    const items = rows.map(formatPromptTemplateRow).filter((item) => item.categories.length > 0);

    if (items.length === 0) {
      const fallback = this.db
        .prepare(`
          SELECT t.*, v.version_num as active_version_num
          FROM prompt_templates t
          LEFT JOIN prompt_versions v ON t.active_version_id = v.id
          WHERE t.agent_id = ?
          ORDER BY t.is_builtin DESC, t.updated_at DESC LIMIT 1
        `)
        .get(agentId) as PromptTemplateRow | undefined;
      return fallback ? formatPromptTemplateRow(fallback) : null;
    }

    if (category) {
      const exactMatch = items.find((item) => item.categories.includes(category));
      if (exactMatch) return exactMatch;
    }

    const allMatch = items.find((item) => item.categories.includes('all'));
    if (allMatch) return allMatch;

    return items[0] ?? null;
  }

  async getPromptTemplateById(id: string): Promise<PromptTemplate | null> {
    const row = this.db
      .prepare(`
        SELECT t.*, v.version_num as active_version_num
        FROM prompt_templates t
        LEFT JOIN prompt_versions v ON t.active_version_id = v.id
        WHERE t.id = ?
      `)
      .get(id) as PromptTemplateRow | undefined;
    return row ? formatPromptTemplateRow(row) : null;
  }

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
    agentId?: string;
    categories?: string[];
    changeSummary?: string;
    remark?: string;
    adminNotes?: string;
  }): Promise<PromptTemplate> {
    const id = genId('prm');
    const versionId = genId('prv');
    const now = new Date().toISOString();
    const categoriesJson = JSON.stringify(Array.isArray(input.categories) ? input.categories : ['all']);
    const agentId = input.agentId || 'agent_dossier_analyst';
    const changeSummary = input.changeSummary || '初始版本建立';

    const tx = this.db.transaction(() => {
      this.db
        .prepare(`
          INSERT INTO prompt_templates
            (id, name, description, content, categories, is_active, is_builtin, agent_id, active_version_id, remark, admin_notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          id,
          input.name,
          input.description,
          input.content,
          categoriesJson,
          agentId,
          versionId,
          input.remark || '',
          input.adminNotes || '',
          now,
          now
        );

      this.db
        .prepare(`
          INSERT INTO prompt_versions
            (id, template_id, version_num, system_prompt, user_prompt_template, model_params, change_summary, created_by, remark, admin_notes, created_at)
          VALUES (?, ?, 1, ?, '', '{}', ?, 'admin', ?, ?, ?)
        `)
        .run(
          versionId,
          id,
          input.content,
          changeSummary,
          input.remark || '初始快照',
          input.adminNotes || '',
          now
        );
    });

    tx();
    const created = await this.getPromptTemplateById(id);
    if (!created) throw new Error('prompt template create failed');
    return created;
  }

  async createPromptVersion(
    templateId: string,
    input: {
      systemPrompt: string;
      userPromptTemplate?: string;
      modelParams?: Record<string, unknown>;
      changeSummary: string;
      createdBy?: string;
      remark?: string;
      adminNotes?: string;
    }
  ): Promise<PromptVersionContract> {
    const template = await this.getPromptTemplateById(templateId);
    if (!template) throw new Error(`Template ${templateId} not found`);

    const row = this.db
      .prepare('SELECT COALESCE(MAX(version_num), 0) + 1 as next_num FROM prompt_versions WHERE template_id = ?')
      .get(templateId) as { next_num: number };
    const nextNum = row.next_num;

    const versionId = genId('prv');
    const now = new Date().toISOString();
    const modelParamsJson = JSON.stringify(input.modelParams ?? {});

    const tx = this.db.transaction(() => {
      this.db
        .prepare(`
          INSERT INTO prompt_versions
            (id, template_id, version_num, system_prompt, user_prompt_template, model_params, change_summary, created_by, remark, admin_notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          versionId,
          templateId,
          nextNum,
          input.systemPrompt,
          input.userPromptTemplate || '',
          modelParamsJson,
          input.changeSummary.trim(),
          input.createdBy || 'admin',
          input.remark || '',
          input.adminNotes || '',
          now
        );

      this.db
        .prepare('UPDATE prompt_templates SET active_version_id = ?, content = ?, updated_at = ? WHERE id = ?')
        .run(versionId, input.systemPrompt, now, templateId);
    });

    tx();

    const created = await this.getPromptVersionById(versionId);
    if (!created) throw new Error('prompt version creation failed');
    return created;
  }

  async listPromptVersions(templateId: string): Promise<PromptVersionContract[]> {
    const rows = this.db
      .prepare('SELECT * FROM prompt_versions WHERE template_id = ? ORDER BY version_num DESC')
      .all(templateId) as PromptVersionRow[];
    return rows.map(formatPromptVersionRow);
  }

  async getPromptVersionById(versionId: string): Promise<PromptVersionContract | null> {
    const row = this.db
      .prepare('SELECT * FROM prompt_versions WHERE id = ?')
      .get(versionId) as PromptVersionRow | undefined;
    return row ? formatPromptVersionRow(row) : null;
  }

  async rollbackPromptVersion(
    templateId: string,
    targetVersionId: string,
    audit: { adminNotes?: string; remark?: string }
  ): Promise<PromptTemplate> {
    const target = await this.getPromptVersionById(targetVersionId);
    if (!target || target.templateId !== templateId) {
      throw new Error('Target version does not exist or does not belong to this template');
    }

    const now = new Date().toISOString();
    const note = audit.adminNotes ? `[回滚至 v${target.versionNum}] ${audit.adminNotes}` : `回滚至 v${target.versionNum}`;

    this.db
      .prepare(`
        UPDATE prompt_templates
        SET active_version_id = ?, content = ?, admin_notes = ?, remark = ?, updated_at = ?
        WHERE id = ?
      `)
      .run(targetVersionId, target.systemPrompt, note, audit.remark || '版本回滚', now, templateId);

    const updated = await this.getPromptTemplateById(templateId);
    if (!updated) throw new Error('Template not found after rollback');
    return updated;
  }

  async updatePromptTemplate(
    id: string,
    patch: {
      name?: string;
      description?: string;
      content?: string;
      categories?: string[];
      remark?: string;
      adminNotes?: string;
    }
  ): Promise<PromptTemplate | null> {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (patch.name !== undefined) {
      sets.push('name = ?');
      params.push(patch.name.trim());
    }
    if (patch.description !== undefined) {
      sets.push('description = ?');
      params.push(patch.description.trim());
    }
    if (patch.content !== undefined) {
      sets.push('content = ?');
      params.push(patch.content);
    }
    if (patch.categories !== undefined) {
      sets.push('categories = ?');
      params.push(JSON.stringify(Array.isArray(patch.categories) ? patch.categories : []));
    }
    if (patch.remark !== undefined) {
      sets.push('remark = ?');
      params.push(patch.remark.trim());
    }
    if (patch.adminNotes !== undefined) {
      sets.push('admin_notes = ?');
      params.push(patch.adminNotes.trim());
    }
    sets.push('updated_at = ?');
    params.push(new Date().toISOString(), id);

    const info = this.db.prepare(`UPDATE prompt_templates SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    if (info.changes === 0) return null;

    return this.getPromptTemplateById(id);
  }

  async activatePromptTemplate(id: string): Promise<PromptTemplate | null> {
    const target = await this.getPromptTemplateById(id);
    if (!target) return null;

    const activateTx = this.db.transaction(() => {
      if (target.categories.includes('all')) {
        this.db.prepare('UPDATE prompt_templates SET is_active = 0 WHERE is_active = 1 AND agent_id = ?').run(target.agentId || 'agent_dossier_analyst');
      } else {
        const activeRows = this.db
          .prepare('SELECT * FROM prompt_templates WHERE is_active = 1 AND agent_id = ?')
          .all(target.agentId || 'agent_dossier_analyst') as PromptTemplateRow[];
        for (const activeRow of activeRows) {
          const activeItem = formatPromptTemplateRow(activeRow);
          const hasOverlap =
            activeItem.categories.includes('all') ||
            activeItem.categories.some((cat) => target.categories.includes(cat));
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

    return this.getPromptTemplateById(id);
  }

  async deletePromptTemplate(id: string): Promise<'deleted' | 'not_found' | 'active' | 'builtin'> {
    const row = this.db
      .prepare('SELECT * FROM prompt_templates WHERE id = ?')
      .get(id) as PromptTemplateRow | undefined;
    if (!row) return 'not_found';
    if (row.is_active) return 'active';
    if (row.is_builtin) return 'builtin';

    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM prompt_versions WHERE template_id = ?').run(id);
      this.db.prepare('DELETE FROM prompt_templates WHERE id = ?').run(id);
    });
    tx();
    return 'deleted';
  }
}
