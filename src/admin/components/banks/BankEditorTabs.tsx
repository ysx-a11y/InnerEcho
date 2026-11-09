import React from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileCode2,
  Image as ImageIcon,
  Layers,
  MessageSquare,
  MoveDown,
  MoveUp,
  Play,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { AdminBankDetail } from '../../adminTypes';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';

const PRESET_COLORS = ['#ff3377', '#80f3ff', '#9333ea', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#6366f1'];
const CATEGORY_MAP: Record<string, { label: string; desc: string; badgeColor: string }> = {
  scenario: { label: '情境切片', desc: '沉浸场景剧情与角色代入', badgeColor: '#ec4899' },
  direct: { label: '真实自白', desc: '原始倾诉与社死自白', badgeColor: '#ff3377' },
  preference: { label: '权责谱系', desc: 'BDSM / 权责与属性量表', badgeColor: '#ff70a6' },
  scientific: { label: '心相镜像', desc: '心理学机制与客观镜像', badgeColor: '#80f3ff' },
};
const QUESTION_TYPE_MAP: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
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
  <div className="flex flex-col flex-1 p-5 overflow-y-auto">
    {/* 选项卡导航 */}
    <Tabs
      value={activeTab}
      onValueChange={(val) => setActiveTab(val as Tab)}
      className="mb-5"
    >
      <TabsList className="h-9">
        <TabsTrigger value="basic" className="gap-1.5 text-xs px-3">
          <Settings className="size-3.5" />
          <span>基础属性</span>
        </TabsTrigger>
        <TabsTrigger value="questions" className="gap-1.5 text-xs px-3">
          <Layers className="size-3.5" />
          <span>题目编排 ({currentBank.questions?.length || 0})</span>
        </TabsTrigger>
        <TabsTrigger value="preview" className="gap-1.5 text-xs px-3">
          <Play className="size-3.5" />
          <span>实时仿真预览</span>
        </TabsTrigger>
        <TabsTrigger value="json" className="gap-1.5 text-xs px-3">
          <FileCode2 className="size-3.5" />
          <span>原始 JSON</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>

    {/* Tab 1: 基础属性 */}
    {activeTab === 'basic' && (
      <div className="space-y-4 max-w-2xl">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">题库主标题 *</label>
          <Input
            type="text"
            className="h-9 bg-background text-xs"
            value={currentBank.title}
            onChange={(e) => setCurrentBank({ ...currentBank, title: e.target.value })}
            disabled={currentBank.isBuiltin}
            placeholder="如：标准 BDSM 50 题深度卷宗"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">副标题 (选填)</label>
          <Input
            type="text"
            className="h-9 bg-background text-xs"
            value={currentBank.subtitle || ''}
            onChange={(e) => setCurrentBank({ ...currentBank, subtitle: e.target.value })}
            disabled={currentBank.isBuiltin}
            placeholder="如：完整权责倒错与信任交付量表"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">分类风格</label>
            <Select
              value={currentBank.category}
              onValueChange={(val) => setCurrentBank({ ...currentBank, category: val as any })}
              disabled={currentBank.isBuiltin}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scenario">情境切片 (scenario)</SelectItem>
                <SelectItem value="direct">真实自白 (direct)</SelectItem>
                <SelectItem value="preference">权责谱系 (preference)</SelectItem>
                <SelectItem value="scientific">心相镜像 (scientific)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">{CATEGORY_MAP[currentBank.category]?.desc}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">预估作答耗时 (分钟)</label>
            <Input
              type="number"
              min="1"
              max="180"
              className="h-9 bg-background text-xs"
              value={currentBank.estimatedMinutes ?? 8}
              onChange={(e) => setCurrentBank({ ...currentBank, estimatedMinutes: parseInt(e.target.value, 10) || null })}
              disabled={currentBank.isBuiltin}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">主题标识色</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={currentBank.badgeColor || '#ff3377'}
              onChange={(e) => setCurrentBank({ ...currentBank, badgeColor: e.target.value })}
              disabled={currentBank.isBuiltin}
              className="size-8 rounded-lg cursor-pointer border border-border"
            />
            <div className="flex items-center gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`size-6 rounded-full border transition-transform ${
                    currentBank.badgeColor === c ? 'scale-110 border-foreground ring-2 ring-primary/40' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => !currentBank.isBuiltin && setCurrentBank({ ...currentBank, badgeColor: c })}
                  disabled={currentBank.isBuiltin}
                />
              ))}
            </div>
            <code className="text-xs text-muted-foreground font-mono">{currentBank.badgeColor || '#ff3377'}</code>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">题库详细描述与前言</label>
          <Textarea
            rows={4}
            className="bg-background text-xs leading-relaxed"
            value={currentBank.description || ''}
            onChange={(e) => setCurrentBank({ ...currentBank, description: e.target.value })}
            disabled={currentBank.isBuiltin}
            placeholder="介绍题库的测试目的、涵盖维度及心理探索价值…"
          />
        </div>

        {/* 测评维度管理 */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground">
              测评维度设置 ({currentBank.dimensions?.length || 0})
            </label>
            {!currentBank.isBuiltin && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  const dims = currentBank.dimensions || [];
                  const newKey = `dim_${dims.length + 1}`;
                  setCurrentBank({
                    ...currentBank,
                    dimensions: [...dims, { key: newKey, name: `新维度 ${dims.length + 1}`, description: '' }],
                  });
                }}
              >
                <Plus className="size-3" />
                <span>添加维度</span>
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {!currentBank.dimensions || currentBank.dimensions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                {currentBank.isBuiltin ? '内置预设未配置独立维度。' : '暂无预设维度，可点击上方“添加维度”进行创建。'}
              </p>
            ) : (
              currentBank.dimensions.map((dim, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg border border-border/70 bg-muted/20">
                  <Input
                    type="text"
                    value={dim.name}
                    placeholder="维度名称"
                    disabled={currentBank.isBuiltin}
                    onChange={(e) => {
                      const next = [...(currentBank.dimensions || [])];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setCurrentBank({ ...currentBank, dimensions: next });
                    }}
                    className="w-32 h-8 bg-background px-2 text-xs"
                  />
                  <Input
                    type="text"
                    value={dim.key}
                    placeholder="英文键 (如 dominance)"
                    disabled={currentBank.isBuiltin}
                    onChange={(e) => {
                      const next = [...(currentBank.dimensions || [])];
                      next[idx] = { ...next[idx], key: e.target.value };
                      setCurrentBank({ ...currentBank, dimensions: next });
                    }}
                    className="w-32 h-8 bg-background px-2 text-xs font-mono"
                  />
                  <Input
                    type="text"
                    value={dim.description || ''}
                    placeholder="说明描述"
                    disabled={currentBank.isBuiltin}
                    onChange={(e) => {
                      const next = [...(currentBank.dimensions || [])];
                      next[idx] = { ...next[idx], description: e.target.value };
                      setCurrentBank({ ...currentBank, dimensions: next });
                    }}
                    className="flex-1 h-8 bg-background px-2 text-xs"
                  />
                  {!currentBank.isBuiltin && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        const next = (currentBank.dimensions || []).filter((_, i) => i !== idx);
                        setCurrentBank({ ...currentBank, dimensions: next });
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
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
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-border/80 bg-muted/30">
          <div>
            <h3 className="text-sm font-bold text-foreground">题目清单 ({currentBank.questions?.length || 0})</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              支持单选、多选、手填自白与媒体上传题型，可自由配置各选项维度分值矩阵。
            </p>
          </div>

          {!currentBank.isBuiltin && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAddQuestion('single_choice')}>
                <Plus className="size-3" /> 单选题
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAddQuestion('multiple_choice')}>
                <Plus className="size-3" /> 多选题
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAddQuestion('open_text')}>
                <Plus className="size-3" /> 手填自白
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAddQuestion('media_upload')}>
                <Plus className="size-3" /> 媒体上传
              </Button>
            </div>
          )}
        </div>

        {/* 题目列表卡片 */}
        <div className="space-y-3">
          {!currentBank.questions || currentBank.questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm gap-2">
              <MessageSquare className="size-6 text-muted-foreground/40" />
              <span>暂无题目，请点击右上角按钮添加题目</span>
            </div>
          ) : (
            currentBank.questions.map((q: any, qIdx: number) => {
              const isExpanded = !!expandedQuestions[qIdx];
              const typeInfo = QUESTION_TYPE_MAP[q.type] || QUESTION_TYPE_MAP.single_choice;
              const TypeIcon = typeInfo.icon;

              return (
                <div key={q.id || qIdx} className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
                  {/* 题目头部 */}
                  <div
                    className="flex items-center justify-between p-3.5 bg-muted/20 cursor-pointer select-none hover:bg-muted/40 transition-colors"
                    onClick={() => setExpandedQuestions((prev) => ({ ...prev, [qIdx]: !prev[qIdx] }))}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Badge variant="outline" className="font-mono text-xs">#{qIdx + 1}</Badge>
                      <Badge variant="secondary" className="flex items-center gap-1 text-[11px]">
                        <TypeIcon className="size-3" /> {typeInfo.label}
                      </Badge>
                      <strong className="text-xs font-medium text-foreground truncate max-w-md">
                        {q.title || '（未填写题干）'}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {!currentBank.isBuiltin && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={qIdx === 0}
                            onClick={() => handleMoveQuestion(qIdx, 'up')}
                            className="size-7 p-0"
                            title="上移"
                          >
                            <MoveUp className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={qIdx === currentBank.questions.length - 1}
                            onClick={() => handleMoveQuestion(qIdx, 'down')}
                            className="size-7 p-0"
                            title="下移"
                          >
                            <MoveDown className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicateQuestion(qIdx)}
                            className="size-7 p-0"
                            title="复制题目"
                          >
                            <Copy className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteQuestion(qIdx)}
                            className="size-7 p-0 text-destructive hover:bg-destructive/10"
                            title="删除题目"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedQuestions((prev) => ({ ...prev, [qIdx]: !prev[qIdx] }));
                        }}
                        className="size-7 p-0 text-muted-foreground hover:text-foreground"
                        title={isExpanded ? '收起题目详情' : '展开题目编辑'}
                        aria-expanded={isExpanded}
                      >
                        <ChevronDown className={`size-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-primary' : ''}`} />
                      </Button>
                    </div>
                  </div>

                  {/* 展开的单题详细编辑器 */}
                  {isExpanded && (
                    <div className="p-4 border-t border-border/60 space-y-3.5 bg-card text-xs">
                      <div className="space-y-1">
                        <label className="font-semibold text-foreground">题目标题 / 核心问题 *</label>
                        <Textarea
                          rows={2}
                          className="min-h-[60px] bg-background text-xs"
                          value={q.title || ''}
                          onChange={(e) => handleUpdateQuestion(qIdx, { ...q, title: e.target.value })}
                          disabled={currentBank.isBuiltin}
                          placeholder="输入题目问句…"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-foreground">情境场景 / 背景描述 (选填)</label>
                        <Textarea
                          rows={2}
                          className="min-h-[60px] bg-background text-xs"
                          value={q.scenario || ''}
                          onChange={(e) => handleUpdateQuestion(qIdx, { ...q, scenario: e.target.value })}
                          disabled={currentBank.isBuiltin}
                          placeholder="可选：描绘特定场景或唤醒心防细节…"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="w-48 space-y-1">
                          <label className="font-semibold text-foreground">题目类型</label>
                          <Select
                            value={q.type}
                            onValueChange={(val) => handleUpdateQuestion(qIdx, { ...q, type: val as QuestionType })}
                            disabled={currentBank.isBuiltin}
                          >
                            <SelectTrigger size="sm" className="bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="single_choice">单选题 (single_choice)</SelectItem>
                              <SelectItem value="multiple_choice">多选题 (multiple_choice)</SelectItem>
                              <SelectItem value="open_text">开放手填 (open_text)</SelectItem>
                              <SelectItem value="media_upload">媒体上传 (media_upload)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <label className="flex items-center gap-2 mt-4 cursor-pointer">
                          <Checkbox
                            checked={q.isRequired ?? true}
                            onCheckedChange={(checked) =>
                              handleUpdateQuestion(qIdx, { ...q, isRequired: checked === true })
                            }
                            disabled={currentBank.isBuiltin}
                          />
                          <span>必须作答 (必填项)</span>
                        </label>
                      </div>

                      {/* 选项配置 */}
                      {(q.type === 'single_choice' || q.type === 'multiple_choice') && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">
                              选项与分值配置 ({q.options?.length || 0})
                            </span>
                            {!currentBank.isBuiltin && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs gap-1"
                                onClick={() => handleAddOption(qIdx)}
                              >
                                <Plus className="size-3" /> 添加选项
                              </Button>
                            )}
                          </div>

                          <div className="space-y-2">
                            {(q.options || []).map((opt: any, optIdx: number) => (
                              <div key={opt.id || optIdx} className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="size-6 p-0 flex items-center justify-center font-mono">
                                    {String.fromCharCode(65 + optIdx)}
                                  </Badge>
                                  <Input
                                    type="text"
                                    className="flex-1 h-8 bg-background px-2 text-xs"
                                    value={opt.text || ''}
                                    onChange={(e) => handleUpdateOption(qIdx, optIdx, { ...opt, text: e.target.value })}
                                    disabled={currentBank.isBuiltin}
                                    placeholder="选项内容…"
                                  />
                                  {!currentBank.isBuiltin && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="size-7 p-0 text-destructive hover:bg-destructive/10"
                                      onClick={() => handleDeleteOption(qIdx, optIdx)}
                                      title="删除选项"
                                    >
                                      <X className="size-3.5" />
                                    </Button>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs pl-8">
                                  <span className="text-muted-foreground text-[11px]">维度分值:</span>
                                  {Object.entries(opt.scores || {}).map(([dimKey, scoreVal]) => (
                                    <Badge key={dimKey} variant="secondary" className="gap-1 font-mono text-[11px] h-5">
                                      <span>{dimKey}</span>: <strong>{String(scoreVal)}</strong>
                                      {!currentBank.isBuiltin && (
                                        <button
                                          type="button"
                                          className="hover:text-destructive ml-1"
                                          onClick={() => {
                                            const newScores = { ...opt.scores };
                                            delete newScores[dimKey];
                                            handleUpdateOption(qIdx, optIdx, { ...opt, scores: newScores });
                                          }}
                                        >
                                          ×
                                        </button>
                                      )}
                                    </Badge>
                                  ))}
                                  {!currentBank.isBuiltin && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 px-1.5 text-[11px] text-primary"
                                      onClick={() => {
                                        const dim = window.prompt('请输入维度 key (如 dominance, disparity):');
                                        if (!dim || !dim.trim()) return;
                                        const scoreStr = window.prompt(`请输入维度 ${dim} 的分值:`, '10');
                                        const scoreNum = parseFloat(scoreStr || '0') || 0;
                                        const newScores = { ...(opt.scores || {}), [dim.trim()]: scoreNum };
                                        handleUpdateOption(qIdx, optIdx, { ...opt, scores: newScores });
                                      }}
                                    >
                                      + 分值
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 手填题配置 */}
                      {q.type === 'open_text' && (
                        <div className="space-y-3 pt-2 border-t border-border/50">
                          <div className="space-y-1">
                            <label className="font-semibold text-foreground">占位引导语 (Placeholder)</label>
                            <Input
                              type="text"
                              className="h-8 bg-background px-2 text-xs"
                              value={q.placeholder || ''}
                              onChange={(e) => handleUpdateQuestion(qIdx, { ...q, placeholder: e.target.value })}
                              disabled={currentBank.isBuiltin}
                              placeholder="如：请输入你的真实自白或经历…"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-semibold text-foreground">灵感预设词 (Sparks)</label>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {(q.sparks || []).map((s: string, sIdx: number) => (
                                <Badge key={sIdx} variant="secondary" className="gap-1 text-xs">
                                  <Sparkles className="size-3 text-primary" /> {s}
                                  {!currentBank.isBuiltin && (
                                    <button
                                      type="button"
                                      className="hover:text-destructive ml-0.5"
                                      onClick={() => {
                                        const newSparks = q.sparks.filter((_: any, i: number) => i !== sIdx);
                                        handleUpdateQuestion(qIdx, { ...q, sparks: newSparks });
                                      }}
                                    >
                                      ×
                                    </button>
                                  )}
                                </Badge>
                              ))}
                              {!currentBank.isBuiltin && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => {
                                    const spark = window.prompt('输入预设灵感词：');
                                    if (spark && spark.trim()) {
                                      handleUpdateQuestion(qIdx, { ...q, sparks: [...(q.sparks || []), spark.trim()] });
                                    }
                                  }}
                                >
                                  + 灵感词
                                </Button>
                              )}
                            </div>
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
      <div className="space-y-5 max-w-2xl mx-auto">
        <div className="flex items-center justify-between p-4 rounded-xl border border-border/80 bg-muted/30">
          <div>
            <h3 className="text-sm font-bold text-foreground">交互式问卷仿真器</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              模拟访客答题流程，实时体验排版渲染与分值归集。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              题目: {previewQuestionIndex + 1} / {currentBank.questions?.length || 1}
            </Badge>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPreviewAnswers({})}>
              清空答卷
            </Button>
          </div>
        </div>

        {(!currentBank.questions || currentBank.questions.length === 0) ? (
          <div className="text-center py-12 text-muted-foreground text-sm">题库中暂无题目可供预览</div>
        ) : (
          (() => {
            const q = currentBank.questions[previewQuestionIndex];
            if (!q) return null;
            const userAns = previewAnswers[q.id];

            return (
              <div className="p-6 rounded-xl border border-border/80 bg-card shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs font-medium">
                    #{previewQuestionIndex + 1} · {QUESTION_TYPE_MAP[q.type]?.label}
                  </Badge>
                  {q.isRequired && <Badge variant="outline" className="text-destructive text-[11px]">必答</Badge>}
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground">{q.title}</h3>
                  {q.scenario && <p className="text-xs text-muted-foreground leading-relaxed">{q.scenario}</p>}
                </div>

                {/* 单选题预览 */}
                {q.type === 'single_choice' && (
                  <div className="space-y-2">
                    {(q.options || []).map((opt: any, optIdx: number) => {
                      const selected = userAns === opt.id;
                      return (
                        <button
                          key={opt.id || optIdx}
                          type="button"
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left text-xs transition-colors ${
                            selected
                              ? 'border-primary bg-primary/10 text-primary font-medium'
                              : 'border-border/70 hover:border-border bg-muted/10'
                          }`}
                          onClick={() => setPreviewAnswers({ ...previewAnswers, [q.id]: opt.id })}
                        >
                          <span className="size-5 rounded-full border border-current flex items-center justify-center font-mono text-[10px]">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="flex-1">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 多选题预览 */}
                {q.type === 'multiple_choice' && (
                  <div className="space-y-2">
                    {(q.options || []).map((opt: any, optIdx: number) => {
                      const selList = Array.isArray(userAns) ? userAns : [];
                      const selected = selList.includes(opt.id);
                      return (
                        <button
                          key={opt.id || optIdx}
                          type="button"
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left text-xs transition-colors ${
                            selected
                              ? 'border-primary bg-primary/10 text-primary font-medium'
                              : 'border-border/70 hover:border-border bg-muted/10'
                          }`}
                          onClick={() => {
                            const next = selected ? selList.filter((x: string) => x !== opt.id) : [...selList, opt.id];
                            setPreviewAnswers({ ...previewAnswers, [q.id]: next });
                          }}
                        >
                          <span className="size-5 rounded-md border border-current flex items-center justify-center font-mono text-[10px]">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="flex-1">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 手填题预览 */}
                {q.type === 'open_text' && (
                  <div className="space-y-3">
                    <Textarea
                      rows={4}
                      className="bg-background text-xs"
                      placeholder={q.placeholder || '请输入你的真实自白…'}
                      value={userAns || ''}
                      onChange={(e) => setPreviewAnswers({ ...previewAnswers, [q.id]: e.target.value })}
                    />
                    {q.sparks && q.sparks.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground text-[11px]">灵感词:</span>
                        {q.sparks.map((s: string, sIdx: number) => (
                          <Button
                            key={sIdx}
                            variant="secondary"
                            size="sm"
                            className="h-6 px-2 text-[11px]"
                            onClick={() => {
                              const prev = userAns || '';
                              setPreviewAnswers({
                                ...previewAnswers,
                                [q.id]: prev ? `${prev}，${s}` : s,
                              });
                            }}
                          >
                            + {s}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 上下题导航 */}
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={previewQuestionIndex === 0}
                    onClick={() => setPreviewQuestionIndex((i) => Math.max(0, i - 1))}
                  >
                    上一题
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={previewQuestionIndex >= currentBank.questions.length - 1}
                    onClick={() => setPreviewQuestionIndex((i) => Math.min(currentBank.questions.length - 1, i + 1))}
                  >
                    下一题
                  </Button>
                </div>
              </div>
            );
          })()
        )}
      </div>
    )}

    {/* Tab 4: 原始 JSON */}
    {activeTab === 'json' && (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-xl border border-border/80 bg-muted/30">
          <div>
            <h3 className="text-sm font-bold text-foreground">题库标准 JSON 配置</h3>
            <p className="text-xs text-muted-foreground mt-0.5">与镜界自白答题引擎和 API 契约对齐。</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(currentBank, null, 2));
              setNotice('已复制完整 JSON 到剪贴板');
            }}
          >
            <Copy className="size-3.5" />
            <span>复制 JSON</span>
          </Button>
        </div>

        <pre className="p-4 rounded-xl border border-border/80 bg-muted/40 font-mono text-xs overflow-x-auto max-h-[500px] leading-relaxed text-foreground">
          <code>{JSON.stringify(currentBank, null, 2)}</code>
        </pre>
      </div>
    )}
  </div>
);
