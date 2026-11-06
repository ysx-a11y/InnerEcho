import type Database from 'better-sqlite3';
import type {
  AdminOverview,
  AdminTelemetry,
  AdminDossierSummary,
} from '../../types.js';
import type { GlobalStatsContract, AdminTimeRange } from '../../../shared/apiContracts.js';
import { classifyReferrer } from '../../utils/referrer.js';
import { CODE_TO_CITY_NAME } from '../../utils/regionCodes.js';
import { OVERSEAS_REGION_CODE } from '../../utils/ipRegion.js';

export const UNKNOWN_REGION_CODE = 'UNKNOWN';
const MAX_REGION_ROWS = 8;

/**
 * 把地区分组结果整理成管理端卡片数据。
 *
 * 关键点：中国城市之外的访问（海外/代理出口、内网、解析失败）必须显式占一行，
 * 否则卡片合计会小于同期访问量、百分比也按缩水后的分母算，看起来就像统计坏了。
 * 尾部超出展示条数的地区并成「其他地区」，保证列表合计始终等于访问量。
 */
export function buildRegionDistribution(
  rows: { region_code: string; c: number }[],
  totalVisits: number
): { code: string; city: string; count: number }[] {
  const byCode = new Map<string, { code: string; city: string; count: number }>();
  for (const row of rows) {
    const code = row.region_code;
    const city = code === OVERSEAS_REGION_CODE ? '海外 / 代理' : (CODE_TO_CITY_NAME[code] ?? code);
    const existing = byCode.get(code);
    if (existing) existing.count += row.c;
    else byCode.set(code, { code, city, count: row.c });
  }

  const buckets = [...byCode.values()];
  const locatedCount = buckets.reduce((sum, item) => sum + item.count, 0);
  const unlocatedCount = Math.max(0, totalVisits - locatedCount);
  if (unlocatedCount > 0) {
    buckets.push({ code: UNKNOWN_REGION_CODE, city: '未识别地区', count: unlocatedCount });
  }

  buckets.sort((a, b) => b.count - a.count);
  if (buckets.length <= MAX_REGION_ROWS) return buckets;
  const head = buckets.slice(0, MAX_REGION_ROWS - 1);
  const tail = buckets.slice(MAX_REGION_ROWS - 1);
  head.push({
    code: 'OTHER',
    city: '其他地区',
    count: tail.reduce((sum, item) => sum + item.count, 0),
  });
  return head;
}
import { STATIC_TASKS } from '../../../shared/tasks.js';
import { genId, safeJsonParse, fuzzCount } from '../helpers.js';

/**
 * 根据管理端时段筛选模式（今日/昨日/本周/本月/本季/本年/指定日期）计算起始与截止日期（北京时间口径 YYYY-MM-DD）。
 */
export function resolveDateRange(
  range: AdminTimeRange = 'today',
  customDate?: string,
  nowTimestamp: number = Date.now()
): { start: string; end: string } {
  const beijingNow = new Date(nowTimestamp + 8 * 3600 * 1000);
  const today = beijingNow.toISOString().slice(0, 10);
  let start = today;
  let end = today;

  if (range === 'yesterday') {
    const yesterday = new Date(nowTimestamp - 24 * 3600 * 1000 + 8 * 3600 * 1000).toISOString().slice(0, 10);
    start = yesterday;
    end = yesterday;
  } else if (range === 'week') {
    const dayOfWeek = beijingNow.getUTCDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const mondayDate = new Date(beijingNow.getTime() - diffToMonday * 24 * 3600 * 1000);
    start = mondayDate.toISOString().slice(0, 10);
    end = today;
  } else if (range === 'month') {
    start = `${today.slice(0, 8)}01`;
    end = today;
  } else if (range === 'quarter') {
    const year = beijingNow.getUTCFullYear();
    const month = beijingNow.getUTCMonth(); // 0..11
    const quarterStartMonth = Math.floor(month / 3) * 3 + 1; // 1, 4, 7, 10
    start = `${year}-${String(quarterStartMonth).padStart(2, '0')}-01`;
    end = today;
  } else if (range === 'year') {
    const year = beijingNow.getUTCFullYear();
    start = `${year}-01-01`;
    end = today;
  } else if (range === 'custom' && customDate) {
    start = customDate;
    end = customDate;
  }

  return { start, end };
}

