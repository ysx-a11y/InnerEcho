import { describe, expect, it } from 'vitest';
import { validateNickname } from './nickname';

describe('validateNickname', () => {
  it('accepts normal nicknames of at least 2 characters', () => {
    expect(validateNickname('小明')).toBeNull();
    expect(validateNickname('ab')).toBeNull();
    expect(validateNickname('Alice')).toBeNull();
    expect(validateNickname(' 猫咪  ')).toBeNull();
  });

  it('rejects empty or single-character nicknames', () => {
    expect(validateNickname('')).not.toBeNull();
    expect(validateNickname('   ')).not.toBeNull();
    expect(validateNickname('a')).not.toBeNull();
    expect(validateNickname('喵')).not.toBeNull();
  });

  it('rejects repeated single-character nicknames', () => {
    expect(validateNickname('aa')).not.toBeNull();
    expect(validateNickname('11')).not.toBeNull();
    expect(validateNickname('AAAA')).not.toBeNull();
    expect(validateNickname('喵喵喵')).not.toBeNull();
  });
});
