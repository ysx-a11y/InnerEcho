import * as React from 'react';
import { Check, Plus } from 'lucide-react';
import { type Column } from '@tanstack/react-table';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Separator } from '../ui/separator';

export interface DataTableFacetedFilterOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  options: DataTableFacetedFilterOption[];
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues();
  const selectedValues = new Set((column?.getFilterValue() as string[]) || []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 text-xs font-normal border-border/80 hover:border-foreground/30 bg-background shadow-xs gap-1.5',
            selectedValues.size > 0 && 'bg-muted/40 border-primary/40 text-foreground font-medium'
          )}
        >
          <Plus className="size-3.5 text-muted-foreground shrink-0" />
          <span>{title}</span>
          {selectedValues.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-1 h-3.5 bg-border/60" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1.5 py-0 h-4.5 font-normal text-[11px] font-mono lg:hidden"
              >
                {selectedValues.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex items-center">
                {selectedValues.size > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1.5 py-0 h-4.5 font-normal text-[11px]"
                  >
                    已选 {selectedValues.size} 项
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge
                        variant="secondary"
                        key={option.value}
                        className="rounded-sm px-1.5 py-0 h-4.5 font-normal text-[11px] bg-background border border-border/60"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <Command>
          {/* 仅在选项数量大于 5 时展示搜索框，避免 3 项枚举弹出冗余搜索框 */}
          {options.length > 5 && (
            <>
              <CommandInput placeholder={`筛选 ${title}...`} className="h-8 text-xs" />
              <CommandEmpty>未找到匹配选项</CommandEmpty>
            </>
          )}
          <CommandList className="max-h-64 p-1">
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        selectedValues.delete(option.value);
                      } else {
                        selectedValues.add(option.value);
                      }
                      const filterValues = Array.from(selectedValues);
                      column?.setFilterValue(
                        filterValues.length ? filterValues : undefined
                      );
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm cursor-pointer"
                  >
                    <div
                      className={cn(
                        'flex size-3.5 items-center justify-center rounded-xs border border-primary/60 transition-colors',
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <Check className="size-3" />
                    </div>
                    {option.icon && (
                      <option.icon className="size-3.5 text-muted-foreground" />
                    )}
                    <span className="flex-1 truncate">{option.label}</span>
                    {facets?.get(option.value) !== undefined && (
                      <span className="ms-auto font-mono text-[11px] text-muted-foreground">
                        {facets.get(option.value)}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => column?.setFilterValue(undefined)}
                    className="justify-center text-center text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer py-1.5"
                  >
                    清除筛选
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

