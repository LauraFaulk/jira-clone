import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://gfqkvxvaqipjkmupkdnp.supabase.co";
const supabaseAnonKey = "sb_publishable_ql_asmAXsuZROqu0szqC-A_HKC0e2H1";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);