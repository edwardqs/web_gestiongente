import { supabase } from '../lib/supabase'

export const bulkImportEmployees = async (data) => {
    const { data: result, error } = await supabase.rpc('bulk_import_employees', {
        p_data: data
    })
    return { data: result, error }
}
