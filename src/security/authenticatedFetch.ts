import { supabase } from '../services/supabase';

/** Attach the current Supabase access token to same-origin API requests. */
const originalFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const isSameOriginApi = url.startsWith('/') && url.startsWith('/api/');
  if (!isSameOriginApi) return originalFetch(input, init);

  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
  if (!headers.has('Authorization')) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
    } catch (error) {
      console.warn('Unable to attach Supabase access token to API request:', error);
    }
  }

  return originalFetch(input, { ...init, headers });
};
