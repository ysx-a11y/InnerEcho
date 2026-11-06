import type Database from 'better-sqlite3';
import type { AdminTaskSummary } from '../../types.js';
import type {
  SpecialPriceLeaderboardItem,
  SpecialPriceMyStatus,
} from '../../../shared/apiContracts.js';
import { STATIC_TASKS } from '../../../shared/tasks.js';
import { genId } from '../helpers.js';
import {
  encryptField,
  decryptField,
  isFieldEncryptionEnabled,
} from '../../utils/fieldCrypto.js';

export interface UserTaskRow {
  id: string;
  user_id: string;
  task_id: string;
  status: string;
  text_content: string | null;
  attachments_json: string | null;
  accepted_at: string;
  completed_at: string | null;
}

export interface CustomTaskDefinitionRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  created_at: string;
}

export class TaskRepo {
  constructor(private db: Database.Database) {}

  async getUserTasks(userId: string): Promise<UserTaskRow[]> {
    const rows = this.db
      .prepare('SELECT * FROM user_tasks WHERE user_id = ? ORDER BY accepted_at DESC')
      .all(userId) as UserTaskRow[];
    return rows.map((row) => ({
      ...row,
      text_content: row.text_content === null
        ? null
        : decryptField(row.text_content, `${row.id}:text_content`),
      attachments_json: row.attachments_json === null
        ? null
        : decryptField(row.attachments_json, `${row.id}:attachments_json`),
    }));
  }

  async getUserActiveTask(userId: string, taskId: string): Promise<UserTaskRow | null> {
    const row = this.db
      .prepare("SELECT * FROM user_tasks WHERE user_id = ? AND task_id = ? AND status = 'accepted'")
      .get(userId, taskId) as UserTaskRow | undefined;
    return row ?? null;
  }

