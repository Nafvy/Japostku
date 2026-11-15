import React from 'react';
import { BadgeCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

interface VerifiedBadgeProps {
  isOwner?: boolean;
  className?: string;
  showText?: boolean;
}

export function VerifiedBadge({
  isOwner = false,
  className,
  showText = false,
}: VerifiedBadgeProps) {
  const label = isOwner ? 'Pemilik terverifikasi' : 'Akun terverifikasi';
  return (
    <span
      className={cn('inline-flex items-center gap-1 shrink-0', className)}
      title={label}
    >
      <BadgeCheck
        className="h-4 w-4 shrink-0 fill-[#1D9BF0] text-white [&>path:first-child]:stroke-[#1D9BF0]"
        aria-label={label}
      />
      {showText && (
        <span className="text-xs font-medium text-zinc-600">{label}</span>
      )}
    </span>
  );
}
