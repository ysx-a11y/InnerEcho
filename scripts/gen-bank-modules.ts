/**
 * 构建期代码生成：content/banks/*.json → 仓库内的 generated 模块。
 *
 * 为什么这么做：题库正文不进 git（仓库只放代码），但前端题库卡片需要同步的
 * 元数据、答题流程需要按需懒加载题库本体。构建前把内容生成为普通 TS 模块，
 * 运行时行为与改造前完全一致（依然同步渲染、依然按题库分包懒加载）。
 *
 * 生成的目录都在 .gitignore 里，只在构建机器上存在：
 *   src/data/questionBanks/generated/   ← 前端（元数据 + 懒加载入口 + 排序规则）
 *   server/data/generated/              ← 服务端（PRESET_BANKS 数据）
 *
 * 用法：npm run gen:banks（build / test 前自动执行）
 */
import fs from 'node:fs';
import path from 'node:path';
import { generateSeoPagesAndSitemap } from './gen-seo-pages.js';

const CONTENT_DIR = path.resolve('content');
const BANKS_DIR = path.join(CONTENT_DIR, 'banks');
const RULES_FILE = path.join(CONTENT_DIR, 'display-rules.json');
const UI_OUT = path.resolve('src/data/questionBanks/generated');
const SERVER_OUT = path.resolve('server/data/generated');

const DEFAULT_BANK_RANK = 500;
const AUTOGEN_NOTE =
  '// 自动生成，请勿手改：源文件 content/banks/*.json（不在 git 里）。\n' +
  '// 重新生成：npm run gen:banks\n';

interface ContentBank {
  id: string;
  card: Record<string, any> | null;
  bank: Record<string, any>;
  listedInSelector: boolean;
  displayRank: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

function fail(message: string): never {
  console.error(`\n[gen:banks] ${message}\n`);
  process.exit(1);
}

function unquoteKeys(json: string): string {
  return json.replace(/^(\s*)"([A-Za-z_$][\w$]*)":/gm, '$1$2:');
}

function moduleBaseName(id: string): string {
  const camel = id.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  return camel.endsWith('Bank') ? camel : `${camel}Bank`;
}

if (!fs.existsSync(BANKS_DIR)) {
  fail(
    `找不到题库内容目录 ${path.relative(process.cwd(), BANKS_DIR)}。\n` +
      '题库正文不在仓库里：从备份恢复 content/banks/ 后再构建（见 content/README.md）。',
  );
}

const files = fs
  .readdirSync(BANKS_DIR)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .sort();

if (files.length === 0) fail(`${path.relative(process.cwd(), BANKS_DIR)} 是空的，构建中止。`);

const banks: ContentBank[] = files.map((file) => {
  const raw = fs.readFileSync(path.join(BANKS_DIR, file), 'utf8');
  try {
    return JSON.parse(raw) as ContentBank;
  } catch (err) {
    return fail(`${file} 不是合法 JSON：${(err as Error).message}`);
  }
});

const rulesFile = fs.existsSync(RULES_FILE) ? fs.readFileSync(RULES_FILE, 'utf8') : '[]';
let displayRules: Array<{ id: string; rank: number; titleSignatures: string[] }>;
try {
  displayRules = JSON.parse(rulesFile);
} catch (err) {
  fail(`content/display-rules.json 解析失败：${(err as Error).message}`);
}

const seen = new Set<string>();
for (const bank of banks) {
  if (!bank?.id) fail('有题库 JSON 缺少 id 字段');
  if (seen.has(bank.id)) fail(`题库 id 重复：${bank.id}`);
  seen.add(bank.id);
  if (!bank.bank?.questions?.length) fail(`题库 ${bank.id} 没有题目`);
}

const rankOf = (id: string): number =>
  displayRules.find((r) => r.id === id)?.rank ?? DEFAULT_BANK_RANK;

fs.rmSync(UI_OUT, { recursive: true, force: true });
fs.rmSync(SERVER_OUT, { recursive: true, force: true });
fs.mkdirSync(UI_OUT, { recursive: true });
fs.mkdirSync(SERVER_OUT, { recursive: true });

/** 去掉值为 null 的顶层字段：JSON 里为了显式表达"无值"会写 null，
 *  但 QuestionBankDefinition 的可选字段是 `string | undefined`，null 会撞类型。 */
function stripNulls<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null) out[k] = v;
  }
  return out as T;
}

