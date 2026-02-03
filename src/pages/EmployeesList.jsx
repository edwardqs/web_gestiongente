import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { deleteEmployee } from '../services/employees'
import { useToast } from '../context/ToastContext'
import Modal from '../components/ui/Modal'
import { 
  Search, 
  Download, 
  UserPlus,
  MapPin,
  Building2,
  Briefcase,
  Edit2,
  Trash2,
  Store 
} from 'lucide-react'

export default function EmployeesList() {
  const { sede } = useParams()
  const [searchParams] = useSearchParams()
  const businessUnit = searchParams.get('business')
  
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null })

  const sedeMap = {
    'adm-central': 'ADM. CENTRAL',
    'trujillo': 'TRUJILLO',
    'chimbote': 'CHIMBOTE',
    'huaraz': 'HUARAZ',
    'huacho': 'HUACHO',
    'chincha': 'CHINCHA',
    'ica': 'ICA',
    'desaguadero': 'DESAGUADERO',
    'lima': 'LIMA'
  }

  const currentSedeName = sedeMap[sede] || sede

  useEffect(() => {
    fetchEmployees()
  }, [sede, businessUnit])

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('employees')
        .select('*')
        .order('full_name', { ascending: true })

      if (currentSedeName) {
        query = query.eq('sede', currentSedeName)
      }

      if (businessUnit) {
        query = query.eq('business_unit', businessUnit.toUpperCase())
      }

      const { data, error } = await query

      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const openDeleteModal = (id) => {
    setModalConfig({
      isOpen: true,
      title: 'Eliminar Empleado',
      message: '¿Estás seguro de que deseas eliminar a este empleado? Esta acción no se puede deshacer.',
      type: 'error',
      confirmText: 'Eliminar',
      onConfirm: () => handleDelete(id)
    })
  }

  const handleDelete = async (id) => {
    setModalConfig(prev => ({ ...prev, isOpen: false }))
    try {
      const { error } = await deleteEmployee(id)
      if (error) throw error
      setEmployees(employees.filter(emp => emp.id !== id))
      showToast('Empleado eliminado correctamente', 'success')
    } catch (err) {
      showToast('Error al eliminar empleado: ' + err.message, 'error')
    }
  }

  const handleNewEmployee = () => {
    // Construir URL con parámetros para pre-llenado
    const params = new URLSearchParams()
    if (currentSedeName) params.append('sede', currentSedeName)
    if (businessUnit) params.append('business', businessUnit.toUpperCase())
    
    navigate(`/register-employee?${params.toString()}`)
  }

  const filteredEmployees = employees.filter(emp => 
    emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.dni.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            {currentSedeName === 'ADM. CENTRAL' ? <Building2 className="text-blue-600" /> : <MapPin className="text-blue-600" />}
            {currentSedeName || 'Todos los Empleados'}
            {businessUnit && (
              <span className="flex items-center gap-1 text-gray-400 text-xl font-normal">
                <span className="mx-1">/</span>
                <Store size={20} />
                {businessUnit.toUpperCase()}
              </span>
            )}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestionando {employees.length} empleados en esta área
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium">
            <Download size={18} /> Exportar
          </button>
          <button 
            onClick={handleNewEmployee}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
          >
            <UserPlus size={18} /> Nuevo
          </button>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar por nombre o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <select className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-blue-500">
            <option value="">Todos los tipos</option>
            <option value="ADMINISTRATIVO">Administrativo</option>
            <option value="OPERATIVO">Operativo</option>
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
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">DNI / Contacto</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Puesto / Área</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    Cargando datos...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-gray-50 p-4 rounded-full mb-3">
                        <UserPlus size={24} className="text-gray-400" />
                      </div>
                      <p className="font-medium text-gray-900">No se encontraron empleados</p>
                      <p className="text-sm mt-1">
                        {businessUnit 
                          ? `No hay personal registrado en ${currentSedeName} - ${businessUnit.toUpperCase()}`
                          : `No hay personal registrado en ${currentSedeName}`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                          {emp.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{emp.full_name}</p>
                          <p className="text-xs text-gray-500">Ingreso: {emp.entry_date}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 font-medium">{emp.dni}</p>
                      <p className="text-xs text-gray-500">{emp.email || 'Sin correo'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Briefcase size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-700">{emp.position}</span>
                      </div>
                      {emp.business_unit && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                          {emp.business_unit}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`
                        text-xs font-medium px-2.5 py-1 rounded-full border
                        ${emp.employee_type === 'ADMINISTRATIVO' 
                          ? 'bg-purple-50 text-purple-700 border-purple-100' 
                          : 'bg-orange-50 text-orange-700 border-orange-100'}
                      `}>
                        {emp.employee_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => navigate(`/edit-employee/${emp.id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => openDeleteModal(emp.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.onConfirm}
        showCancel
      />
    </div>
  )
}
