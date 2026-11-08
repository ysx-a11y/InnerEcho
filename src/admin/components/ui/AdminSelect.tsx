import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface AdminSelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface AdminSelectProps<T extends string = string> {
  id?: string;
  value: T;
  options: AdminSelectOption<T>[];
  onChange: (value: T) => void;
  labelPrefix?: string;
  align?: 'left' | 'right';
  className?: string;
}

export function AdminSelect<T extends string = string>({
  id,
  value,
  options,
  onChange,
  labelPrefix,
  align = 'left',
  className,
}: AdminSelectProps<T>): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) ?? options[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} id={id} className={cn('relative inline-flex items-center select-none', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-transparent px-3 py-1 text-xs font-normal text-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer whitespace-nowrap"
      >
        {labelPrefix && <span className="text-muted-foreground font-medium">{labelPrefix}</span>}
        <span>{selectedOption?.label}</span>
        <ChevronDown
          className={cn('size-3.5 opacity-50 shrink-0 transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute top-[calc(100%+4px)] z-50 min-w-36 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'relative flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-sm px-2.5 py-1.5 text-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
                  isSelected && 'bg-accent/60 font-medium text-accent-foreground'
                )}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="size-3 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

