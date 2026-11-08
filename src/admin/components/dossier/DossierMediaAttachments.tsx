import React from 'react';
import { Video, Music, Image as ImageIcon, FileText } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

export interface DossierMediaItem {
  id?: string;
  type?: string;
  mimeType?: string;
  name?: string;
  dataUrl: string;
  sizeBytes?: number;
  durationSeconds?: number;
  qId?: string;
}

interface DossierMediaAttachmentsProps {
  attachments: DossierMediaItem[];
  title?: string;
  onZoomImage?: (url: string) => void;
}

export const DossierMediaAttachments: React.FC<DossierMediaAttachmentsProps> = ({
  attachments,
  title,
  onZoomImage,
}) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Video className="size-3.5 text-rose-500" />
        <span>{title || '上传媒体成果'}</span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
          {attachments.length}
        </Badge>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {attachments.map((item: DossierMediaItem, idx: number) => {
          const isVideo = item.type === 'video' || (item.mimeType && item.mimeType.startsWith('video/'));
          const isAudio = item.type === 'audio' || (item.mimeType && item.mimeType.startsWith('audio/'));
          const isImage = item.type === 'image' || (item.mimeType && item.mimeType.startsWith('image/'));

          if (isVideo) {
            return (
              <Card key={item.id || idx} className="shadow-xs border-border/80 overflow-hidden">
                <CardContent className="p-2.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-foreground">
                    <span className="font-medium truncate max-w-[200px]">
                      🎥 {item.name || `视频 #${idx + 1}`}
                    </span>
                    {item.sizeBytes && (
                      <span className="text-muted-foreground text-[11px]">
                        {(item.sizeBytes / 1024 / 1024).toFixed(1)}MB
                      </span>
                    )}
                  </div>
                  <video
                    controls
                    src={item.dataUrl}
                    className="w-full rounded-md bg-black max-h-52 object-contain"
                  />
                </CardContent>
              </Card>
            );
          }

          if (isAudio) {
            return (
              <Card key={item.id || idx} className="shadow-xs border-border/80">
                <CardContent className="p-2.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-foreground">
                    <span className="font-medium truncate max-w-[200px] flex items-center gap-1">
                      <Music className="size-3 text-amber-500" />
                      {item.name || `录音 #${idx + 1}`}
                    </span>
                    {item.durationSeconds && (
                      <span className="text-muted-foreground text-[11px]">{item.durationSeconds}s</span>
                    )}
                  </div>
                  <audio controls src={item.dataUrl} className="w-full h-8" />
                </CardContent>
              </Card>
            );
          }

          if (isImage) {
            return (
              <Card key={item.id || idx} className="shadow-xs border-border/80">
                <CardContent className="p-2.5 flex items-center gap-3">
                  <img
                    src={item.dataUrl}
                    alt={item.name || `图片 #${idx + 1}`}
                    onClick={() => onZoomImage?.(item.dataUrl)}
                    className="size-16 rounded-md object-cover border border-border/80 hover:opacity-90 cursor-zoom-in shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium text-foreground truncate">
                      {item.name || `图片 #${idx + 1}`}
                    </span>
                    {item.sizeBytes && (
                      <span className="text-[11px] text-muted-foreground">
                        {(item.sizeBytes / 1024).toFixed(0)}KB
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card key={item.id || idx} className="shadow-xs border-border/80">
              <CardContent className="p-2.5 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-foreground truncate">
                  <FileText className="size-3.5 text-muted-foreground" />
                  {item.name || `附件 #${idx + 1}`}
                </span>
                <a
                  href={item.dataUrl}
                  download={item.name || 'attachment'}
                  className="text-primary hover:underline font-medium text-[11px]"
                >
                  下载
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
export default DossierMediaAttachments;
