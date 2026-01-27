import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { createEmployee, getEmployeeById, updateEmployee } from '../services/employees'
import { getRoles } from '../services/roles'
import { Save, User, Phone, Mail, MapPin, Briefcase, Calendar, FileText, Store, Users } from 'lucide-react'

export default function RegisterEmployee() {
  const navigate = useNavigate()
  const { id } = useParams() 
  const [searchParams] = useSearchParams() // Hook para leer parámetros de URL
  const isEditing = Boolean(id) 

  // Capturar parámetros para pre-llenado (Solo si NO es edición)
  const initialSede = searchParams.get('sede') || ''
  const initialBusiness = searchParams.get('business') || ''

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  
  const [roles, setRoles] = useState([])

  const [formData, setFormData] = useState({
    sede: initialSede, // Pre-llenar sede
    business_unit: initialBusiness, // Pre-llenar negocio
    employee_type: '', 
    dni: '',
    full_name: '',
    entry_date: '',
    position: '',
    role_id: '',
    phone: '',
    email: '',
    birth_date: '',
    address: ''
  })

  // Cargar Roles al inicio
  useEffect(() => {
    const fetchRoles = async () => {
        const { data } = await getRoles()
        if (data) {
            // Filtrar roles excluidos
            const filtered = data.filter(r => 
                r.name.toUpperCase() !== 'ADMINISTRADOR' && 
                r.name.toUpperCase() !== 'JEFE DE AREA DE GENTE Y GESTION'
            )
            setRoles(filtered)
        }
    }
    fetchRoles()
  }, [])

  // Cargar datos si estamos en modo edición
  useEffect(() => {
    if (isEditing) {
      loadEmployeeData()
    }
  }, [id])

  // Actualizar formData si cambian los parámetros de URL (y no estamos editando)
  useEffect(() => {
    if (!isEditing && (initialSede || initialBusiness)) {
      setFormData(prev => ({
        ...prev,
        sede: initialSede,
        business_unit: initialBusiness
      }))
    }
  }, [initialSede, initialBusiness, isEditing])

  const loadEmployeeData = async () => {
    setLoading(true)
    try {
      const { data, error } = await getEmployeeById(id)
      if (error) throw error
      if (data) {
        setFormData({
          sede: data.sede || '',
          business_unit: data.business_unit || '',
          employee_type: data.employee_type || '',
          dni: data.dni || '',
          full_name: data.full_name || '',
          entry_date: data.entry_date || '',
          position: data.position || '',
          role_id: data.role_id || '',
          phone: data.phone || '',
          email: data.email || '',
          birth_date: data.birth_date || '',
          address: data.address || ''
        })
      }
    } catch (err) {
      setError('Error al cargar datos del empleado: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Configuración de Sedes y sus Negocios
  const locationsConfig = {
    'TRUJILLO': ['SNACKS', 'OPL'],
    'CHIMBOTE': ['BEBIDAS', 'SNACKS'],
    'HUARAZ': ['BEBIDA', 'PURINA'],
    'HUACHO': [],
    'CHINCHA': [],
    'ICA': [],
    'DESAGUADERO': [],
    'LIMA': [],
    'ADM. CENTRAL': []
  }

  const sedes = Object.keys(locationsConfig)
  const employeeTypes = ['ADMINISTRATIVO', 'OPERATIVO', 'COMERCIAL']
  
  const availableBusinesses = formData.sede ? locationsConfig[formData.sede] || [] : []

  const handleChange = (e) => {
    const { name, value } = e.target
    
    if (name === 'sede') {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        business_unit: '' 
      }))
    } else if (name === 'role_id') {
       // Manejo especial para el rol: actualiza role_id y position
       const selectedRole = roles.find(r => r.id.toString() === value)
       setFormData(prev => ({
           ...prev,
           role_id: value,
           position: selectedRole ? selectedRole.name : ''
       }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleCancel = () => {
    navigate(-1) 
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      if (isEditing) {
        // Actualizar
        const { error } = await updateEmployee(id, formData)
        if (error) throw error
        setSuccess(true)
        setTimeout(() => navigate(-1), 1500)
      } else {
        // Crear
        const { error } = await createEmployee(formData)
        if (error) throw error
        setSuccess(true)
        
        // Limpiar form pero MANTENER la sede/negocio actuales para seguir registrando rápido
        setFormData(prev => ({
          ...prev,
          dni: '',
          full_name: '',
          entry_date: '',
          position: '',
          role_id: '',
          phone: '',
          email: '',
          birth_date: '',
          address: ''
          // sede y business_unit se mantienen
        }))
        setTimeout(() => setSuccess(false), 3000)
      }

    } catch (err) {
      setError(err.message || 'Error al guardar empleado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isEditing ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isEditing ? 'Modifique los datos necesarios del personal.' : 'Complete todos los campos para dar de alta al personal.'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {success && (
          <div className="bg-green-50 text-green-700 p-4 border-b border-green-100 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-600"></div>
            {isEditing ? 'Datos actualizados correctamente.' : 'Empleado registrado exitosamente.'}
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 p-4 border-b border-red-100 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-600"></div>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Sede */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <MapPin size={16} className="text-blue-500" /> Sede / Ciudad
              </label>
              <select
                name="sede"
                value={formData.sede}
                onChange={handleChange}
                required
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
              >
                <option value="">Seleccione una sede</option>
                {sedes.map(sede => (
                  <option key={sede} value={sede}>{sede}</option>
                ))}
              </select>
            </div>

            {/* Unidad de Negocio (Condicional) */}
            {availableBusinesses.length > 0 ? (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Store size={16} className="text-blue-500" /> Unidad de Negocio
                </label>
                <select
                  name="business_unit"
                  value={formData.business_unit}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
                >
                  <option value="">Seleccione negocio</option>
                  {availableBusinesses.map(business => (
                    <option key={business} value={business}>{business}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="hidden md:block"></div>
            )}

            {/* Tipo de Personal */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Users size={16} className="text-blue-500" /> Tipo de Personal
              </label>
              <select
                name="employee_type"
                value={formData.employee_type}
                onChange={handleChange}
                required
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
              >
                <option value="">Seleccione tipo</option>
                {employeeTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* DNI */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileText size={16} className="text-blue-500" /> DNI
              </label>
              <input
                type="text"
                name="dni"
                value={formData.dni}
                onChange={handleChange}
                maxLength={8}
                pattern="\d{8}"
                placeholder="12345678"
                required
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Apellidos y Nombres */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <User size={16} className="text-blue-500" /> Apellidos y Nombres
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="PEREZ LOPEZ JUAN CARLOS"
                required
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase"
              />
            </div>

            {/* Fecha de Ingreso */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Calendar size={16} className="text-blue-500" /> Fecha de Ingreso
              </label>
              <input
                type="date"
                name="entry_date"
                value={formData.entry_date}
                onChange={handleChange}
                required
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Puesto (Seleccionable) */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Briefcase size={16} className="text-blue-500" /> Puesto / Cargo
              </label>
              <select
                name="role_id"
                value={formData.role_id}
                onChange={handleChange}
                required
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
              >
                <option value="">Seleccione un puesto</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
              {/* Input oculto para mantener compatibilidad si algo falla */}
              <input type="hidden" name="position" value={formData.position} />
            </div>

            {/* Celular */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Phone size={16} className="text-blue-500" /> Celular
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="999888777"
                required
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Correo Corporativo */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Mail size={16} className="text-blue-500" /> Correo Corporativo
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="usuario@pauserdistribuciones.com"
                required
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Cumpleaños */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Calendar size={16} className="text-blue-500" /> Cumpleaños
              </label>
              <input
                type="date"
                name="birth_date"
                value={formData.birth_date}
                onChange={handleChange}
                required
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Dirección */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <MapPin size={16} className="text-blue-500" /> Dirección
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Calle, Número, Distrito, Provincia"
                required
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase"
              />
            </div>

          </div>

          {/* Footer del Formulario */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`
                flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm
                ${loading ? 'opacity-70 cursor-not-allowed' : ''}
              `}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Save size={18} />
              )}
              {isEditing ? 'Actualizar Empleado' : 'Guardar Empleado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
