import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  suffix?: string;
  hint?: string;
}

export function Input({ label, suffix, hint, className = '', ...props }: InputProps) {
  const input = (
    <input
      className={`w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary ${className}`}
      {...props}
    />
  );

  const field = suffix ? (
    <div className="flex">
      {input}
      <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-100 border border-l-0 border-gray-300 rounded-r">
        {suffix}
      </span>
    </div>
  ) : input;

  if (!label) return field;

  return (
    <div className="flex items-center gap-4">
      <label className="w-40 shrink-0 text-right text-sm font-medium text-gray-700">{label}</label>
      {hint && <span className="w-32 shrink-0 text-xs text-gray-500">{hint}</span>}
      <div className="flex-1">{field}</div>
    </div>
  );
}
