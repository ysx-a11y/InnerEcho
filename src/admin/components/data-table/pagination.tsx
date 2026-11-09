import React from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons';
import { type Table } from '@tanstack/react-table';
import { cn, getPageNumbers } from '../../lib/utils';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  totalCount?: number;
  className?: string;
}

export function DataTablePagination<TData>({
  table,
  totalCount,
  className,
}: DataTablePaginationProps<TData>) {
  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalPages = Math.max(1, table.getPageCount());
  const pageNumbers = getPageNumbers(currentPage, totalPages);
  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length;
  const totalRowCount = totalCount ?? table.getFilteredRowModel().rows.length;

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-1',
        className
      )}
    >
      <div className="flex items-center gap-3 text-xs text-muted-foreground w-full sm:w-auto justify-between sm:justify-start">
        <div className="whitespace-nowrap font-medium text-foreground">
          共 {totalRowCount} 份卷宗
          {selectedRowCount > 0 && (
            <span className="text-primary ml-1.5">(已选 {selectedRowCount} 条)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-auto min-w-[96px] px-2.5 text-xs whitespace-nowrap">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`} className="text-xs">
                  {pageSize} 条/页
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        <div className="flex items-center justify-center text-xs font-medium text-muted-foreground">
          第 {currentPage} 页 / 共 {totalPages} 页
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            className="size-8 p-0"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">首页</span>
            <DoubleArrowLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="size-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">上一页</span>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>

          {pageNumbers.map((pageNumber, index) => (
            <div key={`${pageNumber}-${index}`} className="flex items-center">
              {pageNumber === '...' ? (
                <span className="px-1 text-xs text-muted-foreground">...</span>
              ) : (
                <Button
                  variant={currentPage === pageNumber ? 'default' : 'outline'}
                  className="h-8 min-w-8 px-2 text-xs"
                  onClick={() => table.setPageIndex((pageNumber as number) - 1)}
                >
                  <span className="sr-only">跳转到第 {pageNumber} 页</span>
                  {pageNumber}
                </Button>
              )}
            </div>
          ))}

          <Button
            variant="outline"
            className="size-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">下一页</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="size-8 p-0"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">末页</span>
            <DoubleArrowRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

