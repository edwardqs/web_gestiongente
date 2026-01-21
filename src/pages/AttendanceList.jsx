import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Calendar, Clock, Filter, Search, CheckCircle, XCircle, AlertCircle, MapPin, X } from 'lucide-react'

export default function AttendanceList() {
    const { user } = useAuth()
    const [attendances, setAttendances] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedLocation, setSelectedLocation] = useState(null)
    const [reasonModal, setReasonModal] = useState(null)
    const [validationModal, setValidationModal] = useState(null)
    const [validationNotes, setValidationNotes] = useState('')
    const [validating, setValidating] = useState(false)
    const [filters, setFilters] = useState({
        status: 'all', // all, on_time, late, absent
        dateFrom: '',
        dateTo: '',
        search: ''
    })

    // Verificar si el usuario tiene un perfil de empleado vinculado (o modo compatibilidad)
    const hasEmployeeProfile = !!user?.employee_id || !!user?.id;

    useEffect(() => {
        loadAttendances()
    }, [filters])

    async function loadAttendances() {
        try {
            setLoading(true)

            let query = supabase
                .from('attendance')
                .select(`
          *,
          employees:employee_id (
            full_name,
            dni,
            position,
            sede
          )
        `)
                .order('work_date', { ascending: false })
                .order('check_in', { ascending: false })
                .limit(100)

            // Filtro por estado
            if (filters.status === 'on_time') {
                // Puntuales: tienen check_in, no están tarde, y no son ausencias
                query = query
                    .not('check_in', 'is', null)
                    .eq('is_late', false)
                    .neq('record_type', 'AUSENCIA')
            } else if (filters.status === 'late') {
                // Tardanzas: tienen check_in y están marcados como tarde
                query = query
                    .not('check_in', 'is', null)
                    .eq('is_late', true)
            } else if (filters.status === 'absent') {
                // Ausencias: no tienen check_in O son tipo AUSENCIA
                query = query.or('check_in.is.null,record_type.eq.AUSENCIA')
            }

            // Filtro por fecha
            if (filters.dateFrom) {
                query = query.gte('work_date', filters.dateFrom)
            }
            if (filters.dateTo) {
                query = query.lte('work_date', filters.dateTo)
            }

            const { data, error } = await query

            if (error) throw error

            // Filtro por búsqueda (nombre o DNI)
            let filteredData = data || []
            if (filters.search) {
                const searchLower = filters.search.toLowerCase()
                filteredData = filteredData.filter(att =>
                    att.employees?.full_name?.toLowerCase().includes(searchLower) ||
                    att.employees?.dni?.includes(searchLower)
                )
            }

            setAttendances(filteredData)
        } catch (error) {
            console.error('Error cargando asistencias:', error)
            alert('Error cargando asistencias: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleValidate() {
        if (!validationModal) return

        // Usar ID de empleado si existe, sino intentar con el ID de usuario (Auth ID) como fallback
        const supervisorId = user?.employee_id || user?.id;

        if (!supervisorId) {
            alert('Error: No se pudo identificar al usuario actual.')
            return
        }

        try {
            setValidating(true)

            const { data, error } = await supabase.rpc('supervisor_validate_attendance', {
                p_attendance_id: validationModal.attendanceId,
                p_supervisor_id: supervisorId, // Usamos el ID determinado
                p_validated: validationModal.approved,
                p_notes: validationNotes || null
            })

            if (error) throw error

            if (data?.success === false) {
                throw new Error(data.message || 'Error validando asistencia')
            }

            // Recargar asistencias
            await loadAttendances()

            // Cerrar modal
            setValidationModal(null)
            setValidationNotes('')

            alert(validationModal.approved ? 'Asistencia aprobada correctamente' : 'Asistencia rechazada')
        } catch (error) {
            console.error('Error validando:', error)
            alert('Error: ' + error.message)
        } finally {
            setValidating(false)
        }
    }


    function getStatusBadge(attendance) {
        if (!attendance.check_in) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">AUSENTE</span>
        }
        if (attendance.is_late) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">TARDE</span>
        }
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">PUNTUAL</span>
    }

    function getRecordTypeBadge(recordType) {
        const types = {
            'ASISTENCIA': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Asistencia' },
            'PERMISO': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Permiso' },
            'VACACIONES': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Vacaciones' },
            'LICENCIA': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Licencia' },
            'AUSENCIA': { bg: 'bg-red-100', text: 'text-red-800', label: 'Ausencia' }
        }
        const type = types[recordType] || types['ASISTENCIA']
        return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${type.bg} ${type.text}`}>{type.label}</span>
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('es-ES', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    function formatTime(dateString) {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })
    }

    const stats = {
        total: attendances.length,
        onTime: attendances.filter(a => a.check_in && !a.is_late).length,
        late: attendances.filter(a => a.is_late).length,
        absent: attendances.filter(a => !a.check_in || a.record_type === 'AUSENCIA').length
    }

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Registro de Asistencias</h1>
                    <p className="text-gray-600 mt-2">
                        Visualiza y filtra todas las asistencias registradas
                    </p>
                </div>
                {!hasEmployeeProfile && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-w-sm flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-yellow-800">Modo Compatibilidad</p>
                            <p className="text-xs text-yellow-700 mt-1">
                                Usuario de prueba sin perfil vinculado. Se intentará usar su ID de sesión.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 font-medium">Total</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                        </div>
                        <Calendar className="h-8 w-8 text-gray-400" />
                    </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600 font-medium">Puntuales</p>
                            <p className="text-2xl font-bold text-green-700">{stats.onTime}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-yellow-600 font-medium">Tardanzas</p>
                            <p className="text-2xl font-bold text-yellow-700">{stats.late}</p>
                        </div>
                        <AlertCircle className="h-8 w-8 text-yellow-500" />
                    </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-red-600 font-medium">Ausencias</p>
                            <p className="text-2xl font-bold text-red-700">{stats.absent}</p>
                        </div>
                        <XCircle className="h-8 w-8 text-red-500" />
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Search className="inline h-4 w-4 mr-1" />
                            Buscar
                        </label>
                        <input
                            type="text"
                            placeholder="Nombre o DNI..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Filter className="inline h-4 w-4 mr-1" />
                            Estado
                        </label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">Todos</option>
                            <option value="on_time">Puntuales</option>
                            <option value="late">Tardanzas</option>
                            <option value="absent">Ausencias</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Desde</label>
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Hasta</label>
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
            </div>

            {/* Lista de asistencias */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : attendances.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No se encontraron asistencias</h3>
                    <p className="text-gray-600">Intenta ajustar los filtros de búsqueda</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entrada</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motivo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {attendances.map((attendance) => (
                                    <tr key={attendance.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{attendance.employees?.full_name}</div>
                                                <div className="text-sm text-gray-500">{attendance.employees?.dni} • {attendance.employees?.position}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(attendance.work_date)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <div className="flex items-center">
                                                <Clock className="h-4 w-4 mr-1 text-gray-400" />
                                                {formatTime(attendance.check_in)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(attendance)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{getRecordTypeBadge(attendance.record_type || 'ASISTENCIA')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {(attendance.notes || attendance.absence_reason || attendance.evidence_url) ? (
                                                <button
                                                    onClick={() => setReasonModal({
                                                        employee: attendance.employees?.full_name,
                                                        notes: attendance.absence_reason || attendance.notes,
                                                        evidence: attendance.evidence_url
                                                    })}
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                                                >
                                                    <AlertCircle className="h-4 w-4" />
                                                    Ver Detalle
                                                </button>
                                            ) : (
                                                <span className="text-sm text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {attendance.validated ? (
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                                    <span className="text-xs text-gray-500">Validado</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => hasEmployeeProfile && setValidationModal({
                                                            attendanceId: attendance.id,
                                                            employeeName: attendance.employees?.full_name,
                                                            approved: true
                                                        })}
                                                        className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                                                            hasEmployeeProfile 
                                                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                                                        }`}
                                                        title={hasEmployeeProfile ? "Aprobar" : "No tiene permisos"}
                                                        disabled={!hasEmployeeProfile}
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                        Aprobar
                                                    </button>
                                                    <button
                                                        onClick={() => hasEmployeeProfile && setValidationModal({
                                                            attendanceId: attendance.id,
                                                            employeeName: attendance.employees?.full_name,
                                                            approved: false
                                                        })}
                                                        className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                                                            hasEmployeeProfile 
                                                                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                                                        }`}
                                                        title={hasEmployeeProfile ? "Rechazar" : "No tiene permisos"}
                                                        disabled={!hasEmployeeProfile}
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                        Rechazar
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {(() => {
                                                try {
                                                    if (attendance.location_in) {
                                                        const location = typeof attendance.location_in === 'string'
                                                            ? JSON.parse(attendance.location_in)
                                                            : attendance.location_in;

                                                        if (location?.lat && location?.lng) {
                                                            return (
                                                                <button
                                                                    onClick={() => setSelectedLocation({
                                                                        lat: location.lat,
                                                                        lng: location.lng,
                                                                        employee: attendance.employees?.full_name,
                                                                        date: attendance.work_date,
                                                                        time: attendance.check_in
                                                                    })}
                                                                    className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                                                >
                                                                    <MapPin className="h-4 w-4" />
                                                                    Ver Mapa
                                                                </button>
                                                            );
                                                        }
                                                    }
                                                } catch (e) {
                                                    console.error('Error parsing location:', e, attendance.location_in);
                                                }
                                                return <span className="text-sm text-gray-400">Sin ubicación</span>;
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal de Detalle de Motivo */}
            {reasonModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
                    <div className="bg-white rounded-lg shadow-2xl max-w-md w-full border border-gray-100 transform scale-100 transition-all">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Detalle de Justificación
                                </h3>
                                <button
                                    onClick={() => setReasonModal(null)}
                                    className="text-gray-400 hover:text-gray-500"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-4">
                                Empleado: <span className="font-semibold">{reasonModal.employee}</span>
                            </p>

                            <div className="mb-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Motivo / Notas:</h4>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm text-gray-800">
                                    {reasonModal.notes || 'Sin notas adicionales'}
                                </div>
                            </div>

                            {reasonModal.evidence && (
                                <div className="mb-6">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Evidencia Adjunta:</h4>
                                    <a 
                                        href={reasonModal.evidence}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                                    >
                                        <CheckCircle className="h-5 w-5" />
                                        <span className="font-medium">Ver Archivo de Evidencia</span>
                                    </a>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <button
                                    onClick={() => setReasonModal(null)}
                                    className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Validación */}
            {validationModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
                    <div className="bg-white rounded-lg shadow-2xl max-w-md w-full border border-gray-100 transform scale-100 transition-all">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                {validationModal.approved ? '✓ Aprobar Asistencia' : '✗ Rechazar Asistencia'}
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Empleado: <span className="font-semibold">{validationModal.employeeName}</span>
                            </p>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {validationModal.approved ? 'Notas (opcional)' : 'Motivo del rechazo *'}
                                </label>
                                <textarea
                                    value={validationNotes}
                                    onChange={(e) => setValidationNotes(e.target.value)}
                                    rows={3}
                                    placeholder={validationModal.approved ? 'Agregar comentarios...' : 'Indique el motivo del rechazo...'}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setValidationModal(null)
                                        setValidationNotes('')
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    disabled={validating}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleValidate}
                                    disabled={validating || (!validationModal.approved && !validationNotes)}
                                    className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${validationModal.approved
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {validating ? 'Procesando...' : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Mapa */}
            {selectedLocation && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
                    <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-100 transform scale-100 transition-all">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Ubicación de Registro</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    {selectedLocation.employee} • {formatDate(selectedLocation.date)} {formatTime(selectedLocation.time)}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedLocation(null)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4">
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600">
                                    <span className="font-semibold">Coordenadas:</span> {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                                </p>
                                <a
                                    href={`https://www.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-800 mt-1 inline-flex items-center"
                                >
                                    <MapPin className="h-4 w-4 mr-1" />
                                    Abrir en Google Maps
                                </a>
                            </div>
                            <div className="w-full h-96 rounded-lg overflow-hidden border border-gray-200">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    style={{ border: 0 }}
                                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${selectedLocation.lat},${selectedLocation.lng}&zoom=16`}
                                    allowFullScreen
                                    title="Mapa de ubicación"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setSelectedLocation(null)}
                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
