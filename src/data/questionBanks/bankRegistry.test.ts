import { describe, it, expect } from 'vitest';
import { ALL_BANK_METADATA, BANK_IMPORTERS, BANK_DISPLAY_RULES, getBankDisplayRank, sortBanksByDisplayOrder } from './bankRegistry';
import { loadQuestionBankById } from '../../utils/bankLoader';
import { PRESET_BANKS } from '../../../server/presetBanks';

/**
 * 题库内容本体已移出仓库（content/banks/*.json → 构建期生成），
 * 这里只验证「代码侧注册表」与生成物的一致性；内容级断言在
 * content/banks/_expectations.json + scripts/validate-banks.ts。
 */
describe('题库注册表', () => {
  it('元数据按 displayRank 升序排列', () => {
    const ranks = ALL_BANK_METADATA.map((b) => b.displayRank ?? Number.MAX_SAFE_INTEGER);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });

  it('每套题库都有懒加载入口、展示规则与服务端预置记录', () => {
    for (const meta of ALL_BANK_METADATA) {
      expect(BANK_IMPORTERS[meta.id], `${meta.id} 缺少 BANK_IMPORTERS`).toBeTypeOf('function');
      expect(BANK_DISPLAY_RULES.some((r) => r.id === meta.id), `${meta.id} 缺少展示规则`).toBe(true);

      const preset = PRESET_BANKS[meta.id];
      expect(preset, `${meta.id} 缺少服务端预置记录`).toBeDefined();
      expect(preset.isBuiltin).toBe(true);
      expect(preset.questionCount).toBe(preset.questions.length);
    }
  });

  it('懒加载出的题库与元数据标题一致', async () => {
    for (const meta of ALL_BANK_METADATA) {
      const bank = await loadQuestionBankById(meta.id);
      expect(bank, `${meta.id} 懒加载失败`).not.toBeNull();
      expect(bank?.id).toBe(meta.id);
      expect(bank?.questions.length).toBeGreaterThan(0);
      expect(bank?.title).toBeTruthy();
    }
  });

  it('按展示权重排序：人妻在最前，标准 50 题与心相镜像在最后', () => {
    const sorted = sortBanksByDisplayOrder(ALL_BANK_METADATA);
    expect(sorted[0]?.id).toBe('wife_taboo_20');
    const tail = sorted.slice(-2).map((b) => b.id).sort();
    expect(tail).toEqual(['mirror_insight_24', 'standard_bdsm_50']);
  });

  it('未知题库按默认权重排在最后', () => {
    expect(getBankDisplayRank({ id: 'ubk_unknown' })).toBe(500);
    // 社区题库重新投稿拿到新 ubk_ id 后，仍可按标题签名蹭回原来的位次。
    expect(getBankDisplayRank({ id: 'ubk_unknown', title: '体面人妻的聚会与婚房 · 背德日常编年史' })).toBe(10);
  });
});
