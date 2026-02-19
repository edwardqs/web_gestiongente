// debug_gente_positions.js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugPositions() {
  console.log('Buscando variaciones de GENTE Y GESTION...')
  
  // Traemos todo lo que tenga "GENTE" o "GESTION" en el cargo
  const { data, error } = await supabase
    .from('employees')
    .select('full_name, position, is_active')
    .or('position.ilike.%GENTE%,position.ilike.%GESTION%,position.ilike.%RRHH%')
    
  if (error) {
    console.error(error)
    return
  }

  console.log('Resultados encontrados:', data.length)
  data.forEach(d => {
      console.log(`- [${d.is_active ? 'ACTIVO' : 'INACTIVO'}] ${d.position} (${d.full_name})`)
  })
}

debugPositions()
