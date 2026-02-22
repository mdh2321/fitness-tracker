import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d26a] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[#00d26a] text-black hover:bg-[#00b85c]',
        destructive: 'bg-[#ff3b5c] text-white hover:bg-[#e63350]',
        outline: 'border hover:bg-[var(--bg-elevated)]',
        secondary: 'hover:bg-[var(--bg-hover)]',
        ghost: 'hover:bg-[var(--bg-elevated)]',
        link: 'text-[#00d26a] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, style, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const variantStyle: React.CSSProperties = {};
    if (variant === 'outline') {
      variantStyle.borderColor = 'var(--border)';
      variantStyle.color = 'var(--fg-secondary)';
    } else if (variant === 'secondary') {
      variantStyle.background = 'var(--bg-elevated)';
      variantStyle.color = 'var(--fg-secondary)';
    } else if (variant === 'ghost') {
      variantStyle.color = 'var(--fg-secondary)';
    }
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} style={{ ...variantStyle, ...style }} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
