import React, { useState, useEffect, useMemo } from 'react'
import Modal from '../components/ui/Modal'
import { getDashboardMetrics } from '../services/dashboard'
import { getPositions } from '../services/positions' // Importar servicio de cargos
import { supabase } from '../lib/supabase' // Importar supabase
import { useAuth } from '../context/AuthContext'
import { Download, Users, Clock, AlertTriangle, Briefcase, Calendar, UserMinus } from 'lucide-react' // Importar UserMinus
import * as XLSX from 'xlsx'
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function MonthlyReportModal({ isOpen, onClose }) {
    const { user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [metrics, setMetrics] = useState(null)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
    const [selectedSede, setSelectedSede] = useState('all')
    const [selectedUnit, setSelectedUnit] = useState('all') // Nueva variable de estado para Unidad
    const [selectedArea, setSelectedArea] = useState('all') // Nueva variable de estado para Área
    const [terminationsCount, setTerminationsCount] = useState(0) // Estado para bajas del mes
    const [terminationsTrend, setTerminationsTrend] = useState([]) // Estado para tendencia de bajas
    const [positionAreaMap, setPositionAreaMap] = useState({}) // Mapa de Cargo -> Área
    const [units, setUnits] = useState([]) // Lista de unidades de negocio
    const [areas, setAreas] = useState([]) // Lista de áreas disponibles

    useEffect(() => {
        if (isOpen) {
            loadMetrics()
            loadTerminations()
            loadTerminationsTrend()
        }
    }, [isOpen, selectedYear, selectedMonth, selectedSede, selectedUnit, selectedArea])

    // Cargar datos auxiliares (áreas, unidades) al montar
    useEffect(() => {
        const fetchAuxData = async () => {
            // Cargar cargos y armar mapa de áreas
            const { data: positionsData } = await getPositions()
            const areaMap = {}
            const uniqueAreas = new Set()
            
            if (positionsData) {
                positionsData.forEach(pos => {
                    if (pos.area_name && pos.area_name !== 'Sin Área Asignada') {
                        areaMap[pos.name] = pos.area_name
                        uniqueAreas.add(pos.area_name)
                    }
                })
            }
            setPositionAreaMap(areaMap)
            setAreas([...uniqueAreas].sort())

            // Cargar unidades de negocio únicas
            const { data: unitsData } = await supabase
                .from('employees')
                .select('business_unit')
                .not('business_unit', 'is', null)
            
            if (unitsData) {
                const uniqueUnits = [...new Set(unitsData.map(u => u.business_unit))].sort()
                setUnits(uniqueUnits)
            }
        }
        
        if (isOpen) fetchAuxData()
    }, [isOpen])

    const loadMetrics = async () => {
        setLoading(true)
        // Nota: getDashboardMetrics solo soporta filtro por Sede actualmente.
        // Los filtros de Unidad y Área solo afectarán al indicador de Bajas por ahora.
        const { data } = await getDashboardMetrics(selectedYear, selectedMonth, selectedSede)
        if (data) {
                // Ajustar formato de mes al español si es necesario (el backend suele enviar nombres en inglés o números)
                // Aquí asumimos que hires_trend viene con 'name' (mes). Si viene en inglés, lo mapeamos.
                const monthMap = {
                  'January': 'Ene', 'February': 'Feb', 'March': 'Mar', 'April': 'Abr', 'May': 'May', 'June': 'Jun',
                  'July': 'Jul', 'August': 'Ago', 'September': 'Sep', 'October': 'Oct', 'November': 'Nov', 'December': 'Dic',
                  'Jan': 'Ene', 'Feb': 'Feb', 'Mar': 'Mar', 'Apr': 'Abr', 'May': 'May', 'Jun': 'Jun',
                  'Jul': 'Jul', 'Aug': 'Ago', 'Sep': 'Sep', 'Oct': 'Oct', 'Nov': 'Nov', 'Dec': 'Dic'
                }
                const translatedHires = (data.hires_trend || []).map(item => ({
                    ...item,
                    name: monthMap[item.name] || monthMap[item.name.substring(0,3)] || item.name // Traducir si existe, intentar substring
                }))
                
                setMetrics({ ...data, hires_trend: translatedHires })
        }
        setLoading(false)
    }

    const loadTerminations = async () => {
        try {
            // Calcular rango de fechas del mes seleccionado
            const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString()
            const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString()

            let query = supabase
                .from('employees')
                .select('id, position, business_unit, termination_date, sede')
                .eq('is_active', false)
                .gte('termination_date', startDate)
                .lte('termination_date', endDate)

            // Aplicar filtros directos de Sede y Unidad
            if (selectedSede !== 'all') {
                query = query.eq('sede', selectedSede)
            }
            if (selectedUnit !== 'all') {
                query = query.eq('business_unit', selectedUnit)
            }

            const { data, error } = await query
            
            if (error) throw error

            // Filtrar por Área en memoria (usando el mapa de cargos)
            let filteredData = data || []
            if (selectedArea !== 'all') {
                filteredData = filteredData.filter(emp => {
                    const empArea = positionAreaMap[emp.position]
                    // Normalizar para comparación robusta
                    const normalize = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() : ""
                    return normalize(empArea) === normalize(selectedArea)
                })
            }

            setTerminationsCount(filteredData.length)
        } catch (error) {
            console.error('Error loading terminations:', error)
        }
    }

    const loadTerminationsTrend = async () => {
        try {
            // Calcular últimos 6 meses (incluyendo el actual)
            const months = []
            for (let i = 5; i >= 0; i--) {
                const d = new Date(selectedYear, selectedMonth - 1 - i, 1)
                const monthName = d.toLocaleString('es-ES', { month: 'short' })
                // Capitalizar primera letra: "ene" -> "Ene"
                const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1)
                months.push({
                    month: d.getMonth() + 1,
                    year: d.getFullYear(),
                    name: capitalizedMonth,
                    count: 0
                })
            }

            const startDate = new Date(months[0].year, months[0].month - 1, 1).toISOString()
            const endDate = new Date(months[5].year, months[5].month, 0, 23, 59, 59).toISOString()

            let query = supabase
                .from('employees')
                .select('id, position, business_unit, termination_date, sede')
                .eq('is_active', false)
                .gte('termination_date', startDate)
                .lte('termination_date', endDate)

            // Aplicar filtros directos de Sede y Unidad
            if (selectedSede !== 'all') {
                query = query.eq('sede', selectedSede)
            }
            if (selectedUnit !== 'all') {
                query = query.eq('business_unit', selectedUnit)
            }

            const { data, error } = await query
            if (error) throw error

            // Filtrar por Área y agrupar por mes
            const trendData = months.map(m => {
                const count = (data || []).filter(emp => {
                    if (!emp.termination_date) return false
                    const termDate = new Date(emp.termination_date)
                    const matchesMonth = termDate.getMonth() + 1 === m.month && termDate.getFullYear() === m.year
                    
                    if (!matchesMonth) return false

                    // Filtro de Área
                    if (selectedArea !== 'all') {
                        const empArea = positionAreaMap[emp.position]
                        const normalize = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() : ""
                        if (normalize(empArea) !== normalize(selectedArea)) return false
                    }

                    return true
                }).length
                
                return { name: m.name, bajas: count }
            })

            setTerminationsTrend(trendData)

        } catch (error) {
            console.error('Error loading terminations trend:', error)
        }
    }

    const handleExportNewHires = () => {
        if (!metrics?.new_hires?.list?.length) return

        const exportData = metrics.new_hires.list.map(emp => ({
            'DNI': emp.dni,
            'Nombre Completo': emp.full_name,
            'Cargo': emp.position,
            'Sede': emp.sede,
            'Unidad de Negocio': emp.business_unit || '-',
            'Fecha Ingreso': emp.entry_date
        }))

        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.json_to_sheet(exportData)
        
        // Ajustar columnas
        ws['!cols'] = [{wch: 12}, {wch: 35}, {wch: 25}, {wch: 15}, {wch: 20}, {wch: 15}]

        XLSX.utils.book_append_sheet(wb, ws, 'Nuevos Ingresos')
        XLSX.writeFile(wb, `Nuevos_Ingresos_${selectedMonth}_${selectedYear}.xlsx`)
    }

    // Preparar datos para gráficos
    const attendanceData = useMemo(() => {
        if (!metrics?.attendance_summary) return []
        return [
            { name: 'Puntual', value: metrics.attendance_summary.puntual || 0 },
            { name: 'Tardanza', value: metrics.attendance_summary.tardanza || 0 },
            { name: 'Ausencia', value: metrics.attendance_summary.ausencia || 0 }
        ]
    }, [metrics])

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div className="bg-slate-50 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden m-4">
                
                {/* Header */}
                <div className="bg-white p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Briefcase className="text-blue-600" />
                            Reporte Mensual de Gestión
                        </h2>
                        <p className="text-slate-500 text-sm">Resumen estratégico de RRHH</p>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center">
                        <select 
                            value={selectedSede} 
                            onChange={(e) => setSelectedSede(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="all">Todas las Sedes</option>
                            <option value="ADM. CENTRAL">ADM. CENTRAL</option>
                            <option value="LIMA">Lima</option>
                            <option value="TRUJILLO">Trujillo</option>
                            <option value="CHIMBOTE">Chimbote</option>
                            <option value="HUARAZ">Huaraz</option>
                        </select>

                        <select 
                            value={selectedUnit} 
                            onChange={(e) => setSelectedUnit(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="all">Todas las Unidades</option>
                            {units.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>

                        <select 
                            value={selectedArea} 
                            onChange={(e) => setSelectedArea(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="all">Todas las Áreas</option>
                            {areas.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>

                        <select 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                                <option key={i} value={i+1}>{m}</option>
                            ))}
                        </select>

                        <select 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value={2024}>2024</option>
                            <option value={2025}>2025</option>
                            <option value={2026}>2026</option>
                        </select>

                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">
                            ✕
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : metrics ? (
                        <>
                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-slate-500 font-medium">Nuevos Ingresos</p>
                                            <h3 className="text-3xl font-bold text-blue-600 mt-1">{metrics.new_hires?.count || 0}</h3>
                                        </div>
                                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                            <Users size={20} />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-slate-500 font-medium">Bajas del Mes</p>
                                            <h3 className="text-3xl font-bold text-orange-600 mt-1">{terminationsCount}</h3>
                                        </div>
                                        <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                                            <UserMinus size={20} />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-slate-500 font-medium">Tardanzas Mes</p>
                                            <h3 className="text-3xl font-bold text-yellow-600 mt-1">{metrics.attendance_summary?.tardanza || 0}</h3>
                                        </div>
                                        <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600">
                                            <Clock size={20} />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-slate-500 font-medium">Ausencias Totales</p>
                                            <h3 className="text-3xl font-bold text-red-600 mt-1">{metrics.attendance_summary?.ausencia || 0}</h3>
                                        </div>
                                        <div className="p-2 bg-red-50 rounded-lg text-red-600">
                                            <AlertTriangle size={20} />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-slate-500 font-medium">Días Vacaciones</p>
                                            <h3 className="text-3xl font-bold text-emerald-600 mt-1">{metrics.vacation_stats?.total_days_taken || 0}</h3>
                                        </div>
                                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                                            <Calendar size={20} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Gráficos Principales */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Evolución de Ingresos */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold text-slate-700">Evolución de Ingresos (6 Meses)</h3>
                                        <button 
                                            onClick={handleExportNewHires}
                                            disabled={!metrics.new_hires?.count}
                                            className="flex items-center gap-2 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                                        >
                                            <Download size={14} /> Exportar Excel
                                        </button>
                                    </div>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={metrics.hires_trend}>
                                                <defs>
                                                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                                <YAxis axisLine={false} tickLine={false} />
                                                <Tooltip />
                                                <Area type="monotone" dataKey="ingresos" stroke="#3b82f6" fillOpacity={1} fill="url(#colorIngresos)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Evolución de Bajas */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold text-slate-700">Evolución de Bajas (6 Meses)</h3>
                                    </div>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={terminationsTrend}>
                                                <defs>
                                                    <linearGradient id="colorBajas" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#ea580c" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                                <YAxis axisLine={false} tickLine={false} />
                                                <Tooltip />
                                                <Area type="monotone" dataKey="bajas" stroke="#ea580c" fillOpacity={1} fill="url(#colorBajas)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Distribución de Asistencia */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
                                    <h3 className="font-bold text-slate-700 mb-6">Salud de Asistencia</h3>
                                    <div className="h-64 flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={attendanceData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    label={({ name, value }) => `${value}`} 
                                                >
                                                    {attendanceData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#22c55e' : index === 1 ? '#eab308' : '#ef4444'} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Desglose de Ausencias y Vacaciones */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                    <h3 className="font-bold text-slate-700 mb-6">Top 5 Motivos de Ausencia</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart 
                                                data={metrics.absence_breakdown} 
                                                layout="vertical"
                                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12}} />
                                                <Tooltip cursor={{fill: 'transparent'}} />
                                                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                    <h3 className="font-bold text-slate-700 mb-6">Vacaciones por Unidad (Días)</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart 
                                                data={metrics.vacation_by_unit} 
                                                layout="vertical"
                                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12}} />
                                                <Tooltip cursor={{fill: 'transparent'}} />
                                                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-slate-500 py-20">
                            No hay datos disponibles para el periodo seleccionado.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
