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
    
    // Filtros Específicos
    const [dateRange, setDateRange] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
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
                    fileName = `Maestro_Empleados_${new Date().toISOString().split('T')[0]}.xlsx`
                    sheetName = 'Empleados'
                    break

                case 'attendance':
                    const { data: attData } = await getAttendanceReport(
                        dateRange.start,
                        dateRange.end,
                        selectedSede === 'all' ? null : selectedSede
                    )
                    data = attData.map(att => ({
                        'Fecha': att.work_date,
                        'DNI': att.employees?.dni,
                        'Empleado': att.employees?.full_name,
                        'Sede': att.employees?.sede,
                        'Ingreso': att.check_in,
                        'Salida': att.check_out,
                        'Estado': att.status,
                        'Tipo': att.record_type,
                        'Validado': att.is_validated ? 'SÍ' : 'NO'
                    }))
                    fileName = `Asistencias_${dateRange.start}_al_${dateRange.end}.xlsx`
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
                    fileName = `Nuevos_Ingresos_${selectedMonth.month}_${selectedMonth.year}.xlsx`
                    sheetName = 'Ingresos'
                    break

                case 'vacations':
                    const { data: vacData } = await getVacationBalanceReport(
                        selectedSede === 'all' ? null : selectedSede
                    )
                    data = vacData.map(v => ({
                        'DNI': v.dni,
                        'Empleado': v.full_name,
                        'Sede': v.sede,
                        'Unidad Negocio': v.business_unit || '-',
                        'Fecha Ingreso': v.entry_date,
                        'Años Servicio': v.years_service,
                        'Días Ganados': v.earned_days,
                        'Días Gozados': parseFloat(v.legacy_taken || 0) + parseFloat(v.app_taken || 0),
                        'Saldo Actual': v.balance,
                        'Estado': v.status
                    }))
                    fileName = `Saldos_Vacaciones_${new Date().toISOString().split('T')[0]}.xlsx`
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
                        <option value="LIMA">Lima</option>
                        <option value="TRUJILLO">Trujillo</option>
                        <option value="CHIMBOTE">Chimbote</option>
                        <option value="HUARAZ">Huaraz</option>
                        <option value="HUACHO">Huacho</option>
                        <option value="CHINCHA">Chincha</option>
                        <option value="ICA">Ica</option>
                        <option value="DESAGUADERO">Desaguadero</option>
                        <option value="AREQUIPA">Arequipa</option>
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
