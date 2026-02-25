import { Search, ChevronDown, Filter } from 'lucide-react'

export default function EmployeesFilterBar({
  selectedSede, setSelectedSede,
  selectedUnit, setSelectedUnit,
  selectedArea, setSelectedArea,
  selectedType, setSelectedType,
  searchTerm, setSearchTerm,
  filterOptions,
  filteredCount,
  totalInScope,
  userRestrictedArea
}) {
  const activeFiltersCount = [selectedSede, selectedUnit, selectedArea, selectedType].filter(Boolean).length

  return (
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
          Mostrando <span className="font-semibold text-gray-600">{filteredCount}</span> de{' '}
          <span className="font-semibold text-gray-600">{totalInScope}</span> colaboradores
        </p>
      )}
    </div>
  )
}
