import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yrruaymlqncyltkgticg.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_yhrN5vDGiKZfu4Jwb_GXzw_OARinPOd'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
