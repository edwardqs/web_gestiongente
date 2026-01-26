import { useState, useEffect } from 'react'
import { getRequests } from '../services/requests'
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react'

const CalendarRequests = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    VACACIONES: true,
    SALUD: true,
    PERSONAL: true,
    OTROS: true
  })

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const { data } = await getRequests()
      setRequests(data || [])
    } catch (error) {
      console.error("Error cargando solicitudes:", error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const days = new Date(year, month + 1, 0).getDate()
    const firstDay = new Date(year, month, 1).getDay()
    // Ajustar para que lunes sea 0 (opcional, pero común en calendarios latinos. JS Sunday is 0)
    // Vamos a usar Domingo = 0 para simplificar por ahora, o ajustar visualmente.
    return { days, firstDay }
  }

  const { days: totalDays, firstDay } = getDaysInMonth(currentDate)
  
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const getRequestType = (type) => {
    if (!type) return 'OTROS'
    const t = type.toUpperCase()
    if (t.includes('VACACIONES')) return 'VACACIONES'
    if (t.includes('SALUD') || t.includes('MEDICO')) return 'SALUD'
    if (t.includes('PERSONAL')) return 'PERSONAL'
    return 'OTROS'
  }

  const getColor = (type) => {
    switch (type) {
      case 'VACACIONES': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'SALUD': return 'bg-rose-100 text-rose-800 border-rose-200'
      case 'PERSONAL': return 'bg-amber-100 text-amber-800 border-amber-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }
  
  const getDotColor = (type) => {
    switch (type) {
      case 'VACACIONES': return 'bg-emerald-500'
      case 'SALUD': return 'bg-rose-500'
      case 'PERSONAL': return 'bg-amber-500'
      default: return 'bg-blue-500'
    }
  }

  const filteredRequests = requests.filter(req => {
    const type = getRequestType(req.request_type)
    return filters[type]
  })

  // Función para verificar si una solicitud cae en un día específico
  const getRequestsForDay = (day) => {
    const currentMonthStr = currentDate.toISOString().slice(0, 7) // YYYY-MM
    const dateStr = `${currentMonthStr}-${String(day).padStart(2, '0')}`
    
    return filteredRequests.filter(req => {
        // Ajustar fechas para comparación (ignorar horas)
        // Ojo: req.start_date y req.end_date vienen como YYYY-MM-DD string normalmente de Supabase date column
        // Si vienen con tiempo, hay que limpiar.
        return req.start_date <= dateStr && req.end_date >= dateStr
    })
  }

  const toggleFilter = (type) => {
    setFilters(prev => ({ ...prev, [type]: !prev[type] }))
  }

  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  // Generar celdas vacías previas
  const emptyCells = Array(firstDay).fill(null)
  // Generar días del mes
  const daysCells = Array.from({ length: totalDays }, (_, i) => i + 1)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-800">Calendario de Solicitudes</h1>
            <p className="text-gray-500 mt-1">Visualiza y filtra las ausencias del personal</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronLeft size={20} />
            </button>
            <span className="text-lg font-semibold w-40 text-center capitalize">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronRight size={20} />
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar de Filtros y Leyenda */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-4 text-gray-700 font-semibold">
                    <Filter size={18} />
                    <h3>Filtros</h3>
                </div>
                <div className="space-y-3">
                    {Object.keys(filters).map(type => (
                        <label key={type} className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative flex items-center">
                                <input 
                                    type="checkbox" 
                                    checked={filters[type]} 
                                    onChange={() => toggleFilter(type)}
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 transition-all checked:border-blue-500 checked:bg-blue-500"
                                />
                                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${getDotColor(type)}`}></span>
                                <span className="text-sm text-gray-600 group-hover:text-gray-900 capitalize">{type.toLowerCase()}</span>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                <h3 className="text-blue-900 font-semibold mb-2">Resumen del Mes</h3>
                <p className="text-sm text-blue-700">
                    Total de solicitudes visibles: <span className="font-bold">{filteredRequests.length}</span>
                </p>
            </div>
        </div>

        {/* Calendario Grid */}
        <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Días de la semana */}
                <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                    {daysOfWeek.map(day => (
                        <div key={day} className="py-3 text-center text-sm font-semibold text-gray-500">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Días */}
                <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px">
                    {emptyCells.map((_, i) => (
                        <div key={`empty-${i}`} className="bg-gray-50 min-h-[120px]"></div>
                    ))}
                    
                    {daysCells.map(day => {
                        const dayRequests = getRequestsForDay(day)
                        const isToday = 
                            day === new Date().getDate() && 
                            currentDate.getMonth() === new Date().getMonth() && 
                            currentDate.getFullYear() === new Date().getFullYear()

                        return (
                            <div key={day} className={`bg-white min-h-[120px] p-2 transition-colors hover:bg-gray-50 flex flex-col gap-1 ${isToday ? 'bg-blue-50/30' : ''}`}>
                                <div className="flex justify-between items-start">
                                    <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                                        {day}
                                    </span>
                                    {dayRequests.length > 0 && (
                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 rounded-full">
                                            {dayRequests.length}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="flex flex-col gap-1 mt-1 overflow-y-auto max-h-[100px] custom-scrollbar">
                                    {dayRequests.map(req => {
                                        const type = getRequestType(req.request_type)
                                        const style = getColor(type)
                                        return (
                                            <div 
                                                key={req.id} 
                                                className={`text-[10px] px-1.5 py-1 rounded border-l-2 truncate cursor-help group relative ${style}`}
                                                title={`${req.employees?.full_name} - ${req.request_type}`}
                                            >
                                                <span className="font-semibold">{req.employees?.full_name?.split(' ')[0]}</span>
                                                <span className="hidden group-hover:block absolute left-0 bottom-full mb-1 z-10 w-48 bg-gray-800 text-white p-2 rounded text-xs shadow-lg whitespace-normal">
                                                    <div className="font-bold mb-1">{req.employees?.full_name}</div>
                                                    <div>{req.request_type}</div>
                                                    <div className="text-gray-300 text-[9px] mt-1">
                                                        {req.start_date} al {req.end_date}
                                                    </div>
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}

export default CalendarRequests
