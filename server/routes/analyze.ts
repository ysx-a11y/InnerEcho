import { Router, urlencoded } from 'express';
import { maybeUserId, extractDeviceId } from '../auth.js';
import { analyzeDossierSchema } from '../schemas.js';
import { getClientIp } from '../utils/clientIp.js';
import type { FullDossierData } from '../types.js';
import { asyncHandler } from '../http/asyncHandler.js';
import { analyzeDossier } from '../services/analyzeService.js';

export const analyzeRouter = Router();

const MAX_POSTER_BASE64_CHARS = 12 * 1024 * 1024;
const parsePosterForm = urlencoded({
  extended: false,
  // URL encoding expands '+' and '/' characters beyond the raw Base64 length.
  limit: '16mb',
  parameterLimit: 4,
});

analyzeRouter.post('/analyze-dossier', asyncHandler(async (req, res) => {
  const validation = analyzeDossierSchema.safeParse(req.body ?? {});
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: validation.error.issues[0]?.message ?? '入参校验失败',
      zodErrors: validation.error.issues,
    });
  }
  const body = validation.data;
  const dossierData = body.dossierData as FullDossierData;

  const userId = await maybeUserId(req);
  const deviceId = extractDeviceId(req);
  if (!userId && !deviceId) {
    return res.status(400).json({
      success: false,
      saved: false,
      message: '缺少会话标识，无法安全保存本次卷宗',
    });
  }
  const result = await analyzeDossier({
    dossierData,
    customConfig: body.customConfig,
    userId,
    deviceId,
    ipAddress: getClientIp(req),
  });
  return res.json(result);
}));

/**
 * 🚀 支持海报高清图片直接网络流下载
 * 接收 Base64 格式的图片数据及文件名，在后端组装标准 Content-Disposition 响应头输出，
 * 完美绕过 360 浏览器和第三方下载器（如 IDM）对 blob/dataURL 下载重命名的拦截 bug。
 */
analyzeRouter.post('/download-poster', parsePosterForm, (req, res) => {
  const { base64Data, filename } = req.body || {};
  if (typeof base64Data !== 'string' || typeof filename !== 'string') {
    return res.status(400).json({ success: false, message: '缺少必要参数' });
  }

  try {
    const prefix = 'data:image/png;base64,';
    if (!base64Data.startsWith(prefix) || base64Data.length > MAX_POSTER_BASE64_CHARS) {
      return res.status(400).json({ success: false, message: '无效的 Base64 数据' });
    }

    const encodedImage = base64Data.slice(prefix.length);
    if (
      encodedImage.length === 0
      || encodedImage.length % 4 !== 0
      || !/^[A-Za-z0-9+/]*={0,2}$/.test(encodedImage)
    ) {
      return res.status(400).json({ success: false, message: '无效的 Base64 数据' });
    }

    const imageBuffer = Buffer.from(encodedImage, 'base64');
    const safeFilenameBase = filename
      .replace(/[\r\n/\\]/g, '_')
      .replace(/\.{2,}/g, '_')
      .replace(/\.png$/i, '')
      .trim()
      .slice(0, 150) || '镜界自白_自白卷宗';

    res.set('Content-Type', 'image/png');
    res.attachment(`${safeFilenameBase}.png`);
    return res.send(imageBuffer);
  } catch (err) {
    console.error('Download poster endpoint failed:', err);
    return res.status(500).json({ success: false, message: '海报下载生成失败' });
  }
});
