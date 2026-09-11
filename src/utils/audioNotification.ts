/**
 * DD WORLD MARKETING notification + audio helpers.
 *
 * Foreground: browser/system notification when permission is granted.
 * PWA/service-worker capable: uses ServiceWorkerRegistration.showNotification when
 * a controller is available, which is the correct path for installed PWA notifications.
 * Background push still requires a configured push provider/server subscription.
 */

const isBrowser = () => typeof window !== 'undefined';

export const playNotificationChime = () => {
  if (!isBrowser()) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    console.warn('Audio chime playback disabled or muted:', e);
  }
};

export const playRingtone = () => {
  if (!isBrowser()) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(440, ctx.currentTime);
    osc2.frequency.setValueAtTime(480, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.8);
    osc2.stop(ctx.currentTime + 0.8);
  } catch (e) {
    console.warn('Ringtone playback disabled or muted:', e);
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isBrowser() || !('Notification' in window)) return false;
  try {
    if (Notification.permission === 'granted') return true;
    return (await Notification.requestPermission()) === 'granted';
  } catch (e) {
    console.warn('Failed to request notification permission:', e);
    return false;
  }
};

const showSystemNotification = async (
  title: string,
  body: string,
  onDeepLinkClick?: () => void
): Promise<boolean> => {
  if (!isBrowser() || !('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  try {
    // Installed PWA / active service worker: prefer the service-worker path.
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(title, {
          body,
          icon: '/official-logo.png',
          badge: '/official-logo.png',
          tag: `ddworld-notif-${Date.now()}`,
          requireInteraction: true,
          data: { ddworld: true },
        });
        return true;
      }
    }

    const notification = new Notification(title, {
      body,
      icon: '/official-logo.png',
      badge: '/official-logo.png',
      tag: `ddworld-notif-${Date.now()}`,
      requireInteraction: true,
    });

    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      notification.close();
      onDeepLinkClick?.();
    };
    return true;
  } catch (e) {
    console.warn('System notification error:', e);
    return false;
  }
};

export const triggerWebPushNotification = (
  title: string,
  body: string,
  onDeepLinkClick?: () => void
) => {
  if (!isBrowser()) return;
  // One chime per notification; callers should not play the chime separately.
  playNotificationChime();
  void showSystemNotification(title, body, onDeepLinkClick);
};
