import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
        secondary:
          'border-transparent bg-slate-800 text-slate-300 border-white/5',
        destructive:
          'border-transparent bg-red-500/15 text-red-400 border-red-500/30',
        outline: 'text-slate-300 border-white/10',
        success:
          'border-transparent bg-teal-500/15 text-teal-300 border-teal-500/30',
        warning:
          'border-transparent bg-amber-500/15 text-amber-300 border-amber-500/30',
        cyan:
          'border-transparent bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
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
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
