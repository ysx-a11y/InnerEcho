import type Database from 'better-sqlite3';
import type {
  SysDictType,
  SysDictItem,
  SysStateTransition,
} from '../../../shared/apiContracts.js';
import { genId } from '../helpers.js';

export interface DictTypeRow {
  code: string;
  name: string;
  description: string | null;
  remark: string | null;
  is_system: number;
  created_at: string;
  updated_at: string;
}

export interface DictItemRow {
  id: string;
  type_code: string;
  value: string;
  label: string;
  badge_color: string;
  badge_variant: string;
  sort_order: number;
  is_default: number;
  is_active: number;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

export interface StateTransitionRow {
  id: string;
  type_code: string;
  from_value: string;
  to_value: string;
  action_name: string;
  required_role: string;
  is_allowed: number;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

function mapDictType(row: DictTypeRow): SysDictType {
  return {
    code: row.code,
    name: row.name,
    description: row.description,
    remark: row.remark,
    isSystem: row.is_system,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDictItem(row: DictItemRow): SysDictItem {
  return {
    id: row.id,
    typeCode: row.type_code,
    value: row.value,
    label: row.label,
    badgeColor: row.badge_color,
    badgeVariant: row.badge_variant,
    sortOrder: row.sort_order,
    isDefault: row.is_default,
    isActive: row.is_active,
    remark: row.remark,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTransition(row: StateTransitionRow): SysStateTransition {
  return {
    id: row.id,
    typeCode: row.type_code,
    fromValue: row.from_value,
    toValue: row.to_value,
    actionName: row.action_name,
    requiredRole: row.required_role,
    isAllowed: row.is_allowed,
    remark: row.remark,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class DictRepo {
  constructor(private db: Database.Database) {}

  /** 查询所有字典大类 */
  listDictTypes(): SysDictType[] {
    const rows = this.db
      .prepare('SELECT * FROM sys_dict_types ORDER BY is_system DESC, code ASC')
      .all() as DictTypeRow[];
    return rows.map(mapDictType);
  }

  /** 查询指定字典大类 */
  getDictType(code: string): SysDictType | null {
    const row = this.db
      .prepare('SELECT * FROM sys_dict_types WHERE code = ?')
      .get(code) as DictTypeRow | undefined;
    return row ? mapDictType(row) : null;
  }

  /** 查询指定字典大类下的子项 */
  listDictItems(typeCode: string, options: { activeOnly?: boolean } = {}): SysDictItem[] {
    const { activeOnly = true } = options;
    const sql = activeOnly
      ? 'SELECT * FROM sys_dict_items WHERE type_code = ? AND is_active = 1 ORDER BY sort_order ASC, value ASC'
      : 'SELECT * FROM sys_dict_items WHERE type_code = ? ORDER BY sort_order ASC, value ASC';
    const rows = this.db.prepare(sql).all(typeCode) as DictItemRow[];
    return rows.map(mapDictItem);
  }

  /** 获取指定字典单项 */
  getDictItem(typeCode: string, value: string): SysDictItem | null {
    const row = this.db
      .prepare('SELECT * FROM sys_dict_items WHERE type_code = ? AND value = ?')
      .get(typeCode, value) as DictItemRow | undefined;
    return row ? mapDictItem(row) : null;
  }

  /** 保存/更新字典项 */
  upsertDictItem(input: {
    typeCode: string;
    value: string;
    label: string;
    badgeColor?: string;
    badgeVariant?: string;
    sortOrder?: number;
    isDefault?: number;
    isActive?: number;
    remark?: string;
  }): SysDictItem {
    const now = new Date().toISOString();
    const existing = this.getDictItem(input.typeCode, input.value);
    const id = existing?.id ?? genId('ditem');

    this.db
      .prepare(`
        INSERT INTO sys_dict_items (
          id, type_code, value, label, badge_color, badge_variant, sort_order, is_default, is_active, remark, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(type_code, value) DO UPDATE SET
          label = excluded.label,
          badge_color = excluded.badge_color,
          badge_variant = excluded.badge_variant,
          sort_order = excluded.sort_order,
          is_default = excluded.is_default,
          is_active = excluded.is_active,
          remark = excluded.remark,
          updated_at = excluded.updated_at
      `)
      .run(
        id,
        input.typeCode,
        input.value,
        input.label,
        input.badgeColor ?? 'gray',
        input.badgeVariant ?? 'light',
        input.sortOrder ?? 0,
        input.isDefault ?? 0,
        input.isActive ?? 1,
        input.remark ?? null,
        existing?.createdAt ?? now,
        now
      );

    return this.getDictItem(input.typeCode, input.value)!;
  }

  /** 查询状态流转规则 */
  listTransitions(typeCode: string, fromValue?: string): SysStateTransition[] {
    if (fromValue) {
      const rows = this.db
        .prepare('SELECT * FROM sys_state_transitions WHERE type_code = ? AND from_value = ? AND is_allowed = 1 ORDER BY to_value ASC')
        .all(typeCode, fromValue) as StateTransitionRow[];
      return rows.map(mapTransition);
    }
    const rows = this.db
      .prepare('SELECT * FROM sys_state_transitions WHERE type_code = ? ORDER BY from_value ASC, to_value ASC')
      .all(typeCode) as StateTransitionRow[];
    return rows.map(mapTransition);
  }

  /** 判断流转是否合法 */
  isTransitionAllowed(typeCode: string, fromValue: string, toValue: string, role: string = 'admin'): boolean {
    if (fromValue === toValue) return true; // 同态不变视为自反合法
    const row = this.db
      .prepare(`
        SELECT is_allowed, required_role FROM sys_state_transitions
        WHERE type_code = ? AND from_value = ? AND to_value = ? AND is_allowed = 1
      `)
      .get(typeCode, fromValue, toValue) as { is_allowed: number; required_role: string } | undefined;

    if (!row) return false;
    // admin 可执行一切 user/admin 动作；user 只能执行 required_role == 'user'
    if (role === 'admin') return true;
    return row.required_role === role;
  }

  /** 添加或更新流转规则 */
  upsertTransition(input: {
    typeCode: string;
    fromValue: string;
    toValue: string;
    actionName: string;
    requiredRole?: string;
    isAllowed?: number;
    remark?: string;
  }): SysStateTransition {
    const now = new Date().toISOString();
    const id = genId('stran');

    this.db
      .prepare(`
        INSERT INTO sys_state_transitions (
          id, type_code, from_value, to_value, action_name, required_role, is_allowed, remark, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(type_code, from_value, to_value, action_name) DO UPDATE SET
          required_role = excluded.required_role,
          is_allowed = excluded.is_allowed,
          remark = excluded.remark,
          updated_at = excluded.updated_at
      `)
      .run(
        id,
        input.typeCode,
        input.fromValue,
        input.toValue,
        input.actionName,
        input.requiredRole ?? 'admin',
        input.isAllowed ?? 1,
        input.remark ?? null,
        now,
        now
      );

    const row = this.db
      .prepare('SELECT * FROM sys_state_transitions WHERE type_code = ? AND from_value = ? AND to_value = ? AND action_name = ?')
      .get(input.typeCode, input.fromValue, input.toValue, input.actionName) as StateTransitionRow;
    return mapTransition(row);
  }
}
