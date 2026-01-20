import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Check,
} from 'lucide-react';
import { cn } from '@/utils';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  sortable?: boolean;
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  actions?: (item: T) => React.ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  pagination,
  sortable = false,
  onSort,
  searchable = false,
  searchPlaceholder = 'Search...',
  onSearch,
  actions,
  isLoading = false,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSort = (key: string) => {
    if (!sortable || !onSort) return;
    
    const newOrder = sortKey === key && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortOrder(newOrder);
    onSort(key, newOrder);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch?.(value);
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    
    if (selectedIds.length === data.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data.map(keyExtractor));
    }
  };

  const handleSelectItem = (id: string) => {
    if (!onSelectionChange) return;
    
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const isAllSelected = data.length > 0 && selectedIds.length === data.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < data.length;

  return (
    <div className="bg-surface-dark rounded-xl border border-white/5 overflow-hidden">
      {/* Search Bar */}
      {searchable && (
        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 bg-background rounded-lg border border-white/10 
                       focus:border-primary focus:outline-none text-sm text-white
                       placeholder:text-text-secondary"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-background/50">
              {selectable && (
                <th className="px-4 py-3 text-left w-12">
                  <button
                    onClick={handleSelectAll}
                    className={cn(
                      'w-5 h-5 rounded border flex items-center justify-center transition-colors',
                      isAllSelected || isSomeSelected
                        ? 'bg-primary border-primary'
                        : 'border-white/20 hover:border-white/40'
                    )}
                  >
                    {(isAllSelected || isSomeSelected) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </button>
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{ width: column.width }}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider',
                    column.sortable && sortable && 'cursor-pointer hover:text-white'
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && sortable && sortKey === column.key && (
                      sortOrder === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )
                    )}
                  </div>
                </th>
              ))}
              {actions && <th className="px-4 py-3 w-12"></th>}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="wait">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}
                    className="px-4 py-12 text-center"
                  >
                    <div className="flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}
                    className="px-4 py-12 text-center text-text-secondary"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((item, index) => {
                  const id = keyExtractor(item);
                  const isSelected = selectedIds.includes(id);

                  return (
                    <motion.tr
                      key={id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => onRowClick?.(item)}
                      className={cn(
                        'border-b border-white/5 transition-colors',
                        onRowClick && 'cursor-pointer hover:bg-white/5',
                        isSelected && 'bg-primary/10'
                      )}
                    >
                      {selectable && (
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectItem(id);
                            }}
                            className={cn(
                              'w-5 h-5 rounded border flex items-center justify-center transition-colors',
                              isSelected
                                ? 'bg-primary border-primary'
                                : 'border-white/20 hover:border-white/40'
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </button>
                        </td>
                      )}
                      {columns.map((column) => (
                        <td key={column.key} className="px-4 py-3 text-sm text-white">
                          {column.render
                            ? column.render(item)
                            : String((item as Record<string, unknown>)[column.key] ?? '')}
                        </td>
                      ))}
                      {actions && (
                        <td className="px-4 py-3">
                          <div onClick={(e) => e.stopPropagation()}>
                            {actions(item)}
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className={cn(
                'p-2 rounded-lg transition-colors',
                pagination.page <= 1
                  ? 'text-text-secondary/50 cursor-not-allowed'
                  : 'text-text-secondary hover:text-white hover:bg-white/10'
              )}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className={cn(
                'p-2 rounded-lg transition-colors',
                pagination.page >= pagination.totalPages
                  ? 'text-text-secondary/50 cursor-not-allowed'
                  : 'text-text-secondary hover:text-white hover:bg-white/10'
              )}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
