import { supabase } from '../lib/supabase'

/**
 * Valida o rechaza una asistencia
 */
export async function validateAttendance({
    attendanceId,
    supervisorId,
    approved,
    notes = null
}) {
    try {
        const { data, error } = await supabase.rpc('supervisor_validate_attendance', {
            p_attendance_id: attendanceId,
            p_supervisor_id: supervisorId,
            p_validated: approved,
            p_notes: notes
        })

        if (error) throw error

        if (data?.success === false) {
            throw new Error(data.message || 'Error validando asistencia')
        }

        return data
    } catch (error) {
        console.error('Error en validateAttendance:', error)
        throw error
    }
}

/**
 * Carga masiva de asistencias
 */
export async function bulkImportAttendance(records) {
    try {
        const { data, error } = await supabase.rpc('bulk_import_attendance', {
            p_records: records
        })

        if (error) throw error

        return data
    } catch (error) {
        console.error('Error en bulkImportAttendance:', error)
        throw error
    }
}

/**
 * Registra una asistencia manualmente
 */
export async function registerManualAttendance({
    employeeId,
    supervisorId,
    workDate,
    checkIn,
    checkOut = null,
    recordType = 'ASISTENCIA',
    notes = null
}) {
    try {
        const { data, error } = await supabase.rpc('register_manual_attendance', {
            p_employee_id: employeeId,
            p_supervisor_id: supervisorId,
            p_work_date: workDate,
            p_check_in: checkIn,
            p_check_out: checkOut,
            p_record_type: recordType,
            p_notes: notes
        })

        if (error) throw error

        if (data?.success === false) {
            throw new Error(data.message || 'Error registrando asistencia')
        }

        return data
    } catch (error) {
        console.error('Error en registerManualAttendance:', error)
        throw error
    }
}

/**
 * Obtiene asistencias pendientes de validación
 */
export async function getPendingValidations(supervisorId, daysBack = 7) {
    try {
        const { data, error } = await supabase.rpc('get_pending_validations', {
            p_supervisor_id: supervisorId,
            p_days_back: daysBack
        })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error en getPendingValidations:', error)
        throw error
    }
}

/**
 * Cambia la contraseña de un empleado
 */
export async function changePassword({
    employeeId,
    currentPassword,
    newPassword
}) {
    try {
        const { data, error } = await supabase.rpc('change_employee_password', {
            p_employee_id: employeeId,
            p_current_password: currentPassword,
            p_new_password: newPassword
        })

        if (error) throw error

        if (data?.success === false) {
            throw new Error(data.message || 'Error cambiando contraseña')
        }

        return data
    } catch (error) {
        console.error('Error en changePassword:', error)
        throw error
    }
}

/**
 * Obtiene el equipo de un supervisor con sus asistencias
 */
export async function getTeamAttendance(supervisorId, date = null) {
    try {
        const params = {
            p_supervisor_id: supervisorId
        }

        if (date) {
            params.p_date = date
        }

        const { data, error } = await supabase.rpc('get_team_attendance', params)

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error en getTeamAttendance:', error)
        throw error
    }
}
