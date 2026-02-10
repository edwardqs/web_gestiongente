import React, { useState, useEffect } from 'react'
import { getEmployeeVacationRequests } from '../services/vacations'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle, History } from 'lucide-react'

const VacationCalendar = ({ employeeId }) => {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalRequested: 0,
        consumed: 0,
        pending: 0
    })

    useEffect(() => {
        if (employeeId) {
            fetchRequests()
        }
    }, [employeeId])

    const fetchRequests = async () => {
        try {
            setLoading(true)
            const { data, error } = await getEmployeeVacationRequests(employeeId)
            if (data) {
                setRequests(data)
                calculateStats(data)
            }
        } catch (error) {
            console.error("Error cargando calendario:", error)
        } finally {
            setLoading(false)
        }
    }

    const calculateStats = (data) => {
        let total = 0
        let consumed = 0
        let pending = 0
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        data.forEach(req => {
            // Asumimos que total_days viene calculado del backend o lo calculamos
            // Si el backend trae 'total_days', lo usamos. Si no, calculamos por rango.
            // Por seguridad, calculamos iterando días para saber cuáles son pasados/futuros.
            
            const start = new Date(req.start_date + 'T00:00:00') // Ajuste de zona horaria simple
            const end = new Date(req.end_date + 'T00:00:00')
            
            // Iterar por cada día del rango
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                // Ignoramos fines de semana si esa es la regla de negocio, 
                // pero normalmente 'total_days' ya lo considera. 
                // Aquí contaremos días naturales dentro del rango solicitado para la visualización.
                // Si queremos ser estrictos con días hábiles, necesitaríamos esa lógica.
                // Asumiremos días naturales marcados en calendario por simplicidad visual.
                
                total++
                if (d < today) {
                    consumed++
                } else {
                    pending++
                }
            }
        })

        setStats({
            totalRequested: total,
            consumed,
            pending
        })
    }

    const getDaysInMonth = (date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const days = new Date(year, month + 1, 0).getDate()
        const firstDay = new Date(year, month, 1).getDay()
        return { days, firstDay }
    }

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    }

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    }

    const isDateRequested = (day) => {
        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
        checkDate.setHours(0, 0, 0, 0)
        
        // Buscar si cae en algún rango
        const found = requests.find(req => {
            const start = new Date(req.start_date + 'T00:00:00')
            const end = new Date(req.end_date + 'T00:00:00')
            return checkDate >= start && checkDate <= end
        })
        
        return found
    }

    const isPastDate = (day) => {
        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return checkDate < today
    }

    const { days: totalDays, firstDay } = getDaysInMonth(currentDate)
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

    // Días de la semana
    const weekDays = ["D", "L", "M", "M", "J", "V", "S"]

    return (
        <div className="flex flex-col gap-6">
            {/* Leyenda y Estadísticas */}
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col items-center justify-center">
                    <span className="text-slate-500 mb-1 flex items-center gap-1">
                        <CalendarIcon size={14} /> Solicitados
                    </span>
                    <span className="font-bold text-lg text-slate-800">{stats.totalRequested}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col items-center justify-center">
                    <span className="text-slate-500 mb-1 flex items-center gap-1">
                        <History size={14} /> Consumidos
                    </span>
                    <span className="font-bold text-lg text-slate-600">{stats.consumed}</span>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 flex flex-col items-center justify-center">
                    <span className="text-emerald-600 mb-1 flex items-center gap-1">
                        <Clock size={14} /> Por Gozar
                    </span>
                    <span className="font-bold text-lg text-emerald-700">{stats.pending}</span>
                </div>
            </div>

            {/* Calendario */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                {/* Header Calendario */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                    <button onClick={prevMonth} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-600">
                        <ChevronLeft size={20} />
                    </button>
                    <h3 className="font-semibold text-slate-700">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h3>
                    <button onClick={nextMonth} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-600">
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Grid Días Semana */}
                <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
                    {weekDays.map((day, i) => (
                        <div key={i} className="py-2 text-center text-xs font-medium text-slate-400">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Grid Días Mes */}
                <div className="grid grid-cols-7 p-2 gap-1">
                    {/* Espacios vacíos iniciales */}
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-10"></div>
                    ))}
                    
                    {/* Días */}
                    {Array.from({ length: totalDays }).map((_, i) => {
                        const day = i + 1
                        const requested = isDateRequested(day)
                        const past = isPastDate(day)
                        
                        let bgClass = "bg-white hover:bg-slate-50 text-slate-700"
                        let textClass = ""
                        
                        if (past) {
                            bgClass = "bg-slate-100 text-slate-400"
                        }
                        
                        if (requested) {
                            if (past) {
                                bgClass = "bg-emerald-100 text-emerald-400 line-through decoration-emerald-400/50" // Solicitado pero ya pasó
                            } else {
                                bgClass = "bg-emerald-500 text-white shadow-sm" // Solicitado futuro
                            }
                        }

                        return (
                            <div 
                                key={day} 
                                className={`
                                    h-10 flex items-center justify-center rounded-lg text-sm transition-all
                                    ${bgClass}
                                    ${!past && !requested ? 'cursor-default' : 'cursor-default'}
                                `}
                            >
                                {day}
                            </div>
                        )
                    })}
                </div>
            </div>
            
            {/* Leyenda Visual */}
            <div className="flex flex-wrap gap-4 text-xs text-slate-500 justify-center">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-100 border border-slate-300"></div>
                    <span>Días pasados</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span>Vacaciones programadas</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-200"></div>
                    <span>Vacaciones disfrutadas</span>
                </div>
            </div>
        </div>
    )
}

export default VacationCalendar
