'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function useAuthRedirect() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const user = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (!user) {
      router.replace('/connexion');
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  return authChecked;
} 