import type { SelectHTMLAttributes } from 'react';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: Array<{ value: string; label: string }>;
  helperText?: string;
};

export const Select = ({
  label,
  options,
  helperText,
  id,
  className = '',
  ...props
}: SelectProps) => {
  const selectId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <label className="block text-sm font-medium text-ink-base" htmlFor={selectId}>
      {label}
      <select
        id={selectId}
        className={`mt-1 block w-full min-w-0 rounded-control border border-surface-outline bg-surface-raised px-3 py-2 text-sm text-ink-strong shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText ? <span className="mt-1 block text-xs text-ink-muted">{helperText}</span> : null}
    </label>
  );
};
