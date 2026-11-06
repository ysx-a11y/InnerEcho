// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DossierSealModal } from './DossierSealModal';
import type { ChapterOneData } from '../data/chapterStructure';

/**
 * 回归测试：这道"绝密封缄"门禁过去
 *   1) 用 `age: initialData?.age || '23-28岁'` 兜底，把区间文案写进提交体；
 *   2) 昵称只判非空，弱于服务端 nicknameSchema。
 * 两者都会让 /api/analyze-dossier 返回 400，卷宗静默不入库。
 */
describe('DossierSealModal 提交体', () => {
  // happy-dom 不实现"点击 submit 按钮触发表单提交"的默认行为，沿用仓库既有做法。
  const submit = () => {
    const form = screen.getByText('签署封印 · 印铸 3D 自白卡与报告').closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);
  };

  it('昵称过短时被前端拦截（与服务端 nicknameSchema 一致）', () => {
    const onConfirm = vi.fn();
    render(<DossierSealModal isOpen initialData={{ nickname: '夜' }} onConfirm={onConfirm} onCancel={vi.fn()} />);

    submit();

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('名称或昵称至少需要 2 个字符')).toBeDefined();
  });

  it('昵称全为重复字符时被前端拦截', () => {
    const onConfirm = vi.fn();
    render(<DossierSealModal isOpen initialData={{ nickname: 'aa' }} onConfirm={onConfirm} onCancel={vi.fn()} />);

    submit();

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('名称或昵称不能使用 aa、11 这类重复字符')).toBeDefined();
  });

  it('不再注入区间年龄文案，历史脏数据会被归一化', () => {
    const onConfirm = vi.fn();
    render(
      <DossierSealModal
        isOpen
        initialData={{ nickname: '夜樱', age: '23-28岁' }}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('例如：教师、金融精英、医师、程序员...'), {
      target: { value: '教师' },
    });
    submit();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const payload = onConfirm.mock.calls[0][0] as ChapterOneData;
    // 关键断言：必须是纯数字，能通过服务端 /^\d*$/
    expect(payload.age).toMatch(/^\d*$/);
    expect(payload.age).toBe('23');
    expect(payload.nickname).toBe('夜樱');
  });

  it('年龄缺失时保持为空而不是套用区间兜底', () => {
    const onConfirm = vi.fn();
    render(<DossierSealModal isOpen initialData={{ nickname: '夜樱' }} onConfirm={onConfirm} onCancel={vi.fn()} />);

    submit();

    const payload = onConfirm.mock.calls[0][0] as ChapterOneData;
    expect(payload.age).toBe('');
  });

  it('跳过按钮直接把控制权交回调用方', () => {
    const onCancel = vi.fn();
    render(<DossierSealModal isOpen initialData={{ nickname: '夜樱' }} onConfirm={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByText('跳过补充，直接生成潜意识诊断报告 →'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('未填职业与人设时保持留白，不写死「自由职业 / 未设定」', () => {
    const onConfirm = vi.fn();
    render(
      <DossierSealModal
        isOpen
        initialData={{ nickname: '夜樱', gender: '女', age: '26' }}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    submit();

    const payload = onConfirm.mock.calls[0][0] as ChapterOneData;
    expect(payload.occupation).toBe('');
    expect(payload.personaTrait).toBe('');
    expect(payload.surfaceTrait).toBe('');
    expect(payload.innerDesire).toBe('');
  });

  it('用户真实填写的职业与人设原样透传', () => {
    const onConfirm = vi.fn();
    render(
      <DossierSealModal
        isOpen
        initialData={{ nickname: '夜樱', gender: '女', age: '26' }}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('例如：教师、金融精英、医师、程序员...'), {
      target: { value: '医师' },
    });
    fireEvent.change(screen.getByPlaceholderText('例如：乖乖女、端庄淑女、高冷精英...'), {
      target: { value: '端庄淑女' },
    });
    submit();

    const payload = onConfirm.mock.calls[0][0] as ChapterOneData;
    expect(payload.occupation).toBe('医师');
    expect(payload.personaTrait).toBe('端庄淑女');
    expect(payload.surfaceTrait).toBe('端庄淑女');
  });

  describe('昵称字段级校验', () => {
    const nicknameInput = () => screen.getByLabelText('自白代号 / 昵称：') as HTMLInputElement;

    it('刚打开时不报错', () => {
      render(<DossierSealModal isOpen initialData={{ nickname: '夜樱' }} onConfirm={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.queryByRole('alert')).toBeNull();
      expect(nicknameInput().getAttribute('aria-invalid')).toBe('false');
    });

    it('失焦后立即就地提示，修正后自动消失', () => {
      render(<DossierSealModal isOpen initialData={{ nickname: '夜樱' }} onConfirm={vi.fn()} onCancel={vi.fn()} />);

      fireEvent.change(nicknameInput(), { target: { value: '夜' } });
      fireEvent.blur(nicknameInput());

      expect(screen.getByRole('alert').textContent).toContain('至少需要 2 个字符');
      expect(nicknameInput().getAttribute('aria-invalid')).toBe('true');

      fireEvent.change(nicknameInput(), { target: { value: '夜樱' } });
      expect(screen.queryByRole('alert')).toBeNull();
      expect(nicknameInput().getAttribute('aria-invalid')).toBe('false');
    });

    it('不再预填"匿名倾诉者"这类占位署名', () => {
      render(<DossierSealModal isOpen initialData={{}} onConfirm={vi.fn()} onCancel={vi.fn()} />);

      expect(nicknameInput().value).toBe('');
    });

    it('没有署名时"跳过补充"不会直接提交，而是就地要求补昵称', () => {
      const onCancel = vi.fn();
      render(<DossierSealModal isOpen initialData={{}} onConfirm={vi.fn()} onCancel={onCancel} />);

      fireEvent.click(screen.getByText('跳过补充，直接生成潜意识诊断报告 →'));

      expect(onCancel).not.toHaveBeenCalled();
      expect(screen.getByRole('alert').textContent).toContain('至少需要 2 个字符');
    });

    it('图片错误仍走顶部提示，不与昵称内联错误混淆', () => {
      render(<DossierSealModal isOpen initialData={{ nickname: '夜樱' }} onConfirm={vi.fn()} onCancel={vi.fn()} />);

      // 弹窗通过 createPortal 挂到 document.body，因此要从 body 上取文件输入
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).not.toBeNull();
      // 伪造一次超限上传：选中的文件数超过额度
      const files = Array.from({ length: 10 }, () => new File(['x'], 'a.png', { type: 'image/png' }));
      fireEvent.change(fileInput, { target: { files } });

      const alerts = screen.getAllByRole('alert');
      expect(alerts.some((el) => el.textContent?.includes('最多上传'))).toBe(true);
      expect(nicknameInput().getAttribute('aria-invalid')).toBe('false');
    });
  });
});
