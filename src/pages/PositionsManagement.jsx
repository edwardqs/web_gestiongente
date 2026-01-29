
import { useState, useEffect } from 'react'
import { 
  Briefcase, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Users,
  AlertCircle,
  X,
  Check
} from 'lucide-react'
import { getPositions, createPosition, updatePosition, deletePosition } from '../services/positions'

export default function PositionsManagement() {
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentPosition, setCurrentPosition] = useState(null)
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    employee_type: 'OPERATIVO' // Default
  })
  
  const [error, setError] = useState(null)

  useEffect(() => {
    loadPositions()
  }, [])

  const loadPositions = async () => {
    setLoading(true)
    const { data, error } = await getPositions()
    if (data) {
      setPositions(data)
    } else {
      setError(error?.message)
    }
    setLoading(false)
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const filteredPositions = positions.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.employee_type?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openCreateModal = () => {
    setIsEditing(false)
    setFormData({ name: '', employee_type: 'OPERATIVO' })
    setError(null)
    setShowModal(true)
  }

  const openEditModal = (position) => {
    setIsEditing(true)
    setCurrentPosition(position)
    setFormData({
      name: position.name,
      employee_type: position.employee_type || 'OPERATIVO'
    })
    setError(null)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError('El nombre del cargo es obligatorio')
      return
    }

    try {
      if (isEditing) {
        const { error } = await updatePosition(currentPosition.id, formData)
        if (error) throw error
      } else {
        const { error } = await createPosition(formData)
        if (error) throw error
      }
      
      setShowModal(false)
      loadPositions()
    } catch (err) {
      setError(err.message || 'Error al guardar el cargo')
    }
  }

  const handleDelete = async (id, count) => {
    if (count > 0) {
      alert(`No se puede eliminar este cargo porque tiene ${count} empleados asignados.`)
      return
    }
    
    if (window.confirm('¿Estás seguro de eliminar este cargo?')) {
      const { error } = await deletePosition(id)
      if (error) {
        alert('Error al eliminar: ' + error.message)
      } else {
        loadPositions()
      }
    }
  }

  const employeeTypes = ['ADMINISTRATIVO', 'OPERATIVO', 'COMERCIAL']

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Briefcase className="text-blue-600" /> Gestión de Cargos / Puestos
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Administra los cargos de la empresa y su clasificación.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} /> Nuevo Cargo
        </button>
      </div>

      {/* Buscador */}
      <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
        <Search className="text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar cargo..."
          value={searchTerm}
          onChange={handleSearch}
          className="flex-1 outline-none text-gray-700"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 font-semibold text-gray-600 text-sm">Nombre del Cargo</th>
                <th className="p-4 font-semibold text-gray-600 text-sm">Tipo de Personal</th>
                <th className="p-4 font-semibold text-gray-600 text-sm text-center">Empleados</th>
                <th className="p-4 font-semibold text-gray-600 text-sm text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-500">
                    Cargando cargos...
                  </td>
                </tr>
              ) : filteredPositions.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-500">
                    No se encontraron cargos.
                  </td>
                </tr>
              ) : (
                filteredPositions.map(pos => (
                  <tr key={pos.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-medium text-gray-800">{pos.name}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                        ${pos.employee_type === 'ADMINISTRATIVO' ? 'bg-purple-100 text-purple-700' : 
                          pos.employee_type === 'COMERCIAL' ? 'bg-green-100 text-green-700' : 
                          'bg-blue-100 text-blue-700'}`}>
                        {pos.employee_type || 'SIN CLASIFICAR'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-600">
                        <Users size={14} />
                        <span>{pos.employees ? pos.employees[0]?.count : 0}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openEditModal(pos)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(pos.id, pos.employees ? pos.employees[0]?.count : 0)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">
                {isEditing ? 'Editar Cargo' : 'Nuevo Cargo'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Nombre del Cargo</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase"
                  placeholder="EJ: ANALISTA DE SISTEMAS"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Tipo de Personal</label>
                <select
                  value={formData.employee_type}
                  onChange={e => setFormData(prev => ({ ...prev, employee_type: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {employeeTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                >
                  <Check size={18} /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
