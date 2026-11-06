/**
 * 浏览器端高画质图片压缩工具
 * 使用 Canvas 2D API 进行等比缩放与高平滑度插值重采样
 */

const DEFAULT_MAX_DIMENSION = 1920; // 提升至 Full HD 1080P/Retina 级别，保证在高分屏上纤毫毕现
const DEFAULT_QUALITY = 0.82;       // 0.82 黄金画质：保留细腻暗部色阶与纹理，无马赛克或色带，同时实现 80%~90% 瘦身

export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/webp';
}

/**
 * 压缩单个图片文件
 * - 针对超大分辨率照片等比缩放至 maxDimension 以内
 * - 启用 imageSmoothingQuality = 'high' 双三次平滑插值
 * - 输出高质量 JPEG/WebP
 */
export function compressImage(file: File, options?: CompressOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|heic|heif|bmp|avif)$/i.test(file.name);
    if (!isImage) {
      reject(new Error('仅支持图片文件'));
      return;
    }

    // SVG 与 GIF 动图不通过 Canvas 栅格化压缩以保留矢量与动画帧
    if (file.type === 'image/svg+xml' || file.name.endsWith('.svg') || file.type === 'image/gif' || file.name.endsWith('.gif')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
      return;
    }

    const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
    const quality = options?.quality ?? DEFAULT_QUALITY;
    const format = options?.format ?? 'image/jpeg';

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // 等比缩放
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height / width) * maxDimension);
            width = maxDimension;
          } else {
            width = Math.round((width / height) * maxDimension);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D 上下文不可用'));
          return;
        }

        // 开启高品质双线性/双三次插值重采样，杜绝毛刺
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 如果输出 JPEG，填充深色基底避免透明通道变异常底色
        if (format === 'image/jpeg') {
          ctx.fillStyle = '#0e0b1a'; // 契合全站高奢暗夜基调
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL(format, quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

/**
 * 批量压缩图片文件
 */
export async function compressImages(
  files: File[],
  onProgress?: (done: number, total: number) => void,
  options?: CompressOptions
): Promise<string[]> {
  const results: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const dataUrl = await compressImage(files[i], options);
    results.push(dataUrl);
    onProgress?.(i + 1, files.length);
  }
  return results;
}
