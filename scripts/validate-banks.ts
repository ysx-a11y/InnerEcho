import fs from 'node:fs';
import path from 'node:path';

/**
 * 题库内容校验（构建期 / 测试前跑）。
 *
 * 进来的是 content/banks/*.json —— 题库正文不在 git 里，所以内容级约束
 * （题数、维度、安全基线选项等）不能再写成针对某个题库的单元测试，
 * 统一放在 content/banks/_expectations.json 里由本脚本断言。
 */

interface Option {
  id: string;
  text?: string;
  scores?: Record<string, number>;
}

interface Question {
  id: string;
  bankId?: string;
  type: string;
  options?: Option[];
  mediaConfig?: { allowedTypes?: string[]; maxFileCount?: number };
}

interface Dimension {
  key: string;
  label?: string;
  description?: string;
}

interface BankFields {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  category: string;
  badge?: string;
  badgeColor?: string;
  estimatedMinutes?: number;
  dimensions?: Dimension[];
  questions: Question[];
}

interface ContentBank {
  id: string;
  card: Partial<BankFields> | null;
  bank: BankFields;
  listedInSelector: boolean;
  displayRank?: number;
  isPublished?: boolean;
}

interface DisplayRule {
  id: string;
  rank: number;
  titleSignatures?: string[];
}

interface OptionAExpectation {
  spousal_contempt?: number;
  moral_outrage?: { min?: number; max?: number };
}

interface BankExpectation {
  questionCount?: number;
  category?: string;
  dimensionCount?: number;
  dimensionKeys?: string[];
  openTextCount?: number;
  singleChoiceCount?: number;
  openTextIds?: string[];
  baselineOptionAZero?: boolean;
  baselineOptionA?: OptionAExpectation;
  coverDimensionsWithPositiveScore?: boolean;
  media?: Record<string, { allowedTypes?: string[]; maxFileCount?: number }>;
  optionAZeroAt?: { questionId: string; dimension: string }[];
}

const CONTENT_DIR = path.resolve('content');
const BANKS_DIR = path.join(CONTENT_DIR, 'banks');
const RULES_FILE = path.join(CONTENT_DIR, 'display-rules.json');
const EXPECTATIONS_FILE = path.join(BANKS_DIR, '_expectations.json');

const errors: string[] = [];

