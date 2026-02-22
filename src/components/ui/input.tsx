import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, style, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d26a] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      style={{
        background: 'var(--bg)',
        borderColor: 'var(--border)',
        color: 'var(--fg)',
        ...style,
      }}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export { Input };