const importerLines: string[] = [];
const metadataEntries: Array<Record<string, any>> = [];

for (const bank of banks) {
  const name = moduleBaseName(bank.id);
  const definition = stripNulls({ id: bank.id, ...bank.bank });
  const moduleSource = [
    AUTOGEN_NOTE,
    `// 题库：${bank.id}`,
    "import type { QuestionBankDefinition } from '../../../types/quizEngine';",
    '',
    `export const ${name}: QuestionBankDefinition = ${unquoteKeys(
      JSON.stringify(definition, null, 2),
    )};`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(UI_OUT, `${name}.ts`), moduleSource, 'utf8');

  importerLines.push(`  ${bank.id}: () => import('./${name}'),`);

  if (bank.listedInSelector) {
    const card = bank.card ?? bank.bank;
    metadataEntries.push(stripNulls({
      id: bank.id,
      title: card.title,
      subtitle: card.subtitle ?? '',
      description: card.description ?? '',
      category: card.category,
      badge: card.badge ?? null,
      badgeColor: card.badgeColor ?? null,
      estimatedMinutes: card.estimatedMinutes ?? null,
      dimensions: card.dimensions ?? [],
      displayRank: rankOf(bank.id),
    }));
  }
}

metadataEntries.sort((a, b) => a.displayRank - b.displayRank || String(a.id).localeCompare(String(b.id)));

const indexSource = [
  AUTOGEN_NOTE,
  "import type { QuestionBankDefinition, QuestionBankMetadata, BankDisplayRule } from '../../../types/quizEngine';",
  '',
  '/** 题库选择器卡片元数据（同步可用，不含题目正文）。 */',
  `export const ALL_BANK_METADATA: QuestionBankMetadata[] = ${unquoteKeys(
    JSON.stringify(metadataEntries, null, 2),
  )};`,
  '',
  '/** 内置题库懒加载入口：id → 动态 import（每个题库单独分包）。 */',
  'export const BANK_IMPORTERS: Record<string, () => Promise<Record<string, QuestionBankDefinition>>> = {',
  ...importerLines,
  '};',
  '',
  '/** 题库卡片展示顺序（运营配置，随内容一起放在 content/display-rules.json）。 */',
  `export const BANK_DISPLAY_RULES: BankDisplayRule[] = ${unquoteKeys(
    JSON.stringify(displayRules, null, 2),
  )};`,
  '',
].join('\n');

fs.writeFileSync(path.join(UI_OUT, 'index.ts'), indexSource, 'utf8');

const presetEntries = banks
  .map((bank) => {
    const detail = {
      id: bank.id,
      userId: null,
      userEmail: 'system@innerecho.internal',
      title: bank.bank.title,
      subtitle: bank.bank.subtitle ?? '',
      description: bank.bank.description ?? '',
      category: bank.bank.category,
      badgeColor: bank.bank.badgeColor ?? null,
      estimatedMinutes: bank.bank.estimatedMinutes ?? null,
      questionCount: bank.bank.questions.length,
      isPublished: bank.isPublished,
      auditStatus: 'approved',
      isBuiltin: true,
      createdAt: bank.createdAt,
      updatedAt: bank.updatedAt,
      dimensions: bank.bank.dimensions ?? [],
      questions: bank.bank.questions,
    };
    return `  ${bank.id}: ${unquoteKeys(JSON.stringify(detail, null, 2)).replace(/\n/g, '\n  ')},`;
  })
  .join('\n');

const presetsSource = [
  AUTOGEN_NOTE,
  "import type { AdminBankDetail } from '../../types.js';",
  '',
  '/** 内置题库（只读）：/api/banks 与后台题库管理共用。 */',
  'export const PRESET_BANKS_DATA: Record<string, AdminBankDetail> = {',
  presetEntries,
  '};',
  '',
].join('\n');

fs.writeFileSync(path.join(SERVER_OUT, 'presets.ts'), presetsSource, 'utf8');

generateSeoPagesAndSitemap(
  banks.map((b) => ({
    ...b,
    displayRank: rankOf(b.id),
  })),
);

console.log(
  `[gen:banks] ${banks.length} 个题库 → ${path.relative(process.cwd(), UI_OUT)} + ${path.relative(
    process.cwd(),
    SERVER_OUT,
  )} + public/banks`,
);
