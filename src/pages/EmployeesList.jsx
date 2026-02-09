import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { deleteEmployee } from '../services/employees'
import { getPositions } from '../services/positions'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Modal from '../components/ui/Modal'
import EmployeeExcelUpload from './EmployeeExcelUpload'
import EmployeeProfileCard from '../components/EmployeeProfileCard'
import { 
  Search, 
  Download, 
  UserPlus,
  MapPin,
  Building2,
  Briefcase,
  Edit2,
  Trash2,
  Store,
  Upload,
  Eye
} from 'lucide-react'

export default function EmployeesList() {
  const { sede } = useParams()
  const [searchParams] = useSearchParams()
  const businessUnit = searchParams.get('business')
  const { user } = useAuth()
  
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [positionAreaMap, setPositionAreaMap] = useState({}) // Mapa Cargo -> Área
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null })
  
  // Estado para visualización de perfil
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  
  // Estado para el modal de importación
  const [showImportModal, setShowImportModal] = useState(false)

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

  // Lógica de seguridad para Sedes
  // Si NO es Admin, forzar sede del usuario aunque la URL diga otra cosa
  let currentSedeName = sedeMap[sede] || sede
  
  // Seguridad: Sobreescribir si el usuario tiene una sede asignada y NO es admin
  const isGlobalAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER ADMIN' || user?.role === 'JEFE_RRHH' || (user?.permissions && user?.permissions['*'])
  
  if (!isGlobalAdmin && user?.sede) {
      // Normalizar nombres para comparación
      const userSedeNorm = user.sede.toUpperCase().trim()
      if (currentSedeName?.toUpperCase() !== userSedeNorm) {
          // Si intenta ver otra sede, lo forzamos a la suya
          currentSedeName = user.sede
      }
  }

  useEffect(() => {
    fetchEmployees()
  }, [sede, businessUnit, user]) // Añadir user a deps

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      // 1. Cargar empleados
      let query = supabase
        .from('employees')
        .select('*')
        .order('full_name', { ascending: true })

      // Aplicar filtro de sede (seguro)
      if (currentSedeName) {
        query = query.eq('sede', currentSedeName)
      }

      // Aplicar filtro de unidad de negocio
      // Si el usuario no es admin y tiene business_unit asignada, forzar filtro
      if (!isGlobalAdmin && user?.business_unit) {
          query = query.eq('business_unit', user.business_unit.toUpperCase())
      } else if (businessUnit) {
          query = query.eq('business_unit', businessUnit.toUpperCase())
      }

      // 2. Cargar cargos y áreas
      const { data: positionsData } = await getPositions()
      const areaMap = {}
      if (positionsData) {
        positionsData.forEach(pos => {
            if (pos.area_name && pos.area_name !== 'Sin Área Asignada') {
                areaMap[pos.name] = pos.area_name
            }
        })
      }
      setPositionAreaMap(areaMap)

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

  const handleImportSuccess = () => {
    setShowImportModal(false)
    showToast('Empleados importados correctamente', 'success')
    fetchEmployees() // Recargar lista
  }

  const handleViewProfile = (emp) => {
    // Enriquecer con nombre de área si tenemos el mapa
    const enrichedEmp = {
        ...emp,
        area_name: positionAreaMap[emp.position]
    }
    setSelectedEmployee(enrichedEmp)
    setShowProfileModal(true)
  }

  const filteredEmployees = employees.filter(emp => 
    emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.dni.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      {/* Modal de Importación */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <EmployeeExcelUpload 
                    onClose={() => setShowImportModal(false)} 
                    onSuccess={handleImportSuccess}
                    defaultSede={currentSedeName}
                    defaultBusinessUnit={businessUnit ? businessUnit.toUpperCase() : null}
                />
            </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
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
        
        {/* Acciones Responsive: Grid en móvil (2 columnas), Flex en Desktop */}
        <div className="grid grid-cols-2 sm:flex gap-3 w-full lg:w-auto">
          <button 
            onClick={() => setShowImportModal(true)}
            className="col-span-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium whitespace-nowrap"
          >
            <Upload size={18} /> 
            <span className="hidden sm:inline">Importar</span>
            <span className="sm:hidden">Importar</span>
          </button>
          <button className="col-span-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium whitespace-nowrap">
            <Download size={18} /> 
            <span className="hidden sm:inline">Exportar</span>
            <span className="sm:hidden">Exportar</span>
          </button>
          <button 
            onClick={handleNewEmployee}
            className="col-span-2 sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm whitespace-nowrap"
          >
            <UserPlus size={18} /> Nuevo Empleado
          </button>
        </div>
      </div>

      {/* Filtros y Búsqueda - Grid Layout Robusto */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Barra de Búsqueda (Ocupa más espacio) */}
        <div className="md:col-span-8 lg:col-span-9 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar por nombre o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        
        {/* Filtro de Tipo (Ocupa menos espacio) */}
        <div className="md:col-span-4 lg:col-span-3">
          <select className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-all">
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
                        {emp.profile_picture_url ? (
                          <img 
                            src={emp.profile_picture_url} 
                            alt={emp.full_name}
                            className="w-10 h-10 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                            {emp.full_name.charAt(0)}
                          </div>
                        )}
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
                      {(positionAreaMap[emp.position] || emp.business_unit) && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                          {positionAreaMap[emp.position] || emp.business_unit}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`
                        text-xs font-medium px-2.5 py-1 rounded-full border
                        ${(emp.employee_type || 'OPERATIVO') === 'ADMINISTRATIVO' 
                          ? 'bg-purple-50 text-purple-700 border-purple-100' 
                          : 'bg-orange-50 text-orange-700 border-orange-100'}
                      `}>
                        {emp.employee_type || 'OPERATIVO'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleViewProfile(emp)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Ver Perfil"
                        >
                          <Eye size={18} />
                        </button>
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

      {/* Modal de Perfil de Empleado */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Perfil de Empleado"
        showCancel={false} // Solo cerrar con X
        cancelText="Cerrar"
      >
         <EmployeeProfileCard employee={selectedEmployee} />
      </Modal>
    </div>
  )
}
