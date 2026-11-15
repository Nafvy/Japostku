import React, { useState } from 'react';
import { Clock, ImageOff, Pin, Tag, User } from 'lucide-react';
import { Link } from '../../context/RouterContext';
import { CATEGORY_LABELS } from '../../lib/categories';
import { relativeTime, rupiah } from '../../lib/format';
import type { PublicPost } from '../../lib/types';
import { VerifiedBadge } from '../shared/VerifiedBadge';

interface PostCardProps {
  post: PublicPost;
}

export function PostCard({ post }: PostCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const coverUrl = post.images[0];

  return (
    <Link
      href={`/p/${post.id}`}
      className="group smooth-lift flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white hover:border-zinc-950 hover:shadow-[0_10px_26px_rgba(0,0,0,0.06)]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-zinc-100 bg-zinc-100">
        {coverUrl && !imgFailed ? (
          <img
            src={coverUrl}
            alt={post.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-3 text-center text-zinc-500">
            <ImageOff className="h-6 w-6" aria-hidden="true" />
            <span className="line-clamp-2 text-xs font-medium">{post.title}</span>
          </div>
        )}

        {post.isPinned && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-zinc-950 px-2 py-1 text-[11px] font-semibold text-white shadow-xs">
            <Pin className="h-3 w-3" aria-hidden="true" />
            <span>Sorotan Pemilik</span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5 sm:p-4">
        <p className="text-base sm:text-lg font-bold text-zinc-950 tabular-nums tracking-tight">
          {rupiah(post.priceIdr)}
        </p>
        <h2 className="line-clamp-2 text-sm font-medium leading-snug text-zinc-950 group-hover:underline">
          {post.title}
        </h2>

        <div className="mt-auto space-y-1.5 pt-2 border-t border-zinc-100">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-950">
            <User className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
            <span className="truncate">{post.sellerName}</span>
            {(post.authorVerified || post.authorIsOwner) && (
              <VerifiedBadge isOwner={post.authorIsOwner} />
            )}
          </div>
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1 truncate">
              <Tag className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{CATEGORY_LABELS[post.category]}</span>
            </span>
            <span className="inline-flex items-center gap-1 shrink-0">
              <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{relativeTime(post.createdAt)}</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
