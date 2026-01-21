import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Faltan las variables de entorno de Supabase. Asegúrate de configurar .env')
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '')
