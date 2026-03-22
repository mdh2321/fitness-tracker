import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[var(--accent)]/20 text-[var(--accent)]',
        secondary: 'border-transparent bg-[#1a1a24] text-gray-300',
        destructive: 'border-transparent bg-[#ff3b5c]/20 text-[#ff3b5c]',
        outline: 'border-[#2a2a35] text-gray-300',
        strength: 'border-transparent bg-[#8b5cf6]/20 text-[#8b5cf6]',
        cardio: 'border-transparent bg-[var(--accent)]/20 text-[var(--accent)]',
        mixed: 'border-transparent bg-[#00bcd4]/20 text-[#00bcd4]',
        flexibility: 'border-transparent bg-[#ff6b35]/20 text-[#ff6b35]',
        sport: 'border-transparent bg-[#ff3b5c]/20 text-[#ff3b5c]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
