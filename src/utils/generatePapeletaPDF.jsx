// utils/generatePapeletaPDF.jsx
import { createRoot } from 'react-dom/client'
import * as html2pdfPkg from 'html2pdf.js'
import { PapeletaTemplate } from '../components/PapeletaTemplate'

const html2pdf = html2pdfPkg.default || html2pdfPkg

const formatDate = (dateString) => {
  if (!dateString) return '--/--/----'
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatLongDate = (date) => {
  const months = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
    "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"]
  return `${date.getDate()} DE ${months[date.getMonth()]} DE ${date.getFullYear()}`
}

export const buildRenderData = ({ request, employer, user }) => {
  const employee    = request.employees || {}
  const requestType = (request.request_type || 'VACACIONES').toUpperCase()
  return {
    employer: {
      nombre: employer.nombre,
      ruc: employer.ruc,
      domicilio: employer.domicilio,
      representante: (user?.full_name || employer.representanteDefault).toUpperCase(),
      dni_representante: user?.dni || employer.dniRepresentanteDefault,
    },
    employee: {
      name: (employee.full_name || '').toUpperCase(),
      dni: employee.dni || '00000000',
      position: (employee.position || '').toUpperCase(),
      sede: (employee.sede || 'TRUJILLO').toUpperCase(),
    },
    flags: {
      isPersonal:   !requestType.includes('VACACIONES') && !requestType.includes('SALUD') && !requestType.includes('MEDICO'),
      isSalud:      requestType.includes('SALUD') || requestType.includes('MEDICO'),
      isVacaciones: requestType.includes('VACACIONES'),
    },
    dates: {
      emission: new Date(),
      formattedStart:    formatDate(request.start_date),
      formattedEnd:      formatDate(request.end_date),
      formattedEmission: formatLongDate(new Date()),
    },
  }
}

const cleanOklch = (clonedEl) => {
  clonedEl.querySelectorAll('*').forEach((el) => {
    Array.from({ length: el.style.length }, (_, i) => el.style[i])
      .forEach(prop => {
        if (el.style.getPropertyValue(prop).includes('oklch'))
          el.style.removeProperty(prop)
      })
    try {
      const bg = window.getComputedStyle(el).backgroundColor
      if (bg?.includes('oklch')) el.style.backgroundColor = '#ffffff'
    } catch (_) {}
  })
}

export const generatePapeletaPDF = async (renderData, filename = 'papeleta', mode = 'save') => {
  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;background:white;z-index:99998;pointer-events:none;'
  document.body.appendChild(overlay)

  const wrapper = document.createElement('div')
  wrapper.style.cssText = `
    position:fixed;top:0;left:0;width:794px;
    background:white;z-index:99999;pointer-events:none;overflow:visible;
  `
  document.body.appendChild(wrapper)

  const root = createRoot(wrapper)

  await new Promise((resolve) => {
    root.render(
      <div id="pdf-capture-target" style={{ padding: '16px', background: 'white', width: '762px' }}>
        <PapeletaTemplate data={renderData} copyType="EMPRESA" />
        <div style={{ borderBottom: '2px dashed #d1d5db', margin: '12px 0', textAlign: 'center', lineHeight: 0 }}>
          <span style={{ display:'inline-block', background:'white', padding:'0 8px', fontSize:'7px', color:'#9ca3af', fontWeight:'bold', letterSpacing:'2px', textTransform:'uppercase' }}>
            ✂ CORTAR AQUÍ
          </span>
        </div>
        <PapeletaTemplate data={renderData} copyType="EMPLEADO" />
      </div>
    )
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 800)))
  })

  const captureEl = document.getElementById('pdf-capture-target')

  const opt = {
    margin: 0,
    filename: `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2, useCORS: true, backgroundColor: '#ffffff',
      logging: false, windowWidth: 794, scrollX: 0, scrollY: 0,
      onclone: (_doc, clonedEl) => cleanOklch(clonedEl),
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }

  try {
    const worker = html2pdf().set(opt).from(captureEl)
    if (mode === 'blob') return await worker.output('blob')
    else await worker.save()
  } finally {
    root.unmount()
    if (document.body.contains(wrapper)) document.body.removeChild(wrapper)
    if (document.body.contains(overlay)) document.body.removeChild(overlay)
  }
}