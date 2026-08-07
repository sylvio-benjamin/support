'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { urlConnexion } from '../lib/authRedirect';

export default function useAuthRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const user = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (!user) {
      router.replace(urlConnexion(pathname));
    } else {
      setAuthChecked(true);
    }
  }, [router, pathname]);

  return authChecked;
} 