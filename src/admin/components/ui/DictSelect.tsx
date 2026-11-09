import React, { useEffect, useState, useMemo } from 'react';
import type { SysDictItem } from '../../../../shared/apiContracts';
import { getAdminToken } from '../../adminToken';
import { cn } from '../../lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

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
const CLEAR_SENTINEL = '__DICT_CLEAR__';

export const DictSelect: React.FC<DictSelectProps> = ({
  dictCode,
  value,
  onChange,
  label,
  placeholder = '请选择',
  clearable = false,
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
    const list = items
      .filter((i) => i.value !== '')
      .map((i) => ({
        value: i.value,
        label: i.label,
      }));
    if (includeAllOption) {
      return [{ value: allOptionValue || 'all', label: allOptionLabel }, ...list];
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
      <Select
        value={value && value !== '' ? value : undefined}
        disabled={disabled}
        onValueChange={(val) => {
          onChange(val === CLEAR_SENTINEL ? null : val);
        }}
      >
        <SelectTrigger className={cn('bg-background', sizeClasses)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {clearable && !includeAllOption && (
            <SelectItem value={CLEAR_SENTINEL}>{placeholder}</SelectItem>
          )}
          {selectData.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DictSelect;
