import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom' // Importar Link y useLocation
import { useAuth } from '../context/AuthContext'
import {
  Users,
  Home,
  LogOut,
  Settings,
  FileText,
  Briefcase,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
  ChevronDown,
  ChevronRight,
  MapPin,
  Store,
  Building2, // Icono para Adm. Central
  Calendar, // Icono para Calendario
  Shield, // Icono para Roles
  Plane, // Icono para Vacaciones
  Camera, // Nuevo icono
  User, // Nuevo icono
  LayoutGrid // Icono para Áreas
} from 'lucide-react'

export default function Sidebar({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }) {
  const { user } = useAuth()
  const location = useLocation()
  
  // Estado para manejar qué menús están expandidos por su etiqueta (label)
  const [expandedMenus, setExpandedMenus] = useState({})

  // Efecto para expandir automáticamente el menú padre si estamos en una subruta
  useEffect(() => {
    const isDescendantActive = (items) => {
        return items.some(sub => {
            // Caso 1: Item tiene href directo
            if (sub.href && sub.href !== '#') {
                const [path, query] = sub.href.split('?')
                // Coincidencia exacta de path
                if (location.pathname === path) {
                    // Si tiene query params, verificar que existan en la URL actual
                    if (query) {
                        return location.search.includes(query)
                    }
                    return true
                }
            }
            // Caso 2: Item tiene submenú anidado (Recursión)
            if (sub.submenu) {
                return isDescendantActive(sub.submenu)
            }
            return false
        })
    }

    menuItems.forEach(item => {
        if (item.submenu) {
            if (isDescendantActive(item.submenu)) {
                setExpandedMenus(prev => ({ ...prev, [item.label]: true }))
            }
        }
    })
  }, [location.pathname, location.search])

  const toggleMenu = (label, level) => {
    if (isCollapsed) setIsCollapsed(false)
    
    setExpandedMenus(prev => {
        // Si estamos en el primer nivel (level 0), cerramos otros menús de primer nivel
        if (level === 0) {
            const newState = {} // Empezamos limpio (acordeón estricto para nivel 0)
            
            // Mantenemos abiertos los submenús internos si estamos cerrando el padre actual
            // Pero como es un toggle simple, si prev[label] es true -> false, todo se cierra.
            // Si prev[label] es false -> true, abrimos este y cerramos los demás.
            
            if (!prev[label]) {
                newState[label] = true
            }
            return newState
        }
        
        // Para niveles profundos, comportamiento normal (toggle independiente)
        // Opcional: Podríamos implementar acordeón también aquí si se desea
        return {
            ...prev,
            [label]: !prev[label]
        }
    })
  }

  const menuItems = [
    { icon: Home, label: 'Inicio', href: '/', module: 'dashboard' },
    { icon: Users, label: 'Empleados', href: '#', module: 'employees' }, // Podría llevar a /employees/all en el futuro
    { icon: Clock, label: 'Asistencias', href: '/attendance-list', module: 'attendance' },
    { icon: FileText, label: 'Solicitudes', href: '/requests', module: 'requests' },
    { 
      icon: Plane, 
      label: 'Vacaciones', 
      href: '#',
      module: 'vacations',
      submenu: [
        { label: 'Monitor / Kardex', href: '/vacaciones', icon: Plane },
        { label: 'Carga Masiva', href: '/vacaciones/carga-masiva', icon: FileText }
      ]
    },
    { icon: Calendar, label: 'Calendario', href: '/calendar', module: 'calendar' },
    {
      icon: Briefcase,
      label: 'Dptos / Sedes',
      href: '#',
      module: 'departments',
      submenu: [
        { label: 'ADM. CENTRAL', icon: Building2, href: '/employees/adm-central' },
        {
          label: 'Trujillo',
          icon: MapPin,
          submenu: [
            { label: 'Snacks', icon: Store, href: '/employees/trujillo?business=snacks' },
            { label: 'OPL', icon: Store, href: '/employees/trujillo?business=opl' }
          ]
        },
        {
          label: 'Chimbote',
          icon: MapPin,
          submenu: [
            { label: 'Bebidas', icon: Store, href: '/employees/chimbote?business=bebidas' },
            { label: 'Snacks', icon: Store, href: '/employees/chimbote?business=snacks' }
          ]
        },
        {
          label: 'Huaraz',
          icon: MapPin,
          submenu: [
            { label: 'Bebidas', icon: Store, href: '/employees/huaraz?business=bebidas' },
            { label: 'Purina', icon: Store, href: '/employees/huaraz?business=purina' }
          ]
        },
        { label: 'Huacho', icon: MapPin, href: '/employees/huacho' },
        { label: 'Chincha', icon: MapPin, href: '/employees/chincha' },
        { label: 'Ica', icon: MapPin, href: '/employees/ica' },
        { label: 'Desaguadero', icon: MapPin, href: '/employees/desaguadero' },
        { label: 'Lima', icon: MapPin, href: '/employees/lima' },
      ]
    },
    { icon: FileText, label: 'Documentos', href: '#', module: 'documents' }, // Module placeholder
    { 
      icon: Settings, 
      label: 'Configuración', 
      href: '#',
      module: 'settings',
      submenu: [
        { label: 'Usuarios y Permisos', icon: Shield, href: '/roles' },
        { label: 'Gestión de Cargos', icon: Briefcase, href: '/positions' },
        { label: 'Gestión de Áreas', icon: LayoutGrid, href: '/areas' }
      ]
    },
  ]

  // Filtrado de Menú por RBAC
  const visibleMenuItems = menuItems.reduce((acc, item) => {
    // 1. Verificar si es Admin, Super Admin, Jefe RRHH o tiene permisos de comodín (*)
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER ADMIN' || user?.role === 'JEFE_RRHH' || (user?.permissions && user?.permissions['*']);
    
    // 2. Verificar permiso de lectura en el módulo
    const hasModuleAccess = isAdmin || !item.module || (user?.permissions && user?.permissions[item.module]?.read);

    if (!hasModuleAccess) return acc;

    // 3. Lógica especial para 'departments' (Sedes): Filtrar submenú si no es Admin
    if (item.module === 'departments' && !isAdmin && user?.sede) {
        const newItem = { ...item };
        if (newItem.submenu) {
            // Filtrar submenu para mostrar SOLO la sede del usuario
            // Normalizamos a mayúsculas para comparar
            newItem.submenu = newItem.submenu.filter(sub => 
                sub.label.toUpperCase() === user.sede.toUpperCase()
            );
        }
        // Solo agregar si tiene items en el submenu (o si no tenía submenu originalmente)
        if (!newItem.submenu || newItem.submenu.length > 0) {
            acc.push(newItem);
        }
    } else {
        // Caso normal (Admin o módulo sin restricción especial de contenido)
        acc.push(item);
    }
    
    return acc;
  }, []);

  // Componente Recursivo para renderizar items
  const MenuItem = ({ item, level = 0 }) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0
    const isExpanded = expandedMenus[item.label]
    const Icon = item.icon

    // Verificar si está activo (Lógica mejorada)
    const isActive = !hasSubmenu && (() => {
        if (!item.href || item.href === '#') return false
        
        // Separar path y query
        const [targetPath, targetQuery] = item.href.split('?')
        const currentPath = location.pathname
        
        // Coincidencia exacta de path
        const isPathMatch = currentPath === targetPath || (targetPath !== '/' && currentPath.startsWith(targetPath))
        
        // Si hay query params, deben coincidir también
        if (targetQuery && isPathMatch) {
            return location.search.includes(targetQuery)
        }
        
        return isPathMatch
    })()

    // Cálculo de indentación y estilos según nivel
    const paddingLeft = level === 0 ? 'px-3' : level === 1 ? 'pl-4 pr-3' : 'pl-8 pr-3'
    const fontSize = level === 0 ? 'text-[15px]' : 'text-[14px]'

    // Si tiene submenú es un botón toggle, si no es un Link
    const Component = hasSubmenu ? 'button' : Link
    const props = hasSubmenu
      ? { onClick: () => toggleMenu(item.label, level), type: 'button' }
      : { to: item.href }

    return (
      <div className="w-full mb-1">
        <Component
          {...props}
          className={`
            w-full flex items-center gap-3 py-2.5 rounded-xl transition-all duration-200 group relative
            ${paddingLeft}
            ${isCollapsed && level === 0 ? 'justify-center px-0' : ''}
            
            /* Estilos condicionales */
            ${isActive 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200/50' 
                : hasSubmenu && isExpanded 
                    ? 'bg-blue-50/80 text-blue-700 font-semibold' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }
          `}
          title={isCollapsed ? item.label : ''}
        >
          {/* Indicador visual para subniveles activos (Línea o Punto) */}
          {level > 0 && (
             <div className={`
                absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full transition-all
                ${isActive ? 'bg-blue-400' : 'bg-transparent'}
             `}></div>
          )}

          {Icon && (
            <Icon
              size={level === 0 ? 22 : 18}
              className={`
                ${level === 0 ? 'min-w-[22px]' : 'min-w-[18px]'} 
                ${isActive ? 'text-white' : (isExpanded ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600')}
              `}
              strokeWidth={isActive ? 2.5 : 2}
            />
          )}

          {!Icon && level > 0 && (
            <div className={`
                w-1.5 h-1.5 rounded-full mr-1 transition-colors
                ${isActive ? 'bg-white' : 'bg-gray-300 group-hover:bg-gray-400'}
            `}></div>
          )}

          {!isCollapsed && (
            <>
              <span className={`whitespace-nowrap flex-1 text-left ${fontSize} ${isActive ? 'font-medium' : ''}`}>
                {item.label}
              </span>
              {hasSubmenu && (
                <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ${isExpanded ? 'text-blue-600' : 'text-gray-400'}`}>
                  <ChevronDown size={16} />
                </span>
              )}
            </>
          )}
        </Component>

        {/* Renderizado Recursivo del Submenú */}
        {!isCollapsed && hasSubmenu && (
          <div className={`
            overflow-hidden transition-all duration-300 ease-in-out space-y-1 mt-1
            ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
          `}>
            {item.submenu.map((subItem, index) => (
              <MenuItem key={index} item={subItem} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-30 h-screen bg-white border-r border-gray-100 shadow-xl shadow-gray-200/50 transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]
          overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        <div className="flex flex-col min-h-full">
          {/* Header del Sidebar */}
          <div className={`flex items-center h-20 px-6 mb-2 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isCollapsed && (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
                        <span className="text-white font-bold text-lg">P</span>
                    </div>
                    <span className="text-xl font-bold text-gray-800 tracking-tight">PAUSER</span>
                </div>
            )}
            {isCollapsed && (
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
                    <span className="text-white font-bold text-lg">P</span>
                </div>
            )}

            <div className="flex items-center">
              {/* Botón colapsar (Desktop) */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`hidden lg:flex p-2 rounded-xl text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors ${isCollapsed ? 'hidden' : ''}`}
                title="Colapsar menú"
              >
                <PanelLeftClose size={20} />
              </button>

              {/* Botón expandir (Cuando está colapsado) */}
              {isCollapsed && (
                  <button
                    onClick={() => setIsCollapsed(false)}
                    className="hidden lg:absolute lg:flex -right-3 top-8 bg-white border border-gray-200 p-1.5 rounded-full shadow-md text-gray-500 hover:text-blue-600 z-50"
                  >
                      <ChevronRight size={14} />
                  </button>
              )}

              {/* Botón cerrar (Móvil) */}
              <button
                onClick={() => setIsOpen(false)}
                className="lg:hidden p-2 ml-2 rounded-xl hover:bg-gray-100 text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Menú de Navegación */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {visibleMenuItems.map((item, index) => (
              <MenuItem key={index} item={item} level={0} />
            ))}
          </nav>

          {/* Footer del Sidebar (Logo o Versión) */}
          <div className="p-6 mt-auto text-center">
             {!isCollapsed && (
                <div className="bg-blue-50 rounded-2xl p-4 mb-4">
                    <p className="text-xs font-semibold text-blue-800 mb-1">Pauser RRHH v2.0</p>
                    <p className="text-[10px] text-blue-600/70">Gestión de Personal</p>
                </div>
             )}
             <p className="text-[10px] text-gray-300 font-medium">
                {isCollapsed ? 'v2.0' : '© 2024 Pauser Distribuciones'}
             </p>
          </div>
        </div>
      </aside>
    </>
  )
}
