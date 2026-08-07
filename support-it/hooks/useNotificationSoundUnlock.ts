'use client';

import { useEffect } from 'react';
import { unlockNotificationAudio } from '../utils/notificationSound';

// Débloque l'audio de notification dès le premier geste utilisateur sur la
// page (clic, touche, frappe clavier) : sans ça, le son déclenché par un
// évènement websocket (nouveau ticket) reste silencieux dans la plupart des
// navigateurs, faute de geste utilisateur au moment précis où il se déclenche.
export default function useNotificationSoundUnlock() {
  useEffect(() => {
    const evenements: (keyof DocumentEventMap)[] = ['pointerdown', 'keydown'];
    const debloquer = () => {
      unlockNotificationAudio();
      evenements.forEach((evt) => document.removeEventListener(evt, debloquer));
    };
    evenements.forEach((evt) => document.addEventListener(evt, debloquer, { once: true }));
    return () => {
      evenements.forEach((evt) => document.removeEventListener(evt, debloquer));
    };
  }, []);
}
