import React from 'react';

interface CommentFormProps {
  className?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  placeholder?: string;
  rows?: number;
  submitLabel: string;
  submittingLabel: string;
  submitting: boolean;
  onCancel?: () => void;
  cancelLabel?: string;
}

const CommentForm: React.FC<CommentFormProps> = ({
  className = 'comment-form',
  value,
  onChange,
  onSubmit,
  placeholder,
  rows = 4,
  submitLabel,
  submittingLabel,
  submitting,
  onCancel,
  cancelLabel = '取消',
}) => {
  return (
    <form className={className} onSubmit={onSubmit}>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
      <div className="comment-form-actions">
        {onCancel && (
          <button type="button" className="comment-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
        )}
        <button type="submit" disabled={!value.trim() || submitting}>
          {submitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default CommentForm;
