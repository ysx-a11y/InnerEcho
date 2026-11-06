import React from 'react';
import {
  AlertTriangle, Check, CheckCircle2, Copy, Download, FileEdit, Globe,
  Info, Loader2, Lock, Save, ShieldAlert, Trash2, X,
} from 'lucide-react';
import type { AdminBankDetail } from '../../adminTypes';

interface BankEditorHeaderProps {
  bank: AdminBankDetail;
  isDirty: boolean;
  saving: boolean;
  onExportJson: () => void;
  onCloneBank: () => void | Promise<void>;
  onAudit: (action: 'approve' | 'reject') => void | Promise<void>;
  onTogglePublish: () => void | Promise<void>;
  onSave: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}

export const BankEditorHeader: React.FC<BankEditorHeaderProps> = ({
  bank: currentBank,
  isDirty,
  saving,
  onExportJson: handleExportJson,
  onCloneBank: handleCloneBank,
  onAudit: handleAudit,
  onTogglePublish: handleTogglePublish,
  onSave: handleSave,
  onDelete: handleDeleteBank,
}) => (
  <>
              {/* 题库头部信息栏 */}
              <div className="bank-editor-header">
                <div className="bank-header-left">
                  <span className="admin-eyebrow">QUESTION BANK EDITOR</span>
                  <h2>{currentBank.title || '未命名题库'}</h2>
                  <div className="bank-header-badges">
                    <span className="bank-id-tag">ID: {currentBank.id}</span>
                    {currentBank.isBuiltin && (
                      <span className="bank-badge-preset"><Lock size={12} /> 核心内置预设（只读保护）</span>
                    )}
                    {currentBank.auditStatus === 'pending' ? (
                      <span className="bank-badge-pending">待审核 · 仅作者可见</span>
                    ) : currentBank.auditStatus === 'approved' ? (
                      <span className="bank-badge-published"><Check size={12} /> 已通过 · 已公开</span>
                    ) : currentBank.auditStatus === 'rejected' ? (
                      <span className="bank-badge-rejected">未通过 · 仅作者可见</span>
                    ) : (
                      <span className="bank-badge-draft">草稿 · 仅作者可见</span>
                    )}
                    {isDirty && <span className="bank-dirty-badge">有未保存修改</span>}
                  </div>
                </div>

                <div className="bank-header-actions">
                  <button
                    className="admin-button admin-button-quiet"
                    onClick={handleExportJson}
                    title="导出为标准 JSON 文件"
                  >
                    <Download size={14} />
                    <span>导出 JSON</span>
                  </button>
                  <button
                    className="admin-button admin-button-quiet"
                    onClick={handleCloneBank}
                    disabled={saving}
                    title="以此题库为蓝本复制副本"
                  >
                    <Copy size={14} />
                    <span>复制副本</span>
                  </button>
                  {/* 1. 待审核状态：显示【通过审核】与【驳回】，绝不显示删除按钮 */}
                  {currentBank.auditStatus === 'pending' && !currentBank.isBuiltin && (
                    <>
                      <button
                        className="admin-button admin-button-primary"
                        onClick={() => void handleAudit('approve')}
                        disabled={saving}
                        title="审核通过后题库将自动上架并对所有用户开放"
                      >
                        <Check size={14} />
                        <span>通过并上架</span>
                      </button>
                      <button
                        className="admin-button admin-button-danger"
                        onClick={() => void handleAudit('reject')}
                        disabled={saving}
                        title="驳回后题库未通过，仅作者可见；驳回后方可物理删除"
                      >
                        <X size={14} />
                        <span>驳回</span>
                      </button>
                    </>
                  )}

                  {/* 保存修改按钮（内置预设只读，不允许保存） */}
                  {!currentBank.isBuiltin && (
                    <button
                      className="admin-button admin-button-primary"
                      onClick={handleSave}
                      disabled={saving || !isDirty}
                    >
                      {saving ? <Loader2 className="admin-spin" size={14} /> : <Save size={14} />}
                      <span>保存修改</span>
                    </button>
                  )}

                  {/* 7. 物理删除按钮：严格限制仅在【已下架】（!isPublished）或【已驳回】（rejected）或【新建草稿】（draft）状态下展示！上架与待审核状态无删除按钮 */}
                  {!currentBank.isBuiltin &&
                    (currentBank.auditStatus === 'rejected' ||
                      (currentBank.auditStatus === 'approved' && !currentBank.isPublished) ||
                      currentBank.auditStatus === 'draft') && (
                      <button
                        className="admin-button admin-button-danger"
                        onClick={handleDeleteBank}
                        disabled={saving}
                        title="物理永久删除该已下架/已驳回题库"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                </div>
              </div>

              {/* 审核状态指引与提示条 */}
              {!currentBank.isBuiltin && currentBank.auditStatus === 'pending' && (
                <div className="bank-audit-callout bank-audit-callout-pending">
                  <div className="bank-audit-callout-content">
                    <ShieldAlert size={20} className="bank-audit-callout-icon" />
                    <div>
                      <div className="bank-audit-callout-title">
                        <span>【待审核题包】正在等待管理员核验</span>
                      </div>
                      <p className="bank-audit-callout-desc">
                        该题库由作者提交审核，当前处于待审保护状态（客户端访客不可见）。请在「题目编排」与「实时仿真」中核验题目内容、选项分值及维度定义，确认合规后点击右侧审核按钮。
                      </p>
                    </div>
                  </div>
                  <div className="bank-audit-callout-actions">
                    <button
                      className="admin-button admin-button-primary"
                      onClick={() => void handleAudit('approve')}
                      disabled={saving}
                      title="审核通过后题库将自动公开上架"
                    >
                      <Check size={14} />
                      <span>通过并上架</span>
                    </button>
                    <button
                      className="admin-button admin-button-danger"
                      onClick={() => void handleAudit('reject')}
                      disabled={saving}
                      title="驳回题库，仅创建者可见"
                    >
                      <X size={14} />
                      <span>驳回</span>
                    </button>
                  </div>
                </div>
              )}

              {!currentBank.isBuiltin && currentBank.auditStatus === 'rejected' && (
                <div className="bank-audit-callout bank-audit-callout-rejected">
                  <div className="bank-audit-callout-content">
                    <AlertTriangle size={20} className="bank-audit-callout-icon" />
                    <div>
                      <div className="bank-audit-callout-title">
                        <span>【已驳回题包】内容未通过审核</span>
                      </div>
                      <p className="bank-audit-callout-desc">
                        该题库未通过审核，当前仅创建者本人可见。您可以根据审核意见修改题目内容后重新通过上架，也可以执行物理删除。
                      </p>
                    </div>
                  </div>
                  <div className="bank-audit-callout-actions">
                    <button
                      className="admin-button admin-button-primary"
                      onClick={() => void handleAudit('approve')}
                      disabled={saving}
                    >
                      <Check size={14} />
                      <span>重新通过上架</span>
                    </button>
                  </div>
                </div>
              )}

              {!currentBank.isBuiltin && currentBank.auditStatus === 'draft' && (
                <div className="bank-audit-callout bank-audit-callout-draft">
                  <div className="bank-audit-callout-content">
                    <FileEdit size={20} className="bank-audit-callout-icon" />
                    <div>
                      <div className="bank-audit-callout-title">
                        <span>【草稿状态】编排调试中，未公开</span>
                      </div>
                      <p className="bank-audit-callout-desc">
                        当前题库处于离线草稿状态，客户端普通用户不可见。完成题目设置与仿真测试后，可随时发布上线向全网用户开放。
                      </p>
                    </div>
                  </div>
                  <div className="bank-audit-callout-actions">
                    <button
                      className="admin-button admin-button-primary"
                      onClick={handleTogglePublish}
                      disabled={saving}
                    >
                      <Globe size={14} />
                      <span>发布上线</span>
                    </button>
                  </div>
                </div>
              )}

              {!currentBank.isBuiltin && currentBank.auditStatus === 'approved' && !currentBank.isPublished && (
                <div className="bank-audit-callout bank-audit-callout-pending">
                  <div className="bank-audit-callout-content">
                    <Info size={20} className="bank-audit-callout-icon" />
                    <div>
                      <div className="bank-audit-callout-title">
                        <span>【已下架状态】已通过审核但未上线</span>
                      </div>
                      <p className="bank-audit-callout-desc">
                        该题库已通过内容合规审核，但当前处于下架离线状态。您可以随时重新发布上线或进行物理删除。
                      </p>
                    </div>
                  </div>
                  <div className="bank-audit-callout-actions">
                    <button
                      className="admin-button admin-button-primary"
                      onClick={handleTogglePublish}
                      disabled={saving}
                    >
                      <Globe size={14} />
                      <span>重新发布上线</span>
                    </button>
                  </div>
                </div>
              )}

              {!currentBank.isBuiltin && currentBank.auditStatus === 'approved' && currentBank.isPublished && (
                <div className="bank-audit-callout bank-audit-callout-approved">
                  <div className="bank-audit-callout-content">
                    <CheckCircle2 size={20} className="bank-audit-callout-icon" />
                    <div>
                      <div className="bank-audit-callout-title">
                        <span>【已通过 · 正式公开上架中】</span>
                      </div>
                      <p className="bank-audit-callout-desc">
                        该题库已公开并在客户端正常提供测评服务，所有普通用户均可在卷宗测评中加载此题包。
                      </p>
                    </div>
                  </div>
                  <div className="bank-audit-callout-actions">
                    <button
                      className="admin-button admin-button-quiet"
                      onClick={handleTogglePublish}
                      disabled={saving}
                      title="下架为离线草稿"
                    >
                      <span>下架为草稿</span>
                    </button>
                  </div>
                </div>
              )}


  </>
);
