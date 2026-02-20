
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

// Load environment variables from .env.local or similar
// We need to find the .env file. Usually it's in the root of the web project.
// The current working directory is d:\00_A_PAUSER\pauser 2.0\web_gestiongente

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath))
    for (const k in envConfig) {
        process.env[k] = envConfig[k]
    }
} else {
    // Try .env
    const envPath2 = path.resolve(process.cwd(), '.env')
    if (fs.existsSync(envPath2)) {
        const envConfig = dotenv.parse(fs.readFileSync(envPath2))
        for (const k in envConfig) {
            process.env[k] = envConfig[k]
        }
    }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in environment variables.')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const query = `
SELECT 
    e.full_name, 
    e.position, 
    e.sede, 
    e.business_unit, 
    a.name as area_name, 
    jp.area_id 
FROM public.employees e 
LEFT JOIN public.job_positions jp ON e.job_position_id = jp.id 
LEFT JOIN public.areas a ON jp.area_id = a.id 
WHERE ( 
    e.position ILIKE 'SUPERVISOR%' 
    OR e.position ILIKE 'COORDINADOR%' 
    OR e.position ILIKE 'ANALISTA%' 
) 
AND e.is_active = true 
ORDER BY e.position, e.sede, e.full_name;
`

async function runQuery() {
    console.log('Running query...')
    const { data, error } = await supabase
        .from('employees')
        .select(`
            full_name, 
            position, 
            sede, 
            business_unit, 
            job_positions (
                area_id,
                areas (
                    name
                )
            )
        `)
        .or('position.ilike.SUPERVISOR%,position.ilike.COORDINADOR%,position.ilike.ANALISTA%')
        .eq('is_active', true)
        .order('position', { ascending: true })

    if (error) {
        console.error('Error running query:', error)
        return
    }

    // Process and print like the SQL result
    const tableData = data.map(e => ({
        full_name: e.full_name,
        position: e.position,
        sede: e.sede,
        business_unit: e.business_unit,
        area_name: e.job_positions?.areas?.name || 'N/A',
        area_id: e.job_positions?.area_id || 'N/A'
    })).sort((a, b) => {
        if (a.position !== b.position) return a.position.localeCompare(b.position)
        if (a.sede !== b.sede) return a.sede.localeCompare(b.sede)
        return a.full_name.localeCompare(b.full_name)
    })

    console.table(tableData)
}

runQuery()
