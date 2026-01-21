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
  Edit2, // Icono para edición
  Trash2 // Icono para eliminación
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
      setActivities(prev => [newActivity, ...prev].slice(0, 5)) // Agregar nuevo y mantener solo 5
    })

    // Cleanup al desmontar
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Función para formatear hora exacta (Ej: 14:30 PM)
  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  // Función para obtener icono según tipo de actividad
  const getActivityIcon = (type) => {
    switch(type) {
      case 'NEW_EMPLOYEE': return <UserPlus size={20} />
      case 'UPDATE_EMPLOYEE': return <Edit2 size={20} /> // Nuevo icono
      case 'DELETE_EMPLOYEE': return <Trash2 size={20} /> // Nuevo icono
      case 'ATTENDANCE': return <Clock size={20} />
      default: return <Activity size={20} />
    }
  }

  // Función para obtener color según tipo de actividad
  const getActivityColor = (type) => {
    switch(type) {
      case 'NEW_EMPLOYEE': return 'text-blue-600 bg-blue-50'
      case 'UPDATE_EMPLOYEE': return 'text-orange-600 bg-orange-50'
      case 'DELETE_EMPLOYEE': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
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
                  <p>No hay actividad reciente registrada</p>
                </div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-default border-b border-gray-50 last:border-0 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(act.type)}`}>
                      {getActivityIcon(act.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{act.description}</p>
                      <p className="text-xs text-gray-500">
                        {act.type === 'NEW_EMPLOYEE' ? 'Registro de Personal' : 
                         act.type === 'UPDATE_EMPLOYEE' ? 'Actualización de Datos' :
                         act.type === 'DELETE_EMPLOYEE' ? 'Eliminación de Registro' : 'Sistema'}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-gray-400 whitespace-nowrap bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                      {formatTime(act.created_at)}
                    </span>
                  </div>
                ))
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
