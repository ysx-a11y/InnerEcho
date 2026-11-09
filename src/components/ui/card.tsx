import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const cardVariants = cva(
  'glass-card box-border overflow-hidden max-w-full [word-break:break-word] [overflow-wrap:break-word] transition-all duration-300 relative',
  {
    variants: {
      variant: {
        default: 'border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-[18px]',
        glow: 'glass-card-glow border-[rgba(255,112,166,0.35)] shadow-[0_0_30px_rgba(255,51,119,0.22),0_8px_32px_rgba(0,0,0,0.5)]',
        hero: 'portal-hero-card border-[rgba(255,112,166,0.28)]',
        secondary: 'portal-secondary-card border-[rgba(255,112,166,0.18)]',
        highlight: 'result-mobile-card-highlight border-[rgba(255,112,166,0.45)]',
        interactive: 'cursor-pointer hover:border-[rgba(255,150,200,0.4)] hover:-translate-y-0.5',
      },
      padding: {
        none: 'p-0',
        sm: 'p-3 sm:p-4',
        default: 'p-4 sm:p-6',
        lg: 'p-6 sm:p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default',
    },
  }
);

export interface LuxuryCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const LuxuryCard = React.forwardRef<HTMLDivElement, LuxuryCardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, className }))}
      {...props}
    />
  )
);
LuxuryCard.displayName = 'LuxuryCard';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 box-border max-w-full', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg sm:text-xl font-bold tracking-tight text-[#fff0f5] [word-break:break-word]', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-xs sm:text-sm text-[var(--text-secondary)] [word-break:break-word] leading-relaxed', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('box-border max-w-full [word-break:break-word]', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center box-border max-w-full pt-3 sm:pt-4', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

export { LuxuryCard as Card };

