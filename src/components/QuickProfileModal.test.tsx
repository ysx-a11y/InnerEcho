// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuickProfileModal } from './QuickProfileModal';

/**
 * 回归测试：这道门禁产出的 age 必须能通过服务端 analyzeDossierSchema 的
 * /^\d*$/ 约束。历史 bug 是这里提交了 "23-28岁" 这类区间文案，
 * 导致 /api/analyze-dossier 400、卷宗静默不入库。
 */
describe('QuickProfileModal 年龄门禁', () => {
  const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  // happy-dom 不实现"点击 submit 按钮触发表单提交"的默认行为，沿用仓库既有
  // 做法（见 AdminLogin.test.tsx）直接派发 submit 事件。
  const submit = () => {
    const form = screen.getByText('开启深度答题').closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);
  };

  const setNickname = (value: string) => {
    fireEvent.change(screen.getByLabelText('你的名称或昵称：'), { target: { value } });
  };

  it('默认不预填区间文案，且未填年龄时拒绝提交', () => {
    const onConfirm = vi.fn();
    render(<QuickProfileModal {...baseProps} onConfirm={onConfirm} />);

    submit();

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('请输入你的准确年龄（岁）')).toBeDefined();
  });

  it('手动输入岁数后提交纯数字', () => {
    const onConfirm = vi.fn();
    render(<QuickProfileModal {...baseProps} onConfirm={onConfirm} />);

    setNickname('夜樱');
    fireEvent.change(screen.getByLabelText('你的准确年龄（岁）：'), { target: { value: '26' } });
    submit();

    expect(onConfirm).toHaveBeenCalledWith({ nickname: '夜樱', gender: '女', age: '26' });
  });

  it('输入非数字字符时自动剥离，不会把区间文案提交出去', () => {
    const onConfirm = vi.fn();
    render(<QuickProfileModal {...baseProps} onConfirm={onConfirm} />);

    setNickname('夜樱');
    const input = screen.getByLabelText('你的准确年龄（岁）：') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '23-28岁' } });

    expect(input.value).toBe('23');
    submit();
    expect(onConfirm).toHaveBeenCalledWith({ nickname: '夜樱', gender: '女', age: '23' });
  });

  it('快捷年龄芯片给出的也是纯数字', () => {
    const onConfirm = vi.fn();
    render(<QuickProfileModal {...baseProps} onConfirm={onConfirm} />);

    setNickname('夜樱');
    fireEvent.click(screen.getByText('32 岁'));
    submit();

    const payload = onConfirm.mock.calls[0][0] as { age: string };
    expect(payload.age).toBe('32');
    expect(payload.age).toMatch(/^\d*$/);
  });

  it('越界年龄被拦截', () => {
    const onConfirm = vi.fn();
    render(<QuickProfileModal {...baseProps} onConfirm={onConfirm} />);

    setNickname('夜樱');
    fireEvent.change(screen.getByLabelText('你的准确年龄（岁）：'), { target: { value: '99' } });
    submit();

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('已存在的合法年龄会被预填（不会退回区间文案）', () => {
    const onConfirm = vi.fn();
    render(
      <QuickProfileModal {...baseProps} onConfirm={onConfirm} initialNickname="夜樱" initialAge="23-28岁" />
    );

    const input = screen.getByLabelText('你的准确年龄（岁）：') as HTMLInputElement;
    expect(input.value).toBe('23');
    submit();
    expect(onConfirm).toHaveBeenCalledWith({ nickname: '夜樱', gender: '女', age: '23' });
  });

  describe('署名门禁', () => {
    it('不给"匿名"兜底：未填昵称时拒绝提交', () => {
      const onConfirm = vi.fn();
      render(<QuickProfileModal {...baseProps} onConfirm={onConfirm} />);

      fireEvent.change(screen.getByLabelText('你的准确年龄（岁）：'), { target: { value: '26' } });
      submit();

      expect(onConfirm).not.toHaveBeenCalled();
      expect(screen.getByText('名称或昵称至少需要 2 个字符')).toBeDefined();
      expect(document.activeElement).toBe(screen.getByLabelText('你的名称或昵称：'));
    });

    it('已存在的昵称会被预填，不要求用户重复输入', () => {
      const onConfirm = vi.fn();
      render(
        <QuickProfileModal {...baseProps} onConfirm={onConfirm} initialNickname="萧晓" initialAge="26" />
      );

      const input = screen.getByLabelText('你的名称或昵称：') as HTMLInputElement;
      expect(input.value).toBe('萧晓');
      submit();

      expect(onConfirm).toHaveBeenCalledWith({ nickname: '萧晓', gender: '女', age: '26' });
    });

    it('全重复字符的昵称被拦截', () => {
      const onConfirm = vi.fn();
      render(<QuickProfileModal {...baseProps} onConfirm={onConfirm} initialAge="26" />);

      setNickname('aaa');
      submit();

      expect(onConfirm).not.toHaveBeenCalled();
      expect(screen.getByText('名称或昵称不能使用 aa、11 这类重复字符')).toBeDefined();
    });
  });

  describe('字段级即时校验', () => {
    const ageInput = () => screen.getByLabelText('你的准确年龄（岁）：') as HTMLInputElement;

    it('刚打开时不报错（不打扰尚未输入的用户）', () => {
      render(<QuickProfileModal {...baseProps} onConfirm={vi.fn()} />);

      expect(screen.queryByRole('alert')).toBeNull();
      expect(ageInput().getAttribute('aria-invalid')).toBe('false');
    });

    it('失焦后立即就地提示越界，并标记 aria-invalid', () => {
      render(<QuickProfileModal {...baseProps} onConfirm={vi.fn()} />);

      fireEvent.change(ageInput(), { target: { value: '99' } });
      fireEvent.blur(ageInput());

      const alert = screen.getByRole('alert');
      expect(alert.textContent).toContain('18-70');
      expect(ageInput().getAttribute('aria-invalid')).toBe('true');
      expect(ageInput().getAttribute('aria-describedby')).toBe('quick-profile-age-error');
    });

    it('错误提示与输入框关联，改成合法值后自动消失', () => {
      render(<QuickProfileModal {...baseProps} onConfirm={vi.fn()} />);

      fireEvent.change(ageInput(), { target: { value: '9' } });
      fireEvent.blur(ageInput());
      expect(screen.getByRole('alert')).toBeDefined();

      fireEvent.change(ageInput(), { target: { value: '29' } });
      expect(screen.queryByRole('alert')).toBeNull();
      expect(ageInput().getAttribute('aria-invalid')).toBe('false');
      expect(ageInput().getAttribute('aria-describedby')).toBeNull();
    });

    it('点击快捷芯片也会即时消除错误', () => {
      render(<QuickProfileModal {...baseProps} onConfirm={vi.fn()} />);

      fireEvent.blur(ageInput());
      expect(screen.getByRole('alert')).toBeDefined();

      fireEvent.click(screen.getByText('25 岁'));
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('提交失败时把焦点移回出错的字段', () => {
      render(<QuickProfileModal {...baseProps} onConfirm={vi.fn()} />);

      fireEvent.change(screen.getByLabelText('你的名称或昵称：'), { target: { value: '夜樱' } });
      fireEvent.change(ageInput(), { target: { value: '99' } });
      submit();

      expect(document.activeElement).toBe(ageInput());
    });
  });
});