  async createUserTask(userId: string, taskId: string): Promise<UserTaskRow> {
    const id = genId('utk');
    const now = new Date().toISOString();
    const row: UserTaskRow = {
      id,
      user_id: userId,
      task_id: taskId,
      status: 'accepted',
      text_content: null,
      attachments_json: null,
      accepted_at: now,
      completed_at: null,
    };
    const insertTx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO user_tasks (id, user_id, task_id, status, text_content, attachments_json, accepted_at, completed_at)
           VALUES (?, ?, ?, ?, NULL, NULL, ?, NULL)`
        )
        .run(id, userId, taskId, 'accepted', now);
    });
    insertTx();
    return row;
  }

  async completeUserTask(
    userTaskId: string,
    textContent: string,
    attachmentsJson: string
  ): Promise<void> {
    const now = new Date().toISOString();
    const storedText = isFieldEncryptionEnabled()
      ? encryptField(textContent, `${userTaskId}:text_content`)
      : textContent;
    const storedAttachments = isFieldEncryptionEnabled()
      ? encryptField(attachmentsJson, `${userTaskId}:attachments_json`)
      : attachmentsJson;

    const completeTx = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE user_tasks
           SET status = 'completed', text_content = ?, attachments_json = ?, completed_at = ?
           WHERE id = ?`
        )
        .run(storedText, storedAttachments, now, userTaskId);
    });
    completeTx();
  }

  async abandonUserTask(userTaskId: string): Promise<void> {
    const abandonTx = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE user_tasks
           SET status = 'abandoned'
           WHERE id = ? AND status = 'accepted'`
        )
        .run(userTaskId);
    });
    abandonTx();
  }

  async getCompletedTasksCount(userId: string): Promise<number> {
    const row = this.db
      .prepare("SELECT COUNT(*) as count FROM user_tasks WHERE user_id = ? AND status = 'completed'")
      .get(userId) as { count: number } | undefined;
    return row?.count ?? 0;
  }

  async createCustomTaskDefinition(
    userId: string,
    title: string,
    description: string,
    category: string
  ): Promise<CustomTaskDefinitionRow> {
    const id = genId('ctd');
    const now = new Date().toISOString();
    const row: CustomTaskDefinitionRow = {
      id,
      user_id: userId,
      title,
      description,
      category,
      created_at: now,
    };
    this.db
      .prepare(
        `INSERT INTO custom_task_definitions (id, user_id, title, description, category, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, userId, title, description, category, now);
    return row;
  }

  async getCustomTaskDefinitions(userId: string): Promise<CustomTaskDefinitionRow[]> {
    return this.db
      .prepare('SELECT * FROM custom_task_definitions WHERE user_id = ? ORDER BY created_at ASC')
      .all(userId) as CustomTaskDefinitionRow[];
  }

  async getTotalAcceptedTasksCount(userId: string): Promise<number> {
    const row = this.db
      .prepare('SELECT COUNT(*) as count FROM user_tasks WHERE user_id = ?')
      .get(userId) as { count: number } | undefined;
    return row?.count ?? 0;
  }

  async listAdminTasks(input: {
    limit?: number;
    offset?: number;
    status?: string;
    category?: string;
  }): Promise<{ total: number; items: AdminTaskSummary[] }> {
    const limit = Math.min(Math.max(1, input.limit ?? 50), 200);
    const offset = Math.max(0, input.offset ?? 0);

    const conditions: string[] = [];
    const params: any[] = [];

    if (input.status && input.status !== 'all') {
      conditions.push('ut.status = ?');
      params.push(input.status);
    }

    if (input.category && input.category !== 'all') {
      let targetCategories: string[] = [];
      if (input.category === 'routine' || input.category === 'subconscious') {
        targetCategories = ['subconscious', 'persona'];
      } else if (input.category === 'secret' || input.category === 'dream') {
        targetCategories = ['dream', 'shadow'];
      } else {
        targetCategories = [input.category];
      }

      const matchingStaticIds = STATIC_TASKS.filter((t) => targetCategories.includes(t.category)).map((t) => t.id);
      const catPlaceholders = targetCategories.map(() => '?').join(',');
      const customRows = this.db
        .prepare(`SELECT id FROM custom_task_definitions WHERE category IN (${catPlaceholders})`)
        .all(...targetCategories) as { id: string }[];
      const allMatchingIds = Array.from(new Set([...matchingStaticIds, ...customRows.map((r) => r.id)]));

      if (allMatchingIds.length === 0) {
        return { total: 0, items: [] };
      }

      const taskPlaceholders = allMatchingIds.map(() => '?').join(',');
      conditions.push(`ut.task_id IN (${taskPlaceholders})`);
      params.push(...allMatchingIds);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const totalRow = this.db.prepare(`SELECT COUNT(*) c FROM user_tasks ut ${whereClause}`).get(...params) as { c: number } | undefined;
    const rows = this.db
      .prepare(
        `SELECT ut.*, u.email,
           (SELECT nickname FROM dossiers WHERE user_id = ut.user_id ORDER BY created_at DESC LIMIT 1) as nickname
         FROM user_tasks ut
         LEFT JOIN users u ON ut.user_id = u.id
         ${whereClause}
         ORDER BY ut.accepted_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as any[];

    const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
    let customTasks: any[] = [];
    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(',');
      customTasks = this.db
        .prepare(`SELECT * FROM custom_task_definitions WHERE user_id IN (${placeholders})`)
        .all(...userIds) as any[];
    }

    const decryptedItems: AdminTaskSummary[] = rows.map((row) => {
      const textContent = row.text_content === null
        ? null
        : decryptField(row.text_content, `${row.id}:text_content`);
      const attachmentsJson = row.attachments_json === null
        ? null
        : decryptField(row.attachments_json, `${row.id}:attachments_json`);

      let title = '未知任务';
      let description = '';
      let category: 'subconscious' | 'dream' | 'shadow' | 'persona' = 'subconscious';

      const staticTask = STATIC_TASKS.find((t) => t.id === row.task_id);
      if (staticTask) {
        title = staticTask.title;
        description = staticTask.description;
        category = staticTask.category;
      } else {
        const customTask = customTasks.find((ct) => ct.id === row.task_id);
        if (customTask) {
          title = customTask.title;
          description = customTask.description;
          category = customTask.category;
        }
      }

      let attachments: any[] = [];
      if (attachmentsJson) {
        try {
          const parsed = JSON.parse(attachmentsJson);
          attachments = Array.isArray(parsed) ? parsed : [];
        } catch {
          attachments = [];
        }
      }

      return {
        id: row.id,
        userId: row.user_id,
        email: row.email,
        nickname: row.nickname || '神秘客',
        taskId: row.task_id,
        title,
        description,
        category,
        status: row.status,
        textContent,
        attachments,
        acceptedAt: row.accepted_at,
        completedAt: row.completed_at,
      };
    });

    return {
      total: totalRow?.c ?? 0,
      items: decryptedItems,
    };
  }

  /** 获取特殊任务自评（如身价自评）及全网排名统计 */
  async getSpecialEvaluation(
    taskType: string,
    deviceId: string,
    userId?: string | null
  ): Promise<{
    id: string;
    taskType: string;
    price: number;
    selfEvaluation: string;
    rank: number;
    totalParticipants: number;
    defeatedPercentage: number;
    createdAt: string;
    updatedAt: string;
    canEdit: boolean;
    cooldownRemainingSeconds: number;
  } | null> {
    let sql = `SELECT * FROM special_evaluations WHERE task_type = ? AND (`;
    const params: unknown[] = [taskType];
    if (userId) {
      sql += `user_id = ? OR (user_id IS NULL AND device_id = ?)`;
      params.push(userId, deviceId);
    } else {
      sql += `device_id = ?`;
      params.push(deviceId);
    }
    sql += `) ORDER BY updated_at DESC LIMIT 1`;

    const row = this.db.prepare(sql).get(...params) as {
      id: string;
      user_id: string | null;
      device_id: string;
      task_type: string;
      price: number;
      self_evaluation: string;
      created_at: string;
      updated_at: string;
    } | undefined;

    if (!row) return null;

    const decryptedText = isFieldEncryptionEnabled()
      ? decryptField(row.self_evaluation, `${row.id}:self_eval`)
      : row.self_evaluation;

    // 排名算法（并列按最高算，即统计价格严格大于当前用户的记录数 + 1）
    const higherRow = this.db
      .prepare(`SELECT COUNT(*) as c FROM special_evaluations WHERE task_type = ? AND price > ?`)
      .get(taskType, row.price) as { c: number } | undefined;
    const rank = (higherRow?.c ?? 0) + 1;

    // 统计总参与人数与低于当前价格的人数，计算超越百分比
    const statsRow = this.db
      .prepare(
        `SELECT COUNT(*) as total_count, COUNT(CASE WHEN price < ? THEN 1 END) as lower_count
         FROM special_evaluations WHERE task_type = ?`
      )
      .get(row.price, taskType) as { total_count: number; lower_count: number } | undefined;

    const totalCount = statsRow?.total_count ?? 1;
    const lowerCount = statsRow?.lower_count ?? 0;
    const defeatedPercentage = totalCount <= 1
      ? 99.9
      : Math.min(99.9, Math.max(0.1, Math.round((lowerCount / (totalCount - 1)) * 1000) / 10));

    // 1 小时修改冷却倒计时
    const updatedTime = new Date(row.updated_at).getTime();
    const elapsedMs = Date.now() - (isNaN(updatedTime) ? 0 : updatedTime);
    const COOLDOWN_MS = 3600 * 1000;
    const remainingMs = Math.max(0, COOLDOWN_MS - elapsedMs);
    const cooldownRemainingSeconds = Math.ceil(remainingMs / 1000);
    const canEdit = cooldownRemainingSeconds === 0;

    return {
      id: row.id,
      taskType: row.task_type,
      price: Number(row.price),
      selfEvaluation: decryptedText,
      rank,
      totalParticipants: totalCount,
      defeatedPercentage,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      canEdit,
      cooldownRemainingSeconds,
    };
  }

  /** 保存或更新特殊自评（含 1 小时限流校验） */
  async saveSpecialEvaluation(payload: {
    taskType: string;
    deviceId: string;
    userId?: string | null;
    price: number;
    selfEvaluation: string;
    force?: boolean;
  }): Promise<{
    ok: boolean;
    evaluation?: NonNullable<Awaited<ReturnType<TaskRepo['getSpecialEvaluation']>>>;
    cooldownRemainingSeconds?: number;
    message?: string;
  }> {
    const existing = await this.getSpecialEvaluation(payload.taskType, payload.deviceId, payload.userId);

    // 冷却校验：未满 1 小时拒绝修改
    if (existing && !payload.force && !existing.canEdit) {
      return {
        ok: false,
        cooldownRemainingSeconds: existing.cooldownRemainingSeconds,
        message: `距上次自评未满 1 小时，还需等待 ${Math.ceil(existing.cooldownRemainingSeconds / 60)} 分钟后方可重新修改。`,
      };
    }

    const now = new Date().toISOString();

    if (existing) {
      const storedText = isFieldEncryptionEnabled()
        ? encryptField(payload.selfEvaluation, `${existing.id}:self_eval`)
        : payload.selfEvaluation;

      const updateTx = this.db.transaction(() => {
        this.db
          .prepare(
            `UPDATE special_evaluations
             SET price = ?, self_evaluation = ?, user_id = COALESCE(?, user_id), updated_at = ?
             WHERE id = ?`
          )
          .run(payload.price, storedText, payload.userId ?? null, now, existing.id);
      });
      updateTx();
    } else {
      const id = genId('spe');
      const storedText = isFieldEncryptionEnabled()
        ? encryptField(payload.selfEvaluation, `${id}:self_eval`)
        : payload.selfEvaluation;

      const insertTx = this.db.transaction(() => {
        this.db
          .prepare(
            `INSERT INTO special_evaluations (id, user_id, device_id, task_type, price, self_evaluation, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            id,
            payload.userId ?? null,
            payload.deviceId,
            payload.taskType,
            payload.price,
            storedText,
            now,
            now
          );
      });
      insertTx();
    }

    const updated = await this.getSpecialEvaluation(payload.taskType, payload.deviceId, payload.userId);
    return {
      ok: true,
      evaluation: updated ?? undefined,
    };
  }

  /** 管理后台：全网特殊身价自评列表与天梯排位 */
  async listAdminSpecialEvaluations(input: {
    taskType?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: 'price' | 'createdAt' | 'updatedAt';
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<{
    total: number;
    items: Array<{
      id: string;
      userId: string | null;
      email: string | null;
      nickname: string;
      deviceId: string;
      taskType: string;
      price: number;
      selfEvaluation: string;
      rank: number;
      createdAt: string;
      updatedAt: string;
    }>;
    stats: {
      totalParticipants: number;
      highestPrice: number;
      lowestPrice: number;
      averagePrice: number;
      medianPrice: number;
    };
  }> {
    const taskType = input.taskType || 'price_tag';
    const limit = Math.min(Math.max(1, input.limit ?? 50), 200);
    const offset = Math.max(0, input.offset ?? 0);
    const sortField = input.sort === 'createdAt' ? 'se.created_at' : input.sort === 'updatedAt' ? 'se.updated_at' : 'se.price';
    const sortOrder = input.order === 'asc' ? 'ASC' : 'DESC';

    // 基础统计
    const statsRow = this.db.prepare(
      `SELECT
         COUNT(*) as total_count,
         MAX(price) as max_price,
         MIN(price) as min_price,
         AVG(price) as avg_price
       FROM special_evaluations WHERE task_type = ?`
    ).get(taskType) as any;

    const allPrices = (this.db.prepare(
      `SELECT price FROM special_evaluations WHERE task_type = ? ORDER BY price ASC`
    ).all(taskType) as any[]).map((r) => Number(r.price));

    let medianPrice = 0;
    if (allPrices.length > 0) {
      const mid = Math.floor(allPrices.length / 2);
      medianPrice = allPrices.length % 2 === 0
        ? Math.round((allPrices[mid - 1] + allPrices[mid]) / 2)
        : allPrices[mid];
    }

    // 动态检索与过滤
    const conditions: string[] = ['se.task_type = ?'];
    const params: unknown[] = [taskType];

    if (input.minPrice !== undefined && !isNaN(input.minPrice)) {
      conditions.push('se.price >= ?');
      params.push(input.minPrice);
    }
    if (input.maxPrice !== undefined && !isNaN(input.maxPrice)) {
      conditions.push('se.price <= ?');
      params.push(input.maxPrice);
    }

    const whereClause = conditions.join(' AND ');
    const nicknameSubquery = `(SELECT nickname FROM dossiers WHERE user_id = se.user_id ORDER BY created_at DESC LIMIT 1)`;
    const searchTerm = input.search?.trim() || null;

    let total: number;
    let rows: any[];

    if (searchTerm) {
      // 自评文本加密存储，无法用 SQL LIKE 检索：拉取当前任务类型的全部记录，
      // 解密后按昵称/邮箱/自白关键词在内存中过滤，再分页。
      const allSql = `
        SELECT se.*, u.email, ${nicknameSubquery} as nickname
        FROM special_evaluations se
        LEFT JOIN users u ON se.user_id = u.id
        WHERE ${whereClause}
      `;
      const allRows = this.db.prepare(allSql).all(...params) as any[];
      const needle = searchTerm.toLowerCase();
      const matched = allRows.filter((row) => {
        const selfEvaluation = isFieldEncryptionEnabled()
          ? decryptField(row.self_evaluation, `${row.id}:self_eval`)
          : row.self_evaluation;
        const haystack = `${row.nickname ?? ''} ${row.email ?? ''} ${selfEvaluation ?? ''}`.toLowerCase();
        return haystack.includes(needle);
      });
      total = matched.length;
      rows = matched.slice(offset, offset + limit);
    } else {
      // 查询总数
      const countSql = `
        SELECT COUNT(*) as c
        FROM special_evaluations se
        LEFT JOIN users u ON se.user_id = u.id
        WHERE ${whereClause}
      `;
      const countRow = this.db.prepare(countSql).get(...params) as { c: number } | undefined;
      total = countRow?.c ?? 0;

      // 查询列表
      const listSql = `
        SELECT se.*, u.email, ${nicknameSubquery} as nickname
        FROM special_evaluations se
        LEFT JOIN users u ON se.user_id = u.id
        WHERE ${whereClause}
        ORDER BY ${sortField} ${sortOrder}
        LIMIT ? OFFSET ?
      `;
      rows = this.db.prepare(listSql).all(...params, limit, offset) as any[];
    }

    // 解密与计算排名
    const items = rows.map((row) => {
      const decryptedText = isFieldEncryptionEnabled()
        ? decryptField(row.self_evaluation, `${row.id}:self_eval`)
        : row.self_evaluation;

      // 实时全网排位（严格大于当前定价的记录数 + 1）
      const higherCount = allPrices.filter((p) => p > Number(row.price)).length;

      return {
        id: row.id,
        userId: row.user_id,
        email: row.email || null,
        nickname: row.nickname || '神秘客',
        deviceId: row.device_id,
        taskType: row.task_type,
        price: Number(row.price),
        selfEvaluation: decryptedText,
        rank: higherCount + 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    return {
      total,
      items,
      stats: {
        totalParticipants: statsRow?.total_count ?? 0,
        highestPrice: Number(statsRow?.max_price ?? 0),
        lowestPrice: Number(statsRow?.min_price ?? 0),
        averagePrice: Math.round(Number(statsRow?.avg_price ?? 0)),
        medianPrice,
      },
    };
  }

  /** 获取身价天梯榜：近 7 天净赞数（赞 - 踩）前 10 名，以及当前访客排名与投票状态 */
  async getSpecialPriceLeaderboard(
    taskType: string,
    deviceId: string,
    userId?: string | null
  ): Promise<{
    top10: SpecialPriceLeaderboardItem[];
    myStatus: SpecialPriceMyStatus;
    userVotes: Record<string, 'up' | 'down'>;
  }> {
    // 1. 获取当前用户对所有评定的投票记录（登录态只认账号；设备仅匹配匿名遗留）
    const userVoteParams: unknown[] = userId ? [userId, deviceId] : [deviceId];
    const userVoteSql = userId
      ? `SELECT evaluation_id, vote_type FROM special_evaluation_votes WHERE (user_id = ? OR (user_id IS NULL AND device_id = ?))`
      : `SELECT evaluation_id, vote_type FROM special_evaluation_votes WHERE (user_id IS NULL AND device_id = ?)`;
    const voteRows = this.db.prepare(userVoteSql).all(...userVoteParams) as Array<{ evaluation_id: string; vote_type: string }>;
    const userVotes: Record<string, 'up' | 'down'> = {};
    for (const vr of voteRows) {
      if (vr.vote_type === 'up' || vr.vote_type === 'down') {
        userVotes[vr.evaluation_id] = vr.vote_type;
      }
    }

    // 2. 查询所有自评记录并统计 7 天内投票数
    const listSql = `
      SELECT
        se.id,
        se.user_id,
        se.device_id,
        se.price,
        se.self_evaluation,
        se.created_at,
        se.updated_at,
        (
          SELECT nickname FROM dossiers
          WHERE (user_id = se.user_id AND se.user_id IS NOT NULL)
          ORDER BY created_at DESC LIMIT 1
        ) as user_nickname,
        (
          SELECT nickname FROM user_profiles
          WHERE user_id = se.user_id AND se.user_id IS NOT NULL
          LIMIT 1
        ) as profile_nickname,
        COUNT(CASE WHEN v.vote_type = 'up' AND v.created_at >= datetime('now', '-7 days') THEN 1 END) as upvotes,
        COUNT(CASE WHEN v.vote_type = 'down' AND v.created_at >= datetime('now', '-7 days') THEN 1 END) as downvotes
      FROM special_evaluations se
      LEFT JOIN special_evaluation_votes v ON se.id = v.evaluation_id
      WHERE se.task_type = ?
      GROUP BY se.id
    `;

    const allRows = this.db.prepare(listSql).all(taskType) as any[];

    // 3. 解密文本并计算净分
    const mapped = allRows.map((row) => {
      const decryptedText = isFieldEncryptionEnabled()
        ? decryptField(row.self_evaluation, `${row.id}:self_eval`)
        : row.self_evaluation;
      const up = Number(row.upvotes || 0);
      const down = Number(row.downvotes || 0);
      const net = up - down;
      const nickname = row.user_nickname || row.profile_nickname || '神秘自白者';

      return {
        id: String(row.id),
        userId: row.user_id ? String(row.user_id) : null,
        deviceId: String(row.device_id),
        nickname,
        price: Number(row.price || 0),
        selfEvaluation: decryptedText || '',
        upvotes: up,
        downvotes: down,
        netScore: net,
        createdAt: String(row.created_at),
        userVote: userVotes[String(row.id)] ?? null,
      };
    });

    // 4. 按 7 天净获赞从高到低排序（净分相同时按身价从高到低，再按创建时间从新到旧）
    mapped.sort((a, b) => {
      if (b.netScore !== a.netScore) return b.netScore - a.netScore;
      if (b.price !== a.price) return b.price - a.price;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // 5. 分配排名 (1-indexed)
    const rankedList = mapped.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    const top10 = rankedList.slice(0, 10).map((r) => ({
      id: r.id,
      nickname: r.nickname,
      price: r.price,
      selfEvaluation: r.selfEvaluation,
      upvotes: r.upvotes,
      downvotes: r.downvotes,
      netScore: r.netScore,
      rank: r.rank,
      createdAt: r.createdAt,
      userVote: r.userVote,
    }));

    // 6. 查找本人的排位与状态：登录态只认账号；匿名访客只认未绑定账号的记录。
    const myRecord = userId
      ? rankedList.find((r) => r.userId === userId)
      : rankedList.find((r) => !r.userId && r.deviceId === deviceId);

    const myStatus = {
      id: myRecord ? myRecord.id : null,
      rank: myRecord ? myRecord.rank : null,
      price: myRecord ? myRecord.price : null,
      selfEvaluation: myRecord ? myRecord.selfEvaluation : null,
      upvotes: myRecord ? myRecord.upvotes : 0,
      downvotes: myRecord ? myRecord.downvotes : 0,
      netScore: myRecord ? myRecord.netScore : 0,
      totalParticipants: rankedList.length,
      hasSubmitted: !!myRecord,
      userVote: myRecord ? myRecord.userVote : null,
    };

    return {
      top10,
      myStatus,
      userVotes,
    };
  }

  /** 点赞或点踩身价自评（支持切换与取消） */
  async voteSpecialEvaluation(
    evaluationId: string,
    deviceId: string,
    userId: string | null,
    voteType: 'up' | 'down'
  ): Promise<
    | {
        ok: true;
        upvotes: number;
        downvotes: number;
        netScore: number;
        userVote: 'up' | 'down' | null;
      }
    | { ok: false; reason: 'not_found' | 'self_vote' }
  > {
    // 校验目标自评存在，且禁止给自己的自评投票（防止自刷榜单）
    const target = this.db
      .prepare(`SELECT id, device_id, user_id FROM special_evaluations WHERE id = ?`)
      .get(evaluationId) as { id: string; device_id: string; user_id: string | null } | undefined;
    if (!target) {
      return { ok: false, reason: 'not_found' };
    }
    if (target.device_id === deviceId || (userId && target.user_id === userId)) {
      return { ok: false, reason: 'self_vote' };
    }

    // 投票查重同样只认账号归属：登录态按 user_id，设备仅匹配匿名遗留；
    // 两者同时存在时优先返回账号自己的那一票。
    const existingSql = userId
      ? `SELECT * FROM special_evaluation_votes
         WHERE evaluation_id = ? AND (user_id = ? OR (user_id IS NULL AND device_id = ?))
         ORDER BY (user_id IS NULL) ASC, created_at ASC LIMIT 1`
      : `SELECT * FROM special_evaluation_votes
         WHERE evaluation_id = ? AND (user_id IS NULL AND device_id = ?)
         ORDER BY created_at ASC LIMIT 1`;
    const existing = this.db
      .prepare(existingSql)
      .get(...(userId ? [evaluationId, userId, deviceId] : [evaluationId, deviceId])) as { id: string; vote_type: string } | undefined;

    let finalUserVote: 'up' | 'down' | null = null;
    const now = new Date().toISOString();

    if (existing) {
      if (existing.vote_type === voteType) {
        // 再次点击同类型：取消投票
        this.db.prepare(`DELETE FROM special_evaluation_votes WHERE id = ?`).run(existing.id);
        finalUserVote = null;
      } else {
        // 点击不同类型：切换投票
        this.db
          .prepare(`UPDATE special_evaluation_votes SET vote_type = ?, user_id = COALESCE(?, user_id), created_at = ? WHERE id = ?`)
          .run(voteType, userId, now, existing.id);
        finalUserVote = voteType;
      }
    } else {
      // 首次投票
      const voteId = genId('spv');
      this.db
        .prepare(
          `INSERT INTO special_evaluation_votes (id, evaluation_id, device_id, user_id, vote_type, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(voteId, evaluationId, deviceId, userId, voteType, now);
      finalUserVote = voteType;
    }

    // 重新统计 7 天内赞踩数
    const countsRow = this.db
      .prepare(
        `SELECT
           COUNT(CASE WHEN vote_type = 'up' AND created_at >= datetime('now', '-7 days') THEN 1 END) as upvotes,
           COUNT(CASE WHEN vote_type = 'down' AND created_at >= datetime('now', '-7 days') THEN 1 END) as downvotes
         FROM special_evaluation_votes
         WHERE evaluation_id = ?`
      )
      .get(evaluationId) as { upvotes: number; downvotes: number } | undefined;

    const upvotes = Number(countsRow?.upvotes || 0);
    const downvotes = Number(countsRow?.downvotes || 0);

    return {
      ok: true,
      upvotes,
      downvotes,
      netScore: upvotes - downvotes,
      userVote: finalUserVote,
    };
  }
}