function fail(message: string) {
  errors.push(message);
}

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function main() {
  if (!fs.existsSync(BANKS_DIR)) {
    console.error(`找不到题库内容目录 ${BANKS_DIR}（见 content/README.md）。`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(BANKS_DIR)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .sort();

  if (files.length === 0) {
    console.error(`${BANKS_DIR} 是空的，校验中止。`);
    process.exit(1);
  }

  const rules: DisplayRule[] = fs.existsSync(RULES_FILE) ? (readJson(RULES_FILE) as DisplayRule[]) : [];
  const expectations: Record<string, BankExpectation> = fs.existsSync(EXPECTATIONS_FILE)
    ? (readJson(EXPECTATIONS_FILE) as Record<string, BankExpectation>)
    : {};

  const banks: ContentBank[] = [];
  for (const file of files) {
    let parsed: ContentBank;
    try {
      parsed = readJson(path.join(BANKS_DIR, file)) as ContentBank;
    } catch (err) {
      fail(`${file} 不是合法 JSON：${(err as Error).message}`);
      continue;
    }
    banks.push(parsed);
    checkBank(parsed, file, rules);
  }

  const ids = new Set<string>();
  for (const b of banks) {
    if (ids.has(b.id)) fail(`题库 id 重复：${b.id}`);
    ids.add(b.id);
  }

  for (const [id, exp] of Object.entries(expectations)) {
    const bank = banks.find((b) => b.id === id);
    if (!bank) {
      fail(`_expectations.json 里的 ${id} 没有对应题库文件`);
      continue;
    }
    checkExpectation(bank, exp, `_expectations.json[${id}]`);
  }

  if (errors.length > 0) {
    console.error(`题库校验失败，共 ${errors.length} 项：`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }

  console.log(`题库校验通过：${banks.length} 个题库。`);
  for (const b of banks) {
    const q = b.bank.questions.length;
    const d = b.bank.dimensions?.length ?? 0;
    console.log(
      `  ✓ ${String(b.id).padEnd(24)} ${String(q).padStart(3)} 题 / ${d} 维 / ${b.bank.category}${b.listedInSelector ? '' : '（不在选择器展示）'}`,
    );
  }
}

function checkBank(bank: ContentBank, file: string, rules: DisplayRule[]) {
  const stem = file.replace(/\.json$/, '');
  const where = `${file}`;

  if (!bank.bank) {
    fail(`${where} 缺少 bank 字段`);
    return;
  }
  // 顶层 id 是唯一权威；bank 里通常不重复存 id（生成器会补上）。
  const bankId = bank.id;
  if (!bankId) fail(`${where} 缺少顶层 id`);
  if (bankId !== stem) fail(`${where} 的 id (${bankId}) 与文件名不一致`);
  if (bank.bank.id !== undefined && bank.bank.id !== bankId) {
    fail(`${where} 的 bank.id (${bank.bank.id}) 与顶层 id (${bankId}) 不一致`);
  }

  for (const key of ['title', 'subtitle', 'description', 'category'] as const) {
    const v = bank.bank[key];
    if (typeof v !== 'string' || v.trim() === '') fail(`${where} 的 ${key} 为空`);
  }
  for (const key of ['title', 'subtitle', 'description', 'category'] as const) {
    if (bank.card && typeof bank.card[key] === 'string' && bank.card[key] !== bank.bank[key]) {
      // card 是本应用的展示文案，允许与题库本体不同（standard_bdsm_50 就是如此），仅提示。
      console.log(`  · ${where} card.${key} 与 bank.${key} 不同（展示文案覆盖）`);
    }
  }

  if (!Array.isArray(bank.bank.questions) || bank.bank.questions.length === 0) {
    fail(`${where} 没有题目`);
    return;
  }

  const dimensionKeys = new Set((bank.bank.dimensions ?? []).map((d) => d.key));
  if ((bank.bank.dimensions ?? []).length !== dimensionKeys.size) fail(`${where} 的维度 key 有重复`);
  for (const dim of bank.bank.dimensions ?? []) {
    if (typeof dim.description !== 'string' || dim.description.trim() === '') {
      fail(`${where} 维度 ${dim.key} 缺少 description（图表侧会用到）`);
    }
    // 旧题库（standard_bdsm_50）的 key 是 camelCase 且已写进历史报告，只提示不拦截。
    if (!/^[a-z][a-z0-9_]*$/.test(dim.key)) {
      console.log(`  · ${where} 维度 key ${dim.key} 不是 snake_case（历史 key，勿改名）`);
    }
  }

  const questionIds = new Set<string>();
  for (const q of bank.bank.questions) {
    if (typeof q.id !== 'string' || q.id.trim() === '') {
      fail(`${where} 有题目缺少 id`);
      continue;
    }
    if (questionIds.has(q.id)) fail(`${where} 题目 id 重复：${q.id}`);
    questionIds.add(q.id);
    if (q.bankId && q.bankId !== bankId) fail(`${where} 题目 ${q.id} 的 bankId 是 ${q.bankId}`);
    if (typeof q.isRequired !== 'boolean') fail(`${where} 题目 ${q.id} 缺少 isRequired（应显式 true/false）`);

    if (q.type === 'single_choice' || q.type === 'multiple_choice') {
      const options = q.options ?? [];
      if (options.length < 2) fail(`${where} 题目 ${q.id} 的选择项少于 2 个`);
      const optionIds = new Set<string>();
      for (const o of options) {
        if (optionIds.has(o.id)) fail(`${where} 题目 ${q.id} 的选项 id 重复：${o.id}`);
        optionIds.add(o.id);
        for (const [key, val] of Object.entries(o.scores ?? {})) {
          if (dimensionKeys.size > 0 && !dimensionKeys.has(key)) {
            console.log(`  · ${where} 题目 ${q.id} 的分数字段 ${key} 不在声明的维度里`);
          }
          if (typeof val !== 'number' || !Number.isFinite(val)) {
            fail(`${where} 题目 ${q.id} 选项 ${o.id} 的 ${key} 分数不是有限数字`);
          }
        }
      }
    } else if (q.type === 'open_text') {
      if ((q.options ?? []).length > 0) fail(`${where} 自白题 ${q.id} 不应带选项`);
    } else if (q.type === 'media_upload') {
      if (!q.mediaConfig) fail(`${where} 媒体题 ${q.id} 缺少 mediaConfig`);
    }
  }

  if (bank.listedInSelector) {
    if (!bank.card) fail(`${where} 在选择器展示但缺少 card 文案`);
    else if (!Array.isArray(bank.card.dimensions) || bank.card.dimensions.length === 0) {
      fail(`${where} 在选择器展示但 card.dimensions 为空`);
    }
  }

  for (const field of ['createdAt', 'updatedAt'] as const) {
    const value = bank[field];
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
      fail(`${where} 的 ${field} 不是合法时间`);
    }
  }
  if (typeof bank.createdAt === 'string' && typeof bank.updatedAt === 'string') {
    if (Date.parse(bank.updatedAt) < Date.parse(bank.createdAt)) {
      fail(`${where} 的 updatedAt 早于 createdAt`);
    }
  }

  const rule = rules.find((r) => r.id === bankId);
  if (rule && typeof bank.displayRank === 'number' && rule.rank !== bank.displayRank) {
    fail(`${where} 的 displayRank (${bank.displayRank}) 与 display-rules.json (${rule.rank}) 不一致`);
  }
}

function checkExpectation(bank: ContentBank, exp: BankExpectation, where: string) {
  const qs = bank.bank.questions;
  const tag = `${where} ${bank.id}`;

  if (typeof exp.questionCount === 'number' && qs.length !== exp.questionCount) {
    fail(`${tag} 题数应为 ${exp.questionCount}，实际 ${qs.length}`);
  }
  if (exp.category && bank.bank.category !== exp.category) {
    fail(`${tag} category 应为 ${exp.category}，实际 ${bank.bank.category}`);
  }
  const dims = bank.bank.dimensions ?? [];
  if (typeof exp.dimensionCount === 'number' && dims.length !== exp.dimensionCount) {
    fail(`${tag} 维度数应为 ${exp.dimensionCount}，实际 ${dims.length}`);
  }
  if (exp.dimensionKeys) {
    const actual = dims.map((d) => d.key);
    if (actual.join(',') !== exp.dimensionKeys.join(',')) {
      fail(`${tag} 维度 key 顺序应为 ${exp.dimensionKeys.join(',')}，实际 ${actual.join(',')}`);
    }
  }

  const openTexts = qs.filter((q) => q.type === 'open_text');
  const singleChoices = qs.filter((q) => q.type === 'single_choice');
  if (typeof exp.openTextCount === 'number' && openTexts.length !== exp.openTextCount) {
    fail(`${tag} 自白题应为 ${exp.openTextCount}，实际 ${openTexts.length}`);
  }
  if (typeof exp.singleChoiceCount === 'number' && singleChoices.length !== exp.singleChoiceCount) {
    fail(`${tag} 单选题应为 ${exp.singleChoiceCount}，实际 ${singleChoices.length}`);
  }
  if (exp.openTextIds) {
    const actual = openTexts.map((q) => q.id);
    if (actual.join(',') !== exp.openTextIds.join(',')) {
      fail(`${tag} 自白题 id 应为 ${exp.openTextIds.join(',')}，实际 ${actual.join(',')}`);
    }
  }

  if (exp.baselineOptionAZero || exp.baselineOptionA) {
    for (const q of singleChoices) {
      const optA = q.options?.[0];
      if (!optA) {
        fail(`${tag} 题目 ${q.id} 没有选项 A`);
        continue;
      }
      const scores = optA.scores ?? {};
      if (exp.baselineOptionAZero) {
        const bad = Object.entries(scores).filter(([, v]) => v !== 0);
        if (bad.length > 0) fail(`${tag} 题目 ${q.id} 的选项 A 不是全 0：${bad.map(([k]) => k).join(',')}`);
      }
      if (exp.baselineOptionA) {
        const e = exp.baselineOptionA;
        if (typeof e.spousal_contempt === 'number' && (scores.spousal_contempt ?? 0) !== e.spousal_contempt) {
          fail(`${tag} 题目 ${q.id} 的选项 A spousal_contempt 应为 ${e.spousal_contempt}`);
        }
        if (e.moral_outrage?.min !== undefined && (scores.moral_outrage ?? 0) < e.moral_outrage.min) {
          fail(`${tag} 题目 ${q.id} 的选项 A moral_outrage 应 >= ${e.moral_outrage.min}`);
        }
      }
    }
  }

  if (exp.coverDimensionsWithPositiveScore) {
    const scored = new Set<string>();
    for (const q of singleChoices) {
      for (const o of q.options ?? []) {
        for (const [k, v] of Object.entries(o.scores ?? {})) if (v > 0) scored.add(k);
      }
    }
    for (const d of dims) {
      if (!scored.has(d.key)) fail(`${tag} 维度 ${d.key} 没有任何正分覆盖`);
    }
  }

  for (const [questionId, media] of Object.entries(exp.media ?? {})) {
    const q = qs.find((x) => x.id === questionId);
    if (!q) {
      fail(`${tag} 找不到题目 ${questionId}`);
      continue;
    }
    if (!q.mediaConfig) {
      fail(`${tag} 题目 ${questionId} 缺少 mediaConfig`);
      continue;
    }
    if (media.allowedTypes && (q.mediaConfig.allowedTypes ?? []).join(',') !== media.allowedTypes.join(',')) {
      fail(`${tag} 题目 ${questionId} allowedTypes 应为 ${media.allowedTypes.join(',')}`);
    }
    if (media.maxFileCount !== undefined && q.mediaConfig.maxFileCount !== media.maxFileCount) {
      fail(`${tag} 题目 ${questionId} maxFileCount 应为 ${media.maxFileCount}`);
    }
  }

  for (const item of exp.optionAZeroAt ?? []) {
    const q = qs.find((x) => x.id === item.questionId);
    if (!q) {
      fail(`${tag} 找不到题目 ${item.questionId}`);
      continue;
    }
    const score = q.options?.[0]?.scores?.[item.dimension];
    if ((score ?? 0) !== 0) fail(`${tag} 题目 ${item.questionId} 的选项 A ${item.dimension} 应为 0`);
  }
}

main();
