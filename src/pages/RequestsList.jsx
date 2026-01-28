import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRequests, updateRequestStatus } from '../services/requests'
import { useAuth } from '../context/AuthContext'
import { createRoot } from 'react-dom/client'
import { PapeletaTemplate } from '../components/PapeletaTemplate'
import html2pdf from 'html2pdf.js'
import { supabase } from '../lib/supabase'
import { 
  FileText, 
  Search, 
  Printer, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react'

// --- FUNCIONES DE FORMATEO PARA PDF ---
const formatDate = (dateString) => {
  if (!dateString) return '26/01/2026'
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatLongDate = (date) => {
  const months = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]
  return `${date.getDate()} DE ${months[date.getMonth()]} DE ${date.getFullYear()}`
}

export default function RequestsList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    setLoading(true)
    const { data, error } = await getRequests()
    if (!error) {
      setRequests(data || [])
    }
    setLoading(false)
  }

  // --- FUNCIÓN GENERAR Y SUBIR PDF ---
  const generateAndUploadPDF = async (request) => {
    const employee = request.employees || {}
    const employeeName = (employee.full_name || '').toUpperCase()
    const employeeDni = employee.dni || '00000000'
    const emissionDate = new Date()

    const renderData = {
      employer: {
        nombre: "PAUSER DISTRIBUCIONES S.A.C.",
        ruc: "20600869940",
        domicilio: "JR. PEDRO MUÑIZ NRO. 253 DPTO. 1601 SEC. JORGE CHAVEZ LA LIBERTAD - TRUJILLO",
        representante: "GIANCARLO URBINA GAITAN",
        dni_representante: "18161904"
      },
      employee: {
        name: employeeName,
        dni: employeeDni,
        position: (employee.position || '').toUpperCase(),
        sede: (employee.sede || 'TRUJILLO').toUpperCase()
      },
      flags: {
        isPersonal: !request.request_type?.includes('VACACIONES') && !request.request_type?.includes('SALUD'),
        isSalud: request.request_type?.includes('SALUD') || request.request_type?.includes('MEDICO'),
        isVacaciones: request.request_type?.includes('VACACIONES')
      },
      dates: {
        emission: emissionDate,
        formattedStart: formatDate(request.start_date),
        formattedEnd: formatDate(request.end_date),
        formattedEmission: formatLongDate(emissionDate)
      }
    }

    // Crear contenedor temporal
    // ESTRATEGIA FIX: No usar coordenadas negativas lejanas ni display none.
    // Usar fixed en pantalla pero detrás de todo (z-index negativo) para asegurar renderizado.
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.left = '0'
    container.style.top = '0'
    container.style.zIndex = '-9999' // Detrás de todo
    container.style.width = '210mm'
    container.style.minHeight = '297mm'
    container.style.backgroundColor = '#ffffff'
    document.body.appendChild(container)

    // Renderizar template
    const root = createRoot(container)
    
    // Renderizamos DOS copias (Empresa y Empleado) como en la vista de impresión
    root.render(
      <div className="p-[5mm] text-black bg-white w-full h-full" style={{ color: 'black', background: 'white' }}>
        <PapeletaTemplate data={renderData} copyType="EMPRESA" />
        <div className="w-full border-b-2 border-dashed border-gray-300 my-4" style={{ borderColor: '#d1d5db', borderBottomWidth: '2px', borderStyle: 'dashed', margin: '1rem 0' }} />
        <PapeletaTemplate data={renderData} copyType="EMPLEADO" />
      </div>
    )

    // AUMENTAR TIEMPO DE ESPERA para asegurar renderizado completo
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Configurar html2pdf con método "limpio" (sin estilos computados complejos)
    const opt = {
      margin: 10,
      filename: `Papeleta_${employeeDni}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        // IMPORTANTE: Permitir logging para depurar si sigue blanco
        logging: true,
        // Asegurar fondo blanco explícito
        backgroundColor: '#ffffff'
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }

    try {
      // SOLUCIÓN DEFINITIVA OKLCH: 
      // Si html2pdf falla, usamos un fallback manual o evitamos estilos conflictivos
      // El error oklch viene de Tailwind en navegadores modernos.
      // Vamos a "limpiar" el contenedor antes de pasarlo a html2pdf
      
      // Opción: Inyectar estilos explícitos para sobreescribir variables CSS globales
      container.style.color = '#000000';
      container.style.backgroundColor = '#ffffff';

      // HACK DEFINITIVO PARA OKLCH:
      // El problema es que Tailwind v4 usa 'oklch' en sus variables CSS por defecto.
      // html2canvas intenta leer todas las reglas CSS y falla al parsear 'oklch'.
      // Solución: Usar un iframe limpio sin el CSS global de Tailwind, e inyectar solo los estilos necesarios.
      // O MÁS FÁCIL: Inyectar un estilo que redefina los colores problemáticos a valores seguros antes de generar.
      
      const stylePatch = document.createElement('style');
      stylePatch.innerHTML = `
        * { 
          border-color: #e5e7eb !important; 
          --tw-border-opacity: 1 !important;
        }
      `;
      container.appendChild(stylePatch);

      // Desactivar temporalmente la lectura de hojas de estilo externas si es posible
      // html2canvas options: { logging: false, removeContainer: false }
      
      // Generar Blob
      const pdfBlob = await html2pdf().set(opt).from(container).output('blob')
      
      // Limpiar
      root.unmount()
      document.body.removeChild(container)

      // Subir a Supabase Storage
      const fileName = `papeletas/${employeeDni}_${request.id}_${Date.now()}.pdf`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('papeletas') // Asegúrate de crear este bucket en Supabase
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Obtener URL Pública
      const { data: publicUrlData } = supabase.storage
        .from('papeletas')
        .getPublicUrl(fileName)

      return publicUrlData.publicUrl

    } catch (error) {
       console.error("Error fatal generando PDF:", error);
       // Limpiar en caso de error si no se limpió antes
       if (document.body.contains(container)) {
         root.unmount();
         document.body.removeChild(container);
       }
       throw error;
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    if (!confirm(`¿Estás seguro de cambiar el estado a ${newStatus}?`)) return

    setProcessingId(id)
    try {
      let pdfUrl = null;

      // Si se APRUEBA, generamos el PDF primero
      if (newStatus === 'APROBADO') {
        const request = requests.find(r => r.id === id)
        if (request) {
          try {
            pdfUrl = await generateAndUploadPDF(request)
          } catch (err) {
            console.error('Error generando PDF:', err)
            alert('Error generando el PDF, pero se intentará aprobar. ' + err.message)
          }
        }
      }

      // Actualizar estado y URL en BD
      // Nota: updateRequestStatus debe aceptar un objeto extra o modificarse
      const { error } = await supabase
        .from('vacation_requests')
        .update({ 
          status: newStatus,
          validated_by: user?.id,
          validated_at: new Date().toISOString(),
          pdf_url: pdfUrl // Guardamos la URL generada
        })
        .eq('id', id)
      
      if (error) throw error

      // Actualizar localmente
      setRequests(prev => prev.map(req => 
        req.id === id ? { ...req, status: newStatus, pdf_url: pdfUrl } : req
      ))

    } catch (error) {
      console.error(error)
      alert('Error al actualizar el estado: ' + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'APROBADO':
        return <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium"><CheckCircle size={12} /> Aprobado</span>
      case 'RECHAZADO':
        return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-medium"><XCircle size={12} /> Rechazado</span>
      default:
        return <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full text-xs font-medium"><Clock size={12} /> Pendiente</span>
    }
  }

  const filteredRequests = requests.filter(req => {
    const employeeName = req.employees?.full_name || 'Desconocido'
    const employeeDni = req.employees?.dni || ''
    
    const matchesSearch = 
      employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employeeDni.includes(searchTerm)
    
    const matchesStatus = filterStatus === 'ALL' || req.status === filterStatus

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-blue-600" />
            Solicitudes de Vacaciones
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestiona e imprime las papeletas de vacaciones y permisos
          </p>
        </div>
        <button 
          onClick={fetchRequests}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar por empleado o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Todos los estados</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="APROBADO">Aprobados</option>
            <option value="RECHAZADO">Rechazados</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Empleado</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo / Motivo</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fechas</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      Cargando solicitudes...
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No se encontraron solicitudes
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                          {req.employees?.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{req.employees?.full_name || 'Empleado no encontrado'}</p>
                          <p className="text-xs text-gray-500">{req.employees?.position || 'Sin cargo'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{req.request_type || 'Solicitud'}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]" title={req.notes || req.reason}>
                        {req.notes || req.reason || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <p>Desde: {new Date(req.start_date + 'T00:00:00').toLocaleDateString('es-PE')}</p>
                        <p>Hasta: {new Date(req.end_date + 'T00:00:00').toLocaleDateString('es-PE')}</p>
                        <p className="text-xs text-gray-500 mt-1">({req.total_days} días)</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {req.status === 'PENDIENTE' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(req.id, 'APROBADO')}
                              disabled={processingId === req.id}
                              className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                              title="Aprobar"
                            >
                              <ThumbsUp size={16} />
                            </button>
                            <button
                              onClick={() => handleStatusChange(req.id, 'RECHAZADO')}
                              disabled={processingId === req.id}
                              className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                              title="Rechazar"
                            >
                              <ThumbsDown size={16} />
                            </button>
                          </>
                        )}
                        
                        <button 
                          onClick={() => navigate(`/papeleta/${req.id}`)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 transition-all text-sm font-medium shadow-sm"
                          title="Ver Papeleta"
                        >
                          <Printer size={16} />
                          <span className="hidden sm:inline">Papeleta</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
