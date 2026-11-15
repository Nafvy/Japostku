import React from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { cn } from '../../lib/utils';

export function FloatingCreateButton() {
  const { pathname, navigate } = useRouter();
  const { user } = useAuth();

  if (
    pathname === '/akun/postingan/baru' ||
    pathname === '/masuk' ||
    pathname === '/daftar'
  ) {
    return null;
  }

  const isDetailPage = pathname.startsWith('/p/');
  const targetHref = user ? '/akun/postingan/baru' : '/masuk?next=/akun/postingan/baru';

  return (
    <motion.button
      type="button"
      onClick={() => navigate(targetHref)}
      aria-label="Pasang postingan baru"
      title="Pasang postingan baru"
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'fixed right-5 sm:right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-zinc-950 text-white shadow-[0_10px_28px_rgba(0,0,0,0.22)] ring-1 ring-white/15 hover:bg-zinc-800 cursor-pointer',
        isDetailPage ? 'bottom-20 sm:bottom-6' : 'bottom-5 sm:bottom-6'
      )}
    >
      <Plus className="h-6 w-6 stroke-[2.25]" aria-hidden="true" />
    </motion.button>
  );
}
