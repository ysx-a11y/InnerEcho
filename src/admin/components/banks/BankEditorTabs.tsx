import React from 'react';
import {
  Check, ChevronDown, ChevronUp, Copy, FileCode2, Image as ImageIcon,
  Layers, MessageSquare, MoveDown, MoveUp, Play, Plus, Settings,
  Sparkles, Trash2, X,
} from 'lucide-react';
import type { AdminBankDetail } from '../../adminTypes';

const PRESET_COLORS = ['#ff3377', '#80f3ff', '#9333ea', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#6366f1'];
const CATEGORY_MAP: Record<string, { label: string; desc: string; badgeColor: string }> = {
  scenario: { label: '情境切片', desc: '沉浸场景剧情与角色代入', badgeColor: '#ec4899' },
  direct: { label: '真实自白', desc: '原始倾诉与社死自白', badgeColor: '#ff3377' },
  preference: { label: '权责谱系', desc: 'BDSM / 权责与属性量表', badgeColor: '#ff70a6' },
  scientific: { label: '心相镜像', desc: '心理学机制与客观镜像', badgeColor: '#80f3ff' },
};
const QUESTION_TYPE_MAP: Record<string, { label: string; icon: React.ComponentType<{ size?: number }> }> = {
  single_choice: { label: '单选题', icon: Check },
  multiple_choice: { label: '多选题', icon: Layers },
  open_text: { label: '开放手填', icon: MessageSquare },
  media_upload: { label: '媒体上传', icon: ImageIcon },
};
type Tab = 'basic' | 'questions' | 'preview' | 'json';
type QuestionType = 'single_choice' | 'multiple_choice' | 'open_text' | 'media_upload';
type BankQuestion = AdminBankDetail['questions'][number];
type PreviewAnswers = Record<string, any>;

interface BankEditorTabsProps {
  bank: AdminBankDetail;
  onBankChange: React.Dispatch<React.SetStateAction<AdminBankDetail | null>>;
  activeTab: Tab;
  onTabChange: React.Dispatch<React.SetStateAction<Tab>>;
  expandedQuestions: Record<number, boolean>;
  onExpandedQuestionsChange: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  onAddQuestion: (type: QuestionType) => void;
  onUpdateQuestion: (index: number, updated: BankQuestion) => void;
  onDeleteQuestion: (index: number) => void;
  onMoveQuestion: (index: number, direction: 'up' | 'down') => void;
  onDuplicateQuestion: (index: number) => void;
  onAddOption: (questionIndex: number) => void;
  onUpdateOption: (questionIndex: number, optionIndex: number, updated: BankQuestion) => void;
  onDeleteOption: (questionIndex: number, optionIndex: number) => void;
  previewAnswers: PreviewAnswers;
  onPreviewAnswersChange: React.Dispatch<React.SetStateAction<PreviewAnswers>>;
  previewQuestionIndex: number;
  onPreviewQuestionIndexChange: React.Dispatch<React.SetStateAction<number>>;
  onNotice: React.Dispatch<React.SetStateAction<string | null>>;
}

export const BankEditorTabs: React.FC<BankEditorTabsProps> = ({
  bank: currentBank,
  onBankChange: setCurrentBank,
  activeTab,
  onTabChange: setActiveTab,
  expandedQuestions,
  onExpandedQuestionsChange: setExpandedQuestions,
  onAddQuestion: handleAddQuestion,
  onUpdateQuestion: handleUpdateQuestion,
  onDeleteQuestion: handleDeleteQuestion,
  onMoveQuestion: handleMoveQuestion,
  onDuplicateQuestion: handleDuplicateQuestion,
  onAddOption: handleAddOption,
  onUpdateOption: handleUpdateOption,
  onDeleteOption: handleDeleteOption,
  previewAnswers,
  onPreviewAnswersChange: setPreviewAnswers,
  previewQuestionIndex,
  onPreviewQuestionIndexChange: setPreviewQuestionIndex,
  onNotice: setNotice,
}) => (
  <>
              {/* 选项卡导航 */}
              <div className="bank-tab-nav">
                <button
                  className={activeTab === 'basic' ? 'is-active' : ''}
                  onClick={() => setActiveTab('basic')}
                >
                  <Settings size={15} />
                  <span>基础属性</span>
                </button>
                <button
                  className={activeTab === 'questions' ? 'is-active' : ''}
                  onClick={() => setActiveTab('questions')}
                >
                  <Layers size={15} />
                  <span>题目编排 ({currentBank.questions?.length || 0})</span>
                </button>
                <button
                  className={activeTab === 'preview' ? 'is-active' : ''}
                  onClick={() => setActiveTab('preview')}
                >
                  <Play size={15} />
                  <span>实时仿真预览</span>
                </button>
                <button
                  className={activeTab === 'json' ? 'is-active' : ''}
                  onClick={() => setActiveTab('json')}
                >
                  <FileCode2 size={15} />
                  <span>原始 JSON</span>
                </button>
              </div>

              {/* Tab 1: 基础属性 */}
              {activeTab === 'basic' && (
                <div className="bank-tab-content basic-form-layout animate-fade-in">
                  <div className="admin-form-group">
                    <label>题库主标题 *</label>
                    <input
                      type="text"
                      value={currentBank.title}
                      onChange={(e) => setCurrentBank({ ...currentBank, title: e.target.value })}
                      disabled={currentBank.isBuiltin}
                      placeholder="如：标准 BDSM 50 题深度卷宗"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>副标题 (选填)</label>
                    <input
                      type="text"
                      value={currentBank.subtitle || ''}
                      onChange={(e) => setCurrentBank({ ...currentBank, subtitle: e.target.value })}
                      disabled={currentBank.isBuiltin}
                      placeholder="如：完整权责倒错与信任交付量表"
                    />
                  </div>

                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label>分类风格</label>
                      <select
                        value={currentBank.category}
                        onChange={(e) => setCurrentBank({ ...currentBank, category: e.target.value as any })}
                        disabled={currentBank.isBuiltin}
                      >
                        <option value="scenario">情境切片 (scenario)</option>
                        <option value="direct">真实自白 (direct)</option>
                        <option value="preference">权责谱系 (preference)</option>
                        <option value="scientific">心相镜像 (scientific)</option>
                      </select>
                      <small className="admin-form-hint">
                        {CATEGORY_MAP[currentBank.category]?.desc}
                      </small>
                    </div>

                    <div className="admin-form-group">
                      <label>预估作答耗时 (分钟)</label>
                      <input
                        type="number"
                        min="1"
                        max="180"
                        value={currentBank.estimatedMinutes ?? 8}
                        onChange={(e) => setCurrentBank({ ...currentBank, estimatedMinutes: parseInt(e.target.value, 10) || null })}
                        disabled={currentBank.isBuiltin}
                      />
                    </div>
                  </div>

                  <div className="admin-form-group">
                    <label>主题标识色</label>
                    <div className="color-picker-row">
                      <input
                        type="color"
                        value={currentBank.badgeColor || '#ff3377'}
                        onChange={(e) => setCurrentBank({ ...currentBank, badgeColor: e.target.value })}
                        disabled={currentBank.isBuiltin}
                        className="native-color-picker"
                      />
                      <div className="color-swatches">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`color-swatch ${currentBank.badgeColor === c ? 'is-active' : ''}`}
                            style={{ backgroundColor: c }}
                            onClick={() => !currentBank.isBuiltin && setCurrentBank({ ...currentBank, badgeColor: c })}
                            disabled={currentBank.isBuiltin}
                          />
                        ))}
                      </div>
                      <span className="color-code">{currentBank.badgeColor || '#ff3377'}</span>
                    </div>
                  </div>

                  <div className="admin-form-group">
                    <label>题库详细描述与前言</label>
                    <textarea
                      rows={4}
                      value={currentBank.description || ''}
                      onChange={(e) => setCurrentBank({ ...currentBank, description: e.target.value })}
                      disabled={currentBank.isBuiltin}
                      placeholder="介绍题库的测试目的、涵盖维度及心理探索价值…"
                    />
                  </div>

                  {/* 测评维度管理与编辑 */}
                  <div className="admin-form-group">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <label style={{ margin: 0 }}>测评维度设置 ({currentBank.dimensions?.length || 0})</label>
                      {!currentBank.isBuiltin && (
                        <button
                          type="button"
                          className="admin-button admin-button-quiet"
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem' }}
                          onClick={() => {
                            const dims = currentBank.dimensions || [];
                            const newKey = `dim_${dims.length + 1}`;
                            setCurrentBank({
                              ...currentBank,
                              dimensions: [...dims, { key: newKey, name: `新维度 ${dims.length + 1}`, description: '' }],
                            });
                          }}
                        >
                          <Plus size={13} />
                          <span>添加维度</span>
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.4rem' }}>
                      {(!currentBank.dimensions || currentBank.dimensions.length === 0) ? (
                        <small style={{ color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>
                          {currentBank.isBuiltin ? '内置预设未配置独立维度。' : '暂无预设维度，可点击上方“添加维度”进行创建。'}
                        </small>
                      ) : (
                        currentBank.dimensions.map((dim, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.6rem',
                              padding: '0.55rem 0.75rem',
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: '8px',
                            }}
                          >
                            <div style={{ width: '130px', flexShrink: 0 }}>
                              <input
                                type="text"
                                value={dim.name}
                                placeholder="维度名称 (如: 功能防御)"
                                disabled={currentBank.isBuiltin}
                                onChange={(e) => {
                                  const next = [...(currentBank.dimensions || [])];
                                  next[idx] = { ...next[idx], name: e.target.value };
                                  setCurrentBank({ ...currentBank, dimensions: next });
                                }}
                                style={{ fontSize: '0.78rem', padding: '0.35rem 0.55rem' }}
                              />
                            </div>
                            <div style={{ width: '130px', flexShrink: 0 }}>
                              <input
                                type="text"
                                value={dim.key}
                                placeholder="英文键 (如: persona_density)"
                                disabled={currentBank.isBuiltin}
                                onChange={(e) => {
                                  const next = [...(currentBank.dimensions || [])];
                                  next[idx] = { ...next[idx], key: e.target.value };
                                  setCurrentBank({ ...currentBank, dimensions: next });
                                }}
                                style={{ fontSize: '0.74rem', fontFamily: 'monospace', padding: '0.35rem 0.55rem' }}
                              />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <input
                                type="text"
                                value={dim.description || ''}
                                placeholder="维度说明描述 (选填)"
                                disabled={currentBank.isBuiltin}
                                onChange={(e) => {
                                  const next = [...(currentBank.dimensions || [])];
                                  next[idx] = { ...next[idx], description: e.target.value };
                                  setCurrentBank({ ...currentBank, dimensions: next });
                                }}
                                style={{ fontSize: '0.76rem', padding: '0.35rem 0.55rem' }}
                              />
                            </div>
                            {!currentBank.isBuiltin && (
                              <button
                                type="button"
                                className="q-mini-btn q-danger-btn"
                                title="删除此维度"
                                onClick={() => {
                                  const next = (currentBank.dimensions || []).filter((_, i) => i !== idx);
                                  setCurrentBank({ ...currentBank, dimensions: next });
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: 题目编排 */}
              {activeTab === 'questions' && (
                <div className="bank-tab-content questions-builder-layout animate-fade-in">
                  <div className="questions-builder-header">
                    <div>
                      <h3>题目清单 ({currentBank.questions?.length || 0})</h3>
                      <p>支持单选、多选、手填自白与媒体上传题型，可自由配置各选项维度分值矩阵。</p>
                    </div>

                    {!currentBank.isBuiltin && (
                      <div className="add-question-menu">
                        <button
                          className="admin-button admin-button-quiet"
                          onClick={() => handleAddQuestion('single_choice')}
                        >
                          <Plus size={13} /> 单选题
                        </button>
                        <button
                          className="admin-button admin-button-quiet"
                          onClick={() => handleAddQuestion('multiple_choice')}
                        >
                          <Plus size={13} /> 多选题
                        </button>
                        <button
                          className="admin-button admin-button-quiet"
                          onClick={() => handleAddQuestion('open_text')}
                        >
                          <Plus size={13} /> 手填自白题
                        </button>
                        <button
                          className="admin-button admin-button-quiet"
                          onClick={() => handleAddQuestion('media_upload')}
                        >
                          <Plus size={13} /> 媒体上传题
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 题目列表折叠卡片 */}
                  <div className="questions-cards-stack">
                    {(!currentBank.questions || currentBank.questions.length === 0) ? (
                      <div className="admin-empty-state">
                        <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                        <span>暂无题目，请点击右上角按钮添加题目</span>
                      </div>
                    ) : (
                      currentBank.questions.map((q: any, qIdx: number) => {
                        const isExpanded = !!expandedQuestions[qIdx];
                        const typeInfo = QUESTION_TYPE_MAP[q.type] || QUESTION_TYPE_MAP.single_choice;
                        const TypeIcon = typeInfo.icon;

                        return (
                          <div
                            key={q.id || qIdx}
                            className={`question-edit-card ${isExpanded ? 'is-expanded' : ''}`}
                          >
                            {/* 题目头部 */}
                            <div
                              className="q-card-header"
                              onClick={() => setExpandedQuestions((prev) => ({ ...prev, [qIdx]: !prev[qIdx] }))}
                            >
                              <div className="q-card-header-left">
                                <span className="q-number-badge">#{qIdx + 1}</span>
                                <span className="q-type-badge">
                                  <TypeIcon size={12} /> {typeInfo.label}
                                </span>
                                <strong className="q-card-title">{q.title || '（未填写题干）'}</strong>
                              </div>

                              <div className="q-card-header-actions" onClick={(e) => e.stopPropagation()}>
                                {!currentBank.isBuiltin && (
                                  <>
                                    <button
                                      className="q-mini-btn"
                                      disabled={qIdx === 0}
                                      onClick={() => handleMoveQuestion(qIdx, 'up')}
                                      title="上移"
                                    >
                                      <MoveUp size={13} />
                                    </button>
                                    <button
                                      className="q-mini-btn"
                                      disabled={qIdx === currentBank.questions.length - 1}
                                      onClick={() => handleMoveQuestion(qIdx, 'down')}
                                      title="下移"
                                    >
                                      <MoveDown size={13} />
                                    </button>
                                    <button
                                      className="q-mini-btn"
                                      onClick={() => handleDuplicateQuestion(qIdx)}
                                      title="复制题目"
                                    >
                                      <Copy size={13} />
                                    </button>
                                    <button
                                      className="q-mini-btn q-danger-btn"
                                      onClick={() => handleDeleteQuestion(qIdx)}
                                      title="删除题目"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </>
                                )}
                                <button className="q-toggle-expand">
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                              </div>
                            </div>

                            {/* 展开的单题详细编辑器 */}
                            {isExpanded && (
                              <div className="q-card-body animate-fade-in">
                                <div className="admin-form-group">
                                  <label>题目标题 / 核心问题 *</label>
                                  <textarea
                                    rows={2}
                                    value={q.title || ''}
                                    onChange={(e) => handleUpdateQuestion(qIdx, { ...q, title: e.target.value })}
                                    disabled={currentBank.isBuiltin}
                                    placeholder="输入题目问句…"
                                  />
                                </div>

                                <div className="admin-form-group">
                                  <label>情境场景 / 背景描述 (选填)</label>
                                  <textarea
                                    rows={2}
                                    value={q.scenario || ''}
                                    onChange={(e) => handleUpdateQuestion(qIdx, { ...q, scenario: e.target.value })}
                                    disabled={currentBank.isBuiltin}
                                    placeholder="可选：描绘特定场景或唤醒心防细节…"
                                  />
                                </div>

                                <div className="admin-form-row">
                                  <div className="admin-form-group">
                                    <label>题目类型</label>
                                    <select
                                      value={q.type}
                                      onChange={(e) => handleUpdateQuestion(qIdx, { ...q, type: e.target.value })}
                                      disabled={currentBank.isBuiltin}
                                    >
                                      <option value="single_choice">单选题 (single_choice)</option>
                                      <option value="multiple_choice">多选题 (multiple_choice)</option>
                                      <option value="open_text">开放手填 (open_text)</option>
                                      <option value="media_upload">媒体上传 (media_upload)</option>
                                    </select>
                                  </div>

                                  <div className="admin-form-group checkbox-group">
                                    <label>
                                      <input
                                        type="checkbox"
                                        checked={q.isRequired ?? true}
                                        onChange={(e) => handleUpdateQuestion(qIdx, { ...q, isRequired: e.target.checked })}
                                        disabled={currentBank.isBuiltin}
                                      />
                                      <span>必须作答 (必填项)</span>
                                    </label>
                                  </div>
                                </div>

                                {/* 单选 / 多选题选项列表 */}
                                {(q.type === 'single_choice' || q.type === 'multiple_choice') && (
                                  <div className="options-editor-section">
                                    <div className="options-header">
                                      <label>选项与分值配置 ({q.options?.length || 0})</label>
                                      {!currentBank.isBuiltin && (
                                        <button
                                          type="button"
                                          className="q-add-opt-btn"
                                          onClick={() => handleAddOption(qIdx)}
                                        >
                                          <Plus size={12} /> 添加选项
                                        </button>
                                      )}
                                    </div>

                                    <div className="options-stack">
                                      {(q.options || []).map((opt: any, optIdx: number) => (
                                        <div key={opt.id || optIdx} className="option-row-card">
                                          <div className="opt-main-inputs">
                                            <span className="opt-index-letter">{String.fromCharCode(65 + optIdx)}</span>
                                            <input
                                              type="text"
                                              className="opt-text-input"
                                              value={opt.text || ''}
                                              onChange={(e) => handleUpdateOption(qIdx, optIdx, { ...opt, text: e.target.value })}
                                              disabled={currentBank.isBuiltin}
                                              placeholder="选项内容…"
                                            />
                                            {!currentBank.isBuiltin && (
                                              <button
                                                type="button"
                                                className="opt-delete-btn"
                                                onClick={() => handleDeleteOption(qIdx, optIdx)}
                                                title="删除选项"
                                              >
                                                <X size={14} />
                                              </button>
                                            )}
                                          </div>

                                          {/* 选项关联维度得分展示/编辑 */}
                                          <div className="opt-scores-bar">
                                            <span className="opt-score-label">维度分值:</span>
                                            <div className="opt-scores-chips">
                                              {Object.entries(opt.scores || {}).map(([dimKey, scoreVal]) => (
                                                <span key={dimKey} className="score-chip">
                                                  <code>{dimKey}</code>: <strong>{String(scoreVal)}</strong>
                                                  {!currentBank.isBuiltin && (
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        const newScores = { ...opt.scores };
                                                        delete newScores[dimKey];
                                                        handleUpdateOption(qIdx, optIdx, { ...opt, scores: newScores });
                                                      }}
                                                    >
                                                      ×
                                                    </button>
                                                  )}
                                                </span>
                                              ))}
                                              {!currentBank.isBuiltin && (
                                                <button
                                                  type="button"
                                                  className="add-dim-score-btn"
                                                  onClick={() => {
                                                    const dim = window.prompt('请输入维度 key (如 dominance, disparity, chaos):');
                                                    if (!dim || !dim.trim()) return;
                                                    const scoreStr = window.prompt(`请输入维度 ${dim} 的分值 (数字):`, '10');
                                                    const scoreNum = parseFloat(scoreStr || '0') || 0;
                                                    const newScores = { ...(opt.scores || {}), [dim.trim()]: scoreNum };
                                                    handleUpdateOption(qIdx, optIdx, { ...opt, scores: newScores });
                                                  }}
                                                >
                                                  + 分值
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* 手填题配置 */}
                                {q.type === 'open_text' && (
                                  <div className="open-text-config">
                                    <div className="admin-form-group">
                                      <label>占位引导语 (Placeholder)</label>
                                      <input
                                        type="text"
                                        value={q.placeholder || ''}
                                        onChange={(e) => handleUpdateQuestion(qIdx, { ...q, placeholder: e.target.value })}
                                        disabled={currentBank.isBuiltin}
                                        placeholder="如：请输入你的真实自白或经历…"
                                      />
                                    </div>
                                    <div className="admin-form-group">
                                      <label>灵感预设词 (Sparks)</label>
                                      <div className="sparks-tag-list">
                                        {(q.sparks || []).map((s: string, sIdx: number) => (
                                          <span key={sIdx} className="spark-tag">
                                            <Sparkles size={11} /> {s}
                                            {!currentBank.isBuiltin && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const newSparks = q.sparks.filter((_: any, i: number) => i !== sIdx);
                                                  handleUpdateQuestion(qIdx, { ...q, sparks: newSparks });
                                                }}
                                              >
                                                ×
                                              </button>
                                            )}
                                          </span>
                                        ))}
                                        {!currentBank.isBuiltin && (
                                          <button
                                            type="button"
                                            className="add-spark-btn"
                                            onClick={() => {
                                              const spark = window.prompt('输入预设灵感词：');
                                              if (spark && spark.trim()) {
                                                handleUpdateQuestion(qIdx, { ...q, sparks: [...(q.sparks || []), spark.trim()] });
                                              }
                                            }}
                                          >
                                            + 灵感词
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* 媒体上传配置 */}
                                {q.type === 'media_upload' && (
                                  <div className="media-upload-config admin-form-row">
                                    <div className="admin-form-group">
                                      <label>允许媒体类型</label>
                                      <div className="media-types-checks">
                                        {['image', 'audio', 'video', 'document'].map((mType) => {
                                          const allowed = q.mediaConfig?.allowedTypes || ['image'];
                                          const checked = allowed.includes(mType);
                                          return (
                                            <label key={mType} className="checkbox-pill">
                                              <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled={currentBank.isBuiltin}
                                                onChange={(e) => {
                                                  const next = e.target.checked
                                                    ? [...allowed, mType]
                                                    : allowed.filter((x: string) => x !== mType);
                                                  handleUpdateQuestion(qIdx, {
                                                    ...q,
                                                    mediaConfig: { ...(q.mediaConfig || {}), allowedTypes: next },
                                                  });
                                                }}
                                              />
                                              <span>{mType}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    <div className="admin-form-group">
                                      <label>最大上传数量</label>
                                      <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={q.mediaConfig?.maxFileCount || 3}
                                        disabled={currentBank.isBuiltin}
                                        onChange={(e) => {
                                          handleUpdateQuestion(qIdx, {
                                            ...q,
                                            mediaConfig: {
                                              ...(q.mediaConfig || {}),
                                              maxFileCount: parseInt(e.target.value, 10) || 1,
                                            },
                                          });
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: 实时仿真预览 */}
              {activeTab === 'preview' && (
                <div className="bank-tab-content preview-simulator-layout animate-fade-in">
                  <div className="simulator-header">
                    <div>
                      <h3>交互式问卷仿真器</h3>
                      <p>模拟访客答题流程，实时体验排版渲染与维度分值归集。</p>
                    </div>

                    <div className="simulator-nav-pills">
                      <span>题目: <strong>{previewQuestionIndex + 1}</strong> / {currentBank.questions?.length || 1}</span>
                      <button
                        className="admin-button admin-button-quiet"
                        onClick={() => setPreviewAnswers({})}
                      >
                        清空答卷
                      </button>
                    </div>
                  </div>

                  {(!currentBank.questions || currentBank.questions.length === 0) ? (
                    <div className="admin-empty-state">
                      <span>题库中暂无题目可供预览</span>
                    </div>
                  ) : (
                    <div className="simulator-card-box">
                      {(() => {
                        const q = currentBank.questions[previewQuestionIndex];
                        if (!q) return null;
                        const userAns = previewAnswers[q.id];

                        return (
                          <div className="simulator-question-card">
                            <div className="sim-q-meta">
                              <span className="sim-q-badge" style={{ backgroundColor: currentBank.badgeColor || '#ff3377' }}>
                                #{previewQuestionIndex + 1} · {QUESTION_TYPE_MAP[q.type]?.label}
                              </span>
                              {q.isRequired && <span className="sim-q-required">必答</span>}
                            </div>

                            <h3 className="sim-q-title">{q.title}</h3>
                            {q.scenario && <p className="sim-q-scenario">{q.scenario}</p>}

                            {/* 单选题选项预览 */}
                            {q.type === 'single_choice' && (
                              <div className="sim-options-grid">
                                {(q.options || []).map((opt: any, optIdx: number) => {
                                  const selected = userAns === opt.id;
                                  return (
                                    <button
                                      key={opt.id || optIdx}
                                      type="button"
                                      className={`sim-option-btn ${selected ? 'is-selected' : ''}`}
                                      onClick={() => setPreviewAnswers({ ...previewAnswers, [q.id]: opt.id })}
                                    >
                                      <span className="sim-opt-letter">{String.fromCharCode(65 + optIdx)}</span>
                                      <span className="sim-opt-text">{opt.text}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* 多选题选项预览 */}
                            {q.type === 'multiple_choice' && (
                              <div className="sim-options-grid">
                                {(q.options || []).map((opt: any, optIdx: number) => {
                                  const selList = Array.isArray(userAns) ? userAns : [];
                                  const selected = selList.includes(opt.id);
                                  return (
                                    <button
                                      key={opt.id || optIdx}
                                      type="button"
                                      className={`sim-option-btn ${selected ? 'is-selected' : ''}`}
                                      onClick={() => {
                                        const next = selected
                                          ? selList.filter((x: string) => x !== opt.id)
                                          : [...selList, opt.id];
                                        setPreviewAnswers({ ...previewAnswers, [q.id]: next });
                                      }}
                                    >
                                      <span className="sim-opt-letter">{String.fromCharCode(65 + optIdx)}</span>
                                      <span className="sim-opt-text">{opt.text}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* 手填自白题预览 */}
                            {q.type === 'open_text' && (
                              <div className="sim-open-text">
                                <textarea
                                  rows={4}
                                  placeholder={q.placeholder || '请输入你的真实自白…'}
                                  value={userAns || ''}
                                  onChange={(e) => setPreviewAnswers({ ...previewAnswers, [q.id]: e.target.value })}
                                />
                                {q.sparks && q.sparks.length > 0 && (
                                  <div className="sim-sparks-row">
                                    <span className="sim-sparks-label">灵感触碰:</span>
                                    {q.sparks.map((s: string, sIdx: number) => (
                                      <button
                                        key={sIdx}
                                        type="button"
                                        className="sim-spark-btn"
                                        onClick={() => {
                                          const prev = userAns || '';
                                          setPreviewAnswers({
                                            ...previewAnswers,
                                            [q.id]: prev ? `${prev}，${s}` : s,
                                          });
                                        }}
                                      >
                                        + {s}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 媒体上传题预览 */}
                            {q.type === 'media_upload' && (
                              <div className="sim-media-upload">
                                <div className="sim-dropzone">
                                  <ImageIcon size={32} />
                                  <span>支持格式: {q.mediaConfig?.allowedTypes?.join(', ') || 'image'}</span>
                                  <small>单文件上限 5MB，最多可上传 {q.mediaConfig?.maxFileCount || 3} 个附件</small>
                                </div>
                              </div>
                            )}

                            {/* 下一题 / 上一题控制 */}
                            <div className="simulator-controls">
                              <button
                                className="admin-button admin-button-quiet"
                                disabled={previewQuestionIndex === 0}
                                onClick={() => setPreviewQuestionIndex((i) => Math.max(0, i - 1))}
                              >
                                上一题
                              </button>
                              <button
                                className="admin-button admin-button-primary"
                                disabled={previewQuestionIndex >= currentBank.questions.length - 1}
                                onClick={() => setPreviewQuestionIndex((i) => Math.min(currentBank.questions.length - 1, i + 1))}
                              >
                                下一题
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: 原始 JSON */}
              {activeTab === 'json' && (
                <div className="bank-tab-content json-view-layout animate-fade-in">
                  <div className="json-header">
                    <div>
                      <h3>题库标准 JSON 配置</h3>
                      <p>与镜界自白核心答题引擎和 API 契约完全对齐。</p>
                    </div>

                    <div className="json-header-actions">
                      <button
                        className="admin-button admin-button-quiet"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(currentBank, null, 2));
                          setNotice('已复制完整 JSON 到剪贴板');
                        }}
                      >
                        <Copy size={14} />
                        <span>复制 JSON</span>
                      </button>
                    </div>
                  </div>

                  <pre className="admin-json-code-box">
                    <code>{JSON.stringify(currentBank, null, 2)}</code>
                  </pre>
                </div>
              )}
  </>
);
