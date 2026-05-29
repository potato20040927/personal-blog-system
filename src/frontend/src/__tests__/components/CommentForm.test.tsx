import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CommentForm from '../../components/CommentForm';

describe('CommentForm', () => {
  it('內容空白時停用送出按鈕', () => {
    render(
      <CommentForm
        value="   "
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        submitLabel="送出留言"
        submittingLabel="送出中..."
        submitting={false}
      />
    );

    expect(screen.getByRole('button', { name: '送出留言' })).toBeDisabled();
  });

  it('輸入內容後觸發 onChange 與 onSubmit', () => {
    const handleChange = vi.fn();
    const handleSubmit = vi.fn((event) => event.preventDefault());

    render(
      <CommentForm
        value="測試留言"
        onChange={handleChange}
        onSubmit={handleSubmit}
        placeholder="留下你的想法..."
        submitLabel="送出留言"
        submittingLabel="送出中..."
        submitting={false}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('留下你的想法...'), {
      target: { value: '新的內容' },
    });
    fireEvent.click(screen.getByRole('button', { name: '送出留言' }));

    expect(handleChange).toHaveBeenCalledWith('新的內容');
    expect(handleSubmit).toHaveBeenCalled();
  });

  it('有取消處理器時顯示取消按鈕並觸發 callback', () => {
    const handleCancel = vi.fn();

    render(
      <CommentForm
        value="編輯中"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        submitLabel="儲存"
        submittingLabel="儲存中..."
        submitting={false}
        onCancel={handleCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '取消' }));

    expect(handleCancel).toHaveBeenCalled();
  });

  it('送出中時顯示 loading label', () => {
    render(
      <CommentForm
        value="編輯中"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        submitLabel="儲存"
        submittingLabel="儲存中..."
        submitting
      />
    );

    expect(screen.getByRole('button', { name: '儲存中...' })).toBeDisabled();
  });
});
