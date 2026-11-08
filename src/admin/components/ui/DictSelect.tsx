import React, { useEffect, useState, useMemo } from 'react';
import type { SysDictItem } from '../../../../shared/apiContracts';
import { getAdminToken } from '../../adminToken';
import { cn } from '../../lib/utils';

export interface DictSelectProps {
  dictCode: string;
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  placeholder?: string;
  clearable?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  disabled?: boolean;
  includeAllOption?: boolean;
  allOptionLabel?: string;
  allOptionValue?: string;
  className?: string;
}

const selectDictCache = new Map<string, SysDictItem[]>();

export const DictSelect: React.FC<DictSelectProps> = ({
  dictCode,
  value,
  onChange,
  label,
  placeholder = '请选择',
  size = 'sm',
  disabled = false,
  includeAllOption = false,
  allOptionLabel = '全部状态',
  allOptionValue = 'all',
  className,
}) => {
  const [items, setItems] = useState<SysDictItem[]>(() => selectDictCache.get(dictCode) ?? []);

  useEffect(() => {
    if (!dictCode || selectDictCache.has(dictCode)) return;

    const token = getAdminToken();
    fetch(`/api/admin/dict/items/${dictCode}`, {
      headers: token ? { 'x-admin-token': token } : {},
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Fetch failed'))))
      .then((data: { success: boolean; items: SysDictItem[] }) => {
        if (data?.success && Array.isArray(data.items)) {
          selectDictCache.set(dictCode, data.items);
          setItems(data.items);
        }
      })
      .catch(() => {
        // ignore fetch error
      });
  }, [dictCode]);

  const selectData = useMemo(() => {
    const list = items.map((i) => ({
      value: i.value,
      label: i.label,
    }));
    if (includeAllOption) {
      return [{ value: allOptionValue, label: allOptionLabel }, ...list];
    }
    return list;
  }, [items, includeAllOption, allOptionValue, allOptionLabel]);

  const sizeClasses =
    size === 'xs'
      ? 'h-7 text-xs px-2'
      : size === 'lg'
      ? 'h-10 text-sm px-3'
      : 'h-8 text-xs px-2.5';

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <label className="text-xs font-medium text-foreground">{label}</label>}
      <select
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val === '' ? null : val);
        }}
        className={cn(
          'flex rounded-md border border-input bg-background text-foreground shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
          sizeClasses
        )}
      >
        <option value="" disabled hidden>
          {placeholder}
        </option>
        {selectData.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DictSelect;
