/**
 * InnerEcho Telegram 单向引流频道自动发布器。
 *
 * 定位：只发内容、不收消息、不建群、不做任何交互——Telegram 仅作为引流入口。
 * 发布队列存放在独立 JSON 文件（部署目录，不入 tar），重新部署不清空进度；
 * 日常只编辑该 JSON 增删内容，无需改代码或重启（重启可选）。
 *
 * 所需环境变量（与用户端共享同一份 .env）：
 *   TG_BOT_TOKEN           必填，@BotFather 创建的机器人 token
 *   TG_CHANNEL_ID          必填，公开频道填 @username，私密频道填数字 id
 *   TG_POST_QUEUE          选填，队列文件路径，默认 <cwd>/telegram-posts.json（部署目录根）
 *   TG_POST_INTERVAL_HOURS 选填，发布间隔（小时），默认 12
 *   TG_FORCE_POST          选填，=1 时启动即发一篇（用于部署冒烟验证）
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

interface QueueFile {
  /** 每篇内容 = 若干段落，发布时以空行连接。 */
  posts: string[][];
  nextIndex: number;
  lastPostedAt: number;
}

const TOKEN = process.env.TG_BOT_TOKEN?.trim();
const CHANNEL = process.env.TG_CHANNEL_ID?.trim();
const QUEUE_PATH =
  process.env.TG_POST_QUEUE?.trim() ??
  path.resolve(process.cwd(), 'telegram-posts.json');
const INTERVAL_HOURS = Number(process.env.TG_POST_INTERVAL_HOURS ?? '12');
const FORCE_POST = process.env.TG_FORCE_POST === '1';
const CHECK_EVERY_MS = 15 * 60 * 1000;

if (!TOKEN || !CHANNEL) {
  console.error('[tg-channel] 缺少 TG_BOT_TOKEN 或 TG_CHANNEL_ID，无法启动');
  process.exit(1);
}

const API_BASE = `https://api.telegram.org/bot${TOKEN}`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callApi<T = unknown>(method: string, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!res.ok || body.ok !== true) {
    throw new Error(`Telegram API ${method} 失败：${res.status} ${body.description ?? ''}`.trim());
  }
  return body.result as T;
}

function normalizeQueue(raw: string): QueueFile {
  const parsed = JSON.parse(raw) as Partial<QueueFile>;
  const posts = (parsed.posts ?? [])
    .filter((p): p is string[] => Array.isArray(p))
    .map((paragraphs) => paragraphs.filter((line) => typeof line === 'string' && line.trim()).map((line) => line.trim()))
    .filter((paragraphs) => paragraphs.length > 0);
  if (posts.length === 0) {
    throw new Error(`发布队列为空：${QUEUE_PATH}`);
  }
  return {
    posts,
    nextIndex: Number.isInteger(parsed.nextIndex) ? Number(parsed.nextIndex) : 0,
    lastPostedAt: Number.isFinite(parsed.lastPostedAt) ? Number(parsed.lastPostedAt) : 0,
  };
}

function loadQueue(): QueueFile {
  if (!fs.existsSync(QUEUE_PATH)) {
    throw new Error(`找不到发布队列文件：${QUEUE_PATH}`);
  }
  return normalizeQueue(fs.readFileSync(QUEUE_PATH, 'utf8'));
}

function saveQueue(queue: QueueFile): void {
  const tmp = `${QUEUE_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(queue, null, 2), 'utf8');
  fs.renameSync(tmp, QUEUE_PATH);
}

async function publish(queue: QueueFile): Promise<void> {
  const index = queue.nextIndex % queue.posts.length;
  const text = queue.posts[index].join('\n\n');
  await callApi('sendMessage', { chat_id: CHANNEL, text });
  queue.nextIndex = index + 1;
  queue.lastPostedAt = Date.now();
  saveQueue(queue);
  console.log(`[tg-channel] 已发布第 ${queue.nextIndex} 篇（队列共 ${queue.posts.length} 篇，将循环使用）`);
}

async function main(): Promise<void> {
  const me = await callApi<{ username?: string }>('getMe', {});
  console.log(`[tg-channel] 机器人 @${me.username ?? 'unknown'} 已连接`);

  const chat = await callApi<{ title?: string; username?: string }>('getChat', { chat_id: CHANNEL });
  console.log(
    `[tg-channel] 目标频道：${chat.title ?? chat.username ?? CHANNEL}（每 ${INTERVAL_HOURS} 小时发一篇）`,
  );

  const initial = loadQueue();
  console.log(
    `[tg-channel] 队列共 ${initial.posts.length} 篇，下一次发布序号 ${initial.nextIndex % initial.posts.length}`,
  );

  if (FORCE_POST) {
    await publish(initial);
  }

  for (;;) {
    try {
      const queue = loadQueue();
      const dueAt = queue.lastPostedAt + INTERVAL_HOURS * 3600_000;
      if (Date.now() >= dueAt) {
        await publish(queue);
      }
    } catch (error) {
      console.error('[tg-channel] 发布失败，下轮重试：', error);
    }
    await sleep(CHECK_EVERY_MS);
  }
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
process.on('unhandledRejection', (error) => {
  console.error('[tg-channel] unhandledRejection：', error);
});

main().catch((error) => {
  console.error('[tg-channel] 启动失败：', error);
  process.exit(1);
});
