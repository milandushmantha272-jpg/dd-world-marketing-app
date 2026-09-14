import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gbszujosgslsjaiibasa.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_y7AXK7PAs06E66sgfn6aaQ_06WNuS0l';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
