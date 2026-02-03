import { useState } from 'react'
import { Link } from 'react-router-dom' // Importar Link
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
  Shield // Icono para Roles
} from 'lucide-react'

export default function Sidebar({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }) {
  const { signOut, user } = useAuth()

  // Estado para manejar qué menús están expandidos por su etiqueta (label)
  const [expandedMenus, setExpandedMenus] = useState({})

  const toggleMenu = (label) => {
    if (isCollapsed) setIsCollapsed(false)
    setExpandedMenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }))
  }

  const menuItems = [
    { icon: Home, label: 'Inicio', href: '/', module: 'dashboard' },
    { icon: Users, label: 'Empleados', href: '#', module: 'employees' }, // Podría llevar a /employees/all en el futuro
    { icon: Clock, label: 'Asistencias', href: '/attendance-list', module: 'attendance' },
    { icon: FileText, label: 'Solicitudes', href: '/requests', module: 'requests' },
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
        { label: 'Roles y Permisos', icon: Shield, href: '/roles' },
        { label: 'Gestión de Cargos', icon: Briefcase, href: '/positions' }
      ]
    },
  ]

  // Filtrado de Menú por RBAC
  const visibleMenuItems = menuItems.reduce((acc, item) => {
    // 1. Verificar si es Admin o tiene permisos de comodín (*)
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER ADMIN' || (user?.permissions && user?.permissions['*']);
    
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

    // Cálculo de indentación dinámica
    const paddingLeft = level === 0 ? 'px-3' : level === 1 ? 'pl-10 pr-3' : 'pl-14 pr-3'

    // Si tiene submenú es un botón toggle, si no es un Link
    const Component = hasSubmenu ? 'button' : Link
    const props = hasSubmenu
      ? { onClick: () => toggleMenu(item.label), type: 'button' }
      : { to: item.href } // Link usa 'to', no 'href'

    return (
      <div className="w-full">
        <Component
          {...props}
          className={`
            w-full flex items-center gap-3 py-2.5 text-gray-600 rounded-lg transition-colors group relative
            ${paddingLeft}
            ${isCollapsed && level === 0 ? 'justify-center px-0' : ''}
            ${hasSubmenu && isExpanded ? 'text-blue-600 bg-blue-50' : 'hover:bg-blue-50 hover:text-blue-600'}
          `}
          title={isCollapsed ? item.label : ''}
        >
          {Icon && (
            <Icon
              size={level === 0 ? 22 : 18}
              className={`
                ${level === 0 ? 'min-w-[22px]' : 'min-w-[18px]'} 
                ${isExpanded ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600'}
              `}
            />
          )}

          {!isCollapsed && (
            <>
              <span className={`font-medium whitespace-nowrap flex-1 text-left ${level > 0 ? 'text-sm' : ''}`}>
                {item.label}
              </span>
              {hasSubmenu && (
                <span className="text-gray-400">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
              )}
            </>
          )}
        </Component>

        {/* Renderizado Recursivo del Submenú */}
        {!isCollapsed && hasSubmenu && isExpanded && (
          <div className="space-y-1 mt-1">
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
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-30 h-screen bg-white border-r border-gray-200 transition-all duration-300 ease-in-out overflow-y-auto overflow-x-hidden scrollbar-hide
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        <div className="flex flex-col min-h-full">
          {/* Header del Sidebar */}
          <div className={`flex items-center h-16 px-4 border-b border-gray-100 sticky top-0 bg-white z-10 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isCollapsed && <span className="text-xl font-bold text-blue-600 whitespace-nowrap">PAUSER RRHH</span>}

            <div className="flex items-center">
              {/* Botón colapsar (Desktop) */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
              >
                {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
              </button>

              {/* Botón cerrar (Móvil) */}
              <button
                onClick={() => setIsOpen(false)}
                className="lg:hidden p-1 ml-2 rounded-md hover:bg-gray-100 text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Menú de Navegación */}
          <nav className="flex-1 px-3 py-6 space-y-1">
            {visibleMenuItems.map((item, index) => (
              <MenuItem key={index} item={item} level={0} />
            ))}
          </nav>

          {/* Footer del Sidebar (Usuario y Logout) */}
          <div className="p-3 border-t border-gray-100 mt-auto sticky bottom-0 bg-white">
            <div className={`flex items-center gap-3 px-2 py-2 mb-2 rounded-lg bg-gray-50 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-8 h-8 min-w-[32px] rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.email}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={signOut}
              className={`
                w-full flex items-center gap-3 px-2 py-2 text-red-600 rounded-lg hover:bg-red-50 transition-colors
                ${isCollapsed ? 'justify-center' : ''}
              `}
              title={isCollapsed ? 'Cerrar Sesión' : ''}
            >
              <LogOut size={20} className="min-w-[20px]" />
              {!isCollapsed && <span className="font-medium whitespace-nowrap">Salir</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
