
import { useState, useEffect } from 'react'
import { getPolicies, createPolicy, deletePolicy } from '../services/mobileAccess'
import { getLocations } from '../services/structure'
import { getPositions } from '../services/positions'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { 
  Shield, 
  Smartphone, 
  Ban, 
  Trash2, 
  Plus, 
  MapPin, 
  Briefcase, 
  Building2,
  AlertTriangle
} from 'lucide-react'

export default function MobileAccessConfig() {
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const { user } = useAuth()
  const { showToast } = useToast()

  // Form States
  const [scopeType, setScopeType] = useState('SEDE') // SEDE, BUSINESS_UNIT, POSITION
  const [scopeValue, setScopeValue] = useState('')
  const [hasHuellero, setHasHuellero] = useState(true) // Default to Blocking (True)

  // Data Options
  const [locations, setLocations] = useState([])
  const [positions, setPositions] = useState([])
  const [businessUnits, setBusinessUnits] = useState([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Policies
      const { data: policiesData, error: policiesError } = await getPolicies()
      if (policiesError) throw policiesError
      setPolicies(policiesData || [])

      // 2. Fetch Options
      const { data: locs } = await getLocations()
      setLocations(locs || [])

      const { data: pos } = await getPositions()
      setPositions(pos || [])

      // 3. Fetch Distinct Business Units from Employees (Best effort)
      const { data: buData } = await supabase
        .from('employees')
        .select('business_unit')
        .not('business_unit', 'is', null)
      
      if (buData) {
        const uniqueBUs = [...new Set(buData.map(item => item.business_unit?.trim().toUpperCase()))].sort()
        setBusinessUnits(uniqueBUs)
      }

    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Error al cargar datos', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!scopeValue) {
      showToast('Debe seleccionar o ingresar un valor', 'error')
      return
    }

    try {
      const { data, error } = await createPolicy({
        scope_type: scopeType,
        scope_value: scopeValue.toUpperCase(),
        has_physical_time_clock: hasHuellero,
        // Fix: Solo enviar employee_id si el usuario tiene perfil real (existe en DB),
        // de lo contrario enviar NULL para evitar error de Foreign Key.
        created_by: (user?.profile) ? user.employee_id : null
      })

      if (error) throw error

      showToast('Política creada exitosamente', 'success')
      setPolicies([data, ...policies])
      setShowModal(false)
      // Reset form
      setScopeValue('')
      setHasHuellero(true)
    } catch (error) {
      console.error('Error creating policy:', error)
      showToast(`Error: ${error.message || 'No se pudo crear la regla'}`, 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta regla?')) return

    try {
      const { error } = await deletePolicy(id)
      if (error) throw error
      
      setPolicies(policies.filter(p => p.id !== id))
      showToast('Regla eliminada', 'success')
    } catch (error) {
      showToast('Error al eliminar regla', 'error')
    }
  }

  const getScopeIcon = (type) => {
    switch (type) {
      case 'SEDE': return <MapPin size={18} className="text-purple-600" />
      case 'BUSINESS_UNIT': return <Building2 size={18} className="text-blue-600" />
      case 'POSITION': return <Briefcase size={18} className="text-orange-600" />
      default: return <Shield size={18} />
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Smartphone className="text-blue-600" />
            Control de Acceso Móvil
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Configure qué Sedes, Unidades o Cargos tienen restringido el acceso a la App Móvil (por uso de Huellero).
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={18} /> Nueva Regla
        </button>
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="text-sm font-semibold text-yellow-800">¿Cómo funciona?</h3>
          <p className="text-sm text-yellow-700 mt-1">
            Si crea una regla marcando <strong>"Tiene Huellero Físico"</strong>, los usuarios que coincidan con esa regla 
            <strong> NO podrán iniciar sesión en la App Móvil</strong> y verán un mensaje indicando que deben usar el reloj biométrico.
            <br />
            Si no existe ninguna regla para un usuario, el acceso a la App Móvil está <strong>PERMITIDO</strong> por defecto.
          </p>
        </div>
      </div>

      {/* Policies List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando reglas...</div>
        ) : policies.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Smartphone size={48} className="text-gray-200 mb-4" />
            <h3 className="text-lg font-medium text-gray-800">Sin reglas definidas</h3>
            <p className="text-gray-500 max-w-md mt-2">
              Actualmente todos los usuarios pueden acceder a la App Móvil. Cree una regla para restringir el acceso en sedes con Huellero.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Alcance</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Configuración</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {policies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getScopeIcon(policy.scope_type)}
                        <span className="font-medium text-gray-700 text-sm">
                          {policy.scope_type === 'BUSINESS_UNIT' ? 'UNIDAD DE NEGOCIO' : policy.scope_type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded">
                        {policy.scope_value}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {policy.has_physical_time_clock ? (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full w-fit">
                          <Ban size={14} />
                          <span className="text-xs font-bold">App Bloqueada (Usa Huellero)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full w-fit">
                          <Smartphone size={14} />
                          <span className="text-xs font-bold">App Permitida</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(policy.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                        title="Eliminar regla"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">Nueva Regla de Acceso</h2>
              <p className="text-sm text-gray-500">Defina quién debe usar el Huellero Físico.</p>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {/* Scope Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Regla</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'SEDE', label: 'Sede', icon: MapPin },
                    { id: 'BUSINESS_UNIT', label: 'Unidad', icon: Building2 },
                    { id: 'POSITION', label: 'Cargo', icon: Briefcase }
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => { setScopeType(type.id); setScopeValue(''); }}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                        scopeType === type.id 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : 'border-gray-200 hover:border-blue-200 text-gray-600'
                      }`}
                    >
                      <type.icon size={20} className="mb-1" />
                      <span className="text-xs font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scope Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {scopeType === 'SEDE' ? 'Seleccionar Sede' : 
                   scopeType === 'BUSINESS_UNIT' ? 'Seleccionar Unidad de Negocio' : 
                   'Seleccionar Cargo'}
                </label>
                
                {scopeType === 'SEDE' ? (
                  <select 
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={scopeValue}
                    onChange={(e) => setScopeValue(e.target.value)}
                    required
                  >
                    <option value="">-- Seleccione una Sede --</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.name}>{loc.name}</option>
                    ))}
                  </select>
                ) : scopeType === 'POSITION' ? (
                   <select 
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={scopeValue}
                    onChange={(e) => setScopeValue(e.target.value)}
                    required
                  >
                    <option value="">-- Seleccione un Cargo --</option>
                    {positions.map(pos => (
                      <option key={pos.id} value={pos.name}>{pos.name}</option>
                    ))}
                  </select>
                ) : (
                  // Business Unit (Datalist or Select)
                  <>
                    <input 
                      list="bu-options"
                      type="text"
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ej. OPL, SNACKS, COMERCIAL..."
                      value={scopeValue}
                      onChange={(e) => setScopeValue(e.target.value)}
                      required
                    />
                    <datalist id="bu-options">
                      {businessUnits.map((bu, i) => (
                        <option key={i} value={bu} />
                      ))}
                    </datalist>
                  </>
                )}
              </div>

              {/* Has Huellero Toggle */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="block text-sm font-medium text-gray-800">¿Tiene Huellero Físico?</span>
                  <span className="text-xs text-gray-500">
                    {hasHuellero 
                      ? 'Sí, bloquear acceso a App Móvil.' 
                      : 'No, permitir usar App Móvil.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setHasHuellero(!hasHuellero)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    hasHuellero ? 'bg-red-600' : 'bg-green-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      hasHuellero ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm"
                >
                  Guardar Regla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
