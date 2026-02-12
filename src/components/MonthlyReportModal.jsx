import React, { useState, useEffect, useMemo } from 'react'
import Modal from '../components/ui/Modal'
import { getDashboardMetrics } from '../services/dashboard'
import { useAuth } from '../context/AuthContext'
import { Download, Users, Clock, AlertTriangle, Briefcase, Calendar } from 'lucide-react'
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

    useEffect(() => {
        if (isOpen) {
            loadMetrics()
        }
    }, [isOpen, selectedYear, selectedMonth, selectedSede])

    const loadMetrics = async () => {
        setLoading(true)
        const { data } = await getDashboardMetrics(selectedYear, selectedMonth, selectedSede)
        if (data) setMetrics(data)
        setLoading(false)
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
                            <option value="LIMA">Lima</option>
                            <option value="TRUJILLO">Trujillo</option>
                            <option value="AREQUIPA">Arequipa</option>
                            <option value="CHIMBOTE">Chimbote</option>
                            <option value="HUARAZ">Huaraz</option>
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
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

                                {/* Distribución de Asistencia */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
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
