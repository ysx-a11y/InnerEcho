import { describe, expect, it } from 'vitest';
import { detectStructuredRefusal } from './llmRefusal.js';

describe('detectStructuredRefusal', () => {
  it('识别跨核心字段的模型拒绝', () => {
    const result = detectStructuredRefusal({
      archetypeTitle: '无法提供分析',
      personaDeconstruction: '抱歉，我无法为你提供或生成这类分析。',
      shadowDeconstruction: '作为 AI，我不能协助完成这项心理解读。',
      psychologicalSublimation: '',
    });
    expect(result.refused).toBe(true);
    expect(result.explicitFields).toHaveLength(2);
  });

  it('不会因为长文中出现“拒绝”或“无法”而误判', () => {
    const result = detectStructuredRefusal({
      archetypeTitle: '边界练习者',
      personaDeconstruction: '你提到自己很少拒绝邀请，这可能让你的日程更容易被外界填满。'.repeat(4),
      shadowDeconstruction: '你写到“我无法立刻回应所有消息”，这里更接近精力分配，而不是对关系的否定。'.repeat(4),
      psychologicalSublimation: '如果愿意，可以先挑一个影响较小的邀请，直接说明自己的时间安排，再观察这种表达是否更适合你。'.repeat(3),
    });
    expect(result.refused).toBe(false);
    expect(result.explicitFields).toHaveLength(0);
  });

  it('单个字段讨论供应商拒绝不会让整份报告失效', () => {
    const result = detectStructuredRefusal({
      archetypeTitle: '表达观察者',
      personaDeconstruction: '你在长文里写到“模型拒绝了我的请求”，这只是你描述的一段经历。'.repeat(5),
      shadowDeconstruction: '你的重点仍然放在表达是否被准确理解，以及对话能否继续。'.repeat(6),
      psychologicalSublimation: '可以先检查问题是否表达了真实目的，再决定是否换一种更直接的说法。'.repeat(4),
    });
    expect(result.refused).toBe(false);
  });
});
