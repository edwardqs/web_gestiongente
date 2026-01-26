import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRequests } from '../services/requests'
import { 
  FileText, 
  Search, 
  Printer, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw
} from 'lucide-react'

export default function RequestsList() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    setLoading(true)
    const { data, error } = await getRequests()
    if (!error) {
      // Filtrar aquellos que no tengan empleado asociado (si la relación falla por RLS)
      // O mostrarlos como 'Desconocido'
      setRequests(data || [])
    }
    setLoading(false)
  }

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'APROBADO':
        return <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium"><CheckCircle size={12} /> Aprobado</span>
      case 'RECHAZADO':
        return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-medium"><XCircle size={12} /> Rechazado</span>
      default:
        return <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full text-xs font-medium"><Clock size={12} /> Pendiente</span>
    }
  }

  const filteredRequests = requests.filter(req => {
    const employeeName = req.employees?.full_name || 'Desconocido'
    const employeeDni = req.employees?.dni || ''
    
    const matchesSearch = 
      employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employeeDni.includes(searchTerm)
    
    const matchesStatus = filterStatus === 'ALL' || req.status === filterStatus

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-blue-600" />
            Solicitudes de Vacaciones
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestiona e imprime las papeletas de vacaciones y permisos
          </p>
        </div>
        <button 
          onClick={fetchRequests}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar por empleado o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Todos los estados</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="APROBADO">Aprobados</option>
            <option value="RECHAZADO">Rechazados</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Empleado</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo / Motivo</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fechas</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      Cargando solicitudes...
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No se encontraron solicitudes
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                          {req.employees?.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{req.employees?.full_name || 'Empleado no encontrado'}</p>
                          <p className="text-xs text-gray-500">{req.employees?.position || 'Sin cargo'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{req.request_type || 'Solicitud'}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]" title={req.notes || req.reason}>
                        {req.notes || req.reason || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <p>Desde: {new Date(req.start_date + 'T00:00:00').toLocaleDateString('es-PE')}</p>
                        <p>Hasta: {new Date(req.end_date + 'T00:00:00').toLocaleDateString('es-PE')}</p>
                        <p className="text-xs text-gray-500 mt-1">({req.total_days} días)</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => navigate(`/papeleta/${req.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 transition-all text-sm font-medium shadow-sm"
                        title="Ver Papeleta"
                      >
                        <Printer size={16} />
                        <span className="hidden sm:inline">Papeleta</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
