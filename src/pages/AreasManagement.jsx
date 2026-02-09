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
  LayoutGrid
} from 'lucide-react'
import { useToast } from '../context/ToastContext'

export default function AreasManagement() {
  const [positions, setPositions] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [newAreaName, setNewAreaName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const { showToast } = useToast()

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
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <LayoutGrid className="text-blue-600" />
            Gestión de Áreas y Cargos
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Arrastra los cargos para asignarlos a sus áreas correspondientes
          </p>
        </div>
        
        <form onSubmit={handleCreateArea} className="flex gap-2">
          <input
            type="text"
            placeholder="Nueva Área (ej. MARKETING)"
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button 
            type="submit"
            disabled={!newAreaName.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Plus size={18} /> Crear Área
          </button>
        </form>
      </div>

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text"
          placeholder="Buscar cargo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
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
                  className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-400 transition-colors group"
                >
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-gray-800 text-sm">{pos.name}</p>
                    <GripVertical size={16} className="text-gray-300 group-hover:text-gray-500" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{pos.employee_count} empleados</p>
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
                  <button 
                    onClick={() => handleDeleteArea(area.id)}
                    className="text-red-400 hover:text-red-600 opacity-0 group-hover/header:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                    title="Eliminar Área"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/30">
                  {areaPositions.map(pos => (
                    <div
                      key={pos.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, pos.id)}
                      className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-400 transition-colors group"
                    >
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-gray-800 text-sm">{pos.name}</p>
                        <GripVertical size={16} className="text-gray-300 group-hover:text-gray-500" />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{pos.employee_count} empleados</p>
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
    </div>
  )
}
