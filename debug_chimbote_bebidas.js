
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Configuración de entorno
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath))
    for (const k in envConfig) {
        process.env[k] = envConfig[k]
    }
} else {
    const envPath2 = path.resolve(process.cwd(), '.env')
    if (fs.existsSync(envPath2)) {
        const envConfig = dotenv.parse(fs.readFileSync(envPath2))
        for (const k in envConfig) {
            process.env[k] = envConfig[k]
        }
    }
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function debugChimbote() {
    console.log("--- 1. BUSCANDO AL SUPERVISOR ---")
    const { data: supervisorData, error: supError } = await supabase
        .from('employees')
        .select(`id, email, full_name, position, sede, business_unit, job_position_id`)
        .eq('sede', 'CHIMBOTE')
        .eq('business_unit', 'BEBIDAS')
        .ilike('position', '%SUPERVISOR%')
        .single()
    
    if (supError) {
        console.error("Error buscando supervisor:", supError)
        // Intentar buscar por nombre si falla el filtro exacto
    }
    
    let supervisor = supervisorData
    if (!supervisor) {
        console.log("No se encontró supervisor único con filtros exactos. Buscando 'SOLANO HEREDIA'...")
        const { data: solano } = await supabase
            .from('employees')
            .select(`id, email, full_name, position, sede, business_unit, job_position_id`)
            .ilike('full_name', '%SOLANO HEREDIA%')
            .single()
        supervisor = solano
    }

    if (!supervisor) {
        console.error("No se encontró al supervisor SOLANO HEREDIA.")
        return
    }

    console.log("Supervisor encontrado:", supervisor.full_name)
    console.log("Datos:", {
        email: supervisor.email,
        position: supervisor.position,
        sede: supervisor.sede,
        unit: supervisor.business_unit,
        job_pos_id: supervisor.job_position_id
    })

    // Obtener Area del Supervisor
    let supervisorAreaId = null
    if (supervisor.job_position_id) {
        const { data: jp } = await supabase
            .from('job_positions')
            .select('area_id, name')
            .eq('id', supervisor.job_position_id)
            .single()
        if (jp) {
            supervisorAreaId = jp.area_id
            console.log("Área del Supervisor (por ID):", jp.area_id, jp.name)
        }
    } else {
         const { data: jp } = await supabase
            .from('job_positions')
            .select('area_id, name')
            .eq('name', supervisor.position)
            .single()
         if (jp) {
            supervisorAreaId = jp.area_id
            console.log("Área del Supervisor (por Nombre):", jp.area_id, jp.name)
        }
    }

    console.log("\n--- 2. EJECUTANDO QUERY DEL USUARIO (TOTAL BEBIDAS CHIMBOTE) ---")
    const { data: allBebidas, error: err1 } = await supabase
        .from('employees')
        .select(`full_name, position, sede, business_unit, job_position_id`)
        .eq('sede', 'CHIMBOTE')
        .eq('business_unit', 'BEBIDAS')
        .eq('is_active', true)
        .order('full_name')
    
    if (err1) console.error(err1)
    
    console.log(`Total Empleados en CHIMBOTE - BEBIDAS: ${allBebidas.length}`)
    
    // Enriquecer con Área
    const enrichedBebidas = []
    for (const emp of allBebidas) {
        let areaName = 'N/A'
        let areaId = null
        
        if (emp.job_position_id) {
            const { data: jp } = await supabase.from('job_positions').select('area_id, areas(name)').eq('id', emp.job_position_id).single()
            if (jp) {
                areaId = jp.area_id
                areaName = jp.areas?.name
            }
        } else if (emp.position) {
             const { data: jp } = await supabase.from('job_positions').select('area_id, areas(name)').eq('name', emp.position).single()
             if (jp) {
                areaId = jp.area_id
                areaName = jp.areas?.name
            }
        }
        enrichedBebidas.push({ ...emp, area_id: areaId, area_name: areaName })
    }

    console.log("\n--- 3. COMPARACIÓN ---")
    console.log("Empleados que ve el Supervisor (Misma Área + Sede):")
    const visible = enrichedBebidas.filter(e => e.area_id === supervisorAreaId)
    console.log(`Cantidad Visible: ${visible.length}`)
    
    console.log("\nEmpleados que NO ve el Supervisor (Diferente Área):")
    const invisible = enrichedBebidas.filter(e => e.area_id !== supervisorAreaId)
    console.log(`Cantidad NO Visible: ${invisible.length}`)
    
    if (invisible.length > 0) {
        console.table(invisible.map(e => ({
            Name: e.full_name,
            Position: e.position,
            Unit: e.business_unit,
            Area: e.area_name || 'Sin Área Def',
            AreaID: e.area_id
        })))
    } else {
        console.log("El supervisor ve a todos.")
    }

}

debugChimbote()
