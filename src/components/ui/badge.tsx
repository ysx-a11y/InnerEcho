import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap shrink-0 transition-colors select-none box-border',
  {
    variants: {
      variant: {
        default: 'bg-[rgba(255,112,166,0.14)] text-[#ffeaf4] border border-[rgba(255,112,166,0.32)]',
        pink: 'bg-[rgba(255,51,119,0.18)] text-[#ff70a6] border border-[rgba(255,51,119,0.4)] shadow-[0_0_12px_rgba(255,51,119,0.25)]',
        purple: 'bg-[rgba(192,132,252,0.16)] text-[#e9d5ff] border border-[rgba(192,132,252,0.35)]',
        gold: 'bg-[rgba(255,209,128,0.15)] text-[#ffd180] border border-[rgba(255,209,128,0.35)]',
        emerald: 'bg-[rgba(52,211,153,0.15)] text-[#6ee7b7] border border-[rgba(52,211,153,0.35)]',
        outline: 'bg-transparent text-[var(--text-secondary)] border border-[rgba(255,112,166,0.22)]',
        subtle: 'bg-white/[0.04] text-[var(--text-secondary)] border border-white/10',
      },
      size: {
        sm: 'text-[11px] px-2 py-0.5',
        default: 'text-xs px-2.5 py-1',
        lg: 'text-sm px-3.5 py-1.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface LuxuryBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const LuxuryBadge = React.forwardRef<HTMLSpanElement, LuxuryBadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  )
);
LuxuryBadge.displayName = 'LuxuryBadge';

export { LuxuryBadge as Badge };

