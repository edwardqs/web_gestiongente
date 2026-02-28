import { useState, useEffect } from 'react'
import { getPositions } from '../services/positions'
import { getAreas, createArea, deleteArea, updatePositionArea } from '../services/areas'
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Briefcase, 
  Building2, 
  Search,
  LayoutGrid,
  ArrowRightLeft,
  Check,
  X
} from 'lucide-react'
import { useToast } from '../context/ToastContext'
import Modal from '../components/ui/Modal'

export default function AreasManagement() {
  const [positions, setPositions] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [newAreaName, setNewAreaName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const { showToast } = useToast()

  // Modal States
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false)
  const [selectedArea, setSelectedArea] = useState(null)
  const [selectedPosition, setSelectedPosition] = useState(null)
  const [positionsToAssign, setPositionsToAssign] = useState([]) // Array of IDs for bulk assign

  // Cargar datos iniciales
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [posRes, areasRes] = await Promise.all([
      getPositions(),
      getAreas()
    ])

    if (posRes.data) setPositions(posRes.data)
    if (areasRes.data) setAreas(areasRes.data)
    setLoading(false)
  }

  const handleCreateArea = async (e) => {
    e.preventDefault()
    if (!newAreaName.trim()) return

    const { data, error } = await createArea(newAreaName)
    if (error) {
      showToast('Error al crear área: ' + error.message, 'error')
    } else {
      setAreas([...areas, data])
      setNewAreaName('')
      showToast('Área creada correctamente', 'success')
    }
  }

  const handleDeleteArea = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta área? Los cargos asignados quedarán sin área.')) return

    // Primero actualizamos los cargos localmente para UX instantánea
    const positionsInArea = positions.filter(p => p.area_id === id)
    
    // Desvincular en BD (opcional si hay ON DELETE SET NULL, pero mejor explícito o cascade)
    // Asumiremos que la FK tiene ON DELETE SET NULL o lo manejamos
    // Para simplificar, intentamos borrar. Si falla por FK, avisamos.
    
    const { error } = await deleteArea(id)
    if (error) {
      showToast('No se puede eliminar: ' + error.message, 'error')
    } else {
      setAreas(areas.filter(a => a.id !== id))
      // Actualizar estado local de cargos
      setPositions(positions.map(p => p.area_id === id ? { ...p, area_id: null, area_name: 'Sin Área Asignada' } : p))
      showToast('Área eliminada', 'success')
    }
  }

  // --- MODAL HANDLERS ---
  const openAssignModal = (area) => {
    setSelectedArea(area)
    setPositionsToAssign([])
    setIsAssignModalOpen(true)
  }

  const handleBulkAssign = async () => {
    if (!selectedArea || positionsToAssign.length === 0) return

    let successCount = 0
    let errors = []

    // Optimistic Update
    const previousPositions = [...positions]
    setPositions(prev => prev.map(p => 
      positionsToAssign.includes(p.id)
        ? { ...p, area_id: selectedArea.id, area_name: selectedArea.name }
        : p
    ))
    
    setIsAssignModalOpen(false)

    // Process all updates
    await Promise.all(positionsToAssign.map(async (posId) => {
      const { error } = await updatePositionArea(posId, selectedArea.id)
      if (error) {
        errors.push(posId)
      } else {
        successCount++
      }
    }))

    if (errors.length > 0) {
      // Revert failed updates
      setPositions(prev => prev.map(p => 
        errors.includes(p.id)
          ? previousPositions.find(prevP => prevP.id === p.id)
          : p
      ))
      showToast(`Se asignaron ${successCount} cargos. ${errors.length} fallaron.`, 'warning')
    } else {
      showToast(`${successCount} cargos asignados a ${selectedArea.name}`, 'success')
    }
    
    setPositionsToAssign([])
    setSelectedArea(null)
  }

  const openMoveModal = (position) => {
    setSelectedPosition(position)
    setIsMoveModalOpen(true)
  }

  const handleMovePosition = async (targetAreaId) => {
    if (!selectedPosition) return

    const targetArea = areas.find(a => a.id === targetAreaId)
    const previousAreaId = selectedPosition.area_id
    
    // Optimistic Update
    setPositions(prev => prev.map(p => 
      p.id === selectedPosition.id
        ? { ...p, area_id: targetAreaId, area_name: targetArea ? targetArea.name : 'Sin Área Asignada' }
        : p
    ))
    
    setIsMoveModalOpen(false)

    const { error } = await updatePositionArea(selectedPosition.id, targetAreaId)
    
    if (error) {
      // Revert
      setPositions(prev => prev.map(p => 
        p.id === selectedPosition.id
          ? { ...p, area_id: previousAreaId }
          : p
      ))
      showToast('Error al mover el cargo', 'error')
    } else {
      showToast(`Cargo movido a ${targetArea ? targetArea.name : 'Sin Área'}`, 'success')
    }
    setSelectedPosition(null)
  }

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (e, positionId) => {
    e.dataTransfer.setData('positionId', positionId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, targetAreaId) => {
    e.preventDefault()
    const positionId = e.dataTransfer.getData('positionId')
    
    if (!positionId) return

    // Encontrar el cargo
    const position = positions.find(p => p.id.toString() === positionId)
    if (!position) return

    // Si ya está en esa área, no hacer nada
    if (position.area_id === targetAreaId) return

    // Optimistic UI update
    const previousAreaId = position.area_id
    const targetArea = areas.find(a => a.id === targetAreaId)
    
    setPositions(prev => prev.map(p => 
      p.id.toString() === positionId 
        ? { ...p, area_id: targetAreaId, area_name: targetArea ? targetArea.name : 'Sin Área Asignada' } 
        : p
    ))

    // Call API
    const { error } = await updatePositionArea(positionId, targetAreaId)
    
    if (error) {
      // Revertir si falla
      setPositions(prev => prev.map(p => 
        p.id.toString() === positionId 
          ? { ...p, area_id: previousAreaId } 
          : p
      ))
      showToast('Error al mover el cargo', 'error')
    } else {
        showToast(`Cargo movido a ${targetArea ? targetArea.name : 'Sin Área'}`, 'success')
    }
  }

  // Filtrar cargos para la columna "Sin Asignar" y búsqueda general
  const filteredPositions = positions.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const unassignedPositions = filteredPositions.filter(p => !p.area_id)

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <LayoutGrid className="text-blue-600" />
            Gestión de Áreas y Cargos
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Arrastra los cargos o usa los botones <span className="inline-block bg-blue-50 text-blue-600 rounded px-1"><ArrowRightLeft size={12} className="inline"/></span> para asignarlos a sus áreas
          </p>
        </div>
        
        <form onSubmit={handleCreateArea} className="flex w-full lg:w-auto gap-2">
          <input
            type="text"
            placeholder="Nueva Área (ej. MARKETING)"
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
            className="flex-1 lg:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button 
            type="submit"
            disabled={!newAreaName.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <Plus size={18} /> Crear Área
          </button>
        </form>
      </div>

      {/* Buscador - Grid Pattern Consistent */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
            type="text"
            placeholder="Buscar cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex gap-6 h-full min-w-max">
          
          {/* Columna: Sin Asignar */}
          <div 
            className="w-80 flex flex-col bg-gray-100 rounded-xl border border-gray-200 shadow-inner"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, null)}
          >
            <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl sticky top-0 z-10">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <Briefcase size={18} />
                Sin Asignar
                <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs ml-auto">
                  {unassignedPositions.length}
                </span>
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {unassignedPositions.map(pos => (
                <div
                  key={pos.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, pos.id)}
                  className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-400 transition-colors group relative"
                >
                  <div className="flex justify-between items-start pr-6">
                    <p className="font-medium text-gray-800 text-sm">{pos.name}</p>
                    <GripVertical size={16} className="text-gray-300 group-hover:text-gray-500 absolute top-3 right-2" />
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">{pos.employee_count} empleados</p>
                    <button 
                      onClick={() => openMoveModal(pos)}
                      className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition-colors"
                      title="Mover a otra área"
                    >
                      <ArrowRightLeft size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {unassignedPositions.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                  No hay cargos sin área
                </div>
              )}
            </div>
          </div>

          {/* Columnas: Áreas */}
          {areas.map(area => {
            const areaPositions = filteredPositions.filter(p => p.area_id === area.id)
            
            return (
              <div 
                key={area.id}
                className="w-80 flex flex-col bg-white rounded-xl border border-blue-100 shadow-sm"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, area.id)}
              >
                <div className="p-4 border-b border-blue-50 bg-blue-50/50 rounded-t-xl sticky top-0 z-10 flex justify-between items-center group/header">
                  <h3 className="font-bold text-blue-900 flex items-center gap-2">
                    <Building2 size={18} className="text-blue-600" />
                    {area.name}
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                      {areaPositions.length}
                    </span>
                  </h3>
                  <div className="flex gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openAssignModal(area)}
                      className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-100 rounded"
                      title="Agregar cargos"
                    >
                      <Plus size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteArea(area.id)}
                      className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                      title="Eliminar Área"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/30">
                  {areaPositions.map(pos => (
                    <div
                      key={pos.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, pos.id)}
                      className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-400 transition-colors group relative"
                    >
                      <div className="flex justify-between items-start pr-6">
                        <p className="font-medium text-gray-800 text-sm">{pos.name}</p>
                        <GripVertical size={16} className="text-gray-300 group-hover:text-gray-500 absolute top-3 right-2" />
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-gray-500">{pos.employee_count} empleados</p>
                        <button 
                          onClick={() => openMoveModal(pos)}
                          className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="Mover a otra área"
                        >
                          <ArrowRightLeft size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {areaPositions.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                      Arrastra cargos aquí
                    </div>
                  )}
                </div>
              </div>
            )
          })}

        </div>
      </div>
      {/* --- MODAL DE ASIGNACIÓN MASIVA --- */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`Asignar cargos a ${selectedArea?.name}`}
        confirmText={`Asignar (${positionsToAssign.length})`}
        onConfirm={handleBulkAssign}
        showCancel
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Selecciona los cargos que deseas mover a este área. 
            Se muestran cargos de "Sin Asignar" y de otras áreas.
          </p>
          
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {positions
              .filter(p => p.area_id !== selectedArea?.id)
              .sort((a, b) => {
                // Prioritize unassigned
                if (!a.area_id && b.area_id) return -1
                if (a.area_id && !b.area_id) return 1
                return a.name.localeCompare(b.name)
              })
              .map(pos => (
                <label 
                  key={pos.id} 
                  className={`flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition-colors ${positionsToAssign.includes(pos.id) ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      checked={positionsToAssign.includes(pos.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPositionsToAssign([...positionsToAssign, pos.id])
                        } else {
                          setPositionsToAssign(positionsToAssign.filter(id => id !== pos.id))
                        }
                      }}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-700">{pos.name}</p>
                      <p className="text-xs text-gray-400">
                        {pos.area_name || 'Sin Asignar'} • {pos.employee_count} emp.
                      </p>
                    </div>
                  </div>
                </label>
              ))
            }
            {positions.filter(p => p.area_id !== selectedArea?.id).length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                No hay cargos disponibles para asignar.
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* --- MODAL DE MOVIMIENTO INDIVIDUAL --- */}
      <Modal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        title={`Mover cargo: ${selectedPosition?.name}`}
        showCancel={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Selecciona el área de destino para este cargo.
          </p>
          
          <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto">
            {/* Opción Sin Asignar */}
            <button
              onClick={() => handleMovePosition(null)}
              className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3
                ${!selectedPosition?.area_id 
                  ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500' 
                  : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                }`}
            >
              <div className="p-2 bg-gray-100 rounded-full text-gray-500">
                <Briefcase size={18} />
              </div>
              <div>
                <p className="font-medium text-gray-800">Sin Asignar</p>
                <p className="text-xs text-gray-500">Mover a la lista de pendientes</p>
              </div>
              {!selectedPosition?.area_id && <Check size={18} className="ml-auto text-blue-600" />}
            </button>

            {/* Lista de Áreas */}
            {areas.map(area => (
              <button
                key={area.id}
                onClick={() => handleMovePosition(area.id)}
                disabled={selectedPosition?.area_id === area.id}
                className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3
                  ${selectedPosition?.area_id === area.id 
                    ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500 opacity-60 cursor-default' 
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                  }`}
              >
                <div className="p-2 bg-blue-50 rounded-full text-blue-600">
                  <Building2 size={18} />
                </div>
                <div>
                  <p className="font-medium text-gray-800">{area.name}</p>
                  <p className="text-xs text-gray-500">
                    {positions.filter(p => p.area_id === area.id).length} cargos asignados
                  </p>
                </div>
                {selectedPosition?.area_id === area.id && <Check size={18} className="ml-auto text-blue-600" />}
              </button>
            ))}
          </div>
        </div>
      </Modal>

    </div>
  )
}
