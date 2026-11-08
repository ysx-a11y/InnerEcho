import React, { useState } from 'react';
import { Sparkles, FileText, User } from 'lucide-react';
import type { AdminDossier } from '../adminTypes';
import { formatTime } from '../adminApi';
import { DossierAnalysisTab } from './dossier/DossierAnalysisTab';
import { DossierQuizTab } from './dossier/DossierQuizTab';
import { DossierPersonaTab } from './dossier/DossierPersonaTab';
import { DossierSidebar } from './dossier/DossierSidebar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Badge } from './ui/badge';

interface DossierDetailModalProps {
  dossier: AdminDossier | null;
  onClose: () => void;
  onUpdateParams?: (id: string, patch: { adminNotes?: string }) => void;
  onReanalyze?: (id: string) => void;
  onDelete?: (id: string) => void;
  reanalyzingId?: string | null;
  onZoomImage?: (url: string) => void;
}

export const DossierDetailModal: React.FC<DossierDetailModalProps> = ({
  dossier,
  onClose,
  onUpdateParams,
  onReanalyze,
  onDelete,
  reanalyzingId,
  onZoomImage,
}) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'quiz' | 'persona'>('analysis');

  if (!dossier) return null;

  const isReanalyzing = reanalyzingId === dossier.id;
  const quizPayload = dossier.quizPayload || {};
  const completedBanks = (quizPayload.completedBanks || []) as any[];
  const questionLogs = (quizPayload.questionLogs || []) as any[];
  const userTextAnswers = (quizPayload.userTextAnswers || {}) as Record<string, string>;
  const userMediaAttachments = (quizPayload.userMediaAttachments || {}) as Record<string, any[]>;

  const allMediaEntries = Object.entries(userMediaAttachments).flatMap(([qId, list]) =>
    Array.isArray(list) ? list.map((item) => ({ ...item, qId })) : []
  );

  const totalQuestionsCount =
    completedBanks.reduce((acc: number, b: any) => acc + (b.questions?.length || 0), 0) || questionLogs.length;

  const tabs = [
    { key: 'analysis' as const, label: '🧬 心理画像与深度解构', icon: Sparkles },
    { key: 'quiz' as const, label: `📝 答卷明细 (${totalQuestionsCount})`, icon: FileText },
    { key: 'persona' as const, label: '👤 作答者身份档案', icon: User },
  ];

  return (
    <Dialog open={Boolean(dossier)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl h-[92vh] overflow-hidden flex flex-col p-0 bg-background border-border text-foreground shadow-2xl">
        {/* Header with Tabs */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/80 bg-muted/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold">
                  卷宗全景审计报告：
                  <span className="text-primary ml-1">{dossier.nickname || '匿名访客'}</span>
                </DialogTitle>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {dossier.id}
                </Badge>
              </div>
              <DialogDescription className="font-mono text-xs text-muted-foreground mt-0.5">
                提交于 {formatTime(dossier.createdAt)} · 设备: {dossier.deviceId || '未记录'}
              </DialogDescription>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              {tabs.map((tab) => {
                const isSelected = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </DialogHeader>

        {/* Content Body: Left Tab Area + Right Sidebar */}
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {activeTab === 'analysis' && <DossierAnalysisTab dossier={dossier} />}
            {activeTab === 'quiz' && (
              <DossierQuizTab
                completedBanks={completedBanks}
                questionLogs={questionLogs}
                userTextAnswers={userTextAnswers}
                userMediaAttachments={userMediaAttachments}
                allMediaEntries={allMediaEntries}
                totalQuestionsCount={totalQuestionsCount}
                onZoomImage={onZoomImage}
              />
            )}
            {activeTab === 'persona' && (
              <DossierPersonaTab dossier={dossier} onZoomImage={onZoomImage} />
            )}
          </div>

          {/* Right Admin Sidebar */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border/80 bg-muted/10 overflow-y-auto">
            <DossierSidebar
              dossier={dossier}
              isReanalyzing={isReanalyzing}
              onUpdateParams={onUpdateParams}
              onReanalyze={onReanalyze}
              onDelete={onDelete}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default DossierDetailModal;
