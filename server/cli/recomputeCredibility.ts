/**
 * 存量卷宗可信度重算（不调用 LLM）
 *
 * 只重新计算 credibilityScore / credibilityLevel / credibilityReasons，
 * 报告正文与其余诊断字段原样保留，因此不消耗任何 LLM 额度。
 *
 * 用法：
 *   本地（tsx，直接读源码）
 *     npm run recompute:credibility                      # 预演：只统计，不写库
 *     npm run recompute:credibility -- --apply           # 实际写回（先自动做数据库快照）
 *     npm run recompute:credibility -- --apply --verbose # 附带逐条明细
 *
 *   服务器（构建产物，线上库需要 FIELD_ENC_KEY，务必在应用目录下执行）
 *     cd /var/www/innerecho
 *     node dist-server/server/cli/recomputeCredibility.js            # 预演
 *     node dist-server/server/cli/recomputeCredibility.js --apply    # 写回
 *
 * 说明：
 * - 缺少作答轨迹（questionLogs 为空）的老卷宗一律跳过并保持原值，
 *   它们产生于银行题库流程上线之前，拿不到过程证据。
 * - 新旧算法口径不同，分数会变化：旧卷宗的单题停留时长曾被采集端重复累加，
 *   新算法会因此标记「时间口径自相矛盾」并适度扣分，属预期行为，先看预演再决定。
 */
import path from 'node:path';
import { getRawDatabase } from '../db/connection.js';
import { recomputeDossierCredibility } from '../services/credibilityBackfill.js';

interface Flags {
  apply: boolean;
  verbose: boolean;
}

function parseFlags(argv: string[]): Flags {
  return {
    apply: argv.includes('--apply'),
    verbose: argv.includes('--verbose'),
  };
}

/** 当前连接实际使用的数据库文件（:memory: 时返回空串）。 */
function resolveDatabaseFile(): string {
  const rows = getRawDatabase().prepare('PRAGMA database_list').all() as
    { name?: string; file?: string }[];
  return rows.find((row) => row.name === 'main')?.file ?? '';
}

/**
 * 用 SQLite 自己的 VACUUM INTO 做一致性快照：比直接复制文件安全，
 * 不会因为 WAL 里还有未合并的页而拿到半个数据库。
 */
function backupDatabase(databaseFile: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.resolve(`${databaseFile}.backup-${stamp}`);
  getRawDatabase().exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  return target;
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const databaseFile = resolveDatabaseFile();

  console.log('InnerEcho 存量卷宗可信度重算（不调用 LLM）');
  console.log(`数据库文件：${databaseFile || ':memory:'}`);
  console.log(`运行模式：${flags.apply ? '实际写回（--apply）' : '预演，不写库（加 --apply 才写回）'}`);

  if (flags.apply) {
    if (!databaseFile) {
      throw new Error('无法确定数据库文件路径，拒绝写入');
    }
    const backupPath = backupDatabase(databaseFile);
    console.log(`已创建数据库快照：${backupPath}`);
  }

  const summary = await recomputeDossierCredibility({ apply: flags.apply });

  console.log('\n【总体】');
  console.log(`卷宗总数：${summary.total}`);
  console.log(`可重算（含作答轨迹）：${summary.evaluated}`);
  console.log(`跳过（无作答轨迹，保持原值）：${summary.skippedNoTrace}`);
  console.log(`分数/等级有变化：${summary.changed}`);
  console.log(`与旧分完全一致：${summary.unchanged}`);
  if (flags.apply) console.log(`已写回：${summary.updated}`);

  console.log('\n【等级变化】');
  const transitions = Object.entries(summary.levelTransitions).sort((a, b) => b[1] - a[1]);
  for (const [transition, count] of transitions) {
    console.log(`  ${transition.padEnd(20, ' ')} ${count}`);
  }

  console.log('\n【判定依据命中】');
  const reasons = Object.entries(summary.reasonCounts).sort((a, b) => b[1] - a[1]);
  for (const [reason, count] of reasons) {
    console.log(`  ${reason.padEnd(20, ' ')} ${count}`);
  }

  if (summary.changes.length > 0) {
    console.log(`\n【分数变化最大的 ${Math.min(10, summary.changes.length)} 条】`);
    for (const change of summary.changes.slice(0, 10)) {
      const before = change.previousScore === null ? '??' : String(change.previousScore);
      const delta = change.scoreDelta === null
        ? ''
        : ` (${change.scoreDelta > 0 ? '+' : ''}${change.scoreDelta})`;
      console.log(
        `  ${before} → ${change.score}${delta}  ${change.id}  ${change.submittedAt}`
        + `${flags.verbose ? `  ${change.nickname}` : ''}`
      );
      if (flags.verbose) {
        for (const reason of change.reasons) console.log(`        ・${reason}`);
      }
    }
    console.log('\n（管理端列表搜索框支持按卷宗 ID 检索，可直接定位上述行）');
  }

  if (!flags.apply) {
    console.log('\n提示：以上为预演结果，数据库未被修改。确认无误后加 --apply 重跑。');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`重算失败：${message}`);
    if (message.includes('FIELD_ENC_KEY')) {
      console.error(
        '该数据库是加密库：需要在配置了 FIELD_ENC_KEY 的环境里运行（通常是应用目录下的服务器），'
        + '否则读不出作答轨迹。'
      );
    }
    process.exit(1);
  });
