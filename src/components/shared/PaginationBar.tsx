import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Primitives';

interface PaginationBarProps {
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
}

export function PaginationBar({ page, totalPages, onPageChange }: PaginationBarProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Navigasi halaman"
      className="mt-8 flex items-center justify-between gap-4 border-t border-zinc-200 pt-6"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        <span>Sebelumnya</span>
      </Button>
      <span className="text-sm text-zinc-600 tabular-nums">
        Halaman {page} dari {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <span>Berikutnya</span>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </nav>
  );
}
