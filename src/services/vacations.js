import { supabase } from '../lib/supabase'

/**
 * Obtiene el resumen de vacaciones (Kardex)
 */
export const getVacationOverview = async (sede, search, businessUnit) => {
    const { data, error } = await supabase.rpc('get_vacation_overview', {
        p_sede: sede || null,
        p_search: search || null,
        p_business_unit: businessUnit || null
    })
    return { data, error }
}

/**
 * Obtiene las solicitudes de vacaciones de un empleado específico
 */
export const getEmployeeVacationRequests = async (employeeId) => {
    const { data, error } = await supabase
        .from('vacation_requests')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('request_type', 'VACACIONES')
        .neq('status', 'RECHAZADA')
    
    return { data, error }
}

/**
 * Carga masiva de datos históricos de vacaciones con BATCHING AUTOMÁTICO
 * El usuario sube 1 archivo, el sistema lo procesa en lotes internos.
 */
export const bulkUpdateVacations = async (data) => {
    const BATCH_SIZE = 50; // Procesamos de 50 en 50 para evitar el límite de 256
    let totalUpdated = 0;
    let allErrors = [];

    // Calculamos cuántos lotes necesitamos (ej: 530 registros = 11 lotes)
    const totalBatches = Math.ceil(data.length / BATCH_SIZE);

    console.log(`🚀 Iniciando carga inteligente: ${data.length} registros en ${totalBatches} lotes.`);

    for (let i = 0; i < totalBatches; i++) {
        // Cortamos un trozo del array (ej: del 0 al 50, del 50 al 100...)
        const start = i * BATCH_SIZE;
        const end = start + BATCH_SIZE;
        const batch = data.slice(start, end);
        
        console.log(`📡 Procesando lote ${i + 1}/${totalBatches} (${batch.length} registros)...`);

        // Enviamos solo este trocito a Supabase
        const { data: result, error } = await supabase.rpc('bulk_update_vacations', {
            p_data: batch
        });

        if (error) {
            console.error(`❌ Error en lote ${i + 1}:`, error);
            allErrors.push(`Lote ${i + 1}: ${error.message}`);
        } else {
            // Sumamos los éxitos
            totalUpdated += (result?.updated_count || 0);
        }
    }

    // Al final, devolvemos el resultado como si fuera una sola operación
    console.log(`✅ Carga finalizada. Total procesado: ${totalUpdated}`);
    
    return { 
        data: { 
            updated_count: totalUpdated, 
            success: allErrors.length === 0,
            total_processed: data.length
        }, 
        error: allErrors.length > 0 ? { message: "Algunos registros no se pudieron cargar", details: allErrors } : null 
    };
}