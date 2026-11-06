import React, { useEffect, useRef, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface AdminDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  style?: React.CSSProperties;
}

export const AdminDatePicker: React.FC<AdminDatePickerProps> = ({
  value,
  onChange,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial date
  const parsedDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(parsedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedDate.getMonth()); // 0-indexed

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

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Quick shortcuts
  const setToday = () => {
    const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
    onChange(today);
    setIsOpen(false);
  };

  const setYesterday = () => {
    const yest = new Date(Date.now() + 8 * 3600 * 1000 - 86400000).toISOString().slice(0, 10);
    onChange(yest);
    setIsOpen(false);
  };

  // Calculate calendar matrix
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const days: Array<{ day: number; dateStr: string; isCurrentMonth: boolean }> = [];
  
  // Empty slots for preceding days
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ day: 0, dateStr: '', isCurrentMonth: false });
  }

  // Days in current month
  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(viewMonth + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${viewYear}-${monthStr}-${dayStr}`;
    days.push({ day: d, dateStr, isCurrentMonth: true });
  }

  const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div
      ref={containerRef}
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
          gap: '0.4rem',
          padding: '0.38rem 0.7rem',
          background: isOpen ? 'rgba(28, 20, 36, 0.95)' : 'rgba(18, 12, 24, 0.85)',
          border: `1px solid ${isOpen ? '#ff70a6' : 'rgba(255, 112, 166, 0.25)'}`,
          borderRadius: 10,
          color: '#fff0f5',
          fontSize: '0.76rem',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: isOpen ? '0 0 12px rgba(255, 112, 166, 0.25)' : 'none',
          transition: 'all 0.2s ease',
          outline: 'none',
        }}
      >
        <CalendarIcon size={12} color="#ff70a6" />
        <span>{value || '选择日期'}</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 1000,
            width: 250,
            background: '#160c20',
            border: '1px solid rgba(255, 112, 166, 0.35)',
            borderRadius: 14,
            padding: '0.75rem',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.95), 0 0 25px rgba(255, 51, 119, 0.18)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          {/* Header Month / Year switcher */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: 6,
                color: '#dfb8cf',
                padding: '3px 6px',
                cursor: 'pointer',
                display: 'flex',
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fff0f5' }}>
              {viewYear}年 {viewMonth + 1}月
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: 6,
                color: '#dfb8cf',
                padding: '3px 6px',
                cursor: 'pointer',
                display: 'flex',
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Quick shortcuts */}
          <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.2rem' }}>
            <button
              type="button"
              onClick={setToday}
              style={{
                flex: 1,
                padding: '0.2rem 0.4rem',
                fontSize: '0.68rem',
                borderRadius: 6,
                background: 'rgba(255, 112, 166, 0.12)',
                border: '1px solid rgba(255, 112, 166, 0.3)',
                color: '#ff70a6',
                cursor: 'pointer',
              }}
            >
              今天
            </button>
            <button
              type="button"
              onClick={setYesterday}
              style={{
                flex: 1,
                padding: '0.2rem 0.4rem',
                fontSize: '0.68rem',
                borderRadius: 6,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#dfb8cf',
                cursor: 'pointer',
              }}
            >
              昨天
            </button>
          </div>

          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', gap: 2 }}>
            {WEEK_DAYS.map((wd) => (
              <span key={wd} style={{ fontSize: '0.66rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>
                {wd}
              </span>
            ))}
          </div>

          {/* Day Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {days.map((d, idx) => {
              if (!d.isCurrentMonth) {
                return <div key={`empty-${idx}`} style={{ height: 26 }} />;
              }
              const isSelected = d.dateStr === value;
              return (
                <button
                  key={d.dateStr}
                  type="button"
                  onClick={() => {
                    onChange(d.dateStr);
                    setIsOpen(false);
                  }}
                  style={{
                    height: 26,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 6,
                    border: 'none',
                    background: isSelected ? '#ff70a6' : 'transparent',
                    color: isSelected ? '#120716' : '#fff0f5',
                    fontSize: '0.72rem',
                    fontWeight: isSelected ? 800 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255, 112, 166, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {d.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
