export interface ChapterOneData {
  nickname: string;          // 名称或昵称 (必填)
  gender?: string;           // 性别 (可选: '女' | '男' | '保密')
  occupation?: string;       // 职业 (可选)
  avatarUrl?: string;        // 第一张照片（向后兼容，= avatarUrls[0]）
  avatarUrls?: string[];    // 多张照片（压缩后 DataURL）
  personaTrait?: string;     // 人前社交面具/形象 (可选)
  age?: string;              // 年龄 (可选)
  maritalStatus?: string;    // 婚姻状态 (可选)
  hasBoyfriend?: string;     // 是否有男友 (可选)
  surfaceTrait?: string;     // 人前展现出的具体性格特征 (可选)
  innerDesire?: string;      // 无人时真正的暗面渴望 (可选)
  durationSeconds?: number;  // 第一章填写停留时间 (秒)
}

export interface ChapterTwoData {
  boundaryText: string;      // 【边界试探】最想体验但未越过的边界
  fantasyText: string;       // 【心跳画面】难以启齿的私密幻想
  relationPreference: string;// 【权责倾向】渴望对方对我...
  awakeningMoment: string;   // 【觉醒契机】第一次意识到反差的瞬间
  durationSeconds?: number;  // 第二章填写停留时间 (秒)
}

export interface ChapterThreeData {
  secretWords: string;       // 密室第一句话
  secretRule: string;        // 私密法则
  durationSeconds?: number;  // 第三章填写停留时间 (秒)
}

import { TelemetryMetrics } from '../utils/telemetryTracker';

export interface FullDossierData {
  chapter1: ChapterOneData;
  chapter2: ChapterTwoData;
  chapter3: ChapterThreeData;
  selectedShadowTags: string[];
  depthRating: 'light' | 'medium' | 'deep';
  telemetry?: TelemetryMetrics;
  selectedBankIds?: string[];
  completedBanks?: any[];
  aggregatedScores?: Record<string, number>;
  collectedTags?: string[];
  questionLogs?: any[];
  userTextAnswers?: Record<string, string>;
  userMediaAttachments?: Record<string, any[]>;
  totalDurationSeconds?: number;
}

// Calculate Openness & Defense Index based on filled vs empty inputs
export function calculateBehaviorOpenness(data: FullDossierData) {
  const ch1 = data?.chapter1 || {};
  const ch2 = data?.chapter2 || {};
  const ch3 = data?.chapter3 || {};

  const fields = [
    ch1.gender,
    ch1.occupation,
    ch1.personaTrait,
    ch1.age,
    ch1.maritalStatus,
    ch1.surfaceTrait,
    ch1.innerDesire,
    ch2.boundaryText,
    ch2.fantasyText,
    ch2.relationPreference,
    ch2.awakeningMoment,
    ch3.secretWords,
    ch3.secretRule,
  ];

  const filledCount = fields.filter((f) => f && f.trim().length > 0).length;
  const totalCount = fields.length;
  const opennessPercent = Math.round((filledCount / totalCount) * 100);

  let opennessTrait = '';
  if (opennessPercent >= 80) {
    opennessTrait = '完全敞开 · 勇敢倾诉型 (真实无保留)';
  } else if (opennessPercent >= 50) {
    opennessTrait = '适度防备 · 边界试探型 (保留私密核心)';
  } else {
    opennessTrait = '高度克制 · 隐秘防范型 (用留白保护自己)';
  }

  return {
    filledCount,
    totalCount,
    opennessPercent,
    opennessTrait,
  };
}
