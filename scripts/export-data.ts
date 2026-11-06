import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db } from '../server/db.js';
import type { DossierRow } from '../server/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const exportDir = path.resolve(__dirname, '../exports');
const imageDir = path.resolve(exportDir, 'images');

// Create folders
if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });

/**
 * 导出脚本通过 server/db.ts 读取已解密的卷宗行：
 * - 生产库启用 FIELD_ENC_KEY 时，自白类字段 / 信封 JSON 由 formatDossierRow 解密，
 *   不会再导出 v1: 密文或 __encryptedPayload 信封；
 * - DATABASE_FILE 等配置同样来自环境变量，与线上服务保持一致。
 */
async function main(): Promise<void> {
  console.log('Reading decrypted dossiers through db layer...');
  const rows = await db.getAllDossierHistory();
  console.log(`Found ${rows.length} dossiers. Starting export...`);

  const exportedData = rows.map((row: DossierRow) => {
    // Parse avatar URLs and save to local PNG files
    const localImagePaths: string[] = [];
    (row.chapter1.avatarUrls ?? []).forEach((url, idx) => {
      if (!url || !url.startsWith('data:image/')) return;
      const matches = url.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = matches[1].includes('jpeg') ? 'jpg' : matches[1].includes('png') ? 'png' : 'png';
        const buffer = Buffer.from(matches[2], 'base64');
        const filename = `${row.id}_${idx}.${ext}`;
        fs.writeFileSync(path.join(imageDir, filename), buffer);
        localImagePaths.push(`images/${filename}`);
      }
    });

    return {
      id: row.id,
      userId: row.userId,
      email: row.email,
      nickname: row.chapter1.nickname ?? '',
      occupation: row.chapter1.occupation ?? '',
      personaTrait: row.chapter1.personaTrait ?? '',
      age: row.chapter1.age ?? '',
      maritalStatus: row.chapter1.maritalStatus ?? '',
      innerDesire: row.chapter1.innerDesire ?? '',
      boundaryText: row.chapter2.boundaryText ?? '',
      fantasyText: row.chapter2.fantasyText ?? '',
      relationPreference: row.chapter2.relationPreference ?? '',
      awakeningMoment: row.chapter2.awakeningMoment ?? '',
      depthRating: row.depthRating,
      selectedShadowTags: row.selectedShadowTags ?? [],
      telemetry: row.telemetry ?? null,
      diagnosticResult: row.diagnosticResult ?? null,
      quizPayload: row.quizPayload ?? null,
      localImages: localImagePaths,
      createdAt: row.createdAt,
    };
  });

  // Write JSON export file
  fs.writeFileSync(path.join(exportDir, 'dossiers.json'), JSON.stringify(exportedData, null, 2), 'utf-8');
  console.log(`Saved JSON data to: ${path.join(exportDir, 'dossiers.json')}`);

  // Generate HTML dashboard
  fs.writeFileSync(path.join(exportDir, 'index.html'), generateDashboardHtml(exportedData), 'utf-8');
  console.log(`Generated HTML Dashboard: ${path.join(exportDir, 'index.html')}`);
}

main().catch((err) => {
  console.error('Export failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});

function generateDashboardHtml(data: Array<Record<string, unknown>>): string {
  const rowsHtml = data.map((d) => {
    const localImages = (d.localImages as string[]) ?? [];
    const imagesHtml = localImages.map((img) => `
      <a href="${escapeHtml(img)}" target="_blank">
        <img src="${escapeHtml(img)}" style="width: 50px; height: 50px; border-radius: 6px; object-fit: cover; border: 1px solid rgba(255,255,255,0.1);" />
      </a>
    `).join('') || '<span style="color: #666;">无照片</span>';

    const tagsHtml = ((d.selectedShadowTags as string[]) ?? []).map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join(' ');

    return `
      <tr>
        <td><strong>${escapeHtml(d.id)}</strong></td>
        <td>${escapeHtml(d.nickname) || '匿名'}</td>
        <td>${imagesHtml}</td>
        <td>${escapeHtml(d.occupation) || '未填'}</td>
        <td>${escapeHtml(d.personaTrait) || '未填'}</td>
        <td>${escapeHtml(d.age) || '未填'} / ${escapeHtml(d.maritalStatus) || '未填'}</td>
        <td><div class="expandable">${escapeHtml(d.innerDesire) || '未填'}</div></td>
        <td><div class="expandable">${escapeHtml(d.fantasyText) || '未填'}</div></td>
        <td>${tagsHtml}</td>
        <td><span class="badge badge-${escapeHtml(d.depthRating)}">${escapeHtml(d.depthRating)}</span></td>
        <td>${escapeHtml(d.createdAt)}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>镜界自白（InnerEcho）数据卷宗后台查看面板</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0b050f;
      color: #e2e8f0;
      margin: 0;
      padding: 2rem;
    }
    h1 {
      font-size: 1.8rem;
      font-weight: 800;
      color: #ff70a6;
      text-shadow: 0 0 15px rgba(255, 112, 166, 0.4);
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 0.9rem;
      margin-bottom: 2rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      overflow: hidden;
    }
    th, td {
      padding: 1rem;
      text-align: left;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 0.85rem;
    }
    th {
      background: rgba(255, 255, 255, 0.04);
      color: #f1f5f9;
      font-weight: 700;
    }
    tr:hover {
      background: rgba(255, 255, 255, 0.02);
    }
    .tag {
      background: rgba(255, 112, 166, 0.15);
      border: 1px solid rgba(255, 112, 166, 0.3);
      color: #ff70a6;
      padding: 0.15rem 0.4rem;
      border-radius: 6px;
      font-size: 0.72rem;
      display: inline-block;
      margin: 2px;
    }
    .badge {
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
      border-radius: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-deep { background: #ff3377; color: #fff; }
    .badge-medium { background: #e100ff; color: #fff; }
    .badge-light { background: #3b82f6; color: #fff; }
    .expandable {
      max-width: 250px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
    }
    .expandable:hover {
      white-space: normal;
      overflow: visible;
      background: #1e1b29;
      padding: 0.5rem;
      border-radius: 6px;
      position: absolute;
      z-index: 50;
      max-width: 400px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.1);
    }
  </style>
</head>
<body>
  <h1>镜界自白（InnerEcho）数据卷宗后台查看面板</h1>
  <div class="subtitle">共检索到 <strong>${data.length}</strong> 条测评档案卷宗。点击单元格可悬浮查看文本，点击缩略图可查看高清照片。</div>
  <table>
    <thead>
      <tr>
        <th>卷宗ID</th>
        <th>昵称</th>
        <th>照片</th>
        <th>职业</th>
        <th>人设</th>
        <th>年龄/状态</th>
        <th>内心渴望</th>
        <th>私密幻想</th>
        <th>潜在标签</th>
        <th>觉醒评级</th>
        <th>测评时间</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`;
}

/** 转义用户自白等动态内容，防止导出面板 HTML 注入 (XSS)。 */
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
