import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 text-sm font-semibold transition-all duration-200 select-none cursor-pointer disabled:pointer-events-none disabled:opacity-50 touch-manipulation focus:outline-none shrink-0 whitespace-nowrap',
  {
    variants: {
      variant: {
        glow: 'btn-glow text-white shadow-[0_0_24px_rgba(255,51,119,0.45)] hover:shadow-[0_0_32px_rgba(255,112,166,0.65)] hover:-translate-y-0.5 active:translate-y-0',
        secondary: 'btn-secondary text-[#fff0f5] hover:-translate-y-0.5 active:translate-y-0',
        outline: 'border border-[rgba(255,112,166,0.35)] bg-transparent text-[#ff70a6] hover:bg-[rgba(255,112,166,0.12)] hover:border-[#ff70a6]',
        ghost: 'bg-transparent text-[#dfb8cf] hover:text-white hover:bg-[rgba(255,112,166,0.1)]',
        pill: 'rounded-full border border-[rgba(255,112,166,0.3)] bg-[rgba(255,112,166,0.12)] text-[#fff0f5] hover:bg-[rgba(255,112,166,0.22)] hover:border-[#ff70a6]',
        danger: 'bg-rose-950/60 border border-rose-500/40 text-rose-200 hover:bg-rose-900/70 hover:border-rose-400',
      },
      size: {
        default: 'h-10 px-4 py-2 rounded-xl',
        sm: 'h-8 px-3 py-1 text-xs rounded-lg',
        lg: 'h-12 px-6 py-3 text-base rounded-2xl',
        icon: 'size-9 p-0 rounded-xl flex items-center justify-center',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'default',
    },
  }
);

export interface LuxuryButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const LuxuryButton = React.forwardRef<HTMLButtonElement, LuxuryButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);

LuxuryButton.displayName = 'LuxuryButton';

export { LuxuryButton as Button };

