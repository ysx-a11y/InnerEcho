import React, { useRef, useState } from 'react';
import type { Card3DConfig } from './types';
import {
  RotateCcw,
  Sparkles,
  Sliders,
  Download,
  Upload,
  Layers,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Check,
} from 'lucide-react';

interface Card3DControlsProps {
  config: Card3DConfig;
  onChange: (config: Card3DConfig) => void;
  onExport: () => void;
  isExporting: boolean;
  onExportDualCard?: () => void;
  isExportingDualCard?: boolean;
  availablePhotos?: string[];
  onResetToDefault: () => void;
}

const FILTERS = [
  { id: 'none', label: '原图' },
  { id: 'vibrant', label: '冷艳质感' },
  { id: 'vintage', label: '复古手札' },
  { id: 'grayscale', label: '纯净黑白' },
  { id: 'sepia', label: '暖黄怀旧' },
];

const WAX_COLORS = [
  { name: '勃艮第红', value: '#6b0505' },
  { name: '极夜金箔', value: '#a37e12' },
  { name: '暗夜幽紫', value: '#581c87' },
  { name: '古铜暖褐', value: '#7c2d12' },
  { name: '冷翠青绿', value: '#064e3b' },
  { name: '深邃墨黑', value: '#171717' },
];

const INK_COLORS = [
  { name: '复古朱红', value: '#8a1515' },
  { name: '深金焦糖', value: '#92400e' },
  { name: '极光洋红', value: '#a21caf' },
  { name: '青绿冷墨', value: '#065f46' },
  { name: '玄青深黑', value: '#0f172a' },
];

