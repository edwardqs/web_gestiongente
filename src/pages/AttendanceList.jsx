import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Calendar, Clock, Filter, Search, CheckCircle, XCircle, AlertCircle, MapPin, X, ChevronLeft, ChevronRight, Download, Upload, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import Modal from '../components/ui/Modal'
import { bulkImportAttendance } from '../services/attendance'

// Constante para la clave de persistencia
const ATTENDANCE_FILTERS_KEY = 'attendance_list_filters'

export default function AttendanceList() {
    const { user } = useAuth()
    const [attendances, setAttendances] = useState([])
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)
    const [selectedLocation, setSelectedLocation] = useState(null)
    const [reasonModal, setReasonModal] = useState(null)
    const [validationModal, setValidationModal] = useState(null)
    const [validationNotes, setValidationNotes] = useState('')
    const [validating, setValidating] = useState(false)
    
    // Importación Masiva
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [importFile, setImportFile] = useState(null)
    const [importPreview, setImportPreview] = useState([])
    const [importLoading, setImportLoading] = useState(false)
    const [importResult, setImportResult] = useState(null)
    const fileInputRef = useRef(null)

    // Paginación
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalRecords, setTotalRecords] = useState(0)
    const PAGE_SIZE = 20

    // Helper para obtener fecha local en formato YYYY-MM-DD
    const getLocalDate = () => {
        const d = new Date()
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    // Cargar filtros guardados
    const loadSavedFilters = () => {
        try {
            const saved = localStorage.getItem(ATTENDANCE_FILTERS_KEY)
            if (saved) {
                const parsed = JSON.parse(saved)
                if (parsed.userId === user?.id) {
                    return parsed.filters
                }
            }
        } catch (error) {
            console.error('Error cargando filtros:', error)
        }
        return null
    }

    // Guardar filtros
    const saveFilters = (filters) => {
        try {
            localStorage.setItem(ATTENDANCE_FILTERS_KEY, JSON.stringify({
                userId: user?.id,
                filters: filters,
                timestamp: Date.now()
            }))
        } catch (error) {
            console.error('Error guardando filtros:', error)
        }
    }

    // Inicializar filtros con fecha actual por defecto
    const initializeFilters = () => {
        const savedFilters = loadSavedFilters()
        const today = getLocalDate()
        
        return {
            status: savedFilters?.status || 'all',
            dateFrom: savedFilters?.dateFrom || today, // Por defecto: hoy
            dateTo: savedFilters?.dateTo || '', // Sin fecha final por defecto
            search: savedFilters?.search || ''
        }
    }

    const [filters, setFilters] = useState(initializeFilters())

    // Guardar filtros cuando cambien
    useEffect(() => {
        if (user?.id) {
            saveFilters(filters)
        }
    }, [filters, user?.id])

    // Verificar permisos de validación (Solo RRHH)
    const canValidate = () => {
        if (!user) return false
        
        // Permisos por Rol (Admin, Jefe RRHH, Super Admin)
        if (user.role === 'ADMIN' || user.role === 'SUPER ADMIN' || user.role === 'JEFE_RRHH') return true
        
        // Permisos por Cargo (Legacy/Fallback)
        if (!user.position) return false
        
        // Normalizamos quitando tildes para evitar problemas de compatibilidad
        const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
        
        const userPosition = normalize(user.position);
        
        // Lista extendida de cargos permitidos
        const allowedPositions = [
            'ANALISTA DE GENTE Y GESTION',
            'JEFE DE AREA DE GENTE Y GESTION',
            'JEFE DE GENTE Y GESTION',
            'JEFE DE GENTE Y GESTIÓN',
            'ADMIN'
        ]
        
        return allowedPositions.some(pos => userPosition.includes(normalize(pos)))
    }

    const hasValidationPermission = canValidate()
    
    // Ref para controlar la primera carga
    const isFirstRender = useRef(true)

    // Helper para aplicar filtros
    const applyFilters = (query, currentFilters) => {
        if (currentFilters.status === 'on_time') {
            query = query.eq('record_type', 'ASISTENCIA').eq('is_late', false)
        } else if (currentFilters.status === 'late') {
            query = query.eq('record_type', 'ASISTENCIA').eq('is_late', true)
        } else if (currentFilters.status === 'absent') {
             query = query.or('record_type.in.(AUSENCIA,INASISTENCIA,FALTA JUSTIFICADA,AUSENCIA SIN JUSTIFICAR),check_in.is.null')
        } else if (currentFilters.status === 'medical') {
            query = query.eq('record_type', 'DESCANSO MÉDICO')
        } else if (currentFilters.status === 'license') {
            query = query.eq('record_type', 'LICENCIA CON GOCE')
        } else if (currentFilters.status === 'vacation') {
            query = query.eq('record_type', 'VACACIONES')
        }

        // CRÍTICO: Aplicar filtros de fecha correctamente
        if (currentFilters.dateFrom) {
            query = query.gte('work_date', currentFilters.dateFrom)
        }
        if (currentFilters.dateTo) {
            query = query.lte('work_date', currentFilters.dateTo)
        }
        
        return query
    }

    useEffect(() => {
        // Cuando cambian los filtros, volver a página 1
        if (currentPage === 1) {
            loadAttendances(1)
        } else {
            setCurrentPage(1)
        }
    }, [filters])

    useEffect(() => {
        // Evitar doble carga en el montaje inicial
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }
        
        loadAttendances(currentPage)
    }, [currentPage])

    // Escuchar actualizaciones en tiempo real
    useEffect(() => {
        const subscription = supabase
            .channel('attendance_list_updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'attendance' },
                () => {
                    loadAttendances(currentPage)
                }
            )
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [currentPage, filters])

    async function loadAttendances(page = 1) {
        try {
            setLoading(true)
            
            const offset = (page - 1) * PAGE_SIZE
            const isGlobalAdmin = (
                user?.role === 'ADMIN' || 
                user?.role === 'SUPER ADMIN' || 
                user?.role === 'JEFE_RRHH' || 
                user?.position?.includes('JEFE DE GENTE') ||
                user?.position?.includes('JEFE DE RRHH') ||
                (user?.permissions && user?.permissions['*'])
            ) && !user?.position?.includes('ANALISTA'); // Asegurar que Analistas SIEMPRE pasen por filtro de sede

            console.log('User Role:', user?.role, 'Position:', user?.position, 'Is Global Admin:', isGlobalAdmin)

            // SIEMPRE usar consulta histórica (rango de fechas) en lugar de RPC diaria
            // Esto permite ver cualquier rango de fechas, no solo "hoy"
            let isSingleDate = filters.dateFrom && filters.dateTo && filters.dateFrom === filters.dateTo
            let reportData = []
            let totalRows = 0

            // MODO REPORTE DIARIO (Roster)
            // Si se selecciona una fecha única, mostramos TODOS los empleados y su estado
            if (isSingleDate) {
                console.log('Loading Daily Roster Mode for:', filters.dateFrom)
                
                // Determinar sede/business unit para la RPC
                let rpcSede = null
                let rpcBusinessUnit = null
                
                if (!isGlobalAdmin) {
                    if (user?.sede) rpcSede = user.sede
                    if (user?.business_unit) rpcBusinessUnit = user.business_unit
                }

                const { data: rpcData, error: rpcError } = await supabase.rpc('get_daily_attendance_report', {
                    p_date: filters.dateFrom,
                    p_sede: rpcSede,
                    p_business_unit: rpcBusinessUnit,
                    p_search: filters.search || null,
                    p_status: filters.status === 'all' ? null : filters.status,
                    p_page: page,
                    p_limit: PAGE_SIZE
                })

                if (rpcError) throw rpcError

                if (rpcData && rpcData.data) {
                    reportData = rpcData.data
                    totalRows = rpcData.total || 0
                }

                // Mapear al formato esperado por la tabla
                let processedList = reportData.map(item => ({
                    id: item.attendance_id || `virtual-${item.employee_id}`, // ID virtual si no hay asistencia
                    work_date: filters.dateFrom,
                    check_in: item.check_in,
                    check_out: item.check_out,
                    is_late: item.is_late || false,
                    record_type: item.record_type || 'SIN REGISTRO',
                    status: item.computed_status, // present, absent, late, on_time
                    validated: item.validated,
                    absence_reason: item.absence_reason,
                    location_in: item.location_in,
                    employees: {
                        full_name: item.full_name,
                        dni: item.dni,
                        position: item.position,
                        sede: item.sede,
                        business_unit: item.business_unit,
                        profile_picture_url: item.profile_picture_url
                    }
                }))

                setAttendances(processedList)
                setTotalRecords(totalRows)
                setTotalPages(Math.ceil(totalRows / PAGE_SIZE))
                setLoading(false)
                return // Salir, ya cargamos los datos
            }

            // MODO HISTÓRICO (Rango de Fechas)
            let query = supabase
                .from('attendance')
                .select(`
                    *,
                    employees!attendance_employee_id_fkey (
                        full_name,
                        dni,
                        position,
                        sede,
                        business_unit,
                        profile_picture_url
                    )
                `, { count: 'exact' })
                .order('work_date', { ascending: false })
                .order('check_in', { ascending: true })

            // Aplicar filtros de fecha
            if (filters.dateFrom) {
                query = query.gte('work_date', filters.dateFrom)
            }
            if (filters.dateTo) {
                query = query.lte('work_date', filters.dateTo)
            }

            // Si NO hay filtro de fecha "desde", usar el mes actual por defecto
            if (!filters.dateFrom && !filters.dateTo) {
                const today = getLocalDate()
                const firstDayOfMonth = today.substring(0, 8) + '01' // YYYY-MM-01
                query = query.gte('work_date', firstDayOfMonth)
            }

            // Aplicar filtros de estado
            query = applyFilters(query, filters)

            // Búsqueda por texto (optimizada para evitar errores de Supabase con joins)
            // Nota: La búsqueda en campos anidados (employees.*) no funciona directamente en el filtro
            // Se filtrará en memoria después de la consulta

            // Paginación
            if (isGlobalAdmin) {
                query = query.range(offset, offset + PAGE_SIZE - 1)
            } else {
                // Para usuarios restringidos, traemos más datos para filtrar localmente
                query = query.limit(1000)
            }

            const { data, error, count } = await query
            if (error) throw error
            
            reportData = data || []
            totalRows = count || 0

            // Procesar lista y aplicar filtros de seguridad
            let processedList = reportData.map(item => ({
                id: item.id,
                work_date: item.work_date,
                check_in: item.check_in,
                check_out: item.check_out,
                is_late: item.is_late,
                record_type: item.record_type,
                status: item.status || (item.check_in ? 'present' : 'absent'),
                validated: item.validated,
                notes: item.notes,
                absence_reason: item.absence_reason,
                evidence_url: item.evidence_url,
                location_in: item.location_in,
                validated_by: item.validated_by,
                employees: item.employees || {}
            }))

            // Filtrado de seguridad por sede/business unit
            if (!isGlobalAdmin) {
                if (user?.sede) {
                    processedList = processedList.filter(item => item.employees.sede === user.sede)
                }
                if (user?.business_unit) {
                    processedList = processedList.filter(item => item.employees.business_unit === user.business_unit)
                }
            }

            // Filtrado por búsqueda (en memoria, después de traer los datos)
            if (filters.search && filters.search.length > 0) {
                const searchLower = filters.search.toLowerCase()
                processedList = processedList.filter(item => 
                    item.employees?.full_name?.toLowerCase().includes(searchLower) ||
                    item.employees?.dni?.toLowerCase().includes(searchLower)
                )
            }

            // Paginación manual si se filtró en cliente
            let displayList = processedList
            if (!isGlobalAdmin) {
                totalRows = processedList.length
                const start = (page - 1) * PAGE_SIZE
                displayList = processedList.slice(start, start + PAGE_SIZE)
            }

            setAttendances(displayList)
            setTotalRecords(totalRows)
            setTotalPages(Math.ceil(totalRows / PAGE_SIZE) || 1)

            // Calcular estadísticas
            if (isGlobalAdmin) {
                // Para admin, calcular stats de los datos filtrados
                const total = processedList.length
                const onTime = processedList.filter(i => i.record_type === 'ASISTENCIA' && !i.is_late).length
                const late = processedList.filter(i => i.record_type === 'ASISTENCIA' && i.is_late).length
                const absent = processedList.filter(i => 
                    !i.record_type || 
                    ['AUSENCIA', 'INASISTENCIA', 'FALTA JUSTIFICADA', 'AUSENCIA SIN JUSTIFICAR'].includes(i.record_type)
                ).length
                
                setGlobalStats({ total, onTime, late, absent })
            } else {
                // Para usuario restringido, usar processedList completo (ya filtrado)
                const total = processedList.length
                const onTime = processedList.filter(i => i.record_type === 'ASISTENCIA' && !i.is_late).length
                const late = processedList.filter(i => i.record_type === 'ASISTENCIA' && i.is_late).length
                const absent = processedList.filter(i => 
                    !i.record_type || 
                    ['AUSENCIA', 'INASISTENCIA', 'FALTA JUSTIFICADA', 'AUSENCIA SIN JUSTIFICAR'].includes(i.record_type)
                ).length
                
                setGlobalStats({ total, onTime, late, absent })
            }

        } catch (error) {
            console.error('Error cargando asistencias:', error)
            alert('Error cargando asistencias: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    // Estado para stats globales
    const [globalStats, setGlobalStats] = useState({
        total: 0,
        onTime: 0,
        late: 0,
        absent: 0
    })

    const exportToExcel = async () => {
        try {
            setExporting(true)
            
            // Usar las fechas de los filtros actuales
            let startDate = filters.dateFrom
            let endDate = filters.dateTo

            // Si no hay fechas, usar el mes actual
            if (!startDate) {
                const now = new Date()
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
                startDate = firstDay.toISOString().split('T')[0]
            }

            if (!endDate) {
                const now = new Date()
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                endDate = lastDay.toISOString().split('T')[0]
            }

            // Consulta directa (sin RPC) para obtener todos los datos del rango
            let query = supabase
                .from('attendance')
                .select(`
                    *,
                    employees!attendance_employee_id_fkey (
                        full_name,
                        dni,
                        position,
                        sede,
                        business_unit
                    )
                `)
                .gte('work_date', startDate)
                .lte('work_date', endDate)
                .order('work_date', { ascending: false })

            query = applyFilters(query, filters)

            const { data: exportData, error } = await query

            if (error) throw error

            // Filtrar por búsqueda si es necesario
            let filteredExportData = exportData || []
            if (filters.search) {
                const searchLower = filters.search.toLowerCase()
                filteredExportData = filteredExportData.filter(item => 
                    item.employees?.full_name?.toLowerCase().includes(searchLower) || 
                    item.employees?.dni?.toLowerCase().includes(searchLower)
                )
            }

            // Formatear datos para Excel
            const formattedData = filteredExportData.map(item => {
                const getStatusText = (i) => {
                    const t = i.record_type;
                    if (t === 'ASISTENCIA') return i.is_late ? 'TARDANZA' : 'PUNTUAL';
                    if (t === 'FALTA JUSTIFICADA' || t === 'AUSENCIA SIN JUSTIFICAR') return 'AUSENCIA';
                    if (t === 'DESCANSO MÉDICO') return 'DESCANSO MÉDICO';
                    if (t === 'LICENCIA CON GOCE') return 'LICENCIA';
                    if (t === 'VACACIONES') return 'VACACIONES';
                    return t || 'AUSENTE';
                };

                const getTypeText = (i) => {
                    const t = i.record_type;
                    if (t === 'ASISTENCIA') return 'Asistencia';
                    if (t === 'FALTA JUSTIFICADA') return 'Justificada';
                    if (t === 'AUSENCIA SIN JUSTIFICAR') return 'Injustificada';
                    if (t === 'DESCANSO MÉDICO') return 'General';
                    if (t === 'LICENCIA CON GOCE') return 'Con Goce';
                    if (t === 'VACACIONES') return 'Vacaciones';
                    return t || '-';
                };

                return {
                    'Fecha': item.work_date,
                    'Empleado': item.employees?.full_name || 'Desconocido',
                    'DNI': item.employees?.dni || '',
                    'Cargo': item.employees?.position || '',
                    'Sede': item.employees?.sede || '',
                    'Hora Entrada': item.check_in ? new Date(item.check_in).toLocaleTimeString('es-PE') : '-',
                    'Hora Salida': item.check_out ? new Date(item.check_out).toLocaleTimeString('es-PE') : '-',
                    'Estado': getStatusText(item),
                    'Tipo': getTypeText(item),
                    'Validado': item.validated ? 'SÍ' : 'NO',
                    'Motivo/Notas': item.notes || item.absence_reason || ''
                };
            })

            // Crear libro y hoja
            const wb = XLSX.utils.book_new()
            const ws = XLSX.utils.json_to_sheet(formattedData)
            
            // Ajustar ancho de columnas
            const wscols = [
                {wch: 12}, {wch: 30}, {wch: 12}, {wch: 20}, {wch: 15},
                {wch: 12}, {wch: 12}, {wch: 15}, {wch: 15}, {wch: 8}, {wch: 40}
            ]
            ws['!cols'] = wscols

            XLSX.utils.book_append_sheet(wb, ws, 'Asistencias')
            
            const fileName = `Reporte_Asistencias_${startDate}_al_${endDate}.xlsx`
            XLSX.writeFile(wb, fileName)

        } catch (error) {
            console.error('Error exportando:', error)
            alert('Error al exportar: ' + error.message)
        } finally {
            setExporting(false)
        }
    }

    async function handleValidate() {
        if (!validationModal) return

        const supervisorId = user?.employee_id;

        if (!supervisorId) {
            alert('Error: No se encontró un perfil de empleado asociado. No puedes validar asistencias.')
            return
        }

        try {
            setValidating(true)

            const { data, error } = await supabase.rpc('supervisor_validate_attendance', {
                p_attendance_id: validationModal.attendanceId,
                p_supervisor_id: supervisorId,
                p_validated: validationModal.approved,
                p_notes: validationNotes || null
            })

            if (error) throw error

            if (data?.success === false) {
                throw new Error(data.message || 'Error validando asistencia')
            }

            await loadAttendances(currentPage)

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
        const type = attendance.record_type;
        const isLate = attendance.is_late;
        let badgeContent;

        if (type === 'ASISTENCIA') {
            if (isLate) {
                badgeContent = <span title="TARDANZA" className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 block truncate max-w-[100px] text-center">TARDANZA</span>
            } else {
                badgeContent = <span title="PUNTUAL" className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 block truncate max-w-[100px] text-center">PUNTUAL</span>
            }
        } else if (type === 'FALTA JUSTIFICADA' || type === 'AUSENCIA SIN JUSTIFICAR') {
             badgeContent = <span title="AUSENCIA" className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 block truncate max-w-[100px] text-center">AUSENCIA</span>
        } else if (type === 'DESCANSO MÉDICO') {
            badgeContent = <span title="DESCANSO MÉDICO" className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 block truncate max-w-[100px] text-center">DESCANSO MÉDICO</span>
        } else if (type === 'LICENCIA CON GOCE') {
             badgeContent = <span title="LICENCIA" className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 block truncate max-w-[100px] text-center">LICENCIA</span>
        } else if (type === 'VACACIONES') {
             badgeContent = <span title="VACACIONES" className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 block truncate max-w-[100px] text-center">VACACIONES</span>
        } else if (!attendance.check_in && !type) {
            badgeContent = <span title="AUSENCIA" className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 block truncate max-w-[100px] text-center">AUSENCIA</span>
        } else {
            const label = type || 'OTRO';
            badgeContent = <span title={label} className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 block truncate max-w-[100px] text-center">{label}</span>
        }
        
        return badgeContent;
    }

    function getRecordTypeBadge(attendance) {
        const type = attendance.record_type;
        const subcategory = attendance.subcategory;

        let label = type;
        let colorClass = 'bg-gray-100 text-gray-800';

        switch (type) {
            case 'ASISTENCIA':
                label = 'Asistencia';
                colorClass = 'bg-blue-50 text-blue-700';
                break;
            case 'FALTA JUSTIFICADA':
                label = 'Justificada';
                colorClass = 'bg-green-50 text-green-700';
                break;
            case 'AUSENCIA SIN JUSTIFICAR':
                label = 'Injustificada';
                colorClass = 'bg-red-50 text-red-700';
                break;
            case 'DESCANSO MÉDICO':
                label = subcategory || 'General';
                colorClass = 'bg-indigo-50 text-indigo-700';
                break;
            case 'LICENCIA CON GOCE':
                label = 'Con Goce';
                colorClass = 'bg-purple-50 text-purple-700';
                break;
             case 'VACACIONES':
                label = 'Vacaciones';
                colorClass = 'bg-orange-50 text-orange-700';
                break;
            default:
                label = type || '-';
        }

        return <span title={label} className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClass} block truncate max-w-[120px] text-center`}>{label}</span>
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        const date = new Date(year, month - 1, day);
        
        return date.toLocaleDateString('es-ES', {
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
        total: globalStats.total,
        onTime: globalStats.onTime,
        late: globalStats.late,
        absent: globalStats.absent
    }

    // ==========================================
    // Lógica de Importación Masiva
    // ==========================================
    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setImportFile(file)
            readExcel(file)
        }
    }

    const readExcel = (file) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result)
            const workbook = XLSX.read(data, { type: 'array' })
            const sheetName = workbook.SheetNames[0]
            const sheet = workbook.Sheets[sheetName]
            
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
            
            if (jsonData.length < 2) {
                alert('El archivo parece estar vacío o sin cabeceras.')
                return
            }

            const rows = jsonData.slice(1).map((row, idx) => ({
                id: idx,
                dni: row[0],
                date: processExcelDate(row[1]),
                checkIn: processExcelTime(row[2]),
                checkOut: null,
                isValid: validateRow(row)
            }))

            setImportPreview(rows)
        }
        reader.readAsArrayBuffer(file)
    }

    const validateRow = (row) => {
        return row[0] && row[1]
    }

    const processExcelDate = (excelDate) => {
        if (typeof excelDate === 'number') {
            const date = XLSX.SSF.parse_date_code(excelDate)
            return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
        }
        if (typeof excelDate === 'string') {
            const dateStr = excelDate.trim()
            
            const dmyMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
            if (dmyMatch) {
                const day = dmyMatch[1].padStart(2, '0')
                const month = dmyMatch[2].padStart(2, '0')
                const year = dmyMatch[3]
                return `${year}-${month}-${day}`
            }
            
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                return dateStr
            }
        }
        return excelDate
    }
    
    const processExcelTime = (excelTime) => {
         if (!excelTime) return null
         
         if (typeof excelTime === 'number') {
             const totalSeconds = Math.floor(excelTime * 86400)
             const hours = Math.floor(totalSeconds / 3600)
             const minutes = Math.floor((totalSeconds % 3600) / 60)
             return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
         }
         
         if (typeof excelTime === 'string') {
             const timeStr = excelTime.trim().toLowerCase()
             
             const match = timeStr.match(/^(\d{1,2})[:.](\d{2})\s*([ap])\.?\s*m\.?$/)
             
             if (match) {
                 let hours = parseInt(match[1])
                 const minutes = parseInt(match[2])
                 const meridiem = match[3]
                 
                 if (meridiem === 'p' && hours < 12) hours += 12
                 if (meridiem === 'a' && hours === 12) hours = 0
                 
                 return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
             }
             
             if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeStr)) {
                 return timeStr
             }
         }

         return excelTime
    }

    const handleImport = async () => {
        if (importPreview.length === 0) return

        setImportLoading(true)
        try {
            const payload = importPreview
                .filter(row => row.isValid)
                .map(row => ({
                    dni: String(row.dni).trim(),
                    work_date: processExcelDate(row.date),
                    check_in: processExcelTime(row.checkIn),
                    check_out: null, 
                    record_type: 'ASISTENCIA',
                    sede: user?.sede || null 
                }))

            const result = await bulkImportAttendance(payload)
            
            setImportResult({
                success: true,
                count: result.imported_count || payload.length,
                message: 'Importación completada exitosamente'
            })
            
            loadAttendances(1)
        } catch (error) {
            console.error('Error importando:', error)
            setImportResult({
                success: false,
                message: error.message || 'Error al procesar el archivo'
            })
        } finally {
            setImportLoading(false)
        }
    }

    const closeImportModal = () => {
        setIsImportModalOpen(false)
        setImportFile(null)
        setImportPreview([])
        setImportResult(null)
    }

    const handleDownloadTemplate = () => {
        const headers = [['DNI', 'FECHA (YYYY-MM-DD)', 'HORA INGRESO (HH:MM)']]
        const ws = XLSX.utils.aoa_to_sheet(headers)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Asistencias")
        XLSX.writeFile(wb, "plantilla_asistencias.xlsx")
    }

    // Función para limpiar filtros
    const handleClearFilters = () => {
        const today = getLocalDate()
        setFilters({
            status: 'all',
            dateFrom: today,
            dateTo: '',
            search: ''
        })
    }

    // Determinar si hay filtros activos
    const hasActiveFilters = filters.search !== '' || 
                            filters.status !== 'all' || 
                            filters.dateTo !== ''

    return (
        <div className="w-full">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Registro de Asistencias</h1>
                    <p className="text-gray-600 mt-2">
                        Visualiza y filtra todas las asistencias registradas
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-2 w-full md:w-auto">
                    <div className="flex gap-2 w-full">
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex-1 sm:flex-initial"
                        >
                            <Upload className="h-4 w-4" />
                            Importar
                        </button>
                        <button
                            onClick={exportToExcel}
                            disabled={exporting || loading}
                            className={`flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition-colors flex-1 sm:flex-initial ${
                                (exporting || loading) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            {exporting ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            {exporting ? '...' : 'Exportar'}
                        </button>
                    </div>
                    {!hasValidationPermission && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-w-sm flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-yellow-800">Modo Lectura</p>
                                <p className="text-xs text-yellow-700 mt-1">
                                    Solo RRHH puede validar asistencias.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
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
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                            <option value="absent">Ausencias (Todas)</option>
                            <option value="medical">Descanso Médico</option>
                            <option value="license">Licencia</option>
                            <option value="vacation">Vacaciones</option>
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
                    
                    {/* Botón Limpiar Filtros */}
                    {hasActiveFilters && (
                        <div className="flex items-end">
                            <button
                                onClick={handleClearFilters}
                                className="w-full px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <X size={16} />
                                Limpiar
                            </button>
                        </div>
                    )}
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
                    <p className="text-gray-600">Intenta ajustar los filtros de búsqueda o el rango de fechas</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]">Empleado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entrada</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">Estado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[140px]">Tipo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motivo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {attendances.map((attendance) => (
                                    <tr key={attendance.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap max-w-[200px]">
                                            <div className="truncate">
                                                <div className="text-sm font-medium text-gray-900 truncate" title={attendance.employees?.full_name}>{attendance.employees?.full_name}</div>
                                                <div className="text-sm text-gray-500 truncate" title={`${attendance.employees?.dni} • ${attendance.employees?.position}`}>{attendance.employees?.dni} • {attendance.employees?.position}</div>
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
                                        <td className="px-6 py-4 whitespace-nowrap">{getRecordTypeBadge(attendance)}</td>
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
                                            ) : attendance.validated_by ? (
                                                <div className="flex items-center gap-2">
                                                    <XCircle className="h-5 w-5 text-red-500" />
                                                    <span className="text-xs text-red-500">Rechazado</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => hasValidationPermission && setValidationModal({
                                                            attendanceId: attendance.id,
                                                            employeeName: attendance.employees?.full_name,
                                                            approved: true
                                                        })}
                                                        className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                                                            hasValidationPermission 
                                                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                                                        }`}
                                                        title={hasValidationPermission ? "Aprobar" : "Requiere permisos de RRHH"}
                                                        disabled={!hasValidationPermission}
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                        Aprobar
                                                    </button>
                                                    <button
                                                        onClick={() => hasValidationPermission && setValidationModal({
                                                            attendanceId: attendance.id,
                                                            employeeName: attendance.employees?.full_name,
                                                            approved: false
                                                        })}
                                                        className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                                                            hasValidationPermission 
                                                                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                                                        }`}
                                                        title={hasValidationPermission ? "Rechazar" : "Requiere permisos de RRHH"}
                                                        disabled={!hasValidationPermission}
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
                                                    console.error('Error parsing location:', e);
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

            {/* Paginación */}
            {!loading && attendances.length > 0 && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-b-lg shadow-md mt-[-24px] mb-6">
                    <div className="flex flex-1 justify-between sm:hidden">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Siguiente
                        </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Mostrando <span className="font-medium">{(currentPage - 1) * PAGE_SIZE + 1}</span> a <span className="font-medium">{Math.min(currentPage * PAGE_SIZE, totalRecords)}</span> de <span className="font-medium">{totalRecords}</span> resultados
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                    <span className="sr-only">Anterior</span>
                                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                </button>
                                <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                                    Página {currentPage} de {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                    <span className="sr-only">Siguiente</span>
                                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                </button>
                            </nav>
                        </div>
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

            {/* Modal Importación */}
            <Modal
                isOpen={isImportModalOpen}
                onClose={closeImportModal}
                title="Importar Asistencias Masivas"
                showCancel={true}
                cancelText="Cerrar"
                onConfirm={importResult?.success ? closeImportModal : (importPreview.length > 0 && !importResult ? handleImport : null)}
                confirmText={importResult?.success ? "Finalizar" : (importLoading ? "Importando..." : "Importar Datos")}
                type="info"
            >
                <div className="space-y-6">
                    {!importResult ? (
                        <>
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-slate-500">
                                    Carga un archivo Excel con las asistencias.
                                </p>
                                <button 
                                    onClick={handleDownloadTemplate}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                                >
                                    Descargar Plantilla
                                </button>
                            </div>

                            {/* Zona de Carga */}
                            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                                importFile ? 'border-blue-200 bg-blue-50/30' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                            }`}>
                                {!importFile ? (
                                    <div 
                                        onClick={() => fileInputRef.current.click()}
                                        className="cursor-pointer flex flex-col items-center gap-3"
                                    >
                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                            <Upload size={24} />
                                        </div>
                                        <h3 className="text-sm font-semibold text-slate-700">Clic para subir Excel</h3>
                                        <p className="text-xs text-slate-400">
                                            Soporta .xlsx, .xls
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <FileSpreadsheet size={32} className="text-green-600" />
                                        <h3 className="text-sm font-bold text-slate-800">{importFile.name}</h3>
                                        <button 
                                            onClick={() => {
                                                setImportFile(null)
                                                setImportPreview([])
                                            }}
                                            className="text-xs text-red-500 hover:text-red-700 font-medium mt-1"
                                        >
                                            Cambiar archivo
                                        </button>
                                    </div>
                                )}
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept=".xlsx, .xls" 
                                    onChange={handleFileChange} 
                                />
                            </div>

                            {/* Vista Previa */}
                            {importPreview.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-bold text-slate-700">Vista Previa ({importPreview.length} registros)</h4>
                                    <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-slate-50 text-slate-500 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2">DNI</th>
                                                    <th className="px-3 py-2">Fecha</th>
                                                    <th className="px-3 py-2">Entrada</th>
                                                    <th className="px-3 py-2">Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {importPreview.slice(0, 100).map((row, i) => (
                                                    <tr key={i} className={row.isValid ? '' : 'bg-red-50'}>
                                                        <td className="px-3 py-2 font-mono">{row.dni}</td>
                                                        <td className="px-3 py-2">{row.date}</td>
                                                        <td className="px-3 py-2">{row.checkIn || '-'}</td>
                                                        <td className="px-3 py-2">
                                                            {row.isValid 
                                                                ? <CheckCircle size={14} className="text-green-500" /> 
                                                                : <XCircle size={14} className="text-red-500" />
                                                            }
                                                        </td>
                                                    </tr>
                                                ))}
                                                {importPreview.length > 100 && (
                                                    <tr>
                                                        <td colSpan="5" className="px-3 py-2 text-center text-slate-400 italic">
                                                            ... y {importPreview.length - 100} más ...
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className={`p-6 rounded-lg text-center ${importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                            {importResult.success ? (
                                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                            ) : (
                                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                            )}
                            <h3 className={`text-lg font-bold mb-1 ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                {importResult.success ? '¡Importación Exitosa!' : 'Error en la Importación'}
                            </h3>
                            <p className={`text-sm ${importResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                {importResult.message}
                            </p>
                            {importResult.success && (
                                <p className="text-xs text-green-700 mt-2">
                                    Se procesaron {importResult.count} registros correctamente.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    )
}