import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap shrink-0 transition-all duration-200 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 cursor-pointer',
        size === 'sm' && 'min-h-9 px-3.5 text-sm',
        size === 'md' && 'min-h-11 sm:min-h-10 px-4 py-2 text-sm',
        size === 'lg' && 'min-h-12 px-5 py-2.5 text-base',
        variant === 'primary' &&
          'bg-zinc-950 text-white hover:bg-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.08)]',
        variant === 'secondary' &&
          'bg-zinc-100 text-zinc-950 hover:bg-zinc-200 border border-zinc-200',
        variant === 'outline' &&
          'border border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400 hover:bg-zinc-50',
        variant === 'ghost' &&
          'bg-transparent text-zinc-950 hover:bg-zinc-100',
        variant === 'destructive' &&
          'bg-zinc-950 text-white hover:bg-zinc-800 border border-zinc-950',
        className
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('block text-sm font-medium text-zinc-950', className)}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full min-h-11 sm:min-h-10 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-base sm:text-sm text-zinc-950 placeholder:text-zinc-400 transition-colors duration-150 focus:border-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:opacity-60',
        className
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-zinc-950 placeholder:text-zinc-400 transition-colors duration-150 focus:border-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:opacity-60',
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'min-h-11 sm:min-h-10 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-base sm:text-sm text-zinc-950 transition-colors duration-150 focus:border-zinc-950 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-lg bg-zinc-100', className)}
    />
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Batal',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl"
          >
            <h2 id="dialog-title" className="text-lg font-semibold text-zinc-950">
              {title}
            </h2>
            <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
              {description}
            </p>
            {children && <div className="mt-4">{children}</div>}
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                ref={cancelRef}
                variant="outline"
                onClick={onCancel}
                disabled={busy}
              >
                {cancelLabel}
              </Button>
              <Button
                variant={destructive ? 'destructive' : 'primary'}
                onClick={onConfirm}
                disabled={busy}
              >
                {busy ? 'Memproses...' : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
