import { supabase } from '../lib/supabase'

/**
 * Genera el HTML de la papeleta de vacaciones con el formato correcto
 */
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

/**
 * Genera y sube un PDF de papeleta de vacaciones
 * @param {Object} request - Objeto de solicitud con datos del empleado
 * @returns {Promise<string>} URL pública del PDF generado
 */
export const generateAndUploadPDF = async (request) => {
    // Importar html2pdf dinámicamente
    const html2pdfModule = await import('html2pdf.js')
    const html2pdf = html2pdfModule.default || html2pdfModule

    const employee = request.employees || {}
    const employeeName = (employee.full_name || '').toUpperCase()
    const employeeDni = employee.dni || '00000000'
    const emissionDate = new Date()

    const formatDate = (dateString) => {
        if (!dateString) return '26/01/2026'
        const date = new Date(dateString + 'T00:00:00')
        return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    const formatLongDate = (date) => {
        const months = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]
        return `${date.getDate()} DE ${months[date.getMonth()]} DE ${date.getFullYear()}`
    }

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
                logging: false,
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

/**
 * Regenera el PDF de una solicitud existente
 * @param {string} requestId - ID de la solicitud
 * @returns {Promise<string>} URL pública del PDF regenerado
 */
export const regeneratePDF = async (requestId) => {
    // 1. Obtener datos de la solicitud
    const { data: request, error } = await supabase
        .from('vacation_requests')
        .select(`
      *,
      employees (
        full_name,
        dni,
        position,
        sede,
        email
      )
    `)
        .eq('id', requestId)
        .single()

    if (error) throw new Error('Error al obtener solicitud: ' + error.message)
    if (!request) throw new Error('Solicitud no encontrada')

    // 2. Generar PDF
    const pdfUrl = await generateAndUploadPDF(request)

    // 3. Actualizar URL en la base de datos
    const { error: updateError } = await supabase
        .from('vacation_requests')
        .update({ pdf_url: pdfUrl })
        .eq('id', requestId)

    if (updateError) throw new Error('Error al actualizar PDF URL: ' + updateError.message)

    return pdfUrl
}
