import { useState, useEffect } from 'react'
import { getAttendanceRecords } from '../services/attendance'
import { 
  Clock, 
  MapPin, 
  User, 
  Calendar,
  Image as ImageIcon,
  AlertTriangle,
  FileText,
  Search,
  Filter
} from 'lucide-react'

export default function Attendance() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    setLoading(true)
    const { data, error } = await getAttendanceRecords(100)
    if (!error && data) {
      setRecords(data)
    }
    setLoading(false)
  }

  const getStatusColor = (record) => {
    if (record.record_type === 'INASISTENCIA') return 'bg-red-100 text-red-800'
    if (record.check_out) return 'bg-green-100 text-green-800'
    return 'bg-blue-100 text-blue-800'
  }

  const getStatusText = (record) => {
    if (record.record_type === 'INASISTENCIA') return 'Inasistencia'
    if (record.check_out) return 'Jornada Completa'
    return 'En Jornada'
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  // Filter records based on search term
  const filteredRecords = records.filter(record => {
    const fullName = `${record.employees?.first_name} ${record.employees?.last_name}`.toLowerCase()
    const sede = record.employees?.sede?.toLowerCase() || ''
    const search = searchTerm.toLowerCase()
    return fullName.includes(search) || sede.includes(search)
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Clock className="text-blue-600" />
            Registro de Asistencias
          </h1>
          <p className="text-gray-500 mt-1">Monitoreo de entradas, salidas e inasistencias</p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre o sede..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entrada / Salida</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalles</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evidencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            {record.employees?.first_name?.[0]}{record.employees?.last_name?.[0]}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {record.employees?.first_name} {record.employees?.last_name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin size={12} />
                            {record.employees?.sede || 'Sin sede'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} />
                        {formatDate(record.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-green-700">
                          <span className="w-16 text-xs font-bold uppercase">Entrada:</span>
                          {record.record_type === 'INASISTENCIA' ? '-' : formatTime(record.check_in)}
                        </div>
                        <div className="flex items-center gap-2 text-red-700">
                          <span className="w-16 text-xs font-bold uppercase">Salida:</span>
                          {formatTime(record.check_out)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(record)}`}>
                        {getStatusText(record)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {record.notes && (
                        <div className="text-sm text-gray-600 max-w-xs truncate" title={record.notes}>
                          <span className="font-semibold">Nota:</span> {record.notes.split('\nEvidence:')[0]}
                        </div>
                      )}
                      {!record.notes && <span className="text-gray-400 text-xs">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.notes?.includes('Evidence:') || record.evidence_url ? (
                        <button 
                          onClick={() => {
                            // Extract URL from notes if evidence_url is empty, or use evidence_url directly
                            let url = record.evidence_url;
                            if (!url && record.notes) {
                                const match = record.notes.match(/Evidence: (https?:\/\/[^\s]+)/);
                                if (match) url = match[1];
                            }
                            setSelectedImage(url);
                          }}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <ImageIcon size={18} />
                          <span className="underline">Ver foto</span>
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin evidencia</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg p-2">
            <button 
              className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
              onClick={() => setSelectedImage(null)}
            >
              <X size={24} />
            </button>
            <img 
              src={selectedImage} 
              alt="Evidencia" 
              className="max-w-full max-h-[85vh] object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function X({ size, className }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  )
}
