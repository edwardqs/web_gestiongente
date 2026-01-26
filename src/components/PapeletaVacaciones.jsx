import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPapeletaById } from '../services/requests'
import { Printer } from 'lucide-react'
import pauserLogo from '../assets/pauser_logo.png'

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
            color-adjust: exact !important;
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
      {/* BOTÓN IMPRIMIR */}
      <button 
        onClick={() => window.print()}
        className="no-print fixed top-6 right-6 z-50 bg-blue-700 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-800 font-bold flex items-center gap-2 transition-all"
      >
        <Printer size={20} /> IMPRIMIR PAPELETA
      </button>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="printable-content bg-white w-[210mm] h-auto shadow-2xl p-[5mm] text-black font-sans box-border flex flex-col items-center">
        
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
