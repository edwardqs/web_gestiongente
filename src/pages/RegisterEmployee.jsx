import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { createEmployee, getEmployeeById, updateEmployee } from '../services/employees'
import { getLocations, getDepartmentsByLocation, getPositionsByLocationAndDept } from '../services/structure'
import { Save, User, Phone, Mail, MapPin, Briefcase, Calendar, FileText, Store, Users } from 'lucide-react'

export default function RegisterEmployee() {
  const navigate = useNavigate()
  const { id } = useParams() 
  const [searchParams] = useSearchParams()
  const isEditing = Boolean(id) 

  const initialSede = searchParams.get('sede') || ''
  const initialBusiness = searchParams.get('business') || ''

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  
  // Listas dinámicas
  const [locationsList, setLocationsList] = useState([])
  const [departmentsList, setDepartmentsList] = useState([])
  const [positionsList, setPositionsList] = useState([])

  const [formData, setFormData] = useState({
    sede: initialSede,
    business_unit: initialBusiness,
    location_id: null,
    department_id: null,
    dni: '',
    full_name: '',
    entry_date: '',
    position: '',
    job_position_id: null,
    role_id: '', // Mantenemos role_id como job_position_id por compatibilidad, pero en UI se usa como select value
    phone: '',
    email: '',
    birth_date: '',
    address: '',
    employee_type: ''
  })

  // 1. Cargar Sedes (Locations) al inicio
  useEffect(() => {
    const fetchLocations = async () => {
        const { data } = await getLocations()
        if (data) setLocationsList(data)
    }
    fetchLocations()
  }, [])

  // 2. Cargar Departamentos cuando cambia la Sede (o al cargar datos)
  useEffect(() => {
    if (formData.sede && locationsList.length > 0) {
        const selectedLoc = locationsList.find(l => l.name === formData.sede)
        if (selectedLoc) {
            // Actualizar ID si no está
            if (!formData.location_id) {
                setFormData(prev => ({ ...prev, location_id: selectedLoc.id }))
            }
            // Cargar departamentos
            getDepartmentsByLocation(selectedLoc.id).then(({ data }) => {
                if (data) setDepartmentsList(data)
            })
        }
    } else {
        setDepartmentsList([])
    }
  }, [formData.sede, locationsList])

  // 3. Cargar Posiciones cuando cambia Departamento (o al cargar datos)
  useEffect(() => {
    if (formData.location_id && formData.business_unit && departmentsList.length > 0) {
        const selectedDept = departmentsList.find(d => d.name === formData.business_unit)
        if (selectedDept) {
             if (!formData.department_id) {
                setFormData(prev => ({ ...prev, department_id: selectedDept.id }))
             }
             getPositionsByLocationAndDept(formData.location_id, selectedDept.id).then(({ data }) => {
                 if (data) setPositionsList(data)
             })
        }
    } else {
        setPositionsList([])
    }
  }, [formData.location_id, formData.business_unit, departmentsList])


  // Cargar datos si estamos en modo edición
  useEffect(() => {
    if (isEditing) {
      loadEmployeeData()
    }
  }, [id])

  // Actualizar formData si cambian los parámetros de URL
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
          location_id: data.location_id || null, // Si existe en DB
          department_id: data.department_id || null, // Si existe en DB
          employee_type: data.employee_type || '',
          dni: data.dni || '',
          full_name: data.full_name || '',
          entry_date: data.entry_date || '',
          position: data.position || '',
          job_position_id: data.job_position_id || null,
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

  const handleChange = (e) => {
    const { name, value } = e.target
    
    if (name === 'sede') {
      // Buscar ID de la sede seleccionada
      const selectedLoc = locationsList.find(l => l.name === value)
      setFormData(prev => ({ 
        ...prev, 
        sede: value,
        location_id: selectedLoc ? selectedLoc.id : null,
        business_unit: '', // Reset negocio
        department_id: null,
        position: '', // Reset puesto
        job_position_id: null,
        role_id: ''
      }))
    } else if (name === 'business_unit') {
      const selectedDept = departmentsList.find(d => d.name === value)
      setFormData(prev => ({ 
        ...prev, 
        business_unit: value,
        department_id: selectedDept ? selectedDept.id : null,
        position: '', // Reset puesto
        job_position_id: null,
        role_id: ''
      }))
    } else if (name === 'role_id') {
       // value es el ID del job_position
       const selectedPos = positionsList.find(r => r.id.toString() === value)
       setFormData(prev => ({
           ...prev,
           role_id: value, // Guardamos value en role_id TEMPORALMENTE para que el Select refleje la selección visualmente
           job_position_id: value, // Guardamos ID del cargo real
           position: selectedPos ? selectedPos.name : '', // Guardamos Nombre
           employee_type: selectedPos ? selectedPos.employee_type : '' // Auto-asignar tipo
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
      const dataToSave = {
        ...formData,
        role_id: null // Forzamos null en role_id para evitar conflictos de Foreign Key con la tabla 'roles'
      }
      
      // Eliminar employee_type si existe, ya que no es columna de employees (está en job_positions)
      delete dataToSave.employee_type

      if (isEditing) {
        await updateEmployee(id, dataToSave)
        setSuccess(true)
      } else {
        await createEmployee(dataToSave)
        setSuccess(true)
        // Reset form (opcional)
        setFormData({
            ...formData,
            dni: '', full_name: '', phone: '', email: '', 
            position: '', job_position_id: null, role_id: null
        })
      }
    } catch (err) {
      console.error(err)
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
                {locationsList.map(loc => (
                  <option key={loc.id} value={loc.name}>{loc.name}</option>
                ))}
              </select>
            </div>

            {/* Unidad de Negocio (Dinámica) */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Store size={16} className="text-blue-500" /> Unidad de Negocio
              </label>
              <select
                name="business_unit"
                value={formData.business_unit}
                onChange={handleChange}
                required
                disabled={!formData.sede}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50 disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">Seleccione negocio</option>
                {departmentsList.map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
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

            {/* Puesto (Seleccionable Dinámicamente) */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Briefcase size={16} className="text-blue-500" /> Puesto / Cargo
              </label>
              <select
                name="role_id"
                value={formData.role_id || ''}
                onChange={handleChange}
                required
                disabled={!formData.business_unit}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50 disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">Seleccione un puesto</option>
                {positionsList.map(pos => (
                  <option key={pos.id} value={pos.id}>{pos.name}</option>
                ))}
              </select>
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
              className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
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
