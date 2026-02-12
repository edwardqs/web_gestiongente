import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Users,
  Home,
  Settings,
  FileText,
  Briefcase,
  X,
  PanelLeftClose,
  ChevronDown,
  ChevronRight,
  MapPin,
  Store,
  Building2,
  Calendar,
  Shield,
  Plane,
  Clock,
  LayoutGrid,
  Smartphone
} from 'lucide-react'

export default function Sidebar({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }) {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  
  // Estado para manejar SOLO UN menú expandido a la vez por nivel
  const [expandedMenus, setExpandedMenus] = useState({
    level0: null, // Solo 1 menú de nivel 0 puede estar abierto
    level1: null, // Solo 1 menú de nivel 1 puede estar abierto
  })
  
  // Detectar si estamos en móvil
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      
      if (mobile && isCollapsed) {
        setIsCollapsed(false)
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isCollapsed, setIsCollapsed])

  // Configuración de menús (memoizada para performance)
  const menuItems = useMemo(() => {
    // Lógica para determinar el enlace de "Equipo/Empleados"
    let employeesHref = '#'
    let employeesLabel = 'Empleados'
    let showEmployeesMenu = true // Por defecto visible
    
    // Si NO es Admin/SuperAdmin/JefeRRHH, redirigir a su sede
    const isGlobalAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER ADMIN' || user?.role === 'JEFE_RRHH' || (user?.permissions && user?.permissions['*'])
    const isAnalyst = user?.role?.includes('ANALISTA') || user?.position?.includes('ANALISTA')
    
    if (!isGlobalAdmin && user?.sede) {
        employeesLabel = 'Mi Equipo'
        // Normalizar sede para URL
        const sedeSlug = user.sede.toLowerCase().replace('.', '').replace(/\s+/g, '-')
        employeesHref = `/employees/${sedeSlug}`
        
        // Añadir business unit si existe
        if (user?.business_unit) {
            employeesHref += `?business=${user.business_unit.toLowerCase()}`
        }

        // OCULTAR MENÚ PARA ANALISTAS DE GENTE Y GESTIÓN
        // Si es Analista y tiene sede asignada, se oculta 'Mi Equipo' porque ya usa 'Dptos / Sedes'
        // Se mantiene visible solo para Jefes Operativos (Ventas, Logística, etc.)
        if (isAnalyst) {
            showEmployeesMenu = false
        }
    }

    const items = [
    { 
      id: 'home',
      icon: Home, 
      label: 'Inicio', 
      href: '/', 
      module: 'dashboard' 
    },
    // Solo agregar si debe mostrarse
    /* COMENTADO POR SOLICITUD DE USUARIO (EMPLEADOS)
    ...(showEmployeesMenu ? [{ 
      id: 'employees',
      icon: Users, 
      label: employeesLabel, 
      href: employeesHref, 
      module: 'employees' 
    }] : []),
    */
    { 
      id: 'attendance',
      icon: Clock, 
      label: 'Asistencias', 
      href: '/attendance-list', 
      module: 'attendance' 
    },
    { 
      id: 'requests',
      icon: FileText, 
      label: 'Solicitudes', 
      href: '/requests', 
      module: 'requests' 
    },
    { 
      id: 'vacations',
      icon: Plane, 
      label: 'Vacaciones', 
      href: '#',
      module: 'vacations',
      submenu: [
        { id: 'vac-monitor', label: 'Monitor / Kardex', href: '/vacaciones', icon: Plane },
        { id: 'vac-upload', label: 'Carga Masiva', href: '/vacaciones/carga-masiva', icon: FileText }
      ]
    },
    { 
      id: 'calendar',
      icon: Calendar, 
      label: 'Calendario', 
      href: '/calendar', 
      module: 'calendar' 
    },
    {
      id: 'departments',
      icon: Briefcase,
      label: 'Dptos / Sedes',
      href: '#',
      module: 'departments',
      submenu: [
        { id: 'dept-central', label: 'ADM. CENTRAL', icon: Building2, href: '/employees/adm-central' },
        {
          id: 'dept-trujillo',
          label: 'Trujillo',
          icon: MapPin,
          submenu: [
            { id: 'truj-snacks', label: 'Snacks', icon: Store, href: '/employees/trujillo?business=snacks' },
            { id: 'truj-opl', label: 'OPL', icon: Store, href: '/employees/trujillo?business=opl' }
          ]
        },
        {
          id: 'dept-chimbote',
          label: 'Chimbote',
          icon: MapPin,
          submenu: [
            { id: 'chim-bebidas', label: 'Bebidas', icon: Store, href: '/employees/chimbote?business=bebidas' },
            { id: 'chim-snacks', label: 'Snacks', icon: Store, href: '/employees/chimbote?business=snacks' }
          ]
        },
        {
          id: 'dept-huaraz',
          label: 'Huaraz',
          icon: MapPin,
          submenu: [
            { id: 'huar-bebidas', label: 'Bebidas', icon: Store, href: '/employees/huaraz?business=bebidas' },
            { id: 'huar-purina', label: 'Purina', icon: Store, href: '/employees/huaraz?business=purina' }
          ]
        },
        { id: 'dept-huacho', label: 'Huacho', icon: MapPin, href: '/employees/huacho' },
        { id: 'dept-chincha', label: 'Chincha', icon: MapPin, href: '/employees/chincha' },
        { id: 'dept-ica', label: 'Ica', icon: MapPin, href: '/employees/ica' },
        { id: 'dept-desaguadero', label: 'Desaguadero', icon: MapPin, href: '/employees/desaguadero' },
        { id: 'dept-lima', label: 'Lima', icon: MapPin, href: '/employees/lima' },
      ]
    },
    /* COMENTADO POR SOLICITUD DE USUARIO (DOCUMENTOS)
    { 
      id: 'documents',
      icon: FileText, 
      label: 'Documentos', 
      href: '#', 
      module: 'documents' 
    },
    */
    { 
      id: 'settings',
      icon: Settings, 
      label: 'Configuración', 
      href: '#',
      module: 'settings',
      submenu: [
        { id: 'set-roles', label: 'Usuarios y Permisos', icon: Shield, href: '/roles' },
        { id: 'set-positions', label: 'Gestión de Cargos', icon: Briefcase, href: '/positions' },
        { id: 'set-areas', label: 'Gestión de Áreas', icon: LayoutGrid, href: '/areas' },
        { id: 'set-mobile-access', label: 'Acceso App Móvil', icon: Smartphone, href: '/mobile-access-config' }
      ]
    },
  ]
  return items
  }, [user])

  // Función recursiva para encontrar si un item está activo
  const findActiveMenuItem = useCallback((items, path, search) => {
    for (const item of items) {
      if (item.href && item.href !== '#') {
        const [targetPath, targetQuery] = item.href.split('?')
        const isPathMatch = path === targetPath || (targetPath !== '/' && path.startsWith(targetPath))
        
        if (isPathMatch) {
          if (targetQuery && !search.includes(targetQuery)) continue
          return item.id
        }
      }
      
      if (item.submenu) {
        const found = findActiveMenuItem(item.submenu, path, search)
        if (found) return found
      }
    }
    return null
  }, [])

  // Función para expandir automáticamente el menú activo
  const expandActiveMenus = useCallback(() => {
    const activeId = findActiveMenuItem(menuItems, location.pathname, location.search)
    if (!activeId) return

    const newExpandedState = { level0: null, level1: null }

    // Buscar el menú padre en nivel 0
    for (const item of menuItems) {
      if (item.submenu) {
        // Verificar si el item activo está en submenu nivel 1
        if (item.submenu.some(sub => sub.id === activeId)) {
          newExpandedState.level0 = item.id
          break
        }
        
        // Verificar si está en submenu nivel 2
        for (const subItem of item.submenu) {
          if (subItem.submenu && subItem.submenu.some(subSub => subSub.id === activeId)) {
            newExpandedState.level0 = item.id
            newExpandedState.level1 = subItem.id
            break
          }
        }
      }
    }

    setExpandedMenus(newExpandedState)
  }, [menuItems, location.pathname, location.search, findActiveMenuItem])

  // Expandir automáticamente cuando cambia la ruta
  useEffect(() => {
    expandActiveMenus()
  }, [expandActiveMenus])

  // Toggle de menú mejorado - SOLO UN MENÚ ABIERTO POR NIVEL
  const toggleMenu = useCallback((itemId, level) => {
    if (isCollapsed) {
      setIsCollapsed(false)
      return
    }
    
    setExpandedMenus(prev => {
      const levelKey = `level${level}`
      
      // Si el menú ya está abierto, cerrarlo
      if (prev[levelKey] === itemId) {
        return {
          ...prev,
          [levelKey]: null,
          // Cerrar también niveles inferiores
          ...(level === 0 && { level1: null })
        }
      }
      
      // Abrir el nuevo menú y cerrar el anterior del mismo nivel
      return {
        ...prev,
        [levelKey]: itemId,
        // Si abrimos nivel 0, cerrar nivel 1
        ...(level === 0 && { level1: null })
      }
    })
  }, [isCollapsed, setIsCollapsed])

  // Navegación con cierre automático en móvil
  const handleNavigation = useCallback((href) => {
    if (!href || href === '#') return
    
    if (isMobile) {
      setIsOpen(false)
      setTimeout(() => navigate(href), 150)
    } else {
      navigate(href)
    }
  }, [isMobile, setIsOpen, navigate])

  // Filtrado de menú por RBAC (memoizado)
  const visibleMenuItems = useMemo(() => {
    const isAdmin = user?.role === 'ADMIN' || 
                    user?.role === 'SUPER ADMIN' || 
                    user?.role === 'JEFE_RRHH' || 
                    (user?.permissions && user?.permissions['*'])

    return menuItems.reduce((acc, item) => {
      // 1. Verificar si es Admin o tiene permiso explícito
      let hasModuleAccess = isAdmin || !item.module || 
                             (user?.permissions && user?.permissions[item.module]?.read)

      // 2. CORRECCIÓN ESPECÍFICA PARA VACACIONES (Analistas y Jefes deben ver)
      // Si el módulo es 'vacations' y no tiene permiso explícito pero es Analista/Jefe, dar acceso
      if (item.module === 'vacations' && !hasModuleAccess) {
          const isAnalystOrBoss = user?.role?.includes('ANALISTA') || 
                                  user?.role?.includes('JEFE') || 
                                  user?.position?.includes('ANALISTA') ||
                                  user?.position?.includes('JEFE') ||
                                  user?.position?.includes('GERENTE') ||
                                  user?.position?.includes('COORDINADOR');
                                  
          if (isAnalystOrBoss) hasModuleAccess = true;
      }

      if (!hasModuleAccess) return acc

      // Filtrado especial para departamentos
      if (item.module === 'departments' && !isAdmin && user?.sede) {
        const newItem = { ...item }
        if (newItem.submenu) {
          newItem.submenu = newItem.submenu.filter(sub => 
            sub.label.toUpperCase() === user.sede.toUpperCase()
          )
        }
        if (!newItem.submenu || newItem.submenu.length > 0) {
          acc.push(newItem)
        }
      } else {
        acc.push(item)
      }
      
      return acc
    }, [])
  }, [menuItems, user])

  // Componente MenuItem recursivo OPTIMIZADO
  const MenuItem = ({ item, level = 0, parentId = null }) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0
    const levelKey = `level${level}`
    const isExpanded = expandedMenus[levelKey] === item.id
    const Icon = item.icon

    // Verificar si está activo
    const isActive = useMemo(() => {
      if (hasSubmenu || !item.href || item.href === '#') return false
      
      const [targetPath, targetQuery] = item.href.split('?')
      const currentPath = location.pathname
      
      const isPathMatch = currentPath === targetPath || 
                         (targetPath !== '/' && currentPath.startsWith(targetPath))
      
      if (targetQuery && isPathMatch) {
        return location.search.includes(targetQuery)
      }
      
      return isPathMatch
    }, [hasSubmenu, item.href, location.pathname, location.search])

    // Estilos dinámicos
    const paddingLeft = level === 0 ? 'px-3' : level === 1 ? 'pl-6 pr-3' : 'pl-10 pr-3'
    const fontSize = level === 0 ? 'text-[15px]' : level === 1 ? 'text-[14px]' : 'text-[13px]'

    const handleClick = (e) => {
      e.preventDefault()
      e.stopPropagation()
      
      if (hasSubmenu) {
        toggleMenu(item.id, level)
      } else {
        handleNavigation(item.href)
      }
    }

    return (
      <div className="w-full mb-1">
        <button
          onClick={handleClick}
          className={`
            w-full flex items-center gap-3 py-2.5 rounded-xl transition-all duration-200 group relative
            ${paddingLeft}
            ${isCollapsed && level === 0 ? 'justify-center px-0' : ''}
            
            ${isActive 
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200/50' 
              : hasSubmenu && isExpanded 
                ? 'bg-blue-50/80 text-blue-700 font-semibold' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }
            
            active:scale-[0.98]
            ${!hasSubmenu && !isActive ? 'hover:translate-x-1' : ''}
          `}
          title={isCollapsed ? item.label : ''}
        >
          {/* Indicador visual para items activos en subniveles */}
          {level > 0 && isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-blue-400" />
          )}

          {/* Icono */}
          {Icon && (
            <Icon
              size={level === 0 ? 22 : 18}
              className={`
                ${level === 0 ? 'min-w-[22px]' : 'min-w-[18px]'} 
                transition-colors
                ${isActive 
                  ? 'text-white' 
                  : isExpanded 
                    ? 'text-blue-600' 
                    : 'text-gray-400 group-hover:text-gray-600'
                }
              `}
              strokeWidth={isActive ? 2.5 : 2}
            />
          )}

          {!Icon && level > 0 && (
            <div className={`
              w-1.5 h-1.5 rounded-full mr-1 transition-colors
              ${isActive ? 'bg-white' : 'bg-gray-300 group-hover:bg-gray-400'}
            `} />
          )}

          {/* Label y Chevron */}
          {!isCollapsed && (
            <>
              <span className={`
                whitespace-nowrap flex-1 text-left ${fontSize} 
                ${isActive ? 'font-medium' : ''}
                ${isMobile && level > 1 ? 'truncate max-w-[150px]' : ''}
              `}>
                {item.label}
              </span>
              {hasSubmenu && (
                <ChevronDown 
                  size={16}
                  className={`
                    transition-transform duration-200 shrink-0
                    ${isExpanded ? 'rotate-180 text-blue-600' : 'text-gray-400'}
                  `}
                />
              )}
            </>
          )}
        </button>

        {/* Submenú recursivo */}
        {!isCollapsed && hasSubmenu && (
          <div className={`
            overflow-hidden transition-all duration-300 ease-in-out space-y-1 mt-1
            ${isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}
          `}>
            {item.submenu.map((subItem) => (
              <MenuItem 
                key={subItem.id} 
                item={subItem} 
                level={level + 1}
                parentId={item.id}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-20 lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-30 h-screen bg-white border-r border-gray-100 shadow-xl shadow-gray-200/50 
          transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]
          overflow-y-auto overflow-x-hidden
          
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isMobile ? 'w-[280px]' : (isCollapsed ? 'w-20' : 'w-64')}
          ${!isMobile && 'lg:translate-x-0'}
        `}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#e5e7eb transparent'
        }}
      >
        <div className="flex flex-col min-h-full">
          {/* Header */}
          <div className={`
            flex items-center h-20 px-6 mb-2 border-b border-gray-100
            ${isCollapsed && !isMobile ? 'justify-center' : 'justify-between'}
          `}>
            {(!isCollapsed || isMobile) && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
                  <span className="text-white font-bold text-lg">P</span>
                </div>
                <span className="text-xl font-bold text-gray-800 tracking-tight">PAUSER</span>
              </div>
            )}
            
            {isCollapsed && !isMobile && (
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
                <span className="text-white font-bold text-lg">P</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {/* Botón colapsar (Desktop) */}
              {!isMobile && !isCollapsed && (
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="p-2 rounded-xl text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  title="Colapsar menú"
                >
                  <PanelLeftClose size={20} />
                </button>
              )}

              {/* Botón expandir (Desktop colapsado) */}
              {!isMobile && isCollapsed && (
                <button
                  onClick={() => setIsCollapsed(false)}
                  className="absolute -right-3 top-8 bg-white border border-gray-200 p-1.5 rounded-full shadow-md text-gray-500 hover:text-blue-600 z-50 transition-colors"
                  title="Expandir menú"
                >
                  <ChevronRight size={14} />
                </button>
              )}

              {/* Botón cerrar (Móvil) */}
              {isMobile && (
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors active:scale-95"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          {/* Menú de Navegación */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {visibleMenuItems.map((item) => (
              <MenuItem key={item.id} item={item} level={0} />
            ))}
          </nav>

          {/* Footer */}
          <div className="p-6 mt-auto text-center border-t border-gray-100">
            {(!isCollapsed || isMobile) && (
              <div className="bg-blue-50 rounded-2xl p-4 mb-4">
                <p className="text-xs font-semibold text-blue-800 mb-1">Pauser RRHH v2.0</p>
                <p className="text-[10px] text-blue-600/70">Gestión de Personal</p>
              </div>
            )}
            <p className="text-[10px] text-gray-300 font-medium">
              {isCollapsed && !isMobile ? 'v2.0' : '© 2026 Pauser Distribuciones'}
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}