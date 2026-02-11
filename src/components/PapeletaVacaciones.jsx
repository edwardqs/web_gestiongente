import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPapeletaById, getSigningAuthority } from '../services/requests'
import { Printer, Mail, Send } from 'lucide-react'
import pauserLogo from '../assets/pauser_logo.png'
import * as html2pdfPkg from 'html2pdf.js'

const html2pdf = html2pdfPkg.default || html2pdfPkg

const formatDate = (dateString) => {
  if (!dateString) return '26/01/2026'
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatLongDate = (date) => {
  const months = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]
  return `${date.getDate()} DE ${months[date.getMonth()]} DE ${date.getFullYear()}`
}

import { PapeletaTemplate } from './PapeletaTemplate'

const PapeletaFinal = () => {
  const { id } = useParams()
  const [papeleta, setPapeleta] = useState(null)
  const [signer, setSigner] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)

  const EMPLOYER_DATA = {
    nombre: "PAUSER DISTRIBUCIONES S.A.C.",
    ruc: "20600869940",
    domicilio: "JR. PEDRO MUÑIZ NRO. 253 DPTO. 1601 SEC. JORGE CHAVEZ LA LIBERTAD - TRUJILLO",
    representante: signer?.full_name || "GIANCARLO URBINA GAITAN",
    dni_representante: signer?.dni || "18161904"
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!id) { setLoading(false); return; }
      setLoading(true)
      try {
        const { data, error } = await getPapeletaById(id)
        if (error) throw new Error(error.message)
        setPapeleta(data)

        // Obtener responsable de firma dinámicamente
        if (data?.employee_id) {
            const { data: signerData } = await getSigningAuthority(data.employee_id)
            if (signerData) setSigner(signerData)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) return <div>Cargando...</div>
  if (error) return <div>Error: {error}</div>

  const safePapeleta = papeleta || {}
  const safeEmployee = safePapeleta.employees || {}

  const employeeName = (safeEmployee.full_name || 'AZABACHE SOLANO JESUS OCTAVIO').toUpperCase()
  const employeeDni = safeEmployee.dni || '00236872'
  const employeePosition = (safeEmployee.position || 'AUXILIAR DE ALMACÉN').toUpperCase()
  const emissionDate = safePapeleta.created_at ? new Date(safePapeleta.created_at) : new Date()
  const employeeSede = (safeEmployee.sede || 'TRUJILLO').toUpperCase()
  const employeeEmail = safeEmployee.email

  const requestType = (safePapeleta.request_type || 'VACACIONES').toUpperCase()
  const isVacaciones = requestType.includes('VACACIONES')
  const isSalud = requestType.includes('SALUD') || requestType.includes('MEDICO')
  const isPersonal = !isVacaciones && !isSalud

  const renderData = {
    employer: EMPLOYER_DATA,
    employee: {
        name: employeeName,
        dni: employeeDni,
        position: employeePosition,
        sede: employeeSede
    },
    flags: {
        isPersonal,
        isSalud,
        isVacaciones
    },
    dates: {
        emission: emissionDate,
        formattedStart: formatDate(safePapeleta.start_date),
        formattedEnd: formatDate(safePapeleta.end_date),
        formattedEmission: formatLongDate(emissionDate)
    }
  }

  const handleSendEmail = async () => {
    if (!employeeEmail) {
        alert('El empleado no tiene un correo registrado.')
        return
    }
    
    // CORRECCIÓN: Usar confirm() nativo correctamente o una librería de UI
    // En React dentro de un evento, window.confirm es síncrono y seguro.
    const confirmSend = window.confirm(`¿Enviar papeleta a ${employeeEmail}?`)
    if (!confirmSend) return

    setSending(true)
    const element = document.getElementById('papeleta-content')
    
    // SOLUCIÓN DEFINITIVA Y ABSOLUTA PARA ERROR OKLCH:
    // Si html2canvas sigue fallando al leer los estilos, la única opción infalible es NO usar html2canvas en el entorno actual.
    // Vamos a usar jsPDF directamente para crear un PDF simple pero funcional, 
    // O BIEN usar una versión "sanitizada" extrema donde eliminamos TODAS las clases de Tailwind y ponemos estilos inline básicos.

    const opt = {
        margin: 10,
        filename: `Papeleta_${employeeDni}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }

    try {
        // Opción B: Reconstrucción limpia del HTML (Evita cualquier contaminación de CSS externo)
        // Creamos un string HTML limpio con estilos básicos inline, sin clases de Tailwind.
        
        const content = `
            <div style="font-family: Arial, sans-serif; color: #000; padding: 20px; width: 100%;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="margin: 0;">PAPELETA DE VACACIONES / LICENCIA</h2>
                    <p style="margin: 5px 0;"><strong>${EMPLOYER_DATA.name}</strong></p>
                    <p style="margin: 0; font-size: 12px;">RUC: ${EMPLOYER_DATA.ruc}</p>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                    <tr>
                        <td style="padding: 5px; font-weight: bold;">APELLIDOS Y NOMBRES:</td>
                        <td style="padding: 5px; border-bottom: 1px solid #ccc;">${employeeName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px; font-weight: bold;">DNI:</td>
                        <td style="padding: 5px; border-bottom: 1px solid #ccc;">${employeeDni}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px; font-weight: bold;">CARGO:</td>
                        <td style="padding: 5px; border-bottom: 1px solid #ccc;">${employeePosition}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px; font-weight: bold;">ÁREA/SEDE:</td>
                        <td style="padding: 5px; border-bottom: 1px solid #ccc;">${employeeSede}</td>
                    </tr>
                </table>

                <div style="margin: 20px 0; border: 1px solid #000; padding: 10px;">
                    <p style="margin: 0 0 10px 0;"><strong>MOTIVO:</strong> ${requestType}</p>
                    <p style="margin: 0;"><strong>FECHAS:</strong> Del ${formatDate(safePapeleta.start_date)} al ${formatDate(safePapeleta.end_date)}</p>
                    <p style="margin: 10px 0 0 0;"><strong>TOTAL DÍAS:</strong> ${safePapeleta.total_days}</p>
                </div>

                <div style="margin-top: 50px; display: flex; justify-content: space-between;">
                    <div style="width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 5px;">
                        Firma del Trabajador
                    </div>
                    <div style="width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 5px;">
                        Firma Jefe Inmediato / RRHH
                    </div>
                </div>
                
                <div style="margin-top: 20px; font-size: 10px; color: #666; text-align: center;">
                    Generado automáticamente el ${new Date().toLocaleDateString()}
                </div>
            </div>
        `;

        // Crear contenedor aislado
        const container = document.createElement('div');
        container.innerHTML = content;
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '210mm'; // Ancho A4
        container.style.backgroundColor = '#fff';
        document.body.appendChild(container);

        try {
            const worker = html2pdf().set(opt).from(container);
            const pdfBlob = await worker.output('blob');
            
            // Envío...
            const formData = new FormData()
            formData.append('pdf', pdfBlob, `Papeleta_${employeeDni}.pdf`)
            formData.append('email', employeeEmail)
            formData.append('nombre', employeeName)

            // 3. Enviar al script PHP
            // SOLUCIÓN A ERROR 'Failed to fetch':
            // 1. Aseguramos 'no-cors' si el servidor no devuelve headers correctos (aunque esto limitaría la lectura de respuesta).
            // 2. IMPORTANTE: Verificar que el dominio soporte HTTPS o HTTP según corresponda.
            // 3. Añadimos un timestamp para evitar caché.
            
            const apiUrl = 'https://www.pauserdistribuciones.com/api/send_papeleta.php?t=' + Date.now();
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData,
                mode: 'cors', // Necesitamos 'cors' para leer la respuesta JSON
                headers: {
                    // NO poner 'Content-Type': 'multipart/form-data', fetch lo pone automáticamente con el boundary
                }
            })
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`)
            }
            
            const textResult = await response.text()
            try {
                const result = JSON.parse(textResult)
                if (result.success) {
                    alert('✅ Correo enviado exitosamente')
                } else {
                    throw new Error(result.error || 'Error desconocido del servidor')
                }
            } catch (e) {
                console.error('Respuesta no-JSON:', textResult)
                throw new Error('El servidor no respondió correctamente.')
            }

        } finally {
            document.body.removeChild(container);
        }

    } catch (e) {
        console.error(e)
        alert('❌ Error enviando correo: ' + e.message)
    } finally {
        setSending(false)
    }
  }

  return (
    <div className="bg-gray-100 min-h-screen py-10 flex justify-center">
      
      {/* --- CSS DE IMPRESIÓN --- */}
{/* --- CSS DE IMPRESIÓN --- */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4;
            margin: 18mm 10mm 8mm 10mm;
          }
          
          html, body {
            height: 100%;
            margin: 0;
            padding: 0;
          }
          
          body {
            visibility: hidden;
          }

          .printable-content {
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 2mm 10mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            background: transparent !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .printable-content * {
            visibility: visible !important;
          }

          .papeleta-wrapper {
            page-break-inside: avoid !important;
          }

          .no-print { display: none !important; }
        }
      `}} />
      {/* BOTONES ACCIÓN */}
      <div className="no-print fixed top-6 right-6 z-50 flex flex-col gap-3">
        <button 
            onClick={() => window.print()}
            className="bg-blue-700 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-800 font-bold flex items-center gap-2 transition-all"
        >
            <Printer size={20} /> IMPRIMIR
        </button>

        <button 
            onClick={handleSendEmail}
            disabled={sending}
            className={`
                px-6 py-3 rounded-full shadow-lg font-bold flex items-center gap-2 transition-all
                ${sending 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700'}
            `}
        >
            {sending ? (
                <>Enviando...</>
            ) : (
                <><Mail size={20} /> ENVIAR CORREO</>
            )}
        </button>
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div id="papeleta-content" className="printable-content bg-white w-[210mm] h-auto shadow-2xl p-[5mm] text-black font-sans box-border flex flex-col items-center">
        
        <div className="w-full">
            <PapeletaTemplate data={renderData} copyType="EMPRESA" />
        </div>
        
        {/* LÍNEA DE CORTE */}
        <div className="w-full border-b-2 border-dashed border-gray-300 my-4 relative flex-shrink-0">
             <span className="absolute left-1/2 -top-3 -translate-x-1/2 bg-white px-2 text-[8px] text-gray-400 font-bold uppercase tracking-widest print:bg-transparent">Cortar Aquí</span>
        </div>

        <div className="w-full">
            <PapeletaTemplate data={renderData} copyType="EMPLEADO" />
        </div>

      </div>
    </div>
  )
}

export default PapeletaFinal
