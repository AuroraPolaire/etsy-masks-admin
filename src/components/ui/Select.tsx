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
    <label className="block text-sm font-medium text-slate-800" htmlFor={selectId}>
      {label}
      <select
        id={selectId}
        className={`mt-1 block w-full rounded-md border border-white/70 bg-white/70 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none backdrop-blur-md transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText ? <span className="mt-1 block text-xs text-slate-500">{helperText}</span> : null}
    </label>
  );
};
