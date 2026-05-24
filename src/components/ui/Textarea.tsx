import type { TextareaHTMLAttributes } from 'react';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  helperText?: string;
};

export const Textarea = ({ label, helperText, id, className = '', ...props }: TextareaProps) => {
  const textareaId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <label className="block text-sm font-medium text-slate-800" htmlFor={textareaId}>
      {label}
      <textarea
        id={textareaId}
        className={`mt-1 block w-full rounded-md border border-white/70 bg-white/70 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none backdrop-blur-md transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 ${className}`}
        {...props}
      />
      {helperText ? <span className="mt-1 block text-xs text-slate-500">{helperText}</span> : null}
    </label>
  );
};
