import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { getRecentActivity, subscribeToActivity } from '../services/activity'
import { 
  Users, 
  Clock, 
  FileText, 
  AlertCircle, 
  TrendingUp,
  UserPlus,
  Calendar,
  Activity,
  CheckCircle,
  MapPin,
  XCircle
} from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activities, setActivities] = useState([])
  const [loadingActivities, setLoadingActivities] = useState(true)

  // Cargar actividades iniciales y suscribirse a cambios
  useEffect(() => {
    // 1. Cargar datos iniciales
    const loadActivities = async () => {
      const { data, error } = await getRecentActivity()
      if (!error && data) {
        setActivities(data)
      }
      setLoadingActivities(false)
    }
    loadActivities()

    // 2. Suscribirse a tiempo real
    const subscription = subscribeToActivity((newActivity) => {
      setActivities(prev => {
        // Remover si ya existe (para updates) y agregar al inicio
        const filtered = prev.filter(a => a.id !== newActivity.id)
        return [newActivity, ...filtered].slice(0, 10)
      })
    })

    // Cleanup al desmontar
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Función para formatear hora exacta
  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    // Ajuste simple de zona horaria si es necesario, o confiar en el browser
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  // Función para obtener config según tipo de registro
  const getRecordConfig = (activity) => {
    const type = activity.record_type;

    // 1. Inasistencias y Tipos Especiales
    if (type === 'FALTA JUSTIFICADA' || type === 'AUSENCIA SIN JUSTIFICAR' || type === 'AUSENCIA' || type === 'INASISTENCIA') {
      // Determinar texto específico
      let displayText = 'Falta Justificada';
      if (type === 'AUSENCIA SIN JUSTIFICAR' || activity.status === 'FALTA_INJUSTIFICADA' || activity.absence_reason === 'FALTA INJUSTIFICADA') {
          displayText = 'Falta Injustificada';
      }

      return {
        icon: <XCircle size={20} />,
        color: 'text-red-600 bg-red-50',
        text: displayText,
        subtext: activity.notes || activity.absence_reason || 'Sin motivo especificado'
      }
    }

    if (type === 'DESCANSO MÉDICO') {
        return {
            icon: <Activity size={20} />,
            color: 'text-indigo-600 bg-indigo-50',
            text: 'Descanso Médico',
            subtext: activity.subcategory || activity.notes || 'General'
        }
    }

    if (type === 'LICENCIA CON GOCE') {
        return {
             icon: <FileText size={20} />,
             color: 'text-purple-600 bg-purple-50',
             text: 'Licencia con Goce',
             subtext: activity.notes || 'Sin detalle'
        }
    }
    
    if (type === 'VACACIONES') {
        return {
             icon: <Calendar size={20} />,
             color: 'text-orange-600 bg-orange-50',
             text: 'Vacaciones',
             subtext: 'Periodo vacacional'
        }
    }

    // 2. Salidas
    if (activity.check_out && new Date(activity.check_out) > new Date(activity.created_at)) {
       // Esto es aproximado, idealmente sabríamos si el evento fue check_out
       // Pero como activity trae todo el registro, asumimos que si check_out es reciente es salida.
       // Simplificación: Mostramos el estado actual del registro.
    }

    // 3. Entradas (Default)
    if (activity.is_late) {
      return {
        icon: <Clock size={20} />,
        color: 'text-orange-600 bg-orange-50',
        text: 'Marcó Entrada (Tarde)',
        subtext: 'Registro fuera de horario'
      }
    }

    return {
      icon: <CheckCircle size={20} />,
      color: 'text-green-600 bg-green-50',
      text: 'Marcó Entrada (Puntual)',
      subtext: 'Registro en horario'
    }
  }

  // Datos simulados de stats (por ahora estáticos)
  const stats = [
    { 
      label: 'Total Empleados', 
      value: '124', 
      change: '+4 este mes', 
      icon: Users, 
      color: 'blue',
      bg: 'bg-blue-50',
      text: 'text-blue-600'
    },
    { 
      label: 'Asistencias Hoy', 
      value: '112', 
      change: '90% del personal', 
      icon: Clock, 
      color: 'green',
      bg: 'bg-green-50',
      text: 'text-green-600'
    },
    { 
      label: 'Solicitudes Pendientes', 
      value: '5', 
      change: 'Vacaciones / Permisos', 
      icon: FileText, 
      color: 'orange',
      bg: 'bg-orange-50',
      text: 'text-orange-600'
    },
    { 
      label: 'Tardanzas (Mes)', 
      value: '12', 
      change: '-2 vs mes anterior', 
      icon: AlertCircle, 
      color: 'red',
      bg: 'bg-red-50',
      text: 'text-red-600'
    },
  ]

  const quickActions = [
    { 
      label: 'Registrar Empleado', 
      icon: UserPlus, 
      color: 'bg-indigo-600',
      action: () => navigate('/register-employee')
    },
    { 
      label: 'Reporte Mensual', 
      icon: TrendingUp, 
      color: 'bg-emerald-600',
      action: () => console.log('Ir a reportes') // Pendiente
    },
    { 
      label: 'Ver Calendario', 
      icon: Calendar, 
      color: 'bg-purple-600',
      action: () => console.log('Ir a calendario') // Pendiente
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header con Bienvenida */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Hola, <span className="text-blue-600">{user?.email?.split('@')[0]}</span>
          </h1>
          <p className="text-gray-500 mt-1">Aquí tienes el resumen de actividad de hoy.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm">
          <Calendar size={16} />
          <span>{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Grid de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <h3 className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.text}`}>
                <stat.icon size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs font-medium text-gray-500">
              <span className={`px-2 py-1 rounded-full text-xs mr-2 ${stat.bg} ${stat.text}`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Sección Inferior: Accesos Rápidos y Actividad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Actividad Reciente (Ocupa 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Activity className="text-blue-600" size={20} />
                Actividad Reciente
              </h2>
              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                En vivo
              </span>
            </div>
            
            <div className="space-y-4">
              {loadingActivities ? (
                <div className="text-center py-10 text-gray-400">Cargando actividad...</div>
              ) : activities.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <CheckCircle className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                  <p>No hay registros de asistencia recientes</p>
                </div>
              ) : (
                activities.map((act) => {
                  const config = getRecordConfig(act)
                  // Detectar ubicación (location_in o location_out)
                  const location = act.location_in || act.location_out
                  const hasLocation = location && (typeof location === 'string' ? location.includes('lat') : location.lat)
                  
                  return (
                  <div key={act.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-default border-b border-gray-50 last:border-0 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Avatar o Icono */}
                    <div className="relative">
                       {act.employees?.profile_picture_url ? (
                         <img 
                           src={act.employees.profile_picture_url} 
                           alt={act.employees.full_name} 
                           className="w-10 h-10 rounded-full object-cover border border-gray-200"
                         />
                       ) : (
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.color}`}>
                           {config.icon}
                         </div>
                       )}
                       {/* Badge de Estado Pequeño si hay avatar */}
                       {act.employees?.profile_picture_url && (
                         <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${config.color} text-[10px]`}>
                           {config.icon}
                         </div>
                       )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                         <p className="text-sm font-bold text-gray-900 truncate">
                           {act.employees?.full_name || 'Empleado Desconocido'}
                         </p>
                         <span className="text-xs font-medium text-gray-400 whitespace-nowrap bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                            {formatTime(act.created_at)}
                         </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-600 truncate">
                          {config.text}
                        </p>
                        
                        {/* Indicador de Ubicación */}
                        {hasLocation && (
                          <span 
                            title="Ubicación registrada" 
                            className="cursor-pointer text-blue-500 hover:text-blue-700"
                            onClick={(e) => {
                                e.stopPropagation();
                                // Aquí podríamos abrir el modal de mapa, pero por ahora solo indicamos visualmente
                                // O redirigir a la lista de asistencias filtrada
                                navigate('/attendance')
                            }}
                          >
                            <MapPin size={12} />
                          </span>
                        )}

                        {/* Indicador de Validación Pendiente */}
                        {!act.validated && (act.record_type === 'AUSENCIA' || act.is_late) && (
                           <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                             Pendiente
                           </span>
                        )}
                      </div>
                    </div>
                  </div>
                )})
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Accesos Rápidos (Ocupa 1/3) */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-6">Accesos Rápidos</h2>
            <div className="grid grid-cols-1 gap-4">
              {quickActions.map((action, index) => (
                <button 
                  key={index}
                  onClick={action.action}
                  className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all duration-200 group w-full text-left"
                >
                  <div className={`p-3 rounded-lg ${action.color} text-white shadow-md group-hover:scale-110 transition-transform`}>
                    <action.icon size={20} />
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-blue-700">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Tarjeta Informativa / Banner */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-2">¿Necesitas ayuda?</h3>
              <p className="text-blue-100 text-sm mb-4">Contacta con soporte técnico si tienes problemas con el sistema.</p>
              <button className="bg-white/20 hover:bg-white/30 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors backdrop-blur-sm">
                Contactar Soporte
              </button>
            </div>
            {/* Decoración de fondo */}
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          </div>
        </div>

      </div>
    </div>
  )
}
