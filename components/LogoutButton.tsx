'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { protectedJsonHeaders } from '@/lib/csrf';

export default function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/v1/auth/logout', {
      method: 'POST',
      headers: protectedJsonHeaders(),
      body: '{}',
    });
    router.replace('/');
    router.refresh();
  }

  return <button className={compact ? 'logout-button compact' : 'logout-button'} type="button" onClick={logout}><LogOut size={17} />退出登录</button>;
}
