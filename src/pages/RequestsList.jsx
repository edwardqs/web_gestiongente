import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRequests } from '../services/requests'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Modal from '../components/ui/Modal'
import * as html2pdfPkg from 'html2pdf.js'
import { supabase } from '../lib/supabase'

const html2pdf = html2pdfPkg.default || html2pdfPkg

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

// --- FUNCIONES DE FORMATEO ---
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
  const { showToast } = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [processingId, setProcessingId] = useState(null)
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null })

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

  // --- FUNCIÓN GENERAR Y SUBIR PDF (VERSIÓN ROBUSTA IFRAME) ---
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

    // 1. Crear contenedor IFRAME aislado para evitar conflictos CSS
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '0';
    iframe.style.top = '0';
    iframe.style.width = '210mm';
    iframe.style.minHeight = '297mm';
    iframe.style.zIndex = '-9999';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    // 2. Escribir HTML puro en el iframe
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(generatePapeletaHTML(renderData));
    doc.close();

    // 3. Esperar carga de recursos (imágenes, fuentes)
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      // 4. Configurar html2pdf
      const opt = {
        margin: 10,
        filename: `Papeleta_${employeeDni}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: true,
          windowWidth: 794, // A4 width in px at 96dpi approx
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }

      // 5. Generar desde el BODY del iframe
      const pdfBlob = await html2pdf().set(opt).from(doc.body).output('blob');

      // 6. Subir a Supabase
      const fileName = `papeletas/${employeeDni}_${request.id}_${Date.now()}.pdf`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('papeletas')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false
        })

      if (uploadError) throw uploadError

      // 7. Obtener URL
      const { data: publicUrlData } = supabase.storage
        .from('papeletas')
        .getPublicUrl(fileName)

      return publicUrlData.publicUrl

    } catch (error) {
      console.error("Error fatal generando PDF:", error);
      throw error;
    } finally {
      // Limpiar siempre
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }
  }

  // Helper para generar HTML string (Sin dependencias de React)
  const generatePapeletaHTML = (data) => {
    const { employer, employee, flags, dates } = data;

    // Estilos CSS Inline para asegurar renderizado exacto
    const styles = `
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: white; color: black; }
        .container { border: 3px solid black; background: white; width: 100%; max-width: 800px; margin: 0 auto; }
        .header { border-bottom: 3px solid black; padding: 5px; text-align: center; background: #f9fafb; }
        .title { font-size: 20px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin: 0; }
        
        .section { display: flex; border-bottom: 2px solid black; }
        .letter-box { width: 40px; border-right: 2px solid black; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 24px; }
        .content { flex: 1; }
        
        .row { display: flex; border-bottom: 1px solid black; }
        .row:last-child { border-bottom: none; }
        
        .label { width: 100px; padding: 4px; font-weight: bold; border-right: 1px solid black; font-size: 11px; display: flex; align-items: center; }
        .value { padding: 4px; font-weight: bold; color: #1e40af; font-size: 11px; flex: 1; }
        
        .sub-row { width: 50%; display: flex; border-right: 1px solid black; }
        .sub-row:last-child { border-right: none; }
        .sub-label { width: 60px; padding: 4px; font-weight: bold; border-right: 1px solid black; font-size: 10px; }
        .sub-value { padding: 4px; font-size: 10px; }
        
        .date-box { display: flex; align-items: center; gap: 10px; }
        .date-label { font-size: 9px; font-weight: bold; color: #2563eb; text-align: right; line-height: 1.1; }
        .date-value { border: 2px solid black; padding: 4px 12px; font-size: 16px; font-weight: 900; background: white; }
        
        .check-group { display: flex; justify-content: space-between; padding: 5px 20px; }
        .check-item { display: flex; align-items: center; gap: 5px; }
        .check-label { font-weight: bold; font-size: 10px; }
        .check-box { width: 16px; height: 16px; border: 1px solid black; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12px; }
        
        .footer-info { padding: 10px 20px; }
        .date-line { font-weight: bold; font-size: 10px; text-transform: uppercase; margin-bottom: 20px; }
        
        .signatures { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; margin-bottom: 10px; }
        .sig-block { flex: 1; text-align: center; }
        .sig-line { border-top: 1px dotted black; padding-top: 4px; }
        .sig-name { font-weight: bold; font-size: 9px; margin: 0; }
        .sig-dni { font-size: 8px; margin: 0; }
        
        .fingerprint { border: 1px solid black; width: 60px; height: 80px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 4px; background: white; }
        .fp-label { font-size: 6px; color: #9ca3af; }
        .fp-circle { width: 30px; height: 30px; border-radius: 50%; border: 1px solid #e5e7eb; }
        
        .page-footer { border-top: 3px solid black; height: 30px; display: flex; align-items: center; }
        .brand { flex: 1; padding: 0 20px; display: flex; align-items: center; gap: 10px; }
        .brand-text { font-size: 12px; font-weight: 900; }
        .brand-sub { font-size: 8px; font-weight: bold; color: #6b7280; }
        .copy-type { border-left: 3px solid black; padding: 0 20px; height: 100%; display: flex; align-items: center; background: #f3f4f6; font-size: 9px; font-weight: 900; font-style: italic; text-transform: uppercase; }
        
        .divider { width: 100%; border-bottom: 2px dashed #d1d5db; margin: 20px 0; }
      </style>
    `;

    // Template para una copia
    const renderCopy = (type) => `
      <div class="container">
        <div class="header"><h1 class="title">PAPELETA DE VACACIONES</h1></div>
        
        <!-- A -->
        <div class="section">
          <div class="letter-box">A</div>
          <div class="content">
            <div class="row"><div class="label">EL EMPLEADOR</div><div class="value">${employer.nombre}</div></div>
            <div class="row">
              <div class="sub-row"><div class="sub-label">con RUC</div><div class="sub-value">${employer.ruc}</div></div>
              <div class="sub-row" style="flex:1"><div class="sub-label">Domicilio</div><div class="sub-value" style="font-size:8px">${employer.domicilio}</div></div>
            </div>
            <div class="row" style="border:none"><div class="label">Representante</div><div class="value" style="color:black; font-weight:normal; font-size:10px">${employer.representante} (DNI: ${employer.dni_representante})</div></div>
          </div>
        </div>

        <!-- B -->
        <div class="section">
          <div class="letter-box">B</div>
          <div class="content">
            <div class="row"><div class="label">EL TRABAJADOR</div><div class="value">${employee.name}</div></div>
            <div class="row">
              <div class="sub-row"><div class="sub-label">DNI Nº</div><div class="value">${employee.dni}</div></div>
              <div class="sub-row" style="flex:1"><div class="sub-label">CARGO</div><div class="value" style="color:black">${employee.position}</div></div>
            </div>
            <div class="row" style="justify-content: space-around; padding: 8px; border:none">
              <div class="date-box">
                <div class="date-label">FECHA DE<br>SALIDA</div>
                <div class="date-value">${dates.formattedStart}</div>
              </div>
              <div class="date-box">
                <div class="date-label">FECHA DE<br>RETORNO</div>
                <div class="date-value">${dates.formattedEnd}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- C -->
        <div class="section">
          <div class="letter-box">C</div>
          <div class="content">
            <div class="row" style="background:#f9fafb"><div class="label">MOTIVO</div><div class="value" style="color:#6b7280; font-weight:normal; font-style:italic">Seleccione el tipo</div></div>
            <div class="check-group">
              <div class="check-item"><span class="check-label">PERSONALES</span><div class="check-box">${flags.isPersonal ? 'X' : ''}</div></div>
              <div class="check-item"><span class="check-label">SALUD</span><div class="check-box">${flags.isSalud ? 'X' : ''}</div></div>
              <div class="check-item"><span class="check-label">VACACIONES</span><div class="check-box">${flags.isVacaciones ? 'X' : ''}</div></div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer-info">
          <div class="date-line">${employee.sede}, ${dates.formattedEmission}</div>
          <div class="signatures">
            <div class="sig-block"><div style="height:30px"></div><div class="sig-line"><p class="sig-name">${employer.representante}</p><p class="sig-dni">DNI: ${employer.dni_representante}</p></div></div>
            <div class="sig-block"><div style="height:30px"></div><div class="sig-line"><p class="sig-name" style="color:#1e3a8a">${employee.name}</p><p class="sig-dni">DNI: ${employee.dni}</p></div></div>
            <div class="fingerprint">
              <span class="fp-label">HUELLA</span>
              <div class="fp-circle"></div>
              <span class="fp-label" style="text-align:center">INDICE DERECHO</span>
            </div>
          </div>
        </div>

        <div class="page-footer">
          <div class="brand"><span class="brand-text">PAUSER</span><span style="color:#9ca3af">|</span><span class="brand-sub">RECURSOS HUMANOS</span></div>
          <div class="copy-type">COPIA ${type}</div>
        </div>
      </div>
    `;

    return `
      <!DOCTYPE html>
      <html>
      <head>${styles}</head>
      <body>
        ${renderCopy('EMPRESA')}
        <div class="divider"></div>
        ${renderCopy('EMPLEADO')}
      </body>
      </html>
    `;
  }

  const openStatusModal = (id, newStatus) => {
    setModalConfig({
      isOpen: true,
      title: newStatus === 'APROBADO' ? 'Aprobar Solicitud' : 'Rechazar Solicitud',
      message: `¿Estás seguro de cambiar el estado a ${newStatus}?`,
      type: newStatus === 'APROBADO' ? 'info' : 'warning',
      confirmText: newStatus === 'APROBADO' ? 'Aprobar' : 'Rechazar',
      onConfirm: () => handleStatusChange(id, newStatus)
    })
  }

  const handleStatusChange = async (id, newStatus) => {
    setModalConfig(prev => ({ ...prev, isOpen: false }))
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
            showToast('Error generando el PDF, pero se intentará aprobar. ' + err.message, 'warning')
          }
        }
      }

      // Actualizar estado y URL en BD
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
      
      showToast(`Solicitud ${newStatus.toLowerCase()} correctamente`, 'success')

    } catch (error) {
      console.error(error)
      showToast('Error al actualizar el estado: ' + error.message, 'error')
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-blue-600" />
            Solicitudes
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestiona permisos, licencias y vacaciones
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium w-full md:w-auto"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Filtros - Grid Layout Robusto */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Barra de Búsqueda */}
        <div className="md:col-span-8 lg:col-span-9 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por empleado o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        
        {/* Filtro de Estado */}
        <div className="md:col-span-4 lg:col-span-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-all"
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
                              onClick={() => openStatusModal(req.id, 'APROBADO')}
                              disabled={processingId === req.id}
                              className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                              title="Aprobar"
                            >
                              <ThumbsUp size={16} />
                            </button>
                            <button
                              onClick={() => openStatusModal(req.id, 'RECHAZADO')}
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

      <Modal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.onConfirm}
        showCancel
      />
    </div>
  )
}