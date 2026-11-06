import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface AdminSelectOption<T extends string = string> {
  value: T;
  label: string;
  badge?: string;
}

interface AdminSelectProps<T extends string = string> {
  id?: string;
  value: T;
  options: AdminSelectOption<T>[];
  onChange: (value: T) => void;
  labelPrefix?: string;
  align?: 'left' | 'right';
  style?: React.CSSProperties;
  className?: string;
}

export function AdminSelect<T extends string = string>({
  id,
  value,
  options,
  onChange,
  labelPrefix,
  align = 'left',
  style,
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
    <div
      ref={containerRef}
      id={id}
      className={`admin-custom-select-container ${className || ''}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        userSelect: 'none',
        ...style,
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.38rem 0.75rem',
          background: isOpen ? 'rgba(32, 16, 42, 0.95)' : 'rgba(18, 10, 26, 0.85)',
          border: `1px solid ${isOpen ? '#ff70a6' : 'rgba(255, 112, 166, 0.25)'}`,
          borderRadius: 10,
          color: '#fff0f5',
          fontSize: '0.76rem',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: isOpen ? '0 0 14px rgba(255, 112, 166, 0.3)' : 'none',
          transition: 'all 0.2s ease',
          outline: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {labelPrefix && <span style={{ color: 'var(--admin-text-secondary)', fontWeight: 500 }}>{labelPrefix}</span>}
        <span>{selectedOption?.label}</span>
        <ChevronDown
          size={13}
          style={{
            color: 'var(--admin-text-muted)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            ...(align === 'right' ? { right: 0 } : { left: 0 }),
            zIndex: 1000,
            minWidth: '100%',
            width: 'max-content',
            background: '#160c20',
            border: '1px solid rgba(255, 112, 166, 0.35)',
            borderRadius: 12,
            padding: '0.35rem',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.95), 0 0 25px rgba(255, 51, 119, 0.18)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.8rem',
                  padding: '0.42rem 0.7rem',
                  borderRadius: 8,
                  border: 'none',
                  background: isSelected ? 'rgba(255, 112, 166, 0.2)' : 'transparent',
                  color: isSelected ? '#ff70a6' : '#dfb8cf',
                  fontSize: '0.75rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={12} color="#ff70a6" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
