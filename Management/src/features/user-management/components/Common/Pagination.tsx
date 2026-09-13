import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
  disabled?: boolean;
}

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
  disabled = false,
}: PaginationProps) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const renderPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    if (startPage > 1) {
      pages.push(
        <Button key={1} variant="outline" disabled={disabled} onClick={() => onPageChange(1)}>
          1
        </Button>
      );
      if (startPage > 2) {
        pages.push(
          <span key="dots1" className="px-2 text-muted-foreground">
            ...
          </span>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={currentPage === i ? 'default' : 'outline'}
          disabled={disabled}
          onClick={() => onPageChange(i)}
        >
          {i}
        </Button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <span key="dots2" className="px-2 text-muted-foreground">
            ...
          </span>
        );
      }
      pages.push(
        <Button key={totalPages} variant="outline" disabled={disabled} onClick={() => onPageChange(totalPages)}>
          {totalPages}
        </Button>
      );
    }

    return pages;
  };

  return (
    <div className="mt-6 flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 shadow-card">
      <div className="text-sm text-muted-foreground">
        Showing <span className="font-mono font-semibold tabular-nums text-foreground">{startItem}</span> to{' '}
        <span className="font-mono font-semibold tabular-nums text-foreground">{endItem}</span> of{' '}
        <span className="font-mono font-semibold tabular-nums text-foreground">{totalItems}</span> items
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          disabled={disabled || currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>

        <div className="flex gap-1">{renderPageNumbers()}</div>

        <Button
          variant="outline"
          size="icon"
          disabled={disabled || currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
