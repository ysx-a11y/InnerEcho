import {
  type Migration,
  exec,
  all,
  ensureColumn,
} from './types.js';
import {
  DEFAULT_INTERROGATOR_PROMPT,
  DEFAULT_SUMMARY_PROMPT,
} from '../../services/interrogationPrompts.js';

interface ExistingPromptTemplateRow {
  id: string;
  name: string;
  description: string;
  content: string;
  agent_id?: string;
  active_version_id?: string | null;
}

export const migrationV37: Migration = {
  version: 37,
  up(database) {
    const now = new Date().toISOString();

    // 1. 智能体能力元定义表 (ai_agents)
    exec(database, `
      CREATE TABLE IF NOT EXISTS ai_agents (
        id TEXT PRIMARY KEY,
        agent_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        interaction_mode TEXT NOT NULL,
        default_model TEXT NOT NULL DEFAULT 'gemini-1.5-pro',
        temperature REAL NOT NULL DEFAULT 0.7,
        top_p REAL NOT NULL DEFAULT 0.95,
        max_output_tokens INTEGER NOT NULL DEFAULT 2048,
        output_schema TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'active',
        remark TEXT NOT NULL DEFAULT '',
        admin_notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ai_agents_key ON ai_agents(agent_key);
      CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON ai_agents(status);
    `);

    // 2. 扩充 prompt_templates 表字段
    exec(database, `
      CREATE TABLE IF NOT EXISTS prompt_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL,
        categories TEXT NOT NULL DEFAULT '["all"]',
        is_active INTEGER NOT NULL DEFAULT 0,
        is_builtin INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    ensureColumn(database, 'prompt_templates', 'agent_id', "TEXT NOT NULL DEFAULT 'agent_dossier_analyst'");
    ensureColumn(database, 'prompt_templates', 'active_version_id', 'TEXT');
    ensureColumn(database, 'prompt_templates', 'remark', "TEXT NOT NULL DEFAULT ''");
    ensureColumn(database, 'prompt_templates', 'admin_notes', "TEXT NOT NULL DEFAULT ''");
    exec(database, 'CREATE INDEX IF NOT EXISTS idx_prompt_templates_agent ON prompt_templates(agent_id)');

    // 3. 不可变版本快照表 (prompt_versions)
    exec(database, `
      CREATE TABLE IF NOT EXISTS prompt_versions (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL REFERENCES prompt_templates(id),
        version_num INTEGER NOT NULL,
        system_prompt TEXT NOT NULL,
        user_prompt_template TEXT NOT NULL DEFAULT '',
        model_params TEXT NOT NULL DEFAULT '{}',
        change_summary TEXT NOT NULL,
        created_by TEXT NOT NULL DEFAULT 'admin',
        remark TEXT NOT NULL DEFAULT '',
        admin_notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_prompt_versions_num ON prompt_versions(template_id, version_num);
      CREATE INDEX IF NOT EXISTS idx_prompt_versions_template ON prompt_versions(template_id, created_at DESC);
    `);

    // 4. 系统动态变量元数据表 (sys_prompt_variables)
    exec(database, `
      CREATE TABLE IF NOT EXISTS sys_prompt_variables (
        id TEXT PRIMARY KEY,
        variable_key TEXT UNIQUE NOT NULL,
        namespace TEXT NOT NULL,
        label TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        mock_value TEXT NOT NULL DEFAULT '',
        remark TEXT NOT NULL DEFAULT '',
        admin_notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_prompt_vars_ns ON sys_prompt_variables(namespace);
    `);

    // 5. 注入 3 大内置智能体
    const insertAgentStmt = database.prepare(`
      INSERT OR IGNORE INTO ai_agents
        (id, agent_key, name, description, interaction_mode, default_model, temperature, top_p, max_output_tokens, output_schema, status, remark, admin_notes, created_at, updated_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
    `);

    insertAgentStmt.run(
      'agent_dossier_analyst',
      'dossier_analyst',
      '深层卷宗解构导师',
      '基于测评答卷与自白，进行文学共鸣与心理学表里反差解构，生成绝密心理卷宗。',
      'analysis',
      'gemini-1.5-pro',
      0.85,
      0.95,
      2048,
      JSON.stringify({
        type: 'object',
        required: ['archetypeTitle', 'disparityScore', 'personaDeconstruction', 'shadowDeconstruction', 'psychologicalSublimation'],
      }),
      '核心主流程解构智能体',
      '负责/api/analyze-dossier调用，文学风格强烈',
      now,
      now
    );

    insertAgentStmt.run(
      'agent_interrogator',
      'interrogator',
      '审讯室冷峻主审官',
      '桌面摊开被审人档案，冷酷逼问其供词中的矛盾与回避点，严禁被审人反问。',
      'chat',
      'gemini-1.5-pro',
      0.55,
      0.9,
      300,
      JSON.stringify({
        type: 'string',
        description: '2-4句冷峻逼问，无Markdown，无多余寒暄',
      }),
      '交互式对抗智能体',
      '负责/api/interrogation/messages调用',
      now,
      now
    );

    insertAgentStmt.run(
      'agent_interrogation_recorder',
      'interrogation_recorder',
      '审讯室档案记录员',
      '客观提炼会话交锋中的核心矛盾与尚未回答的追问，形成给来访者本人的结案词。',
      'summary',
      'gemini-1.5-flash',
      0.4,
      0.9,
      400,
      JSON.stringify({
        type: 'string',
        description: '第二人称120-200字结案提炼',
      }),
      '会话提炼智能体',
      '负责/api/interrogation/summary调用',
      now,
      now
    );

    // 6. 确保审讯室两个提示词模板入库并绑定智能体
    const insertTemplateStmt = database.prepare(`
      INSERT OR IGNORE INTO prompt_templates
        (id, name, description, content, categories, is_active, is_builtin, agent_id, remark, admin_notes, created_at, updated_at)
      VALUES
        (?, ?, ?, ?, '["all"]', 1, 1, ?, ?, ?, ?, ?)
    `);

    insertTemplateStmt.run(
      'prompt_interrogator_default',
      '默认主审官冷峻人设',
      '审讯室主审官冷峻逼问系统提示词，以来访者真实卷宗为靶向进行矛盾洞察。',
      DEFAULT_INTERROGATOR_PROMPT,
      'agent_interrogator',
      '审讯室内置模板',
      '由v37迁移初始化，后续管理端可直接版本化维护',
      now,
      now
    );

    insertTemplateStmt.run(
      'prompt_interrogation_summary_default',
      '默认审讯记录员总结',
      '审讯室记录员在多轮交锋结束后生成的结案总结。',
      DEFAULT_SUMMARY_PROMPT,
      'agent_interrogation_recorder',
      '审讯室总结内置模板',
      '由v37迁移初始化',
      now,
      now
    );

    // 7. 为所有现存的 prompt_templates 自动创建不可变版本 v1 快照并关联
    const existingTemplates = all<ExistingPromptTemplateRow>(
      database,
      'SELECT id, name, description, content, agent_id, active_version_id FROM prompt_templates'
    );

    const insertVersionStmt = database.prepare(`
      INSERT OR IGNORE INTO prompt_versions
        (id, template_id, version_num, system_prompt, user_prompt_template, model_params, change_summary, created_by, remark, admin_notes, created_at)
      VALUES
        (?, ?, 1, ?, '', '{}', ?, 'system_migration', '迁移初始化版本快照', 'v37自动升版生成', ?)
    `);

    const updateActiveVersionStmt = database.prepare(`
      UPDATE prompt_templates SET active_version_id = ? WHERE id = ?
    `);

    for (const tmpl of existingTemplates) {
      const versionId = `prv_${tmpl.id}_v1`;
      insertVersionStmt.run(
        versionId,
        tmpl.id,
        tmpl.content,
        `系统初始化快照 (迁移升版自 ${tmpl.name})`,
        now
      );
      if (!tmpl.active_version_id) {
        updateActiveVersionStmt.run(versionId, tmpl.id);
      }
    }

    // 8. 注入动态变量字典 (sys_prompt_variables)
    const insertVarStmt = database.prepare(`
      INSERT OR IGNORE INTO sys_prompt_variables
        (id, variable_key, namespace, label, description, mock_value, remark, admin_notes, created_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const variablesSeed = [
      { key: 'user.nickname', ns: 'user', label: '用户昵称', desc: '来访者登记的自白昵称', mock: '深海旅人' },
      { key: 'user.occupation', ns: 'user', label: '真实社会职业', desc: '来访者真实职业，如医师、法务、程序员', mock: '外企合规法务' },
      { key: 'user.persona', ns: 'user', label: '人前社交形象', desc: '在人前的显性特质，如高冷精英、温和包容', mock: '高冷克制、条理清晰的职场精英' },
      { key: 'user.open_confession', ns: 'user', label: '第一阶段隐秘渴望', desc: '手填的深层自白与暗流渴望', mock: '渴望卸下所有防备与审视，彻底交出控制权' },
      { key: 'dossier.scores_table', ns: 'dossier', label: '量化得分表', desc: '测评各维度的量化归一化得分', mock: '支配: 16, 臣服: 84, 克制: 78, 感官: 90' },
      { key: 'dossier.archetype', ns: 'dossier', label: '基准心理原型', desc: '系统算法推算的心理原型称号', mock: '深渊引渡者' },
      { key: 'dossier.dimension_details', ns: 'dossier', label: '维度明细特征', desc: '核心突出维度与偏离度分析', mock: '突出特征：极高臣服度与强克制反差' },
      { key: 'pace.hesitation_signals', ns: 'pace', label: '纠结停留微信号', desc: '答题耗时极高或反复修改的题号及停留秒数', mock: '在第 14 题与第 38 题停留超过 24 秒并修改过答案' },
      { key: 'interrogate.dossier_brief', ns: 'interrogate', label: '审讯档案摘要', desc: '送入审讯室的来访者绝密卷宗精炼摘要', mock: '外企法务，表面极度克制，实际臣服指数 84' },
      { key: 'interrogate.history', ns: 'interrogate', label: '审讯交互历史', desc: '多轮实时对话交锋记录', mock: '主审官: 你为何逃避第14题？\n被审人: 我没有逃避...' },
    ];

    for (const v of variablesSeed) {
      insertVarStmt.run(
        `pvar_${v.key.replace('.', '_')}`,
        v.key,
        v.ns,
        v.label,
        v.desc,
        v.mock,
        '内置标准变量',
        '系统支持在Prompt中通过{{' + v.key + '}}插入',
        now
      );
    }

    // 9. 扩展动态数据字典：ai_agent_type 与 agent_interaction_mode
    const insertDictTypeStmt = database.prepare(`
      INSERT OR IGNORE INTO sys_dict_types (code, name, description, remark, is_system, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `);
    const insertDictItemStmt = database.prepare(`
      INSERT OR IGNORE INTO sys_dict_items (id, type_code, value, label, badge_color, badge_variant, sort_order, is_default, is_active, remark, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'light', ?, ?, 1, ?, ?, ?)
    `);

    insertDictTypeStmt.run('ai_agent_type', 'AI 智能体类型', '系统支持的认知与交互智能体角色分类', 'AI中台角色字典', now, now);
    insertDictItemStmt.run('di_agent_dossier', 'ai_agent_type', 'dossier_analyst', '卷宗解构导师', 'violet', 1, 1, '分析型角色', now, now);
    insertDictItemStmt.run('di_agent_interrogator', 'ai_agent_type', 'interrogator', '审讯室主审官', 'red', 2, 0, '对抗型角色', now, now);
    insertDictItemStmt.run('di_agent_recorder', 'ai_agent_type', 'interrogation_recorder', '审讯记录员', 'teal', 3, 0, '提炼型角色', now, now);

    insertDictTypeStmt.run('agent_interaction_mode', '智能体交互模式', '智能体调用的交互形态契约', '交互形态定义', now, now);
    insertDictItemStmt.run('di_mode_analysis', 'agent_interaction_mode', 'analysis', '结构化分析', 'pink', 1, 1, '单次JSON输出', now, now);
    insertDictItemStmt.run('di_mode_chat', 'agent_interaction_mode', 'chat', '多轮对话', 'orange', 2, 0, '实时对话流', now, now);
    insertDictItemStmt.run('di_mode_summary', 'agent_interaction_mode', 'summary', '收敛总结', 'cyan', 3, 0, '短文案提炼', now, now);
  },
};