interface AdminRecentRow {
  id: string;
  nickname: string | null;
  depth_rating: string | null;
  bank_ids: string | null;
  diagnostic_result_json: string;
  quiz_payload_json: string;
  created_at: string;
}

export class AnalyticsRepo {
  constructor(private db: Database.Database) {}

  private todayDateStr(): string {
    return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
  }

  async recordVisit(deviceId: string, path: string, referrer = '', regionCode = '', userAgent = '', secFetchSite = ''): Promise<void> {
    if (!deviceId) return;
    const now = new Date().toISOString();
    // 6 位行政区划代码只做防御性截断；OVERSEAS 这类哨兵值要原样保留，
    // 否则会被截成 OVERSE 而在地区卡片上显示成一个不存在的城市名。
    const storedRegionCode = regionCode === OVERSEAS_REGION_CODE
      ? regionCode
      : (regionCode || '').slice(0, 6);
    this.db
      .prepare(
        'INSERT INTO page_visits (id, device_id, path, referrer, region_code, user_agent, sec_fetch_site, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        genId('vis'),
        deviceId,
        (path || '/').slice(0, 200),
        (referrer || '').slice(0, 200),
        storedRegionCode,
        (userAgent || '').slice(0, 300),
        (secFetchSite || '').slice(0, 20),
        now
      );
  }