export const Card3DControls: React.FC<Card3DControlsProps> = ({
  config,
  onChange,
  onExport,
  isExporting,
  onExportDualCard,
  isExportingDualCard = false,
  availablePhotos = [],
  onResetToDefault,
}) => {
  const [isOpenDrawer, setIsOpenDrawer] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'image' | 'stamp'>('image');
  const [selectedSide, setSelectedSide] = useState<'front' | 'back'>('front');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateField = <K extends keyof Card3DConfig>(field: K, value: Card3DConfig[K]) => {
    onChange({
      ...config,
      [field]: value,
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (selectedSide === 'front') {
          onChange({
            ...config,
            imageUrl: dataUrl,
            imageScale: 1.0,
            imageX: 0,
            imageY: 0,
          });
        } else {
          onChange({
            ...config,
            backImageUrl: dataUrl,
            backImageScale: 1.1,
            backImageX: 0,
            backImageY: 0,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSwapSides = () => {
    onChange({
      ...config,
      imageUrl: config.backImageUrl || config.imageUrl,
      backImageUrl: config.imageUrl,
      imageScale: config.backImageScale || 1.0,
      backImageScale: config.imageScale || 1.0,
      imageX: config.backImageX || 0,
      backImageX: config.imageX || 0,
      imageY: config.backImageY || 0,
      backImageY: config.imageY || 0,
      imageFilter: config.backImageFilter || 'none',
      backImageFilter: config.imageFilter || 'none',
    });
  };

  const activeFilter = selectedSide === 'front' ? (config.imageFilter || 'none') : (config.backImageFilter || 'none');
  const activeScale = selectedSide === 'front' ? config.imageScale : (config.backImageScale ?? 1.1);
  const activeY = selectedSide === 'front' ? config.imageY : (config.backImageY ?? 0);

  return (
    <div className="card3d-controls-container">
      {/* Quick Action Toolbar */}
      <div className="card3d-toolbar-row">
        <button
          type="button"
          className="card3d-btn"
          onClick={() => updateField('isFlipped', !config.isFlipped)}
          title="翻转卡片正反面"
        >
          <RotateCcw size={13} style={{ color: config.accentColor }} />
          <span>{config.isFlipped ? '看正面' : '翻转背面'}</span>
        </button>

        <button
          type="button"
          className={`card3d-btn ${config.holographic ? 'active' : ''}`}
          onClick={() => updateField('holographic', !config.holographic)}
          style={{ borderColor: config.holographic ? config.accentColor : undefined }}
          title="开启/关闭全息镭射光斑"
        >
          <Sparkles size={13} style={{ color: config.holographic ? config.accentColor : 'rgba(255,255,255,0.6)' }} />
          <span>全息光斑</span>
        </button>

        <button
          type="button"
          className="card3d-btn"
          onClick={() => updateField('contentMode', config.contentMode === 'dimensions' ? 'desire' : 'dimensions')}
          title="在四维微标与暗面渴望自白间切换"
        >
          <Layers size={13} style={{ color: config.accentColor }} />
          <span>{config.contentMode === 'dimensions' ? '看自白金句' : '看四维倾向'}</span>
        </button>

        <button
          type="button"
          className="card3d-btn"
          onClick={() => setIsOpenDrawer(!isOpenDrawer)}
          style={{ borderColor: isOpenDrawer ? config.accentColor : undefined }}
          title="微调卡片立绘与印章"
        >
          <Sliders size={13} style={{ color: config.accentColor }} />
          <span>定制微调</span>
          {isOpenDrawer ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        <button
          type="button"
          className="card3d-btn card3d-btn-primary"
          onClick={onExport}
          disabled={isExporting}
          title="保存高精自白卡片"
        >
          <Download size={14} />
          <span>{isExporting ? '生成中...' : (onExportDualCard ? '保存单面卡' : '保存卡片')}</span>
        </button>

        {onExportDualCard && (
          <button
            type="button"
            className="card3d-btn"
            onClick={onExportDualCard}
            disabled={isExportingDualCard}
            title="保存表里双面并排典藏海报"
            style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(255, 112, 166, 0.25) 100%)',
              borderColor: 'rgba(192, 132, 252, 0.5)',
            }}
          >
            <Layers size={13} style={{ color: '#c084fc' }} />
            <span>{isExportingDualCard ? '生成中...' : '保存双面卡'}</span>
          </button>
        )}
      </div>

      {/* Customizable Drawer */}
      {isOpenDrawer && (
        <div className="card3d-drawer animate-fade-in">
          {/* Sub-tab Navigation */}
          <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
            <button
              type="button"
              className={`card3d-btn ${activeSubTab === 'image' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('image')}
              style={{
                flex: 1,
                background: activeSubTab === 'image' ? 'rgba(255, 112, 166, 0.15)' : 'transparent',
                borderColor: activeSubTab === 'image' ? config.accentColor : 'transparent',
              }}
            >
              <ImageIcon size={13} />
              <span>封面立绘</span>
            </button>
            <button
              type="button"
              className={`card3d-btn ${activeSubTab === 'stamp' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('stamp')}
              style={{
                flex: 1,
                background: activeSubTab === 'stamp' ? 'rgba(255, 112, 166, 0.15)' : 'transparent',
                borderColor: activeSubTab === 'stamp' ? config.accentColor : 'transparent',
              }}
            >
              <Sparkles size={13} />
              <span>印章与火漆</span>
            </button>
          </div>

          {/* Sub-tab 1: Image Tweaks */}
          {activeSubTab === 'image' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Side Switcher (Front vs Back) */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  type="button"
                  className={`card3d-btn ${selectedSide === 'front' ? 'active' : ''}`}
                  onClick={() => setSelectedSide('front')}
                  style={{
                    flex: 1,
                    fontSize: '11px',
                    padding: '6px 8px',
                    background: selectedSide === 'front' ? 'rgba(255, 112, 166, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: selectedSide === 'front' ? config.accentColor : 'rgba(255, 255, 255, 0.12)',
                  }}
                >
                  正面 · 人前面具
                </button>
                <button
                  type="button"
                  className={`card3d-btn ${selectedSide === 'back' ? 'active' : ''}`}
                  onClick={() => setSelectedSide('back')}
                  style={{
                    flex: 1,
                    fontSize: '11px',
                    padding: '6px 8px',
                    background: selectedSide === 'back' ? 'rgba(192, 132, 252, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: selectedSide === 'back' ? '#c084fc' : 'rgba(255, 255, 255, 0.12)',
                  }}
                >
                  背面 · 绝密暗面
                </button>
                <button
                  type="button"
                  className="card3d-btn"
                  onClick={handleSwapSides}
                  title="快速互换正反面两张照片"
                  style={{ fontSize: '11px', padding: '6px 10px', color: 'rgba(255, 255, 255, 0.8)' }}
                >
                  ⇄ 互换
                </button>
              </div>

              {/* Uploaded Gallery Selection */}
              {availablePhotos && availablePhotos.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)' }}>
                      从已录入切片选择 ({availablePhotos.length} 张)：
                    </span>
                    <span style={{ fontSize: '10px', color: selectedSide === 'front' ? config.accentColor : '#c084fc' }}>
                      正在修改【{selectedSide === 'front' ? '正面立绘' : '背面立绘'}】
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {availablePhotos.map((url, idx) => {
                      const isCurrent = selectedSide === 'front' ? config.imageUrl === url : config.backImageUrl === url;
                      const activeColor = selectedSide === 'front' ? config.accentColor : '#c084fc';
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (selectedSide === 'front') {
                              onChange({ ...config, imageUrl: url });
                            } else {
                              onChange({ ...config, backImageUrl: url });
                            }
                          }}
                          style={{
                            position: 'relative',
                            width: 52,
                            height: 52,
                            borderRadius: 8,
                            overflow: 'hidden',
                            flexShrink: 0,
                            cursor: 'pointer',
                            border: `2px solid ${isCurrent ? activeColor : 'rgba(255, 255, 255, 0.15)'}`,
                            boxShadow: isCurrent ? `0 0 10px ${activeColor}55` : 'none',
                            opacity: isCurrent ? 1 : 0.65,
                            transition: 'all 0.2s',
                            boxSizing: 'border-box',
                          }}
                        >
                          <img src={url} alt={`切片 ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: 'rgba(0, 0, 0, 0.75)',
                              fontSize: '8px',
                              textAlign: 'center',
                              color: '#fff',
                              padding: '1px 0',
                            }}
                          >
                            {config.imageUrl === url && config.backImageUrl === url
                              ? '正+反'
                              : config.imageUrl === url
                              ? '正面'
                              : config.backImageUrl === url
                              ? '背面'
                              : `#${idx + 1}`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upload Custom & Reset Buttons */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="card3d-btn"
                  style={{ flex: 1, padding: '7px', background: 'rgba(255,255,255,0.08)' }}
                >
                  <Upload size={13} />
                  <span>上传新照片至{selectedSide === 'front' ? '正面' : '背面'}</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={onResetToDefault}
                  className="card3d-btn"
                  style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}
                >
                  恢复默认立绘
                </button>
              </div>

              {/* Filters Row */}
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
                  {selectedSide === 'front' ? '正面' : '背面'}滤镜质感
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {FILTERS.map((f) => {
                    const isFilterActive = activeFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          if (selectedSide === 'front') {
                            updateField('imageFilter', f.id);
                          } else {
                            updateField('backImageFilter', f.id);
                          }
                        }}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          border: '1px solid',
                          borderColor: isFilterActive ? config.accentColor : 'rgba(255,255,255,0.1)',
                          background: isFilterActive ? 'rgba(255, 112, 166, 0.18)' : 'rgba(0,0,0,0.3)',
                          color: isFilterActive ? '#fff' : 'rgba(255,255,255,0.7)',
                          cursor: 'pointer',
                        }}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sliders: Scale & Position */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginBottom: '3px' }}>
                    {selectedSide === 'front' ? '正面' : '背面'}缩放 ({activeScale.toFixed(2)}x)
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.8"
                    step="0.05"
                    value={activeScale}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (selectedSide === 'front') {
                        updateField('imageScale', val);
                      } else {
                        updateField('backImageScale', val);
                      }
                    }}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginBottom: '3px' }}>
                    {selectedSide === 'front' ? '正面' : '背面'}垂直偏移 ({activeY}%)
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="1"
                    value={activeY}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (selectedSide === 'front') {
                        updateField('imageY', val);
                      } else {
                        updateField('backImageY', val);
                      }
                    }}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab 2: Stamp & Wax Seal Tweaks */}
          {activeSubTab === 'stamp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Type Switcher */}
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>印章类型</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { id: 'wax', label: '浮雕火漆蜡印' },
                    { id: 'ink-circle', label: '复古圆形印泥' },
                    { id: 'ink-rect', label: '绝密矩形公章' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        const defaultColor = t.id === 'wax' ? WAX_COLORS[0].value : INK_COLORS[0].value;
                        onChange({
                          ...config,
                          stampType: t.id as any,
                          stampColor: defaultColor,
                        });
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        border: '1px solid',
                        borderColor: config.stampType === t.id ? config.accentColor : 'rgba(255,255,255,0.1)',
                        background: config.stampType === t.id ? 'rgba(255, 112, 166, 0.18)' : 'rgba(0,0,0,0.3)',
                        color: config.stampType === t.id ? '#fff' : 'rgba(255,255,255,0.7)',
                        cursor: 'pointer',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Presets */}
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>印章/火漆色泽</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {(config.stampType === 'wax' ? WAX_COLORS : INK_COLORS).map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => updateField('stampColor', c.value)}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: c.value,
                        border: config.stampColor.toLowerCase() === c.value.toLowerCase() ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                        boxShadow: config.stampColor.toLowerCase() === c.value.toLowerCase() ? `0 0 10px ${config.accentColor}` : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title={c.name}
                    >
                      {config.stampColor.toLowerCase() === c.value.toLowerCase() && <Check size={12} color="#fff" />}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={config.stampColor}
                    onChange={(e) => updateField('stampColor', e.target.value)}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      padding: 0,
                      border: 'none',
                      cursor: 'pointer',
                      background: 'none',
                    }}
                    title="自定义调色板"
                  />
                </div>
              </div>

              {/* Stamp Assessment Words (LLM Word) */}
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                  印章中心定性文案（大模型评定）
                </div>
                <input
                  type="text"
                  value={config.stampTextCenter}
                  onChange={(e) => updateField('stampTextCenter', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(0,0,0,0.4)',
                    color: '#ffffff',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                  maxLength={10}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
