import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Single warning if variables are missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Missing Supabase environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,      // Essential for university students using mobile/laptops
    autoRefreshToken: true,    // Fixes the "JWT Expired" error by renewing tokens
    detectSessionInUrl: true,  // Helpful for OAuth/Email confirmation redirects
    storageKey: 'uniease-auth' // Prevents conflicts with other Supabase projects in localhost
  }
});
