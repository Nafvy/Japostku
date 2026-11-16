import React, { useMemo, useState } from 'react';
import { Banknote, FileText, Image, MessageCircle, Tag, Type } from 'lucide-react';
import { useCategories } from '../../context/CategoriesContext';
import { getCategoryLabel } from '../../lib/categories';
import { postInputSchema, zodFieldErrors } from '../../lib/schemas';
import type { PostCategory } from '../../lib/types';
import { Button, Input, Label, Select, Textarea } from '../ui/Primitives';
import { ImageUploader } from './ImageUploader';

export interface PostFormValues {
  title: string;
  category: PostCategory;
  priceIdr: string;
  description: string;
  images: string[];
  contactWhatsapp: string;
}

interface PostFormProps {
  initialValues: PostFormValues;
  submitLabel: string;
  submitting: boolean;
  serverError?: string | null;
  serverFieldErrors?: Record<string, string>;
  onSubmit: (values: {
    title: string;
    category: PostCategory;
    priceIdr: number;
    description: string;
    images: string[];
    contactWhatsapp: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function PostForm({
  initialValues,
  submitLabel,
  submitting,
  serverError,
  serverFieldErrors,
  onSubmit,
  onCancel,
}: PostFormProps) {
  const { categories } = useCategories();
  const [title, setTitle] = useState(initialValues.title);
  const [category, setCategory] = useState<PostCategory>(
    initialValues.category || categories[0]?.slug || 'elektronik'
  );
  const [priceIdr, setPriceIdr] = useState(initialValues.priceIdr);
  const [description, setDescription] = useState(initialValues.description);
  const [images, setImages] = useState<string[]>(initialValues.images);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [contactWhatsapp, setContactWhatsapp] = useState(initialValues.contactWhatsapp);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const categoryOptions = useMemo(() => {
    if (
      initialValues.category &&
      !categories.some((c) => c.slug === initialValues.category)
    ) {
      return [
        ...categories,
        {
          slug: initialValues.category,
          label: getCategoryLabel(initialValues.category, categories),
        },
      ];
    }
    return categories;
  }, [categories, initialValues.category]);

  const fieldErrors = { ...clientErrors, ...(serverFieldErrors || {}) };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadingImages) {
      return;
    }
    const numericPrice = priceIdr.trim() === '' ? -1 : Number(priceIdr);
    const parsed = postInputSchema.safeParse({
      title,
      category,
      priceIdr: numericPrice,
      description,
      images,
      contactWhatsapp,
    });
    if (!parsed.success) {
      setClientErrors(zodFieldErrors(parsed.error));
      return;
    }
    setClientErrors({});
    await onSubmit(parsed.data);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {serverError && (
        <div
          role="alert"
          className="rounded-lg border border-zinc-950 bg-zinc-950 px-4 py-3 text-sm font-medium text-white"
        >
          {serverError}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="post-images" className="inline-flex items-center gap-1.5">
          <Image className="h-4 w-4 text-zinc-600" aria-hidden="true" />
          <span>Foto barang atau jasa, 1 sampai 5 foto</span>
        </Label>
        <ImageUploader
          value={images}
          onChange={(next) => {
            setImages(next);
            if (clientErrors.images) {
              setClientErrors((prev) => ({ ...prev, images: '' }));
            }
          }}
          onUploadingChange={setUploadingImages}
          error={fieldErrors.images}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="post-title" className="inline-flex items-center gap-1.5">
          <Type className="h-4 w-4 text-zinc-600" aria-hidden="true" />
          <span>Judul postingan</span>
        </Label>
        <Input
          id="post-title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder="Contoh: Kamera Sony A7 III lengkap dengan lensa"
          aria-invalid={Boolean(fieldErrors.title)}
        />
        <div className="flex items-center justify-between gap-2 text-xs">
          {fieldErrors.title ? (
            <span className="font-medium text-zinc-950">{fieldErrors.title}</span>
          ) : (
            <span className="text-zinc-500">3 sampai 80 karakter</span>
          )}
          <span className="text-zinc-500 tabular-nums">
            {title.length}/80
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="post-category" className="inline-flex items-center gap-1.5">
            <Tag className="h-4 w-4 text-zinc-600" aria-hidden="true" />
            <span>Kategori</span>
          </Label>
          <Select
            id="post-category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as PostCategory)}
            className="w-full"
          >
            {categoryOptions.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.label}
              </option>
            ))}
          </Select>
          {fieldErrors.category && (
            <p className="text-xs font-medium text-zinc-950">{fieldErrors.category}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="post-price" className="inline-flex items-center gap-1.5">
            <Banknote className="h-4 w-4 text-zinc-600" aria-hidden="true" />
            <span>Harga dalam Rupiah</span>
          </Label>
          <Input
            id="post-price"
            name="priceIdr"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={priceIdr}
            onChange={(e) => setPriceIdr(e.target.value)}
            placeholder="0 untuk Gratis"
            aria-invalid={Boolean(fieldErrors.priceIdr)}
          />
          {fieldErrors.priceIdr ? (
            <p className="text-xs font-medium text-zinc-950">{fieldErrors.priceIdr}</p>
          ) : (
            <p className="text-xs text-zinc-500">
              Isi 0 jika diberikan gratis
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="post-description" className="inline-flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-zinc-600" aria-hidden="true" />
          <span>Deskripsi</span>
        </Label>
        <Textarea
          id="post-description"
          name="description"
          rows={6}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Jelaskan kondisi barang, kelengkapan, atau cakupan jasa yang ditawarkan."
          aria-invalid={Boolean(fieldErrors.description)}
        />
        <div className="flex items-center justify-between gap-2 text-xs">
          {fieldErrors.description ? (
            <span className="font-medium text-zinc-950">{fieldErrors.description}</span>
          ) : (
            <span className="text-zinc-500">10 sampai 2000 karakter</span>
          )}
          <span className="text-zinc-500 tabular-nums">
            {description.length}/2000
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="post-whatsapp" className="inline-flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4 text-zinc-600" aria-hidden="true" />
          <span>Nomor WhatsApp</span>
        </Label>
        <Input
          id="post-whatsapp"
          name="contactWhatsapp"
          type="tel"
          inputMode="tel"
          value={contactWhatsapp}
          onChange={(e) => setContactWhatsapp(e.target.value)}
          placeholder="Contoh: 081234567890"
          aria-invalid={Boolean(fieldErrors.contactWhatsapp)}
        />
        {fieldErrors.contactWhatsapp ? (
          <p className="text-xs font-medium text-zinc-950">{fieldErrors.contactWhatsapp}</p>
        ) : (
          <p className="text-xs text-zinc-500">
            Pembeli akan menghubungi langsung ke nomor ini lewat WhatsApp.
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Batal
        </Button>
        <Button type="submit" disabled={submitting || uploadingImages}>
          {uploadingImages ? 'Mengunggah foto...' : submitting ? 'Menyimpan...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
