import React, { useState, useMemo } from 'react';
import { CardDeckCarousel, Slide, LandPalette } from '../ui/card-deck-carousel';
import type { DossierSummaryContract } from '../../../shared/apiContracts';
import { Sparkles, ChevronRight, Eye, Layers } from 'lucide-react';

interface PersonalCardDeckProps {
  dossiers: DossierSummaryContract[];
  onViewDossier?: (dossier: DossierSummaryContract) => void;
  onStartQuiz?: () => void;
}

function formatTime(iso: string | null): string {
  if (!iso) return '暂无时间';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '暂无时间';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return '暂无时间';
  }
}

function formatCleanSerial(rawId: string): string {
  if (!rawId) return '8260492';
  const clean = rawId.replace(/^(dos|ie|echo)[-_]*/i, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return (clean.length > 8 ? clean.slice(-8) : clean) || '8260492';
}

export const PersonalCardDeck: React.FC<PersonalCardDeckProps> = ({
  dossiers,
  onViewDossier,
  onStartQuiz,
}) => {
  const [topIndex, setTopIndex] = useState(0);

  const hasDossiers = dossiers.length > 0;

  // 将真实自白卷宗转化为卡牌 Slides
  const slides: Slide[] = useMemo(() => {
    if (!hasDossiers) {
      return [
        {
          title: '虚位以待 · 首张人格卡',
          caption: '完成标准全景卷宗测评，即可封印并解锁专属 3D 实体角色卡',
          palette: 'dusk' as LandPalette,
          seed: 7,
        },
        {
          title: '潜意识回响 · 待唤醒',
          caption: '每一份真诚自白都将凝练为独一无二的防伪编号人格收藏',
          palette: 'alpine' as LandPalette,
          seed: 21,
        },
      ];
    }

    const palettes: LandPalette[] = ['dusk', 'alpine', 'dawn', 'mist'];

    return dossiers.map((dos, idx) => {
      const ch1 = dos.chapter1;
      const nickname = ch1?.nickname?.trim() || '匿密者';
      const trait = ch1?.personaTrait?.trim() || ch1?.occupation?.trim() || '暗面潜意识';
      const serial = formatCleanSerial(dos.id);
      const date = formatTime(dos.createdAt);
      const photo = ch1?.avatarUrls?.[0] || ch1?.avatarUrl;

      return {
        image: photo || undefined,
        title: `${nickname} · ${trait}`,
        caption: `NO.${serial} · 封印于 ${date}`,
        palette: palettes[idx % palettes.length],
        seed: idx * 19 + 11,
      };
    });
  }, [dossiers, hasDossiers]);

  const activeDossier = hasDossiers ? dossiers[topIndex] || dossiers[0] : null;

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.025)',
        border: '1px solid rgba(255, 112, 166, 0.22)',
        borderRadius: 20,
        padding: '1.25rem 0.85rem 1rem',
        boxSizing: 'border-box',
        overflow: 'hidden',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* 顶部提示栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 0.4rem',
          marginBottom: '0.35rem',
        }}
      >
        <span
          style={{
            fontSize: '0.74rem',
            color: 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
        >
          <Layers size={13} color="#ff70a6" />
          <span>轻滑 / 抛掷翻阅实体卡组（支持拖拽飞牌）</span>
        </span>

        <span
          style={{
            fontSize: '0.72rem',
            color: '#ff70a6',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {hasDossiers ? `${topIndex + 1} / ${dossiers.length}` : '未封印'}
        </span>
      </div>

      {/* 核心卡牌轮播实体槽 */}
      <CardDeckCarousel
        slides={slides}
        height={380}
        cardWidth="min(76vw, 310px)"
        aspect="3 / 4"
        scatter={7}
        autoplay={hasDossiers ? 0 : 5000} // 真实卡牌默认不自动飞牌，给用户把玩时间；空占位时轻缓轮播
        background="transparent"
        ink="#ffffff"
        onChange={(idx) => setTopIndex(idx)}
      />

      {/* 底部联动操作按键 */}
      <div style={{ marginTop: '0.9rem', display: 'flex', justifyContent: 'center' }}>
        {hasDossiers && activeDossier ? (
          <button
            type="button"
            onClick={() => onViewDossier?.(activeDossier)}
            className="btn-glow"
            style={{
              width: '100%',
              maxWidth: 320,
              padding: '0.75rem 1.25rem',
              fontSize: '0.86rem',
              fontWeight: 700,
              borderRadius: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              cursor: 'pointer',
              border: 'none',
              boxShadow: '0 0 20px rgba(255, 51, 119, 0.45)',
            }}
          >
            <Eye size={15} />
            <span>检视当前人格卡卷宗详情</span>
            <ChevronRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onStartQuiz}
            className="btn-glow"
            style={{
              width: '100%',
              maxWidth: 320,
              padding: '0.75rem 1.25rem',
              fontSize: '0.86rem',
              fontWeight: 700,
              borderRadius: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              cursor: 'pointer',
              border: 'none',
              boxShadow: '0 0 20px rgba(255, 51, 119, 0.45)',
            }}
          >
            <Sparkles size={15} />
            <span>开启全景测验 · 封印第一张人格卡</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

