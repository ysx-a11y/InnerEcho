import * as React from 'react';
import { cn } from '../../lib/utils';

export interface LuxuryInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const LuxuryInput = React.forwardRef<HTMLInputElement, LuxuryInputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'input-field w-full rounded-xl border border-[rgba(255,112,166,0.25)] bg-[rgba(14,5,18,0.8)] px-3.5 py-2.5 text-sm text-[#fff0f5] placeholder:text-[rgba(223,184,207,0.35)] outline-none transition-all duration-200 box-border max-w-full focus:border-[#ff70a6] focus:bg-[rgba(22,8,28,0.9)] focus:shadow-[0_0_16px_rgba(255,112,166,0.35)] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
LuxuryInput.displayName = 'LuxuryInput';

export interface LuxuryTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const LuxuryTextarea = React.forwardRef<HTMLTextAreaElement, LuxuryTextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'w-full min-h-[108px] rounded-xl border border-[rgba(255,112,166,0.25)] bg-[rgba(14,5,18,0.8)] p-3 text-sm text-[#fff0f5] placeholder:text-[rgba(223,184,207,0.35)] outline-none transition-all duration-200 box-border max-w-full [word-break:break-word] [overflow-wrap:break-word] overflow-y-auto focus:border-[#ff70a6] focus:bg-[rgba(22,8,28,0.9)] focus:shadow-[0_0_16px_rgba(255,112,166,0.35)] disabled:cursor-not-allowed disabled:opacity-50 resize-y',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
LuxuryTextarea.displayName = 'LuxuryTextarea';

export { LuxuryInput as Input, LuxuryTextarea as Textarea };

