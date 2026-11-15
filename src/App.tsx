import React from 'react';
import { MotionConfig } from 'motion/react';
import { AuthProvider } from './context/AuthContext';
import { RouterProvider, useRouter } from './context/RouterContext';
import { ToastProvider } from './context/ToastContext';
import { SiteHeader } from './components/layout/SiteHeader';
import { SiteFooter } from './components/layout/SiteFooter';
import { FloatingCreateButton } from './components/layout/FloatingCreateButton';
import { HomePage } from './pages/HomePage';
import { PostDetailPage } from './pages/PostDetailPage';
import { RulesPage } from './pages/RulesPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import {
  EditPostPage,
  MyPostsPage,
  NewPostPage,
  ProfilePage,
} from './pages/AccountPages';
import {
  AdminGuard,
  AdminOverviewPage,
  AdminPostsPage,
  AdminUsersPage,
} from './pages/AdminPages';
import { NotFoundPage } from './pages/NotFoundPage';

function AppRoutes() {
  const { pathname } = useRouter();
  const cleanPath = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  if (cleanPath === '/') {
    return <HomePage />;
  }
  if (cleanPath === '/aturan') {
    return <RulesPage />;
  }
  if (cleanPath === '/masuk') {
    return <LoginPage />;
  }
  if (cleanPath === '/daftar') {
    return <RegisterPage />;
  }
  if (cleanPath === '/akun/postingan') {
    return <MyPostsPage />;
  }
  if (cleanPath === '/akun/postingan/baru') {
    return <NewPostPage />;
  }
  if (cleanPath === '/akun/profil') {
    return <ProfilePage />;
  }

  const editMatch = cleanPath.match(/^\/akun\/postingan\/([^/]+)\/ubah$/);
  if (editMatch) {
    return <EditPostPage postId={decodeURIComponent(editMatch[1])} />;
  }

  const postMatch = cleanPath.match(/^\/p\/([^/]+)$/);
  if (postMatch) {
    return <PostDetailPage postId={decodeURIComponent(postMatch[1])} />;
  }

  if (cleanPath === '/admin') {
    return (
      <AdminGuard>
        <AdminOverviewPage />
      </AdminGuard>
    );
  }
  if (cleanPath === '/admin/pengguna') {
    return (
      <AdminGuard>
        <AdminUsersPage />
      </AdminGuard>
    );
  }
  if (cleanPath === '/admin/postingan') {
    return (
      <AdminGuard>
        <AdminPostsPage />
      </AdminGuard>
    );
  }

  return <NotFoundPage />;
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <RouterProvider>
        <AuthProvider>
          <ToastProvider>
            <div className="flex min-h-dvh flex-col bg-white text-zinc-950">
              <SiteHeader />
              <AppRoutes />
              <SiteFooter />
              <FloatingCreateButton />
            </div>
          </ToastProvider>
        </AuthProvider>
      </RouterProvider>
    </MotionConfig>
  );
}
