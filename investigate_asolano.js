
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath))
    for (const k in envConfig) process.env[k] = envConfig[k]
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

    // 3. Simular Query Resultante
    console.log("\n--- SIMULACIÓN QUERY COUNT ---")
    
    let query = supabase.from('employees').select('job_positions!inner(area_id)', { count: 'exact', head: true }).eq('is_active', true)

    if (v_area_id) {
        if (isSupervisor) {
            console.log("CAMINO: SUPERVISOR (Area + Sede)")
            query = query.eq('job_positions.area_id', v_area_id).eq('sede', v_sede)
        } else if (isJefe) {
            console.log("CAMINO: JEFE (Solo Area)")
            query = query.eq('job_positions.area_id', v_area_id)
        } else {
            console.log("CAMINO: SIN ROL DE LIDERAZGO EN AREA")
        }
    } else {
        console.log("CAMINO: SIN AREA ID (Business Unit Fallback)")
    }

    const { count, error: countError } = await query
    console.log(`RESULTADO CONTEO: ${count}`)
    if (countError) console.error(countError)
}

investigateAsolano()
