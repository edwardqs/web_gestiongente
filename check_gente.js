
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkGente() {
  console.log('--- Checking JEFE DE GENTE positions ---')
  
  const { data: positions, error } = await supabase
    .from('employees') 
    .select('position')
    .ilike('position', '%JEFE DE GENTE%')
    
  if (error) {
    console.error('Error fetching positions:', error)
    return
  }

  // Unique positions
  const uniquePositions = [...new Set(positions.map(p => p.position))]
  console.log(`Found ${uniquePositions.length} unique JEFE DE GENTE positions:`)
  uniquePositions.forEach(p => console.log(`- ${p}`))
}

checkGente()
