// Son de notification partagé (nouveau ticket, etc.), utilisé sur la page
// d'affichage mural et sur les listes de tickets technicien/directeur.
// Lit le son personnalisé enregistré via /affichage/parametres (localStorage,
// par navigateur) ; à défaut, génère un bip par défaut avec la Web Audio API.
//
// Les navigateurs bloquent l'audio tant qu'aucun geste utilisateur n'a eu
// lieu sur la page (politique d'autoplay) : un AudioContext fraîchement créé
// démarre à l'état 'suspended', et rien n'est audible tant qu'il n'est pas
// relancé après un geste (clic/touche/frappe clavier). D'où unlockNotificationAudio,
// à appeler une fois au premier geste — voir useNotificationSoundUnlock ci-dessous.

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioContext) {
    sharedAudioContext = new Ctor();
  }
  return sharedAudioContext;
}

// À appeler dans un handler de geste utilisateur (clic, touche, frappe) pour
// débloquer la lecture audio pour le reste de la session de la page.
export function unlockNotificationAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

function playDefaultNotificationSound() {
  try {
    const audioContext = getAudioContext();
    if (!audioContext) return;
    if (audioContext.state === 'suspended') {
      // Tentative de reprise ; si le navigateur bloque encore (aucun geste
      // n'a eu lieu), le son par défaut restera silencieux jusqu'au premier
      // geste utilisateur — comportement du navigateur, pas une erreur.
      audioContext.resume().catch(() => {});
    }
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.error('Erreur lors de la génération du son de notification:', error);
  }
}

export function playNotificationSound() {
  if (typeof window === 'undefined') return;
  const savedSound = localStorage.getItem('notificationSound');
  if (savedSound) {
    const audio = new Audio(savedSound);
    audio.play().catch((err) => console.error('Erreur lecture son de notification (autoplay bloqué ?):', err));
  } else {
    playDefaultNotificationSound();
  }
}
