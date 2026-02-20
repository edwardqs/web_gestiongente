
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Cargar variables asegurando la ruta correcta
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath))
    for (const k in envConfig) process.env[k] = envConfig[k]
} else {
    const envPath2 = path.resolve(process.cwd(), '.env')
    if (fs.existsSync(envPath2)) {
        const envConfig = dotenv.parse(fs.readFileSync(envPath2))
        for (const k in envConfig) process.env[k] = envConfig[k]
    }
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function investigateCounts() {
    console.log("--- INVESTIGANDO CONTEO 318 ---")
    
    // 1. Contar Total Operaciones (Area ID 6)
    const { count: opsCount } = await supabase
        .from('employees')
        .select('job_positions!inner(area_id)', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('job_positions.area_id', 6)
    
    console.log(`Total Empleados Área Operaciones (ID 6): ${opsCount}`)

    // 2. Contar Total Operaciones en Chimbote
    const { count: opsChimbote } = await supabase
        .from('employees')
        .select('job_positions!inner(area_id)', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('job_positions.area_id', 6)
        .eq('sede', 'CHIMBOTE')

    console.log(`Total Empleados Operaciones en CHIMBOTE: ${opsChimbote}`)

    // 3. Contar Total Business Unit 'OPL'
    const { count: oplCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('business_unit', 'OPL')
    console.log(`Total Business Unit 'OPL': ${oplCount}`)

    // 4. Contar Total Business Unit 'BEBIDAS'
    const { count: bebidasCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('business_unit', 'BEBIDAS')
    console.log(`Total Business Unit 'BEBIDAS': ${bebidasCount}`)
}

investigateCounts()
