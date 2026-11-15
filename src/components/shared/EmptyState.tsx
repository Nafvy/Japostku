import React from 'react';
import { PackageOpen } from 'lucide-react';
import { Button } from '../ui/Primitives';

interface EmptyStateProps {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="relative flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-grid-mono px-6 py-14 text-center">
      <span aria-hidden="true" className="absolute -left-1 -top-1 h-2 w-2 bg-zinc-950" />
      <span aria-hidden="true" className="absolute -right-1 -top-1 h-2 w-2 bg-zinc-950" />
      <span aria-hidden="true" className="absolute -bottom-1 -left-1 h-2 w-2 bg-zinc-950" />
      <span aria-hidden="true" className="absolute -bottom-1 -right-1 h-2 w-2 bg-zinc-950" />

      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 shadow-xs">
        {icon ?? <PackageOpen className="h-5 w-5" aria-hidden="true" />}
      </div>
      {title && (
        <h3 className="text-base font-semibold text-zinc-950">{title}</h3>
      )}
      <p className="mt-1.5 max-w-md text-sm sm:text-base text-zinc-600 text-pretty">
        {message}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" className="mt-5">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
