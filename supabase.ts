import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 🔥 createClient から createBrowserClient に変更します
// これにより、ログイン成功時に自動でクッキー（Cookie）が生成されるようになります！
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)