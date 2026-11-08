import React from 'react';
import { Layers, ArrowRight, CheckCircle2, ShieldCheck, HeartHandshake, Eye, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import type { AdminTelemetry } from '../../adminTypes';
import { cn } from '../../lib/utils';

interface TelemetryChapterFlowProps {
  telemetry: AdminTelemetry | null;
}

export const TelemetryChapterFlow: React.FC<TelemetryChapterFlowProps> = ({ telemetry }) => {
  const chapters = [
    {
      step: '01',
      title: '第一章 · 身份登记与面具',
      subtitle: '真实职业与社交人设建立',
      avgDuration: '1m 24s',
      completionRate: '96.2%',
      friction: '极低阻尼',
      frictionColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
      description: '输入真实社会身份与外在防护形象，作为反差对照的起点锚点。',
      icon: ShieldCheck,
      borderColor: 'border-l-sky-500',
    },
    {
      step: '02',
      title: '第二章 · 50题全景权责卷宗',
      subtitle: '潜意识防线击穿与选项博弈',
      avgDuration: '6m 12s',
      completionRate: '88.4%',
      friction: '深度思忖',
      frictionColor: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
      description: '经历 50 题层层推进，在主导、臣服、施虐、受虐与禁忌情境中暴露真实倾向。',
      icon: Layers,
      borderColor: 'border-l-indigo-500',
    },
    {
      step: '03',
      title: '第三章 · 隐秘渴望与绝密自白',
      subtitle: '深层渴望宣泄与自白海报生成',
      avgDuration: '1m 45s',
      completionRate: '84.6%',
      friction: '真挚释放',
      frictionColor: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
      description: '撰写最渴望却不敢言说的内心自白，触发 LLM 深度解构并导出高奢绝密海报。',
      icon: Sparkles,
      borderColor: 'border-l-rose-500',
    },
  ];

  return (
    <Card className="border-border/80 shadow-xs flex flex-col justify-between overflow-hidden">
      <CardHeader className="p-3 sm:p-3.5 pb-2 border-b border-border/60">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
            <Layers className="size-4 text-indigo-500" />
            <span>三大章节心流转化与作答阻尼演进</span>
          </CardTitle>
          <Badge variant="outline" className="text-[10px] font-mono">
            全流程三幕心流
          </Badge>
        </div>
        <CardDescription className="text-[11px] text-muted-foreground">
          受测者从表层社会化面具构建，到 50 题层层瓦解防线，最终在自白海报中实现心理升华
        </CardDescription>
      </CardHeader>

      <CardContent className="p-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {chapters.map((ch, idx) => {
            const Icon = ch.icon;
            return (
              <div
                key={ch.step}
                className={cn(
                  'relative rounded-xl border border-border/70 bg-card/60 p-3 flex flex-col justify-between gap-3 border-l-4 transition-all hover:shadow-md hover:bg-muted/30',
                  ch.borderColor
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-xs font-black text-muted-foreground">
                      STAGE {ch.step}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn('text-[9px] px-1.5 py-0 border', ch.frictionColor)}
                    >
                      {ch.friction}
                    </Badge>
                  </div>

                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Icon className="size-3.5 text-primary" />
                    <span>{ch.title}</span>
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {ch.subtitle}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-1.5 border-y border-border/40 font-mono">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">阶段均耗时</span>
                    <strong className="text-foreground text-sm font-bold">{ch.avgDuration}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">完成流存率</span>
                    <strong className="text-emerald-500 text-sm font-bold">{ch.completionRate}</strong>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground/90 leading-relaxed">
                  {ch.description}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TelemetryChapterFlow;

