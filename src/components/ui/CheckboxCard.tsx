import type { InputHTMLAttributes } from 'react';

type CheckboxCardProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
};

export const CheckboxCard = ({ label, id, className = '', ...props }: CheckboxCardProps) => {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <label
      className={`flex min-h-12 items-center gap-3 rounded-control border border-surface-outline bg-surface-raised p-3 text-sm font-medium text-ink-base transition hover:bg-surface-muted ${className}`}
      htmlFor={inputId}
    >
      <input
        id={inputId}
        type="checkbox"
        className="size-4 accent-brand focus:ring-brand/20"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
};
