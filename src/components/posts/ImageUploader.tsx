import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, RefreshCw, Star, Trash2 } from 'lucide-react';
import { compressImage, validateImageFile } from '../../lib/images';
import { cn } from '../../lib/utils';

export interface UploadedImageItem {
  id: string;
  path?: string;
  previewUrl: string;
  file?: File;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

interface ImageUploaderProps {
  value: string[];
  onChange: (paths: string[]) => void;
  error?: string;
}

export function ImageUploader({ value, onChange, error }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [items, setItems] = useState<UploadedImageItem[]>(() =>
    value.map((p, idx) => ({
      id: `init-${idx}-${p}`,
      path: p,
      previewUrl: p,
      status: 'done',
    }))
  );

  const lastSyncedRef = useRef<string>(JSON.stringify(value));

  useEffect(() => {
    const donePaths = items
      .filter((it) => it.status === 'done' && it.path)
      .map((it) => it.path!);
    const serialized = JSON.stringify(donePaths);
    if (serialized !== lastSyncedRef.current) {
      lastSyncedRef.current = serialized;
      onChangeRef.current(donePaths);
    }
  }, [items]);

  const uploadSingle = async (itemId: string, file: File) => {
    try {
      const compressed = await compressImage(file);
      const res = await fetch('/api/uploads', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': compressed.type || 'image/webp',
        },
        body: compressed,
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: true; data: { path: string } }
        | { ok: false; error: string }
        | null;

      if (!res.ok || !json || !json.ok) {
        const msg = json && !json.ok ? json.error : 'Gagal mengunggah gambar.';
        setItems((prev) =>
          prev.map((it) =>
            it.id === itemId ? { ...it, status: 'error', error: msg } : it
          )
        );
        return;
      }

      setItems((prev) =>
        prev.map((it) =>
          it.id === itemId
            ? { ...it, status: 'done' as const, path: json.data.path, error: undefined }
            : it
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memproses gambar.';
      setItems((prev) =>
        prev.map((it) =>
          it.id === itemId ? { ...it, status: 'error', error: message } : it
        )
      );
    }
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const remainingSlots = Math.max(0, 5 - items.length);
    const chosen = files.slice(0, remainingSlots);

    const added: UploadedImageItem[] = chosen.map((file, idx) => {
      const id = `up-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`;
      const validationError = validateImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      if (validationError) {
        return {
          id,
          previewUrl,
          file,
          status: 'error',
          error: validationError,
        };
      }
      return {
        id,
        previewUrl,
        file,
        status: 'uploading',
      };
    });

    setItems((prev) => [...prev, ...added]);
    for (const item of added) {
      if (item.status === 'uploading' && item.file) {
        void uploadSingle(item.id, item.file);
      }
    }
  };

  const handleRemove = (itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  const handleMakeCover = (itemId: string) => {
    setItems((prev) => {
      const target = prev.find((it) => it.id === itemId);
      if (!target) return prev;
      return [target, ...prev.filter((it) => it.id !== itemId)];
    });
  };

  const handleRetry = (item: UploadedImageItem) => {
    if (!item.file) return;
    setItems((prev) =>
      prev.map((it) =>
        it.id === item.id ? { ...it, status: 'uploading', error: undefined } : it
      )
    );
    void uploadSingle(item.id, item.file);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className={cn(
              'relative overflow-hidden rounded-xl border bg-zinc-100',
              item.status === 'error' ? 'border-zinc-950' : 'border-zinc-200'
            )}
          >
            <div className="relative aspect-[4/3] w-full">
              <img
                src={item.previewUrl}
                alt={`Foto unggahan ${idx + 1}`}
                className="h-full w-full object-cover"
              />

              {idx === 0 && item.status === 'done' && (
                <span className="absolute left-2 top-2 rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-xs font-semibold text-zinc-950">
                  Sampul
                </span>
              )}

              {item.status === 'uploading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-medium text-white">
                  Mengunggah...
                </div>
              )}

              {item.status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/75 p-2 text-center text-white">
                  <p className="text-xs leading-tight">{item.error}</p>
                  {item.file && (
                    <button
                      type="button"
                      onClick={() => handleRetry(item)}
                      className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-zinc-950 cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Coba lagi</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-1 border-t border-zinc-200 bg-white px-2.5 py-1.5">
              {idx > 0 && item.status === 'done' ? (
                <button
                  type="button"
                  onClick={() => handleMakeCover(item.id)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-zinc-950 hover:underline cursor-pointer"
                >
                  <Star className="h-3 w-3" aria-hidden="true" />
                  <span>Jadikan sampul</span>
                </button>
              ) : (
                <span className="text-xs text-zinc-500">
                  Foto {idx + 1}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                aria-label={`Hapus foto ${idx + 1}`}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {items.length < 5 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-full min-h-[156px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-center text-sm text-zinc-600 transition-colors hover:border-zinc-950 hover:text-zinc-950 cursor-pointer"
          >
            <ImagePlus className="h-6 w-6" aria-hidden="true" />
            <span className="font-medium">Tambah foto</span>
            <span className="text-xs text-zinc-500">JPG, PNG, WebP · Maksimal 5 MB</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFilesSelected}
        className="sr-only"
        aria-label="Pilih berkas gambar"
      />

      {error && (
        <p className="text-sm font-medium text-zinc-950" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