  /**
   * 记录轻量用户事件（如导出角色卡）。只存事件类型 + 设备标识 + 可选关联卷宗，
   * 不存任何敏感内容；无设备标识时静默忽略，与访问埋点口径一致。
   */
  async recordEvent(deviceId: string, eventType: string, dossierId = ''): Promise<void> {
    if (!deviceId) return;
    const now = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO user_events (id, device_id, event_type, dossier_id, created_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(
        genId('evt'),
        deviceId,
        (eventType || '').slice(0, 40),
        (dossierId || '').slice(0, 64),
        now
      );
  }

  async getVisitStats(): Promise<{ todayVisits: number; todayVisitors: number; totalVisits: number }> {
    const today = new Date().toISOString().slice(0, 10);
    const todayRow = this.db
      .prepare(
        `SELECT COUNT(*) as visits, COUNT(DISTINCT device_id) as visitors
         FROM page_visits WHERE substr(created_at, 1, 10) = ?`
      )
      .get(today) as { visits: number; visitors: number } | undefined;
    const totalRow = this.db
      .prepare('SELECT COUNT(*) as total FROM page_visits')
      .get() as { total: number } | undefined;

    return {
      todayVisits: todayRow?.visits ?? 0,
      todayVisitors: todayRow?.visitors ?? 0,
      totalVisits: totalRow?.total ?? 0,
    };
  }

  async getMetricsForPeriod(start: string, end: string): Promise<{
    visits: number;
    visitors: number;
    users: number;
    dossiers: number;
    uniquePeople: number;
  }> {
    const visits = (
      this.db
        .prepare(
          "SELECT COUNT(*) c FROM page_visits WHERE date(created_at, '+8 hours') >= ? AND date(created_at, '+8 hours') <= ?"
        )
        .get(start, end) as { c: number } | undefined
    )?.c ?? 0;

    const visitors = (
      this.db
        .prepare(
          "SELECT COUNT(DISTINCT device_id) c FROM page_visits WHERE date(created_at, '+8 hours') >= ? AND date(created_at, '+8 hours') <= ?"
        )
        .get(start, end) as { c: number } | undefined
    )?.c ?? 0;

    const users = (
      this.db
        .prepare(
          "SELECT COUNT(*) c FROM users WHERE date(created_at, '+8 hours') >= ? AND date(created_at, '+8 hours') <= ? AND deleted_at IS NULL"
        )
        .get(start, end) as { c: number } | undefined
    )?.c ?? 0;

    const dossiers = (
      this.db
        .prepare(
          "SELECT COUNT(*) c FROM dossiers WHERE date(created_at, '+8 hours') >= ? AND date(created_at, '+8 hours') <= ?"
        )
        .get(start, end) as { c: number } | undefined
    )?.c ?? 0;

    const uniquePeople = (
      this.db
        .prepare(
          "SELECT COUNT(DISTINCT coalesce(user_id, device_id)) c FROM dossiers WHERE date(created_at, '+8 hours') >= ? AND date(created_at, '+8 hours') <= ?"
        )
        .get(start, end) as { c: number } | undefined
    )?.c ?? 0;

    return { visits, visitors, users, dossiers, uniquePeople };
  }

  async getAdminOverview(
    range: AdminTimeRange = 'today',
    customDate?: string,
    resolveBankNamesFn?: (bankIds: string[]) => Promise<Record<string, string>>
  ): Promise<AdminOverview> {
    const today = this.todayDateStr();
    const { start, end } = resolveDateRange(range, customDate);

    const todayVisits = (this.db.prepare("SELECT COUNT(*) c FROM page_visits WHERE date(created_at, '+8 hours') = ?").get(today) as { c: number } | undefined)?.c ?? 0;
    const todayVisitors = (this.db.prepare("SELECT COUNT(DISTINCT device_id) c FROM page_visits WHERE date(created_at, '+8 hours') = ?").get(today) as { c: number } | undefined)?.c ?? 0;
    const todayUsers = (this.db.prepare("SELECT COUNT(*) c FROM users WHERE date(created_at, '+8 hours') = ? AND deleted_at IS NULL").get(today) as { c: number } | undefined)?.c ?? 0;
    const todayDossiers = (this.db.prepare("SELECT COUNT(*) c FROM dossiers WHERE date(created_at, '+8 hours') = ?").get(today) as { c: number } | undefined)?.c ?? 0;
    const totalVisits = (this.db.prepare('SELECT COUNT(*) c FROM page_visits').get() as { c: number } | undefined)?.c ?? 0;
    const totalUsers = (this.db.prepare('SELECT COUNT(*) c FROM users WHERE deleted_at IS NULL').get() as { c: number } | undefined)?.c ?? 0;
    const totalDossiers = (this.db.prepare('SELECT COUNT(*) c FROM dossiers').get() as { c: number } | undefined)?.c ?? 0;
    const totalBanks = (this.db.prepare('SELECT COUNT(*) c FROM user_banks').get() as { c: number } | undefined)?.c ?? 0;

    const days: AdminOverview['weekly'] = [];
    for (let i = 6; i >= 0; i--) {
      const t = new Date(Date.now() + 8 * 3600 * 1000);
      t.setUTCDate(t.getUTCDate() - i);
      const date = t.toISOString().slice(0, 10);
      days.push({
        date,
        label: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][t.getUTCDay()],
        pv: 0,
        submit: 0,
      });
    }

    const startDate = days[0]?.date || today;
    const weeklyVisits = this.db
      .prepare("SELECT date(created_at, '+8 hours') d, COUNT(*) c FROM page_visits WHERE date(created_at, '+8 hours') >= ? GROUP BY d")
      .all(startDate) as { d: string; c: number }[];
    const weeklyDossiers = this.db
      .prepare("SELECT date(created_at, '+8 hours') d, COUNT(*) c FROM dossiers WHERE date(created_at, '+8 hours') >= ? GROUP BY d")
      .all(startDate) as { d: string; c: number }[];

    const recentRows = this.db
      .prepare(
        `SELECT id, nickname, depth_rating, bank_ids, diagnostic_result_json, quiz_payload_json, created_at
         FROM dossiers ORDER BY created_at DESC LIMIT 5`
      )
      .all() as AdminRecentRow[];

    const selectedPeriod = await this.getMetricsForPeriod(start, end);
    const todayUniquePeople = (this.db.prepare("SELECT COUNT(DISTINCT coalesce(user_id, device_id)) c FROM dossiers WHERE date(created_at, '+8 hours') = ?").get(today) as { c: number } | undefined)?.c ?? 0;
    const totalUniquePeople = (this.db.prepare("SELECT COUNT(DISTINCT coalesce(user_id, device_id)) c FROM dossiers").get() as { c: number } | undefined)?.c ?? 0;

    const depthDistribution = this.db
      .prepare("SELECT depth_rating as rating, COUNT(*) count FROM dossiers WHERE date(created_at, '+8 hours') BETWEEN ? AND ? GROUP BY rating")
      .all(start, end) as { rating: string; count: number }[];

    const auditDistribution = this.db
      .prepare("SELECT coalesce(audit_status, 'pending') as status, COUNT(*) count FROM dossiers WHERE date(created_at, '+8 hours') BETWEEN ? AND ? GROUP BY status")
      .all(start, end) as { status: string; count: number }[];

    const occupationDistribution = this.db
      .prepare("SELECT occupation, COUNT(*) count FROM dossiers WHERE occupation IS NOT NULL AND occupation != '' AND date(created_at, '+8 hours') BETWEEN ? AND ? GROUP BY occupation ORDER BY count DESC LIMIT 7")
      .all(start, end) as { occupation: string; count: number }[];

    const ageDistribution = this.db
      .prepare(
        `SELECT
           CASE
             WHEN CAST(age AS INTEGER) BETWEEN 18 AND 25 THEN '18-25'
             WHEN CAST(age AS INTEGER) BETWEEN 26 AND 30 THEN '26-30'
             WHEN CAST(age AS INTEGER) BETWEEN 31 AND 40 THEN '31-40'
             WHEN CAST(age AS INTEGER) BETWEEN 41 AND 50 THEN '41-50'
             WHEN CAST(age AS INTEGER) > 50 THEN '50+'
             ELSE '未填/其他'
           END as age_group,
           COUNT(*) count
         FROM dossiers
         WHERE date(created_at, '+8 hours') BETWEEN ? AND ?
         GROUP BY age_group`
      )
      .all(start, end) as { age_group: string; count: number }[];

    const taskRows = this.db
      .prepare(
        `SELECT task_id, status, COUNT(*) c FROM user_tasks
         WHERE date(accepted_at, '+8 hours') BETWEEN ? AND ?
         GROUP BY task_id, status`
      )
      .all(start, end) as { task_id: string; status: string; c: number }[];

    const sourceRows = this.db
      .prepare(
        `SELECT referrer, COUNT(*) c FROM page_visits
         WHERE referrer IS NOT NULL AND referrer != ''
           AND date(created_at, '+8 hours') BETWEEN ? AND ?
         GROUP BY referrer ORDER BY c DESC`
      )
      .all(start, end) as { referrer: string; c: number }[];

    const regionRows = this.db
      .prepare(
        `SELECT region_code, COUNT(*) c FROM page_visits
         WHERE region_code IS NOT NULL AND region_code != ''
           AND date(created_at, '+8 hours') BETWEEN ? AND ?
         GROUP BY region_code ORDER BY c DESC`
      )
      .all(start, end) as { region_code: string; c: number }[];

    const eventRows = this.db
      .prepare(
        `SELECT event_type, COUNT(*) c, COUNT(DISTINCT device_id) devices
         FROM user_events
         WHERE date(created_at, '+8 hours') BETWEEN ? AND ?
         GROUP BY event_type ORDER BY c DESC`
      )
      .all(start, end) as { event_type: string; c: number; devices: number }[];

    const totalEventRows = this.db
      .prepare(
        `SELECT event_type, COUNT(*) c, COUNT(DISTINCT device_id) devices
         FROM user_events
         GROUP BY event_type ORDER BY c DESC`
      )
      .all() as { event_type: string; c: number; devices: number }[];

    const periodTasksCompleted = (
      this.db
        .prepare(
          `SELECT COUNT(*) c FROM user_tasks
           WHERE status = 'completed' AND completed_at IS NOT NULL
             AND date(completed_at, '+8 hours') BETWEEN ? AND ?`
        )
        .get(start, end) as { c: number } | undefined
    )?.c ?? 0;

    const totalTasksCompleted = (
      this.db.prepare("SELECT COUNT(*) c FROM user_tasks WHERE status = 'completed'").get() as { c: number } | undefined
    )?.c ?? 0;

    const pvMap = new Map(weeklyVisits.map((r) => [r.d, r.c]));
    const submitMap = new Map(weeklyDossiers.map((r) => [r.d, r.c]));
    for (const day of days) {
      day.pv = pvMap.get(day.date) ?? 0;
      day.submit = submitMap.get(day.date) ?? 0;
    }

    const recent: AdminDossierSummary[] = recentRows.map((r) => {
      const diag = safeJsonParse<Record<string, unknown>>(r.diagnostic_result_json, {});
      const quiz = safeJsonParse<Record<string, unknown>>(r.quiz_payload_json, {});
      return {
        id: r.id,
        nickname: r.nickname ?? '',
        depthRating: r.depth_rating ?? 'medium',
        bankIds: r.bank_ids ?? '',
        credibilityScore: Number(diag.credibilityScore ?? 0),
        credibilityLevel: String(diag.credibilityLevel ?? 'low'),
        durationSeconds: Number(quiz.totalDurationSeconds ?? 0),
        createdAt: r.created_at,
      };
    });

    const customTaskIds = taskRows.filter((tr) => !STATIC_TASKS.some((st) => st.id === tr.task_id)).map((tr) => tr.task_id);
    let customTasks: any[] = [];
    if (customTaskIds.length > 0) {
      const placeholders = customTaskIds.map(() => '?').join(',');
      customTasks = this.db
        .prepare(`SELECT id, category FROM custom_task_definitions WHERE id IN (${placeholders})`)
        .all(...customTaskIds) as any[];
    }

    const taskStatsMap: Record<string, { accepted: number; completed: number }> = {
      subconscious: { accepted: 0, completed: 0 },
      dream: { accepted: 0, completed: 0 },
      shadow: { accepted: 0, completed: 0 },
      persona: { accepted: 0, completed: 0 },
    };

    for (const row of taskRows) {
      let category = 'subconscious';
      const staticTask = STATIC_TASKS.find((t) => t.id === row.task_id);
      if (staticTask) {
        category = staticTask.category;
      } else {
        const customTask = customTasks.find((ct) => ct.id === row.task_id);
        if (customTask) {
          category = customTask.category;
        }
      }
      if (row.status === 'completed') {
        taskStatsMap[category].completed += row.c;
      } else {
        taskStatsMap[category].accepted += row.c;
      }
    }

    const taskStats = Object.entries(taskStatsMap).map(([category, counts]) => ({
      category,
      accepted: counts.accepted + counts.completed,
      completed: counts.completed,
    }));

    const sourceMap = new Map<string, number>();
    for (const row of sourceRows) {
      const source = classifyReferrer(row.referrer);
      sourceMap.set(source, (sourceMap.get(source) ?? 0) + row.c);
    }
    const referencedCount = [...sourceMap.values()].reduce((sum, c) => sum + c, 0);
    const directCount = Math.max(0, (selectedPeriod?.visits ?? 0) - referencedCount);
    if (directCount > 0) {
      sourceMap.set('直接访问 / 无来源', directCount);
    }
    const sourceDistribution = [...sourceMap.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const regionDistribution = buildRegionDistribution(regionRows, selectedPeriod?.visits ?? 0);

    const totalEventMap = new Map(totalEventRows.map((r) => [r.event_type, r]));
    const eventStats = eventRows.map((r) => ({
      eventType: r.event_type,
      count: r.c,
      devices: r.devices,
      totalCount: totalEventMap.get(r.event_type)?.c ?? 0,
      totalDevices: totalEventMap.get(r.event_type)?.devices ?? 0,
    }));

    const recentBankIds = recentRows.flatMap((r) =>
      (r.bank_ids ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    );
    const bankNames = resolveBankNamesFn ? await resolveBankNamesFn(recentBankIds) : {};

    return {
      today: { visits: todayVisits, visitors: todayVisitors, users: todayUsers, dossiers: todayDossiers, uniquePeople: todayUniquePeople },
      totals: { visits: totalVisits, users: totalUsers, dossiers: totalDossiers, banks: totalBanks, uniquePeople: totalUniquePeople },
      weekly: days,
      recent,
      selectedPeriod,
      depthDistribution,
      auditDistribution,
      occupationDistribution,
      ageDistribution: ageDistribution.map((ad) => ({ group: ad.age_group, count: ad.count })),
      taskStats,
      sourceDistribution,
      tasksCompleted: periodTasksCompleted,
      totalTasksCompleted,
      regionDistribution,
      eventStats,
      bankNames,
    };
  }

  async getAdminTelemetry(
    range: AdminTimeRange = 'today',
    customDate?: string,
    resolveBankNamesFn?: (bankIds: string[]) => Promise<Record<string, string>>
  ): Promise<AdminTelemetry> {
    const { start, end } = resolveDateRange(range, customDate);

    const bankRows = this.db
      .prepare(
        `SELECT bank_ids, COUNT(*) c,
           AVG(json_extract(quiz_payload_json, '$.totalDurationSeconds')) avg_dur,
           AVG(json_extract(telemetry_json, '$.hesitationPauses')) avg_hes,
           AVG(json_extract(telemetry_json, '$.deletionRatePercent')) avg_del,
           AVG(json_extract(telemetry_json, '$.flipFlopCount')) avg_ff
         FROM dossiers
         WHERE date(created_at, '+8 hours') BETWEEN ? AND ?
         GROUP BY bank_ids ORDER BY c DESC`
      )
      .all(start, end) as {
        bank_ids: string;
        c: number;
        avg_dur: number | null;
        avg_hes: number | null;
        avg_del: number | null;
        avg_ff: number | null;
      }[];

    const questionRows = this.db
      .prepare(
        `SELECT json_extract(q.value, '$.bankId') bank_id,
                json_extract(q.value, '$.questionId') question_id,
                COUNT(*) attempts,
                AVG(json_extract(q.value, '$.durationMs')) avg_ms,
                AVG(json_extract(q.value, '$.interactionCount')) avg_int
         FROM dossiers, json_each(dossiers.quiz_payload_json, '$.questionLogs') q
         WHERE dossiers.quiz_payload_json IS NOT NULL
           AND json_valid(dossiers.quiz_payload_json)
           AND date(dossiers.created_at, '+8 hours') BETWEEN ? AND ?
         GROUP BY bank_id, question_id
         ORDER BY avg_ms DESC
         LIMIT 20`
      )
      .all(start, end) as {
        bank_id: string;
        question_id: string;
        attempts: number;
        avg_ms: number | null;
        avg_int: number | null;
      }[];

    const hourRows = this.db
      .prepare(
        `SELECT CAST(strftime('%H', created_at, '+8 hours') AS INTEGER) h, COUNT(*) c
         FROM dossiers
         WHERE date(created_at, '+8 hours') BETWEEN ? AND ?
         GROUP BY h`
      )
      .all(start, end) as { h: number; c: number }[];

    const banks = bankRows.map((b) => ({
      bankId: b.bank_ids ?? '',
      count: b.c,
      avgDurationSeconds: Math.round(b.avg_dur ?? 0),
      avgHesitateIndex: Math.round(b.avg_hes ?? 0),
      avgBackspaceRate: Math.round(b.avg_del ?? 0),
      avgFlipFlop: Math.round(b.avg_ff ?? 0),
    }));

    const topQuestions = questionRows.map((q) => ({
      bankId: q.bank_id ?? '',
      questionId: q.question_id ?? '',
      attempts: q.attempts,
      avgDurationMs: Math.round(q.avg_ms ?? 0),
      avgInteractions: Math.round(q.avg_int ?? 0),
    }));

    const total = hourRows.reduce((sum, r) => sum + r.c, 0) || 1;
    const ranges = [
      { range: '00:00 - 04:00', hours: [0, 1, 2, 3] },
      { range: '04:00 - 08:00', hours: [4, 5, 6, 7] },
      { range: '08:00 - 12:00', hours: [8, 9, 10, 11] },
      { range: '12:00 - 18:00', hours: [12, 13, 14, 15, 16, 17] },
      { range: '18:00 - 24:00', hours: [18, 19, 20, 21, 22, 23] },
    ];
    const timeDistribution = ranges.map((r) => {
      const c = hourRows.filter((h) => r.hours.includes(h.h)).reduce((sum, h) => sum + h.c, 0);
      return { range: r.range, rate: Math.round((c / total) * 100) };
    });

    const referencedBankIds = [
      ...bankRows.flatMap((b) => (b.bank_ids ?? '').split(',').map((s) => s.trim()).filter(Boolean)),
      ...questionRows.map((q) => q.bank_id ?? ''),
    ];
    const bankNames = resolveBankNamesFn ? await resolveBankNamesFn(referencedBankIds) : {};

    return { banks, topQuestions, timeDistribution, bankNames };
  }

  async getGlobalPublicStats(): Promise<GlobalStatsContract> {
    const totalDossiersCount = (this.db.prepare('SELECT COUNT(*) as c FROM dossiers').get() as { c: number } | undefined)?.c ?? 0;
    const totalExplorersCount = (this.db.prepare('SELECT COUNT(DISTINCT coalesce(user_id, device_id)) as c FROM dossiers').get() as { c: number } | undefined)?.c ?? 0;
    const depthRows = this.db.prepare('SELECT depth_rating as rating, COUNT(*) as count FROM dossiers GROUP BY depth_rating').all() as { rating: string; count: number }[];
    const shadowTagRows = this.db.prepare("SELECT id, selected_shadow_tags as tags FROM dossiers WHERE selected_shadow_tags IS NOT NULL AND selected_shadow_tags != ''").all() as { id: string; tags: string }[];

    const fuzzedDossierCount = fuzzCount(totalDossiersCount);
    const fuzzedExplorerCount = fuzzCount(totalExplorersCount);

    let lightCount = 0;
    let mediumCount = 0;
    let deepCount = 0;
    for (const row of depthRows) {
      if (row.rating === 'light') lightCount += row.count;
      else if (row.rating === 'deep') deepCount += row.count;
      else mediumCount += row.count;
    }
    const totalRated = lightCount + mediumCount + deepCount;
    const depthDistribution = totalRated > 0
      ? {
          deep: Math.round((deepCount / totalRated) * 100),
          medium: Math.round((mediumCount / totalRated) * 100),
          light: Math.max(0, 100 - Math.round((deepCount / totalRated) * 100) - Math.round((mediumCount / totalRated) * 100)),
        }
      : {
          deep: 54,
          medium: 32,
          light: 14,
        };

    const tagFrequency: Record<string, number> = {};
    let totalTagsCount = 0;
    for (const row of shadowTagRows) {
      const tags = safeJsonParse<string[]>(row.tags, []);
      for (const tag of tags) {
        if (typeof tag === 'string' && tag.trim().length > 0) {
          const t = tag.trim();
          tagFrequency[t] = (tagFrequency[t] || 0) + 1;
          totalTagsCount += 1;
        }
      }
    }

    const DEFAULT_TAG_WEIGHTS: Record<string, number> = {
      '绝对臣服': 38,
      '支配渴求': 26,
      '安全束缚': 18,
      '角色互换': 11,
      '反差情绪': 7,
      '心理补偿': 15,
      '镜像窥探': 14,
      '仪式契约': 12,
    };

    const sourceEntries = totalTagsCount >= 10 && Object.keys(tagFrequency).length >= 3
      ? Object.entries(tagFrequency).map(([tag, count]) => ({
          tag,
          percentage: Math.round((count / totalTagsCount) * 100),
        }))
      : Object.entries(DEFAULT_TAG_WEIGHTS).map(([tag, weight]) => ({
          tag,
          percentage: weight,
        }));

    const topShadowTendencies = sourceEntries
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 8);

    const occupationInsights = [
      {
        occupationGroup: '教育 / 学术领域',
        topTrait: '在严谨秩序背后，渴望温和依赖与边界释放',
        contrastPercentage: 82,
      },
      {
        occupationGroup: '医护 / 心理咨询',
        topTrait: '在高频情绪劳动下，渴望彻底卸载防备与信任托付',
        contrastPercentage: 79,
      },
      {
        occupationGroup: '金融 / 法律 / 商务',
        topTrait: '在理性精密决策外，渴望放下主导掌控体验失控',
        contrastPercentage: 75,
      },
      {
        occupationGroup: '科技 / 研发工程',
        topTrait: '在结构化逻辑世界中，探索非理性直觉与感官张力',
        contrastPercentage: 71,
      },
      {
        occupationGroup: '艺术 / 创意传媒',
        topTrait: '在丰富感知力下，追逐极致反差与仪式沉浸',
        contrastPercentage: 86,
      },
      {
        occupationGroup: '自由探索 / 独立创造',
        topTrait: '追求纯粹真实自我，渴望在安全场域完成暗面觉醒',
        contrastPercentage: 77,
      },
    ];

    const dimensionAverages = {
      dominance: 52,
      submission: 67,
      restraint: 61,
      sensory: 74,
    };

    const archetypeDistribution = [
      { archetype: '双重奏弥散者 (平衡倒错)', percentage: 45 },
      { archetype: '暗夜破局者 (高阶觉醒)', percentage: 33 },
      { archetype: '暗光萌芽者 (潜意识觉知)', percentage: 22 },
    ];

    return {
      fuzzedDossierCount,
      fuzzedExplorerCount,
      depthDistribution,
      averageDisparityScore: 74,
      topShadowTendencies,
      dimensionAverages,
      occupationInsights,
      archetypeDistribution,
    };
  }

  async logApiError(input: {
    endpoint: string;
    errorMessage: string;
    stackTrace: string;
    payload: string;
    deviceId?: string | null;
    userId?: string | null;
    ipAddress?: string | null;
  }): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO api_error_logs (id, endpoint, error_message, stack_trace, payload_json, device_id, user_id, ip_address, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        genId('err'),
        input.endpoint,
        input.errorMessage,
        input.stackTrace,
        input.payload,
        input.deviceId ?? null,
        input.userId ?? null,
        input.ipAddress ?? null,
        new Date().toISOString()
      );
  }

  async getErrorLogs(limit = 100): Promise<unknown[]> {
    return this.db
      .prepare('SELECT * FROM api_error_logs ORDER BY created_at DESC LIMIT ?')
      .all(limit);
  }
}
