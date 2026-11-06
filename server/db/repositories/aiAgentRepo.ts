import type Database from 'better-sqlite3';
import type {
  AiAgentContract,
  PromptVariableContract,
} from '../../../shared/apiContracts.js';
import { genId } from '../helpers.js';

export interface AiAgentRow {
  id: string;
  agent_key: string;
  name: string;
  description: string;
  interaction_mode: 'analysis' | 'chat' | 'summary';
  default_model: string;
  temperature: number;
  top_p: number;
  max_output_tokens: number;
  output_schema: string;
  status: string;
  remark: string;
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

export interface PromptVariableRow {
  id: string;
  variable_key: string;
  namespace: string;
  label: string;
  description: string;
  mock_value: string;
  remark: string;
  admin_notes: string;
  created_at: string;
}

function formatAgentRow(row: AiAgentRow): AiAgentContract {
  return {
    id: row.id,
    agentKey: row.agent_key,
    name: row.name,
    description: row.description || '',
    interactionMode: row.interaction_mode,
    defaultModel: row.default_model || 'gemini-1.5-pro',
    temperature: Number(row.temperature) || 0.7,
    topP: Number(row.top_p) || 0.95,
    maxOutputTokens: Number(row.max_output_tokens) || 2048,
    outputSchema: row.output_schema || '{}',
    status: row.status || 'active',
    remark: row.remark || '',
    adminNotes: row.admin_notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function formatVariableRow(row: PromptVariableRow): PromptVariableContract {
  return {
    id: row.id,
    variableKey: row.variable_key,
    namespace: row.namespace,
    label: row.label,
    description: row.description || '',
    mockValue: row.mock_value || '',
    remark: row.remark || '',
    adminNotes: row.admin_notes || '',
    createdAt: row.created_at,
  };
}

export class AiAgentRepo {
  constructor(private db: Database.Database) {}

  async listAgents(): Promise<AiAgentContract[]> {
    const rows = this.db
      .prepare('SELECT * FROM ai_agents ORDER BY created_at ASC')
      .all() as AiAgentRow[];
    return rows.map(formatAgentRow);
  }

  async getAgentById(id: string): Promise<AiAgentContract | null> {
    const row = this.db
      .prepare('SELECT * FROM ai_agents WHERE id = ?')
      .get(id) as AiAgentRow | undefined;
    return row ? formatAgentRow(row) : null;
  }

  async getAgentByKey(agentKey: string): Promise<AiAgentContract | null> {
    const row = this.db
      .prepare('SELECT * FROM ai_agents WHERE agent_key = ?')
      .get(agentKey) as AiAgentRow | undefined;
    return row ? formatAgentRow(row) : null;
  }

  async updateAgent(
    id: string,
    patch: Partial<
      Pick<
        AiAgentContract,
        | 'name'
        | 'description'
        | 'defaultModel'
        | 'temperature'
        | 'topP'
        | 'maxOutputTokens'
        | 'outputSchema'
        | 'status'
        | 'remark'
        | 'adminNotes'
      >
    >
  ): Promise<AiAgentContract> {
    const sets: string[] = ['updated_at = ?'];
    const params: unknown[] = [new Date().toISOString()];

    if (patch.name !== undefined) {
      sets.push('name = ?');
      params.push(patch.name.trim());
    }
    if (patch.description !== undefined) {
      sets.push('description = ?');
      params.push(patch.description.trim());
    }
    if (patch.defaultModel !== undefined) {
      sets.push('default_model = ?');
      params.push(patch.defaultModel.trim());
    }
    if (patch.temperature !== undefined) {
      sets.push('temperature = ?');
      params.push(patch.temperature);
    }
    if (patch.topP !== undefined) {
      sets.push('top_p = ?');
      params.push(patch.topP);
    }
    if (patch.maxOutputTokens !== undefined) {
      sets.push('max_output_tokens = ?');
      params.push(patch.maxOutputTokens);
    }
    if (patch.outputSchema !== undefined) {
      sets.push('output_schema = ?');
      params.push(patch.outputSchema);
    }
    if (patch.status !== undefined) {
      sets.push('status = ?');
      params.push(patch.status);
    }
    if (patch.remark !== undefined) {
      sets.push('remark = ?');
      params.push(patch.remark.trim());
    }
    if (patch.adminNotes !== undefined) {
      sets.push('admin_notes = ?');
      params.push(patch.adminNotes.trim());
    }

    params.push(id);
    this.db.prepare(`UPDATE ai_agents SET ${sets.join(', ')} WHERE id = ?`).run(...params);

    const updated = await this.getAgentById(id);
    if (!updated) throw new Error(`Agent ${id} not found after update`);
    return updated;
  }

  async listVariables(namespace?: string): Promise<PromptVariableContract[]> {
    let rows: PromptVariableRow[];
    if (namespace) {
      rows = this.db
        .prepare('SELECT * FROM sys_prompt_variables WHERE namespace = ? ORDER BY variable_key ASC')
        .all(namespace) as PromptVariableRow[];
    } else {
      rows = this.db
        .prepare('SELECT * FROM sys_prompt_variables ORDER BY namespace ASC, variable_key ASC')
        .all() as PromptVariableRow[];
    }
    return rows.map(formatVariableRow);
  }

  async getVariableByKey(key: string): Promise<PromptVariableContract | null> {
    const row = this.db
      .prepare('SELECT * FROM sys_prompt_variables WHERE variable_key = ?')
      .get(key) as PromptVariableRow | undefined;
    return row ? formatVariableRow(row) : null;
  }

  async upsertVariable(data: {
    variableKey: string;
    namespace: string;
    label: string;
    description?: string;
    mockValue?: string;
    remark?: string;
    adminNotes?: string;
  }): Promise<PromptVariableContract> {
    const now = new Date().toISOString();
    const existing = await this.getVariableByKey(data.variableKey);
    if (existing) {
      this.db
        .prepare(`
          UPDATE sys_prompt_variables
          SET label = ?, description = ?, mock_value = ?, remark = ?, admin_notes = ?
          WHERE variable_key = ?
        `)
        .run(
          data.label.trim(),
          (data.description || '').trim(),
          data.mockValue || '',
          (data.remark || '').trim(),
          (data.adminNotes || '').trim(),
          data.variableKey
        );
      const updated = await this.getVariableByKey(data.variableKey);
      return updated!;
    }

    const id = genId('pvar');
    this.db
      .prepare(`
        INSERT INTO sys_prompt_variables
          (id, variable_key, namespace, label, description, mock_value, remark, admin_notes, created_at)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        id,
        data.variableKey.trim(),
        data.namespace.trim(),
        data.label.trim(),
        (data.description || '').trim(),
        data.mockValue || '',
        (data.remark || '').trim(),
        (data.adminNotes || '').trim(),
        now
      );

    const created = await this.getVariableByKey(data.variableKey);
    return created!;
  }
}
