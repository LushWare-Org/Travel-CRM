import type { ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /** Right-aligned, rendered in the mono/tabular data face - use for prices, IDs, dates, counts. */
  numeric?: boolean;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  className?: string;
}

function cellValue<T>(row: T, key: string): ReactNode {
  const value = (row as Record<string, unknown>)[key];
  return value == null ? null : String(value);
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  loading = false,
  emptyMessage = 'No results.',
  sortKey,
  sortDirection = 'asc',
  onSort,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn('rounded-lg border border-border bg-card shadow-card', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => {
              const isSorted = sortKey === column.key;
              const SortIcon = isSorted ? (sortDirection === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
              return (
                <TableHead
                  key={column.key}
                  className={cn(column.numeric && 'text-right', column.className)}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort?.(column.key)}
                      className={cn(
                        'inline-flex items-center gap-1 hover:text-foreground',
                        column.numeric && 'flex-row-reverse'
                      )}
                    >
                      {column.header}
                      <SortIcon className={cn('size-3.5', !isSorted && 'text-muted-foreground/50')} />
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 3 }).map((_, rowIndex) => (
              <TableRow key={`loading-${rowIndex}`}>
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    <div className="h-4 w-full max-w-32 animate-pulse rounded bg-muted" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-10 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={getRowKey(row)}>
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      column.numeric && 'text-right font-mono tabular-nums',
                      column.className
                    )}
                  >
                    {column.render ? column.render(row) : cellValue(row, column.key)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
