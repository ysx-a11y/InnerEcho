import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(__dirname, 'data', 'pca-code.json');
const outPath = path.join(__dirname, '..', 'server', 'utils', 'regionCodes.ts');

const data = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

// 直辖市省级码：城市层级使用省级码补 0000。
const MUNICIPALITY_CODES = new Set(['11', '12', '31', '50']);

const cityNameToCode = new Map();
const codeToCityName = new Map();

function add(name, code) {
  if (!name || !code) return;
  if (!cityNameToCode.has(name)) {
    cityNameToCode.set(name, code);
  }
  if (!codeToCityName.has(code)) {
    codeToCityName.set(code, name);
  }
}

for (const province of data) {
  const provinceCode = String(province.code).padStart(2, '0');

  if (MUNICIPALITY_CODES.has(provinceCode)) {
    const code = `${provinceCode}0000`;
    add(province.name, code);
    add(province.name.replace(/市$/, ''), code);
    continue;
  }

  for (const city of province.children ?? []) {
    const cityCode = String(city.code).padStart(4, '0');
    const code = `${cityCode}00`;
    add(city.name, code);
  }
}

const cityEntries = [...cityNameToCode.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'));
const codeEntries = [...codeToCityName.entries()].sort((a, b) => a[0].localeCompare(b[0]));

const lines = [
  '// 自动生成，请勿手改。重新生成：node scripts/generate-region-codes.mjs',
  '// 数据源：scripts/data/pca-code.json（GB/T 2260 行政区划代码）',
  '',
  'export const CITY_NAME_TO_CODE: Record<string, string> = {',
  ...cityEntries.map(([name, code]) => `  ${JSON.stringify(name)}: ${JSON.stringify(code)},`),
  '};',
  '',
  'export const CODE_TO_CITY_NAME: Record<string, string> = {',
  ...codeEntries.map(([code, name]) => `  ${JSON.stringify(code)}: ${JSON.stringify(name)},`),
  '};',
  '',
];

fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`generated ${outPath} (${cityEntries.length} cities)`);
