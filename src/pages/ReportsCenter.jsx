import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import * as XLSX from 'xlsx'
import { 
    FileText, 
    Download, 
    Users, 
    Clock, 
    Calendar, 
    Briefcase,
    Filter,
    Table,
    ChevronDown
} from 'lucide-react'
import { 
    getEmployeesReport, 
    getAttendanceReport, 
    getNewHiresReport, 
    getVacationBalanceReport 
} from '../services/reports'

export default function ReportsCenter() {
    const { user } = useAuth()
    const { showToast } = useToast()
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('employees') // employees, attendance, hires, vacations

    // Filtros Generales
    const [selectedSede, setSelectedSede] = useState(user?.sede || 'all')
    const [selectedBusinessUnit, setSelectedBusinessUnit] = useState(user?.business_unit || 'all')
    
    // Helper robusto para fecha Perú UTC-5 (independiente del navegador)
    const getPeruDate = () => {
        const now = new Date();
        // Obtener UTC en milisegundos
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        // Offset Perú es -5 horas (independientemente del horario de verano que no tiene)
        const peruTime = new Date(utc + (3600000 * -5));
        
        const year = peruTime.getFullYear();
        const month = String(peruTime.getMonth() + 1).padStart(2, '0');
        const day = String(peruTime.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Filtros Específicos
    const [dateRange, setDateRange] = useState({
        start: getPeruDate(),
        end: getPeruDate()
    })
    const [selectedMonth, setSelectedMonth] = useState({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
    })

    const isGlobalAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER ADMIN' || user?.role === 'JEFE_RRHH' || (user?.permissions && user?.permissions['*'])
    const canSelectSede = isGlobalAdmin && !user?.sede

    const handleExport = async (type) => {
        setLoading(true)
        try {
            let data = []
            let fileName = ''
            let sheetName = ''
            
            // Determinar sufijo de sede para el nombre del archivo
            const sedeSuffix = (selectedSede === 'all' || !selectedSede) ? 'GENERAL' : selectedSede.toUpperCase().replace(/\s+/g, '_')

            switch (type) {
                case 'employees':
                    const { data: empData, error: empError } = await getEmployeesReport(
                        selectedSede === 'all' ? null : selectedSede, 
                        selectedBusinessUnit === 'all' ? null : selectedBusinessUnit
                    )
                    
                    if (empError || !empData) {
                        throw new Error('No se pudieron cargar los datos de empleados')
                    }

                    data = empData.map(emp => ({
                        'DNI': emp.dni,
                        'Nombre Completo': emp.full_name,
                        'Cargo': emp.position,
                        'Área': emp.area_name?.area_name || 'Sin Área', // Se mantiene la estructura { area_name: "Nombre" } que viene del servicio
                        'Sede': emp.sede,
                        'Unidad Negocio': emp.business_unit || '-',
                        'Fecha Ingreso': emp.entry_date,
                        'Tipo': emp.employee_type,
                        'Email': emp.email,
                        'Celular': emp.phone,
                        'Dirección': emp.address,
                        'Distrito': emp.district,
                        'Estado Civil': emp.civil_status,
                        'Hijos': emp.children_count,
                        'AFP/ONP': emp.pension_system,
                        'CUSPP': emp.cuspp,
                        'Banco': emp.bank_name,
                        'Cuenta': emp.bank_account,
                        'CCI': emp.cci_account,
                        'Estado': emp.is_active ? 'ACTIVO' : 'INACTIVO'
                    }))
                    fileName = `Maestro_Empleados_${sedeSuffix}_${getPeruDate()}.xlsx`
                    sheetName = 'Empleados'
                    break

                case 'attendance':
                    // 1. ESTRATEGIA ROBUSTA ANT-ZONA HORARIA
                    // Ampliamos el rango de búsqueda (-1 día al inicio, +1 día al final)
                    const qStart = new Date(dateRange.start);
                    qStart.setDate(qStart.getDate() - 1);
                    const queryStartStr = qStart.toISOString().split('T')[0];
                    
                    const qEnd = new Date(dateRange.end);
                    qEnd.setDate(qEnd.getDate() + 1);
                    const queryEndStr = qEnd.toISOString().split('T')[0];

                    // Obtener datos con rango ampliado
                    const { data: rawAttData, error: attError } = await getAttendanceReport(
                        queryStartStr,
                        queryEndStr,
                        selectedSede === 'all' ? null : selectedSede
                    )

                    if (attError || !rawAttData) {
                        throw new Error('No se pudieron cargar los datos de asistencia')
                    }

                    // FILTRADO EXACTO EN MEMORIA (String vs String)
                    const attData = rawAttData.filter(item => {
                        return item.work_date >= dateRange.start && item.work_date <= dateRange.end;
                    });

                    // 2. Obtener lista de empleados para el cruce (Roster)
                    const { data: allEmployees, error: empError2 } = await getEmployeesReport(
                        selectedSede === 'all' ? null : selectedSede, 
                        selectedBusinessUnit === 'all' ? null : selectedBusinessUnit
                    )

                    if (empError2 || !allEmployees) {
                        throw new Error('No se pudo cargar la lista de empleados para el reporte')
                    }

                    // 3. Generar rango de fechas (Iteración segura usando UTC)
                    const dates = []
                    // Parseamos como UTC explícitamente agregando T00:00:00Z si es necesario, 
                    // o mejor aún, trabajamos con los componentes de la fecha para evitar confusiones.
                    
                    const startParts = dateRange.start.split('-').map(Number); // [2026, 2, 17]
                    const endParts = dateRange.end.split('-').map(Number);     // [2026, 2, 17]
                    
                    // Creamos fechas usando UTC para evitar que el navegador reste horas
                    let currentIter = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2]));
                    const endIter = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2]));

                    while (currentIter <= endIter) {
                        dates.push(new Date(currentIter))
                        currentIter.setUTCDate(currentIter.getUTCDate() + 1)
                    }

                    // 4. Indexar asistencias existentes para búsqueda rápida: date_string -> employee_id -> record
                    const attendanceMap = {}
                    attData.forEach(att => {
                        if (!attendanceMap[att.work_date]) {
                            attendanceMap[att.work_date] = {}
                        }
                        attendanceMap[att.work_date][att.employee_id] = att
                    })

                    // 5. Construir reporte completo (Cross-Join: Fechas x Empleados)
                    data = []
                    
                    // Ordenar fechas descendente
                    dates.sort((a, b) => b - a).forEach(d => {
                        const dateStr = d.toISOString().split('T')[0]
                        
                        allEmployees.forEach(emp => {
                            // Buscar si existe registro
                            const record = attendanceMap[dateStr]?.[emp.id]
                            
                            // Helpers (reutilizados)
                            const formatTime = (timeStr) => {
                                if (!timeStr) return '-'
                                try {
                                    const date = new Date(timeStr)
                                    if (isNaN(date.getTime())) return timeStr
                                    return date.toLocaleTimeString('es-PE', {
                                        timeZone: 'America/Lima',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                    }).toUpperCase()
                                } catch (e) {
                                    return timeStr
                                }
                            }

                            const getStatusText = (item) => {
                                if (!item) return 'AUSENCIA'; // Si no hay registro es ausencia implícita
                                const t = item.record_type;
                                if (t === 'ASISTENCIA') return item.is_late ? 'TARDANZA' : 'PUNTUAL';
                                if (t === 'FALTA JUSTIFICADA' || t === 'AUSENCIA SIN JUSTIFICAR') return 'AUSENCIA';
                                if (t === 'DESCANSO MÉDICO') return 'DESCANSO MÉDICO';
                                if (t === 'LICENCIA CON GOCE') return 'LICENCIA';
                                if (t === 'VACACIONES') return 'VACACIONES';
                                return t || 'AUSENTE';
                            };

                            const getLabel = (item) => {
                                const status = getStatusText(item);
                                const t = item?.record_type;
                                if (status === 'AUSENCIA' || 
                                    ['AUSENCIA', 'INASISTENCIA', 'FALTA JUSTIFICADA', 'AUSENCIA SIN JUSTIFICAR', 'FALTA_INJUSTIFICADA'].includes(t) ||
                                    item?.status === 'absent') {
                                    return 'AUSENTISMO';
                                }
                                return 'ASISTENCIA';
                            };

                            if (record) {
                                // Caso: Registro existente
                                data.push({
                                    'Fecha': record.work_date ? record.work_date.split('-').reverse().join('/') : '-', // DD/MM/YYYY
                                    'DNI': record.employees?.dni || emp.dni,
                                    'Empleado': record.employees?.full_name || emp.full_name,
                                    'Sede': record.employees?.sede || emp.sede,
                                    'Ingreso': formatTime(record.check_in),
                                    'Salida': formatTime(record.check_out),
                                    'Estado': getStatusText(record),
                                    'Tipo': record.record_type,
                                    'AUSENTISMO': getLabel(record),
                                    'Validado': record.is_validated ? 'SÍ' : 'NO'
                                })
                            } else {
                                // Caso: Ausencia implícita (No hay registro)
                                data.push({
                                    'Fecha': dateStr.split('-').reverse().join('/'), // DD/MM/YYYY
                                    'DNI': emp.dni,
                                    'Empleado': emp.full_name,
                                    'Sede': emp.sede,
                                    'Ingreso': '-',
                                    'Salida': '-',
                                    'Estado': 'AUSENCIA',
                                    'Tipo': 'AUSENCIA',
                                    'AUSENTISMO': 'AUSENTISMO',
                                    'Validado': 'NO'
                                })
                            }
                        })
                    })
                    
                    fileName = `Asistencias_${sedeSuffix}_${dateRange.start}_al_${dateRange.end}.xlsx`
                    sheetName = 'Asistencias'
                    break

                case 'hires':
                    const { data: hiresData } = await getNewHiresReport(
                        selectedMonth.year,
                        selectedMonth.month,
                        selectedSede === 'all' ? null : selectedSede
                    )
                    data = hiresData.map(h => ({
                        'DNI': h.dni,
                        'Nombre Completo': h.full_name,
                        'Cargo': h.position,
                        'Sede': h.sede,
                        'Unidad Negocio': h.business_unit || '-',
                        'Fecha Ingreso': h.entry_date
                    }))
                    fileName = `Nuevos_Ingresos_${sedeSuffix}_${selectedMonth.month}_${selectedMonth.year}.xlsx`
                    sheetName = 'Ingresos'
                    break

                case 'vacations':
                    const { data: vacData } = await getVacationBalanceReport(
                        selectedSede === 'all' ? null : selectedSede
                    )
                    data = vacData.map(v => {
                        // Calcular años de servicio automáticamente
                        let yearsService = v.years_service;
                        if (v.entry_date) {
                            const entry = new Date(v.entry_date);
                            const today = new Date();
                            let years = today.getFullYear() - entry.getFullYear();
                            const m = today.getMonth() - entry.getMonth();
                            if (m < 0 || (m === 0 && today.getDate() < entry.getDate())) {
                                years--;
                            }
                            yearsService = Math.max(0, years);
                        }

                        return {
                            'DNI': v.dni,
                            'Empleado': v.full_name,
                            'Sede': v.sede,
                            'Unidad Negocio': v.business_unit || '-',
                            'Fecha Ingreso': v.entry_date,
                            'Años Servicio': yearsService,
                            'Días Ganados': Math.trunc(v.earned_days || 0),
                            'Días Gozados': Math.trunc(parseFloat(v.legacy_taken || 0) + parseFloat(v.app_taken || 0)),
                            'Saldo Actual': Math.trunc(v.balance || 0),
                            'Estado': v.status
                        }
                    })
                    fileName = `Saldos_Vacaciones_${sedeSuffix}_${getPeruDate()}.xlsx`
                    sheetName = 'Vacaciones'
                    break
            }

            if (!data || data.length === 0) {
                showToast('No hay datos para exportar con los filtros seleccionados', 'warning')
                return
            }

            // Generar Excel
            const wb = XLSX.utils.book_new()
            const ws = XLSX.utils.json_to_sheet(data)
            
            // Auto-width columnas (simple)
            const colWidths = Object.keys(data[0]).map(key => ({ wch: Math.max(key.length, 15) }))
            ws['!cols'] = colWidths

            XLSX.utils.book_append_sheet(wb, ws, sheetName)
            XLSX.writeFile(wb, fileName)
            
            showToast('Reporte descargado correctamente', 'success')

        } catch (error) {
            console.error('Export error:', error)
            showToast('Error generando el reporte', 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="text-blue-600" />
                        Centro de Reportes
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Descarga reportes detallados y consolidados de toda la gestión
                    </p>
                </div>
            </div>

            {/* Selector de Sede Global (Si aplica) */}
            {canSelectSede && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                    <Filter className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Filtrar por Sede:</span>
                    <select
                        value={selectedSede}
                        onChange={(e) => setSelectedSede(e.target.value)}
                        className="border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">Todas las Sedes</option>
                        <option value="ADM. CENTRAL">ADM. CENTRAL</option>
                        <option value="LIMA">Lima</option>
                        <option value="TRUJILLO">Trujillo</option>
                        <option value="CHIMBOTE">Chimbote</option>
                        <option value="HUARAZ">Huaraz</option>
                        <option value="HUACHO">Huacho</option>
                        <option value="CHINCHA">Chincha</option>
                        <option value="ICA">Ica</option>
                        <option value="DESAGUADERO">Desaguadero</option>
                    </select>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                
                {/* CARD 1: MAESTRO DE EMPLEADOS */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <Users size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Maestro de Empleados</h3>
                        </div>
                        <p className="text-sm text-gray-500">
                            Listado completo de personal con datos personales, laborales, bancarios y de contacto.
                        </p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                            <span>Total registros estimados:</span>
                            <span className="font-bold">Todos</span>
                        </div>
                        <button
                            onClick={() => handleExport('employees')}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                        >
                            {loading ? 'Generando...' : 'Descargar Excel'}
                            <Download size={18} />
                        </button>
                    </div>
                </div>

                {/* CARD 2: ASISTENCIAS */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                <Clock size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Reporte de Asistencias</h3>
                        </div>
                        <p className="text-sm text-gray-500">
                            Detalle diario de marcas de entrada/salida, tardanzas y validaciones.
                        </p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
                                <input 
                                    type="date" 
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
                                    className="w-full border-gray-300 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
                                <input 
                                    type="date" 
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
                                    className="w-full border-gray-300 rounded-lg text-sm"
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => handleExport('attendance')}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                        >
                            {loading ? 'Generando...' : 'Descargar Excel'}
                            <Download size={18} />
                        </button>
                    </div>
                </div>

                {/* CARD 3: SALDOS DE VACACIONES */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                <Briefcase size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Saldos de Vacaciones</h3>
                        </div>
                        <p className="text-sm text-gray-500">
                            Consolidado de días ganados, gozados y saldos pendientes por empleado.
                        </p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between text-sm text-gray-600 bg-purple-50 p-3 rounded-lg">
                            <span>Incluye semáforo de estado:</span>
                            <span className="font-bold text-purple-700">Sí</span>
                        </div>
                        <button
                            onClick={() => handleExport('vacations')}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
                        >
                            {loading ? 'Generando...' : 'Descargar Excel'}
                            <Download size={18} />
                        </button>
                    </div>
                </div>

                {/* CARD 4: NUEVOS INGRESOS */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                                <Users size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Nuevos Ingresos</h3>
                        </div>
                        <p className="text-sm text-gray-500">
                            Listado mensual de personal incorporado a la empresa.
                        </p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Mes</label>
                                <select 
                                    value={selectedMonth.month}
                                    onChange={(e) => setSelectedMonth(prev => ({...prev, month: e.target.value}))}
                                    className="w-full border-gray-300 rounded-lg text-sm"
                                >
                                    {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                                        <option key={i} value={i+1}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Año</label>
                                <select 
                                    value={selectedMonth.year}
                                    onChange={(e) => setSelectedMonth(prev => ({...prev, year: e.target.value}))}
                                    className="w-full border-gray-300 rounded-lg text-sm"
                                >
                                    <option value={2024}>2024</option>
                                    <option value={2025}>2025</option>
                                    <option value={2026}>2026</option>
                                </select>
                            </div>
                        </div>
                        <button
                            onClick={() => handleExport('hires')}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50"
                        >
                            {loading ? 'Generando...' : 'Descargar Excel'}
                            <Download size={18} />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}
