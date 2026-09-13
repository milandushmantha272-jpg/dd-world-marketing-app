import { auth } from '../services/firebase';

/**
 * Attach the current Firebase ID token to same-origin API requests.
 * Firestore remains the source of truth; this only keeps legacy-compatible
 * HTTP calls authenticated while remaining parts of the UI migrate to direct
 * Firestore listeners/writes.
 */
const originalFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const isSameOriginApi = url.startsWith('/') && url.startsWith('/api/');
  if (!isSameOriginApi) return originalFetch(input, init);

  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
  const currentUser = auth.currentUser;
  if (currentUser && !headers.has('Authorization')) {
    try {
      const token = await currentUser.getIdToken(false);
      if (token) headers.set('Authorization', `Bearer ${token}`);
    } catch (error) {
      console.warn('Unable to attach Firebase ID token to API request:', error);
    }
  }

  return originalFetch(input, { ...init, headers });
};
