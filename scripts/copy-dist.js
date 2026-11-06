import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

/**
 * 用户端与管理端各自独立构建，分别拷贝进 dist-server/，
 * 确保服务器上用户进程读不到管理端产物、管理进程读不到用户产物。
 */
const targets = [
  { label: '用户端', source: 'dist-user' },
  { label: '管理端', source: 'dist-admin' },
];

for (const target of targets) {
  const sourceDir = path.resolve(projectRoot, target.source);
  const targetDir = path.resolve(projectRoot, 'dist-server', target.source);

  if (!fs.existsSync(sourceDir)) {
    console.warn(`[copy-dist] 未找到 ${target.label}构建产物 ${target.source}/，跳过拷贝（请先运行 vite build）`);
    continue;
  }

  // 防止目标目录被计算到意外位置
  if (
    path.dirname(targetDir) !== path.resolve(projectRoot, 'dist-server') ||
    path.basename(targetDir) !== target.source
  ) {
    throw new Error(`Refusing to copy to unexpected directory: ${targetDir}`);
  }

  fs.cpSync(sourceDir, targetDir, { recursive: true });
  console.log(`[copy-dist] 已拷贝${target.label}构建产物到 ${targetDir}`);
}

// IP 属地数据库（xdb 二进制不入 Git；本地构建时随部署包分发到 dist-server/server/data/geo）
const geoSourceDir = path.resolve(projectRoot, 'server', 'data', 'geo');
const geoTargetDir = path.resolve(projectRoot, 'dist-server', 'server', 'data', 'geo');
if (
  path.dirname(geoTargetDir) !== path.resolve(projectRoot, 'dist-server', 'server', 'data') ||
  path.basename(geoTargetDir) !== 'geo'
) {
  throw new Error(`Refusing to copy geo data to unexpected directory: ${geoTargetDir}`);
}
if (fs.existsSync(geoSourceDir)) {
  fs.cpSync(geoSourceDir, geoTargetDir, { recursive: true });
  console.log(`[copy-dist] 已拷贝 IP 属地数据到 ${geoTargetDir}`);
} else {
  console.warn('[copy-dist] 未找到 server/data/geo，跳过（地域统计将不可用）');
}
