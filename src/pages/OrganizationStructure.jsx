import { useState, useEffect } from 'react'
import { 
  Building2, 
  MapPin, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  ChevronRight, 
  ChevronDown,
  LayoutGrid
} from 'lucide-react'
import { 
  getSedes, 
  createSede, 
  updateSede, 
  deleteSede,
  getBusinessUnits,
  createBusinessUnit,
  updateBusinessUnit,
  deleteBusinessUnit,
  getOrganizationStructure,
  assignUnitToSede,
  removeUnitFromSede
} from '../services/organization'
import { useToast } from '../context/ToastContext'
import Modal from '../components/ui/Modal'

export default function OrganizationStructure() {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('structure') // 'structure', 'sedes', 'units'
  const [loading, setLoading] = useState(true)
  
  // Data States
  const [sedes, setSedes] = useState([])
  const [units, setUnits] = useState([])
  const [structure, setStructure] = useState([])

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create', 'edit'
  const [currentItem, setCurrentItem] = useState(null)
  const [formData, setFormData] = useState({ name: '', address: '' })

  // Assign Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedSedeForAssign, setSelectedSedeForAssign] = useState(null)
  const [selectedUnitToAssign, setSelectedUnitToAssign] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [sedesRes, unitsRes, structRes] = await Promise.all([
        getSedes(),
        getBusinessUnits(),
        getOrganizationStructure()
      ])

      if (sedesRes.error) throw sedesRes.error
      if (unitsRes.error) throw unitsRes.error
      if (structRes.error) throw structRes.error

      setSedes(sedesRes.data || [])
      setUnits(unitsRes.data || [])
      setStructure(structRes.data || [])
    } catch (error) {
      console.error('Error loading organization data:', error)
      showToast('Error al cargar datos: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // --- CRUD HANDLERS ---

  const handleCreate = () => {
    setModalMode('create')
    setFormData({ name: '', address: '' })
    setCurrentItem(null)
    setIsModalOpen(true)
  }

  const handleEdit = (item) => {
    setModalMode('edit')
    setFormData({ name: item.name, address: item.address || '' })
    setCurrentItem(item)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (activeTab === 'sedes') {
        if (modalMode === 'create') {
          const { error } = await createSede(formData.name, formData.address)
          if (error) throw error
          showToast('Sede creada correctamente', 'success')
        } else {
          const { error } = await updateSede(currentItem.id, { name: formData.name, address: formData.address })
          if (error) throw error
          showToast('Sede actualizada correctamente', 'success')
        }
      } else if (activeTab === 'units') {
        if (modalMode === 'create') {
          const { error } = await createBusinessUnit(formData.name)
          if (error) throw error
          showToast('Unidad creada correctamente', 'success')
        } else {
          const { error } = await updateBusinessUnit(currentItem.id, { name: formData.name })
          if (error) throw error
          showToast('Unidad actualizada correctamente', 'success')
        }
      }
      setIsModalOpen(false)
      loadData()
    } catch (error) {
      showToast('Error al guardar: ' + error.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este elemento?')) return

    try {
      let error = null
      if (activeTab === 'sedes') {
        const res = await deleteSede(id)
        error = res.error
      } else {
        const res = await deleteBusinessUnit(id)
        error = res.error
      }

      if (error) throw error
      showToast('Elemento eliminado correctamente', 'success')
      loadData()
    } catch (error) {
      showToast('Error al eliminar: ' + error.message, 'error')
    }
  }

  // --- STRUCTURE HANDLERS ---

  const handleAssignUnit = async () => {
    if (!selectedSedeForAssign || !selectedUnitToAssign) return
    
    try {
      const { error } = await assignUnitToSede(selectedSedeForAssign.id, selectedUnitToAssign)
      if (error) throw error
      
      showToast('Unidad asignada a la sede correctamente', 'success')
      setAssignModalOpen(false)
      loadData()
    } catch (error) {
      showToast('Error al asignar unidad: ' + error.message, 'error')
    }
  }

  const handleRemoveAssignment = async (structureId) => {
    if (!window.confirm('¿Quitar esta unidad de la sede?')) return
    
    try {
      const { error } = await removeUnitFromSede(structureId)
      if (error) throw error
      
      showToast('Asignación removida correctamente', 'success')
      loadData()
    } catch (error) {
      showToast('Error al remover asignación: ' + error.message, 'error')
    }
  }

  // --- RENDER HELPERS ---

  const renderStructureView = () => {
    // Agrupar estructura por Sede
    const grouped = sedes.map(sede => {
      const assignedUnits = structure
        .filter(s => s.sedes?.id === sede.id)
        .map(s => ({
          ...s.business_units,
          structureId: s.id
        }))
      return { ...sede, assignedUnits }
    })

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {grouped.map(sede => (
            <div key={sede.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{sede.name}</h3>
                    <p className="text-xs text-gray-500">{sede.address || 'Sin dirección'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedSedeForAssign(sede)
                    setAssignModalOpen(true)
                  }}
                  className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                  title="Agregar Unidad"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Unidades Asignadas</p>
                {sede.assignedUnits.length > 0 ? (
                  sede.assignedUnits.map(unit => (
                    <div key={unit.structureId} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded text-sm">
                      <span className="text-gray-700">{unit.name}</span>
                      <button 
                        onClick={() => handleRemoveAssignment(unit.structureId)}
                        className="text-gray-400 hover:text-red-500"
                        title="Remover"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic">No hay unidades asignadas</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderTableView = (items, type) => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
            {type === 'sedes' && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dirección</th>
            )}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map(item => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
              {type === 'sedes' && (
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.address || '-'}</td>
              )}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {item.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900 mr-4">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  if (loading) return <div className="p-8 text-center">Cargando datos organizacionales...</div>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estructura Organizacional</h1>
          <p className="mt-1 text-sm text-gray-500">Gestión de Sedes, Unidades de Negocio y sus relaciones.</p>
        </div>
        {activeTab !== 'structure' && (
          <button
            onClick={handleCreate}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Crear {activeTab === 'sedes' ? 'Sede' : 'Unidad'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('structure')}
            className={`${
              activeTab === 'structure'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Mapa de Estructura
          </button>
          <button
            onClick={() => setActiveTab('sedes')}
            className={`${
              activeTab === 'sedes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Sedes (Maestro)
          </button>
          <button
            onClick={() => setActiveTab('units')}
            className={`${
              activeTab === 'units'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Building2 className="w-4 h-4 mr-2" />
            Unidades (Maestro)
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'structure' && renderStructureView()}
        {activeTab === 'sedes' && renderTableView(sedes, 'sedes')}
        {activeTab === 'units' && renderTableView(units, 'units')}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${modalMode === 'create' ? 'Crear' : 'Editar'} ${activeTab === 'sedes' ? 'Sede' : 'Unidad'}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          {activeTab === 'sedes' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Dirección</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          )}
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Unit Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Asignar Unidad a ${selectedSedeForAssign?.name}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Unidad</label>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              value={selectedUnitToAssign}
              onChange={(e) => setSelectedUnitToAssign(e.target.value)}
            >
              <option value="">Seleccione una unidad...</option>
              {units
                .filter(u => {
                  // Filtrar unidades que ya están asignadas a esta sede
                  const isAssigned = structure.some(s => 
                    s.sedes?.id === selectedSedeForAssign?.id && 
                    s.business_units?.id === u.id
                  )
                  return !isAssigned && u.is_active
                })
                .map(unit => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))
              }
            </select>
          </div>
          <div className="flex justify-end pt-4">
            <button
              onClick={() => setAssignModalOpen(false)}
              className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleAssignUnit}
              disabled={!selectedUnitToAssign}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-300"
            >
              Asignar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
