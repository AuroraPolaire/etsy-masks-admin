import type { TextareaHTMLAttributes } from 'react';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  helperText?: string;
};

export const Textarea = ({ label, helperText, id, className = '', ...props }: TextareaProps) => {
  const textareaId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <label className="block text-sm font-medium text-ink-base" htmlFor={textareaId}>
      {label}
      <textarea
        id={textareaId}
        className={`mt-1 block w-full min-w-0 rounded-control border border-surface-outline bg-surface-raised px-3 py-2 text-sm text-ink-strong shadow-sm outline-none transition placeholder:text-ink-subtle focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted ${className}`}
        {...props}
      />
      {helperText ? <span className="mt-1 block text-xs text-ink-muted">{helperText}</span> : null}
    </label>
  );
};
