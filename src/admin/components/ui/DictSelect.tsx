import React, { useEffect, useState, useMemo } from 'react';
import { Select } from '@mantine/core';
import type { SysDictItem } from '../../../../shared/apiContracts';

interface DictSelectProps {
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
}

const selectDictCache = new Map<string, SysDictItem[]>();

export const DictSelect: React.FC<DictSelectProps> = ({
  dictCode,
  value,
  onChange,
  label,
  placeholder = '请选择',
  clearable = true,
  size = 'sm',
  disabled = false,
  includeAllOption = false,
  allOptionLabel = '全部状态',
  allOptionValue = 'all',
}) => {
  const [items, setItems] = useState<SysDictItem[]>(() => selectDictCache.get(dictCode) ?? []);

  useEffect(() => {
    if (!dictCode || selectDictCache.has(dictCode)) return;

    fetch(`/api/admin/dict/items/${dictCode}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Fetch failed'))))
      .then((data: { success: boolean; items: SysDictItem[] }) => {
        if (data.success && Array.isArray(data.items)) {
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

  return (
    <Select
      label={label}
      placeholder={placeholder}
      data={selectData}
      value={value}
      onChange={onChange}
      clearable={clearable}
      size={size}
      disabled={disabled}
      searchable
    />
  );
};
