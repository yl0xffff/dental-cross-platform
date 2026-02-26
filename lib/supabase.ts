import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ftgabrbnltpubtkqivvh.supabase.co';
const supabaseAnonKey = 'sb_publishable_gJJLToe62BhSre8p8fevQA_3uL_IGeR';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);