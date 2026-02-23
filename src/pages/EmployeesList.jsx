import { useState, useEffect, useMemo } from 'react'
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
  Search, Download, UserPlus, MapPin, Building2, Briefcase,
  Edit2, Trash2, Store, Upload, Eye, Mail, Phone, CreditCard,
  Calendar, ChevronDown, Users, Filter, MoreVertical, UserMinus
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
  const [positionAreaMap, setPositionAreaMap] = useState({})
  const [selectedSede, setSelectedSede] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [selectedArea, setSelectedArea] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [activeMenu, setActiveMenu] = useState(null)
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null })
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [terminationModal, setTerminationModal] = useState({ isOpen: false, employeeId: null, employeeName: '', reason: '', file: null })
  const [terminationLoading, setTerminationLoading] = useState(false)

  const sedeMap = {
    'adm-central': 'ADM. CENTRAL', 'trujillo': 'TRUJILLO', 'chimbote': 'CHIMBOTE',
    'huaraz': 'HUARAZ', 'huacho': 'HUACHO', 'chincha': 'CHINCHA',
    'ica': 'ICA', 'desaguadero': 'DESAGUADERO', 'lima': 'LIMA'
  }

  let currentSedeName = sedeMap[sede] || sede
  const normalize = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() : ""
  const userRole = normalize(user?.role)
  const userPosition = normalize(user?.position)

  // ── Niveles de acceso ──────────────────────────────────────────────────────
  const isGlobalAdmin =
    userRole === 'ADMIN' || userRole === 'SUPER ADMIN' || userRole === 'JEFE_RRHH' ||
    userPosition.includes('JEFE DE GENTE') || userPosition.includes('ANALISTA DE GENTE') ||
    userPosition.includes('GERENTE GENERAL') ||
    (user?.permissions && user?.permissions['*'])

  const isBoss =
    userRole.includes('JEFE') || userRole.includes('GERENTE') ||
    userPosition.includes('JEFE') || userPosition.includes('GERENTE') ||
    userPosition.includes('COORDINADOR') || userPosition.includes('SUPERVISOR')

  // ── Área restringida para Jefes de Área ───────────────────────────────────
  // Un Jefe de Operaciones ve OPERACIONES en TODAS las sedes/unidades
  // RRHH/Gente y admins globales no tienen restricción de área
  const userRestrictedArea = useMemo(() => {
    if (isGlobalAdmin) return null
    if (!isBoss) return null
    if (userPosition.includes('GENTE') || userPosition.includes('RRHH')) return null
    if (userPosition.includes('OPERACIONES')) return 'OPERACIONES'
    if (userPosition.includes('COMERCIAL') || userPosition.includes('VENTAS')) return 'COMERCIAL'
    if (userPosition.includes('ALMACEN') || userPosition.includes('LOGISTICA')) return 'ALMACEN'
    if (userPosition.includes('DISTRIBUCION') || userPosition.includes('TRANSPORTE')) return 'DISTRIBUCION'
    if (userPosition.includes('MANTENIMIENTO')) return 'MANTENIMIENTO'
    if (userPosition.includes('FINANZAS') || userPosition.includes('CONTABILIDAD')) return 'FINANZAS'
    if (userPosition.includes('SISTEMAS') || userPosition.includes('TI')) return 'SISTEMAS'
    return null
  }, [userPosition, isGlobalAdmin, isBoss])

  // Solo forzar sede para usuarios rasos (no jefes, no admins)
  if (!isGlobalAdmin && !isBoss && user?.sede) {
    const userSedeNorm = user.sede.toUpperCase().trim()
    if (currentSedeName?.toUpperCase() !== userSedeNorm) currentSedeName = user.sede
  }

  useEffect(() => { fetchEmployees() }, [sede, businessUnit, user?.sede, user?.business_unit, user?.role])
  useEffect(() => {
    setSelectedSede(''); setSelectedUnit(''); setSelectedArea(''); setSelectedType(''); setSearchTerm('')
  }, [sede, businessUnit])
  useEffect(() => {
    const handler = () => setActiveMenu(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      let query

      if (currentSedeName) {
        query = supabase.from('employees').select('*').eq('sede', currentSedeName).eq('is_active', true)
      } else {
        // Admins y Jefes cargan TODOS los empleados activos
        // El filtrado por área se aplica en cliente con filteredEmployees
        if (isGlobalAdmin || isBoss) {
          query = supabase.from('employees').select('*').eq('is_active', true)
        } else {
          query = supabase.rpc('get_my_employees_v2').eq('is_active', true)
        }
      }

      query = query.order('full_name', { ascending: true })

      // Solo forzar business_unit para usuarios rasos
      // Jefes y Admins NO están limitados por su propia unidad
      if (!isGlobalAdmin && !isBoss && user?.business_unit) {
        query = query.eq('business_unit', user.business_unit.toUpperCase())
      } else if (businessUnit) {
        query = query.eq('business_unit', businessUnit.toUpperCase())
      }

      const { data: positionsData } = await getPositions()
      const areaMap = {}
      if (positionsData) {
        positionsData.forEach(pos => {
          if (pos.area_name && pos.area_name !== 'Sin Área Asignada') areaMap[pos.name] = pos.area_name
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
      isOpen: true, title: 'Eliminar Empleado',
      message: '¿Estás seguro de que deseas eliminar a este empleado? Esta acción no se puede deshacer.',
      type: 'error', confirmText: 'Eliminar', onConfirm: () => handleDelete(id)
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
    const params = new URLSearchParams()
    if (currentSedeName) params.append('sede', currentSedeName)
    if (businessUnit) params.append('business', businessUnit.toUpperCase())
    navigate(`/register-employee?${params.toString()}`)
  }

  const handleImportSuccess = () => {
    setShowImportModal(false)
    showToast('Empleados importados correctamente', 'success')
    fetchEmployees()
  }

  const handleViewProfile = (emp) => {
    setSelectedEmployee({ ...emp, area_name: positionAreaMap[emp.position] })
    setShowProfileModal(true)
  }

  const handleTermination = async () => {
    if (!terminationModal.reason) { showToast('Debes ingresar un motivo de baja', 'error'); return }
    setTerminationLoading(true)
    try {
      let documentUrl = null
      if (terminationModal.file) {
        const fileExt = terminationModal.file.name.split('.').pop()
        const fileName = `${terminationModal.employeeId}_baja_${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('documents').upload(`bajas/${fileName}`, terminationModal.file)
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(`bajas/${fileName}`)
          documentUrl = publicUrlData.publicUrl
        }
      }
      const { error: updateError } = await supabase.from('employees')
        .update({ is_active: false, termination_date: new Date().toISOString(), termination_reason: terminationModal.reason, termination_document_url: documentUrl })
        .eq('id', terminationModal.employeeId)
      if (updateError) throw updateError
      showToast('Empleado dado de baja correctamente', 'success')
      setTerminationModal({ isOpen: false, employeeId: null, employeeName: '', reason: '', file: null })
      fetchEmployees()
    } catch (error) {
      showToast('Error al procesar la baja: ' + error.message, 'error')
    } finally {
      setTerminationLoading(false)
    }
  }

  const filterOptions = useMemo(() => {
    const sedes = [...new Set(employees.map(e => e.sede).filter(Boolean))].sort()
    const units = [...new Set(employees
      .filter(e => !selectedSede || e.sede === selectedSede)
      .map(e => e.business_unit).filter(Boolean))].sort()
    const areas = [...new Set(employees
      .filter(e => (!selectedSede || e.sede === selectedSede) && (!selectedUnit || e.business_unit === selectedUnit))
      .map(e => positionAreaMap[e.position] || 'Sin Área').filter(Boolean))].sort()
    return { sedes, units, areas }
  }, [employees, selectedSede, selectedUnit, positionAreaMap])

  useEffect(() => {
    if (!loading && employees.length > 0) {
      if (filterOptions.sedes.length === 1 && !selectedSede) setSelectedSede(filterOptions.sedes[0])
      if (filterOptions.units.length === 1 && !selectedUnit) setSelectedUnit(filterOptions.units[0])
      if (filterOptions.areas.length === 1 && !selectedArea) setSelectedArea(filterOptions.areas[0])
      // Auto-seleccionar el área restringida del jefe (sin tocar sede ni unidad)
      if (isBoss && !isGlobalAdmin && userRestrictedArea && !selectedArea) {
        const match = filterOptions.areas.find(a => normalize(a) === normalize(userRestrictedArea))
        if (match) setSelectedArea(match)
      }
    }
  }, [loading, employees, filterOptions, isBoss, isGlobalAdmin, userRestrictedArea])

  // ── Filtrado en cliente ────────────────────────────────────────────────────
  const totalInScope = useMemo(() => {
    if (!userRestrictedArea) return employees.length
    return employees.filter(emp => {
      const empArea = positionAreaMap[emp.position] || 'Sin Área'
      return normalize(empArea) === normalize(userRestrictedArea)
    }).length
  }, [employees, userRestrictedArea, positionAreaMap])

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.dni?.includes(searchTerm)
    const matchesSede = !selectedSede || emp.sede === selectedSede
    const matchesUnit = !selectedUnit || emp.business_unit === selectedUnit
    const empArea = positionAreaMap[emp.position] || 'Sin Área'
    // Jefes con área restringida siempre filtran por su área, sin importar el selector
    const matchesArea = userRestrictedArea
      ? normalize(empArea) === normalize(userRestrictedArea)
      : (!selectedArea || empArea === selectedArea)
    const matchesType = !selectedType || (
      selectedType === 'ADMINISTRATIVO'
        ? (emp.position.includes('JEFE') || emp.position.includes('ANALISTA') || emp.position.includes('COORDINADOR') || emp.position.includes('ASISTENTE'))
        : (!emp.position.includes('JEFE') && !emp.position.includes('ANALISTA') && !emp.position.includes('COORDINADOR') && !emp.position.includes('ASISTENTE'))
    )
    return matchesSearch && matchesSede && matchesUnit && matchesArea && matchesType
  })

  const isHR = userRole === 'JEFE_RRHH' || userRole === 'ADMIN' || userRole === 'SUPER ADMIN' || userPosition.includes('JEFE DE GENTE')
  const isCentralHRAnalyst = userPosition.includes('ANALISTA DE GENTE') && user?.sede === 'ADM. CENTRAL' &&
    (user?.business_unit === 'ADMINISTRACIÓN' || user?.business_unit === 'ADMINISTRACION')
  const canManage = isHR || isCentralHRAnalyst
  const activeFiltersCount = [selectedSede, selectedUnit, selectedArea, selectedType].filter(Boolean).length

  const getAvatarColor = (name) => {
    const colors = [
      'from-blue-400 to-blue-600', 'from-violet-400 to-violet-600',
      'from-emerald-400 to-emerald-600', 'from-amber-400 to-amber-600',
      'from-rose-400 to-rose-600', 'from-cyan-400 to-cyan-600',
      'from-indigo-400 to-indigo-600', 'from-teal-400 to-teal-600',
    ]
    return colors[name ? name.charCodeAt(0) % colors.length : 0]
  }

  return (
    <div className="min-h-screen bg-gray-50/60">
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <EmployeeExcelUpload onClose={() => setShowImportModal(false)} onSuccess={handleImportSuccess}
              defaultSede={currentSedeName} defaultBusinessUnit={businessUnit ? businessUnit.toUpperCase() : null} />
          </div>
        </div>
      )}

      <div className="max-w-full px-6 py-6 space-y-5">

        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
              {currentSedeName === 'ADM. CENTRAL' ? <Building2 size={20} className="text-white" /> : <Users size={20} className="text-white" />}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">
                {currentSedeName || 'Todos los Empleados'}
                {businessUnit && <span className="text-gray-400 font-normal ml-2 text-base">/ {businessUnit.toUpperCase()}</span>}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                <span className="font-semibold text-gray-700">{filteredEmployees.length}</span> colaboradores
                {userRestrictedArea && (
                  <span className="ml-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full border border-blue-100">
                    Área: {userRestrictedArea}
                  </span>
                )}
              </p>
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                <Upload size={15} /> Importar
              </button>
              <button className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                <Download size={15} /> Exportar
              </button>
              <button onClick={handleNewEmployee} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-200">
                <UserPlus size={15} /> Nuevo Empleado
              </button>
            </div>
          )}
        </div>

        {/* ── FILTROS ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Sede — libre para jefes y admins */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-0.5">Sede</label>
              <div className="relative">
                <select value={selectedSede} onChange={(e) => { setSelectedSede(e.target.value); setSelectedUnit(''); setSelectedArea('') }}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all cursor-pointer">
                  <option value="">Todas las sedes</option>
                  {filterOptions.sedes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            {/* Unidad — libre para jefes y admins */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-0.5">Unidad</label>
              <div className="relative">
                <select value={selectedUnit} onChange={(e) => { setSelectedUnit(e.target.value); setSelectedArea('') }}
                  disabled={!selectedSede && filterOptions.sedes.length > 1}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                  <option value="">Todas las unidades</option>
                  {filterOptions.units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            {/* Área — bloqueada si el jefe tiene área restringida */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-0.5">
                Área {userRestrictedArea && <span className="ml-1 text-blue-400 normal-case font-normal text-[10px]">(tu área)</span>}
              </label>
              <div className="relative">
                <select value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)}
                  disabled={!!userRestrictedArea}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                  <option value="">Todas las áreas</option>
                  {filterOptions.areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            {/* Tipo */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-0.5">Tipo</label>
              <div className="relative">
                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all cursor-pointer">
                  <option value="">Todos</option>
                  <option value="ADMINISTRATIVO">Administrativo</option>
                  <option value="OPERATIVO">Operativo</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Buscar por nombre o DNI..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
            </div>
            {(activeFiltersCount > 0 || searchTerm) && (
              <button onClick={() => { setSelectedSede(''); setSelectedUnit(''); setSelectedArea(''); setSelectedType(''); setSearchTerm('') }}
                className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-all whitespace-nowrap">
                <Filter size={13} /> Limpiar {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </button>
            )}
          </div>
          {(searchTerm || activeFiltersCount > 0) && (
            <p className="text-xs text-gray-400 pl-0.5">
              Mostrando <span className="font-semibold text-gray-600">{filteredEmployees.length}</span> de{' '}
              <span className="font-semibold text-gray-600">{totalInScope}</span> colaboradores
            </p>
          )}
        </div>

        {/* ── TABLA ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: '860px' }}>
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-5 py-3 text-left" style={{ width: '27%' }}><span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Colaborador</span></th>
                  <th className="px-5 py-3 text-left" style={{ width: '23%' }}><span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Contacto</span></th>
                  <th className="px-5 py-3 text-left" style={{ width: '18%' }}><span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Sede / Área</span></th>
                  <th className="px-5 py-3 text-left" style={{ width: '13%' }}><span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ingreso</span></th>
                  <th className="px-5 py-3 text-left" style={{ width: '10%' }}><span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Estado</span></th>
                  <th className="px-5 py-3 text-left" style={{ width: '9%' }}><span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                          <div className="space-y-1.5">
                            <div className="h-3 w-36 bg-gray-100 rounded animate-pulse" />
                            <div className="h-2.5 w-24 bg-gray-100 rounded animate-pulse" />
                          </div>
                        </div>
                      </td>
                      {[1,2,3,4,5].map(j => <td key={j} className="px-5 py-3.5"><div className="h-3 w-20 bg-gray-100 rounded animate-pulse" /></td>)}
                    </tr>
                  ))
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center"><Users size={24} className="text-gray-400" /></div>
                        <div>
                          <p className="font-semibold text-gray-700 text-sm">Sin resultados</p>
                          <p className="text-gray-400 text-xs mt-1">Intenta ajustar los filtros de búsqueda</p>
                        </div>
                        {(searchTerm || activeFiltersCount > 0) && (
                          <button onClick={() => { setSelectedSede(''); setSelectedUnit(''); setSelectedArea(''); setSelectedType(''); setSearchTerm('') }}
                            className="text-xs text-blue-600 font-semibold hover:underline">Limpiar filtros</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp, idx) => (
                    <tr key={emp.id} className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                      {/* Colaborador */}
                      <td className="px-5 py-5" style={{ width: '27%' }}>
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            {emp.profile_picture_url
                              ? <img src={emp.profile_picture_url} alt={emp.full_name} className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm" />
                              : <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor(emp.full_name)} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>{emp.full_name.charAt(0)}</div>
                            }
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${emp.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate leading-snug">{emp.full_name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Briefcase size={11} className="text-blue-500 flex-shrink-0" />
                              <span className="text-xs text-blue-600 font-medium truncate">{emp.position}</span>
                            </div>
                            <span className="inline-block mt-1 px-1.5 py-px rounded text-[10px] font-semibold bg-gray-100 text-gray-500 uppercase tracking-wide">{emp.employee_type || 'OPERATIVO'}</span>
                          </div>
                        </div>
                      </td>
                      {/* Contacto */}
                      <td className="px-5 py-5" style={{ width: '23%' }}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Mail size={12} className="text-gray-300 flex-shrink-0" />
                            <span className="text-xs text-gray-600 truncate" title={emp.email}>{emp.email || <span className="text-gray-300">—</span>}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone size={12} className="text-gray-300 flex-shrink-0" />
                            <span className="text-xs text-gray-600">{emp.phone || <span className="text-gray-300">—</span>}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CreditCard size={12} className="text-gray-300 flex-shrink-0" />
                            <span className="text-xs font-mono text-gray-500">{emp.dni}</span>
                          </div>
                        </div>
                      </td>
                      {/* Sede / Área */}
                      <td className="px-5 py-5" style={{ width: '18%' }}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={12} className="text-gray-300 flex-shrink-0" />
                            <span className="text-xs font-semibold text-gray-700">{emp.sede}</span>
                          </div>
                          {emp.business_unit && (
                            <div className="flex items-center gap-1.5">
                              <Store size={12} className="text-gray-300 flex-shrink-0" />
                              <span className="text-xs text-gray-500">{emp.business_unit}</span>
                            </div>
                          )}
                          {positionAreaMap[emp.position] && (
                            <span className="inline-block px-1.5 py-px rounded text-[10px] font-medium bg-blue-50 text-blue-500 border border-blue-100">{positionAreaMap[emp.position]}</span>
                          )}
                        </div>
                      </td>
                      {/* Ingreso */}
                      <td className="px-5 py-5" style={{ width: '13%' }}>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-gray-300 flex-shrink-0" />
                          <span className="text-xs text-gray-600">
                            {emp.entry_date ? new Date(emp.entry_date + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : <span className="text-gray-300">—</span>}
                          </span>
                        </div>
                      </td>
                      {/* Estado */}
                      <td className="px-5 py-5" style={{ width: '10%' }}>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${emp.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${emp.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          {emp.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      {/* Acciones */}
                      <td className="px-5 py-5" style={{ width: '9%' }}>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleViewProfile(emp)} title="Ver perfil"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 hover:border-blue-200 transition-all text-xs font-semibold">
                            <Eye size={13} /><span>Ver</span>
                          </button>
                          {canManage && (
                            <>
                              <button onClick={() => navigate(`/edit-employee/${emp.id}`)} title="Editar"
                                className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100 hover:border-amber-200 transition-all">
                                <Edit2 size={13} />
                              </button>
                              <button onClick={() => setTerminationModal({ isOpen: true, employeeId: emp.id, employeeName: emp.full_name, reason: '', file: null })} title="Dar de Baja"
                                className="p-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100 hover:bg-orange-100 hover:border-orange-200 transition-all">
                                <UserMinus size={13} />
                              </button>
                              <button onClick={() => openDeleteModal(emp.id)} title="Eliminar"
                                className="p-1.5 rounded-lg bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 hover:border-red-200 transition-all">
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!loading && filteredEmployees.length > 0 && (
            <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                <span className="font-semibold text-gray-600">{filteredEmployees.length}</span> de{' '}
                <span className="font-semibold text-gray-600">{employees.length}</span> colaboradores
              </p>
              <p className="text-xs text-gray-400">
                {employees.filter(e => e.is_active).length} activos · {employees.filter(e => !e.is_active).length} inactivos
              </p>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={modalConfig.isOpen} onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        title={modalConfig.title} message={modalConfig.message} type={modalConfig.type}
        confirmText={modalConfig.confirmText} onConfirm={modalConfig.onConfirm} showCancel />

      <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="Perfil de Empleado" showCancel={false} cancelText="Cerrar">
        <EmployeeProfileCard employee={selectedEmployee} />
      </Modal>

      <Modal isOpen={terminationModal.isOpen} onClose={() => setTerminationModal(prev => ({ ...prev, isOpen: false }))}
        title={`Dar de Baja: ${terminationModal.employeeName}`}
        confirmText={terminationLoading ? "Procesando..." : "Confirmar Baja"} onConfirm={handleTermination} type="warning" showCancel>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de Baja *</label>
            <textarea className="w-full p-2 border rounded-md" rows="3" value={terminationModal.reason}
              onChange={e => setTerminationModal(prev => ({ ...prev, reason: e.target.value }))} placeholder="Ingrese el motivo de la baja..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Documento de Sustento (Opcional)</label>
            <input type="file" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              onChange={e => setTerminationModal(prev => ({ ...prev, file: e.target.files[0] }))} />
          </div>
          <p className="text-xs text-gray-500 bg-yellow-50 p-2 rounded border border-yellow-100">
            Al confirmar, el empleado pasará a estado Inactivo y no tendrá acceso al sistema.
          </p>
        </div>
      </Modal>
    </div>
  )
}