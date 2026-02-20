
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

async function investigateAsolano() {
    const email = 'asolano@pauserdistribuciones.com'
    console.log(`--- INVESTIGACIÓN PROFUNDA PARA: ${email} ---`)

    // 1. Obtener Datos EXACTOS del Usuario
    const { data: user, error } = await supabase
        .from('employees')
        .select(`
            id, role, position, sede, business_unit, job_position_id,
            job_positions (id, name, area_id)
        `)
        .eq('email', email)
        .single()
    
    if (error) { console.error(error); return; }

    console.log("DATOS USUARIO:")
    console.log(JSON.stringify(user, null, 2))

    const v_role = (user.role || '').toUpperCase().trim()
    const v_pos = (user.position || '').toUpperCase().trim()
    const v_sede = (user.sede || '').toUpperCase().trim()
    const v_unit = (user.business_unit || '').toUpperCase().trim()
    
    // Simular lógica de Área
    let v_area_id = null
    if (user.job_positions?.area_id) v_area_id = user.job_positions.area_id
    else {
        // Fallback
        const { data: jp } = await supabase.from('job_positions').select('area_id').eq('name', user.position).single()
        if (jp) v_area_id = jp.area_id
    }
    console.log(`AREA ID DETECTADO: ${v_area_id}`)

    // 2. Simular Condiciones del RPC
    console.log("\n--- EVALUACIÓN DE CONDICIONES RPC ---")
    
    const isSupervisor = v_role.includes('SUPERVISOR') || v_role.includes('COORDINADOR') || v_role.includes('ANALISTA') ||
                         v_pos.includes('SUPERVISOR') || v_pos.includes('COORDINADOR') || v_pos.includes('ANALISTA')
    
    console.log(`¿Es SUPERVISOR/COORD/ANALISTA? ${isSupervisor}`)
    console.log(`Role '${v_role}' contains SUPERVISOR? ${v_role.includes('SUPERVISOR')}`)
    console.log(`Pos '${v_pos}' contains SUPERVISOR? ${v_pos.includes('SUPERVISOR')}`)

    const isJefe = v_role.includes('JEFE') || v_pos.includes('JEFE') || v_role.includes('GERENTE')
    console.log(`¿Es JEFE? ${isJefe}`)

    // --- SIMULACIÓN DE CONTEOS ALTERNATIVOS ---
    console.log('\n--- DIAGNÓSTICO DE TOTALES (PARA ENCONTRAR EL "318") ---')
  
    // 1. Total Global
    const { count: countGlobal } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
    console.log(`TOTAL EMPLEADOS ACTIVOS (GLOBAL): ${countGlobal}`)

    // 2. Total en Area 6 (Todas las sedes) -> Hipótesis: Se le trata como JEFE
    const { count: countArea6 } = await supabase
        .from('employees')
        .select('id, job_positions!inner(area_id)', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('job_positions.area_id', 6)
    console.log(`TOTAL AREA 6 (OPERACIONES) - TODAS LAS SEDES: ${countArea6}`)

    // 3. Total en Chimbote (Todas las areas) -> Hipótesis: Filtro de area fallando
    const { count: countChimbote } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('sede', 'CHIMBOTE')
    console.log(`TOTAL CHIMBOTE - TODAS LAS AREAS: ${countChimbote}`)

    // 4. Total Area 6 + Chimbote (Lo que debería ser)
    const { count: countCorrect } = await supabase
        .from('employees')
        .select('id, job_positions!inner(area_id)', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('job_positions.area_id', 6)
        .eq('sede', 'CHIMBOTE')
    console.log(`TOTAL AREA 6 + CHIMBOTE (CORRECTO): ${countCorrect}`)

    // 5. Total con solo filtro de UI (sin seguridad)
    // Si el frontend manda sede='CHIMBOTE' y business_unit='BEBIDAS'
    const { count: countUI } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('sede', 'CHIMBOTE')
        .eq('business_unit', 'BEBIDAS')
    console.log(`TOTAL UI (CHIMBOTE + BEBIDAS) SIN SEGURIDAD: ${countUI}`)

}

investigateAsolano()
