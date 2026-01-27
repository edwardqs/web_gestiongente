import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPapeletaById } from '../services/requests'
import { Printer, Mail, Send } from 'lucide-react'
import pauserLogo from '../assets/pauser_logo.png'
import html2pdf from 'html2pdf.js'

const formatDate = (dateString) => {
  if (!dateString) return '26/01/2026'
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatLongDate = (date) => {
  const months = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]
  return `${date.getDate()} DE ${months[date.getMonth()]} DE ${date.getFullYear()}`
}

const PapeletaTemplate = ({ data, copyType }) => {
  const { employer, employee, flags, dates } = data;
  
  return (
    <div className="border-[3px] border-black flex flex-col bg-white">
      {/* TÍTULO */}
      <div className="border-b-[3px] border-black py-1 text-center bg-gray-50">
        <h1 className="text-xl font-black tracking-[0.2em] uppercase">PAPELETA DE VACACIONES</h1>
      </div>

      {/* A: EMPLEADOR */}
      <div className="flex border-b-[2px] border-black">
        <div className="w-8 border-r-[2px] border-black flex items-center justify-center font-black text-xl">A</div>
        <div className="flex-1">
          <div className="flex border-b border-black">
            <div className="w-24 p-1 font-bold border-r border-black text-[10px] flex items-center">EL EMPLEADOR</div>
            <div className="p-1 font-black text-blue-800 text-[10px] flex-1">{employer.nombre}</div>
          </div>
          <div className="flex border-b border-black">
             <div className="w-1/2 flex border-r border-black">
                <div className="w-12 p-1 font-bold border-r border-black text-[9px]">con RUC</div>
                <div className="p-1 text-[9px]">{employer.ruc}</div>
             </div>
             <div className="w-1/2 flex">
                <div className="w-14 p-1 font-bold border-r border-black text-[9px]">Domicilio</div>
                <div className="p-1 text-[7px] leading-tight">{employer.domicilio}</div>
             </div>
          </div>
          <div className="flex">
            <div className="w-24 p-1 font-bold border-r border-black text-[9px]">Representante</div>
            <div className="p-1 text-[9px] uppercase">{employer.representante} (DNI: {employer.dni_representante})</div>
          </div>
        </div>
      </div>

      {/* B: TRABAJADOR */}
      <div className="flex border-b-[2px] border-black">
        <div className="w-8 border-r-[2px] border-black flex items-center justify-center font-black text-xl">B</div>
        <div className="flex-1">
          <div className="flex border-b border-black">
            <div className="w-24 p-1 font-bold border-r border-black text-[10px] flex items-center">EL TRABAJADOR</div>
            <div className="p-1 font-black text-blue-800 text-[10px] flex-1">{employee.name}</div>
          </div>
          <div className="flex border-b border-black">
             <div className="w-1/2 flex border-r border-black">
                <div className="w-12 p-1 font-bold border-r border-black text-[9px]">DNI Nº</div>
                <div className="p-1 font-black text-blue-800 text-[9px]">{employee.dni}</div>
             </div>
             <div className="w-1/2 flex">
                <div className="w-14 p-1 font-bold border-r border-black text-[9px]">CARGO</div>
                <div className="p-1 font-bold text-[9px] uppercase">{employee.position}</div>
             </div>
          </div>
          
          {/* FECHAS */}
          <div className="flex items-center justify-around py-2">
            <div className="flex items-center gap-2">
               <div className="text-[8px] font-bold text-blue-600 text-right leading-tight">FECHA DE<br/>SALIDA</div>
               <div className="border-[2px] border-black px-3 py-1 text-lg font-black bg-white">
                 {dates.formattedStart}
               </div>
            </div>
            <div className="flex items-center gap-2">
               <div className="text-[8px] font-bold text-blue-600 text-right leading-tight">FECHA DE<br/>RETORNO</div>
               <div className="border-[2px] border-black px-3 py-1 text-lg font-black bg-white">
                 {dates.formattedEnd}
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* C: MOTIVO */}
      <div className="flex border-b-[2px] border-black">
        <div className="w-8 border-r-[2px] border-black flex items-center justify-center font-black text-xl">C</div>
        <div className="flex-1">
          <div className="flex border-b border-black bg-gray-50">
            <div className="w-24 p-1 font-bold border-r border-black text-[10px]">MOTIVO</div>
            <div className="p-1 text-[8px] text-gray-500 italic flex-1">Seleccione el tipo</div>
          </div>
          <div className="flex justify-between px-4 py-1">
            <div className="flex items-center gap-1">
              <span className="font-bold text-[9px]">PERSONALES</span>
              <div className="w-4 h-4 border border-black flex items-center justify-center">
                {flags.isPersonal && <span className="font-black text-xs">X</span>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-[9px]">SALUD</span>
              <div className="w-4 h-4 border border-black flex items-center justify-center">
                {flags.isSalud && <span className="font-black text-xs">X</span>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-[9px]">VACACIONES</span>
              <div className="w-4 h-4 border border-black flex items-center justify-center">
                {flags.isVacaciones && <span className="font-black text-xs">X</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FIRMAS Y PIE DE PÁGINA */}
      <div className="mt-2 px-4">
        <div className="mb-2 font-bold text-[9px] uppercase">
          {employee.sede}, {dates.formattedEmission}
        </div>
        
        <div className="flex justify-between items-end gap-4 mb-2">
          <div className="flex-1 text-center">
             <div className="h-12"></div>
             <div className="border-t border-dotted border-black pt-1">
               <p className="font-bold text-[8px] leading-tight">{employer.representante}</p>
               <p className="text-[7px] leading-tight">DNI: {employer.dni_representante}</p>
             </div>
          </div>
          
          <div className="flex-1 text-center">
             <div className="h-12"></div>
             <div className="border-t border-dotted border-black pt-1">
               <p className="font-bold text-[8px] text-blue-900 leading-tight">{employee.name}</p>
               <p className="text-[7px] leading-tight">DNI: {employee.dni}</p>
             </div>
          </div>

          <div className="border border-black w-14 h-20 flex flex-col items-center justify-between p-1 bg-white">
            <span className="text-[5px] text-gray-400">HUELLA</span>
            <div className="w-8 h-8 rounded-full border border-gray-100"></div>
            <span className="text-[5px] text-center leading-none">INDICE DERECHO</span>
          </div>
        </div>
      </div>

      {/* PIE DE PÁGINA */}
      <div className="border-t-[3px] border-black flex h-8 items-center">
        <div className="flex-1 flex items-center px-4 gap-2">
          <img src={pauserLogo} alt="Logo" className="h-6" />
          <div className="w-[1px] h-3 bg-gray-400"></div>
          <span className="text-[7px] text-gray-500 font-bold">RECURSOS HUMANOS</span>
        </div>
        <div className="border-l-[3px] border-black px-4 h-full flex items-center bg-gray-100">
          <span className="text-[8px] font-black uppercase italic">COPIA {copyType}</span>
        </div>
      </div>
    </div>
  )
}

const PapeletaFinal = () => {
  const { id } = useParams()
  const [papeleta, setPapeleta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)

  const EMPLOYER_DATA = {
    nombre: "PAUSER DISTRIBUCIONES S.A.C.",
    ruc: "20600869940",
    domicilio: "JR. PEDRO MUÑIZ NRO. 253 DPTO. 1601 SEC. JORGE CHAVEZ LA LIBERTAD - TRUJILLO",
    representante: "GIANCARLO URBINA GAITAN",
    dni_representante: "18161904"
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!id) { setLoading(false); return; }
      setLoading(true)
      try {
        const { data, error } = await getPapeletaById(id)
        if (error) throw new Error(error.message)
        setPapeleta(data)
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
