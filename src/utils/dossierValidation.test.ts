import { describe, expect, it } from 'vitest';
import { describeValidationFailure, fieldLabelFromPath } from './dossierValidation';

describe('fieldLabelFromPath', () => {
  it('取最后一个非数字段作为字段名', () => {
    expect(fieldLabelFromPath(['dossierData', 'chapter1', 'age'])).toBe('年龄');
    expect(fieldLabelFromPath(['dossierData', 'chapter1'])).toBe('第一章基础信息');
  });

  it('跳过数组下标', () => {
    expect(fieldLabelFromPath(['dossierData', 'chapter1', 'avatarUrls', 3])).toBe('照片');
  });

  it('未知字段返回 null', () => {
    expect(fieldLabelFromPath(['dossierData', 'unknownField'])).toBeNull();
    expect(fieldLabelFromPath([])).toBeNull();
    expect(fieldLabelFromPath(undefined)).toBeNull();
  });
});

describe('describeValidationFailure', () => {
  it('把服务端 400 的字段级原因转成可读提示，并说明未保存', () => {
    const message = describeValidationFailure(
      [{ path: ['dossierData', 'chapter1', 'age'], message: '年龄必须为纯数字' }],
      '入参校验失败'
    );

    expect(message).toContain('年龄');
    expect(message).toContain('年龄必须为纯数字');
    expect(message).toContain('尚未保存');
  });

  it('没有 zodErrors 时回退到服务端 message', () => {
    expect(describeValidationFailure(undefined, '缺少会话标识')).toContain('缺少会话标识');
  });

  it('两个来源都缺失时有兜底文案', () => {
    expect(describeValidationFailure(undefined, undefined)).toContain('入参校验失败');
  });
});
