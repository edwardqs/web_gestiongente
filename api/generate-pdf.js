// api/generate-pdf.js
// Vercel Serverless Function — corre en Node.js
// Recibe los datos de la solicitud, genera el PDF con Puppeteer y lo devuelve como buffer.
//
// INSTALAR: npm install @sparticuz/chromium puppeteer-core
// (NO usar puppeteer completo — Vercel tiene límite de 50MB, chromium completo pesa ~170MB)

import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

// ── HTML de la papeleta (estilos inline, sin dependencia de Tailwind) ────────
// Este HTML replica exactamente el diseño de PapeletaTemplate.jsx
// pero con CSS inline puro para que Puppeteer lo renderice igual.
const buildPapeletaHTML = (data, copyType) => {
  const { employer, employee, flags, dates } = data

  return `
    <div style="border: 3px solid black; display: flex; flex-direction: column; background: white; font-family: Arial, sans-serif; color: black; width: 100%;">
      
      <!-- TÍTULO -->
      <div style="border-bottom: 3px solid black; padding: 4px; text-align: center; background: #f9fafb;">
        <h1 style="margin:0; font-size: 18px; font-weight: 900; letter-spacing: 0.2em; text-transform: uppercase;">
          PAPELETA DE VACACIONES
        </h1>
      </div>

      <!-- A: EMPLEADOR -->
      <div style="display: flex; border-bottom: 2px solid black;">
        <div style="width: 32px; border-right: 2px solid black; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px;">A</div>
        <div style="flex: 1;">
          <div style="display: flex; border-bottom: 1px solid black;">
            <div style="width: 96px; padding: 4px; font-weight: bold; border-right: 1px solid black; font-size: 10px; display: flex; align-items: center;">EL EMPLEADOR</div>
            <div style="padding: 4px; font-weight: 900; color: #1e40af; font-size: 10px; flex: 1;">${employer.nombre}</div>
          </div>
          <div style="display: flex; border-bottom: 1px solid black;">
            <div style="width: 50%; display: flex; border-right: 1px solid black;">
              <div style="width: 48px; padding: 4px; font-weight: bold; border-right: 1px solid black; font-size: 9px;">con RUC</div>
              <div style="padding: 4px; font-size: 9px;">${employer.ruc}</div>
            </div>
            <div style="width: 50%; display: flex;">
              <div style="width: 56px; padding: 4px; font-weight: bold; border-right: 1px solid black; font-size: 9px;">Domicilio</div>
              <div style="padding: 4px; font-size: 7px; line-height: 1.3;">${employer.domicilio}</div>
            </div>
          </div>
          <div style="display: flex;">
            <div style="width: 96px; padding: 4px; font-weight: bold; border-right: 1px solid black; font-size: 9px;">Representante</div>
            <div style="padding: 4px; font-size: 9px; text-transform: uppercase;">${employer.representante} (DNI: ${employer.dni_representante})</div>
          </div>
        </div>
      </div>

      <!-- B: TRABAJADOR -->
      <div style="display: flex; border-bottom: 2px solid black;">
        <div style="width: 32px; border-right: 2px solid black; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px;">B</div>
        <div style="flex: 1;">
          <div style="display: flex; border-bottom: 1px solid black;">
            <div style="width: 96px; padding: 4px; font-weight: bold; border-right: 1px solid black; font-size: 10px; display: flex; align-items: center;">EL TRABAJADOR</div>
            <div style="padding: 4px; font-weight: 900; color: #1e40af; font-size: 10px; flex: 1;">${employee.name}</div>
          </div>
          <div style="display: flex; border-bottom: 1px solid black;">
            <div style="width: 50%; display: flex; border-right: 1px solid black;">
              <div style="width: 48px; padding: 4px; font-weight: bold; border-right: 1px solid black; font-size: 9px;">DNI Nº</div>
              <div style="padding: 4px; font-weight: 900; color: #1e40af; font-size: 9px;">${employee.dni}</div>
            </div>
            <div style="width: 50%; display: flex;">
              <div style="width: 56px; padding: 4px; font-weight: bold; border-right: 1px solid black; font-size: 9px;">CARGO</div>
              <div style="padding: 4px; font-weight: bold; font-size: 9px; text-transform: uppercase;">${employee.position}</div>
            </div>
          </div>
          <!-- FECHAS -->
          <div style="display: flex; align-items: center; justify-content: space-around; padding: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="font-size: 8px; font-weight: bold; color: #2563eb; text-align: right; line-height: 1.2;">FECHA DE<br/>SALIDA</div>
              <div style="border: 2px solid black; padding: 4px 12px; font-size: 16px; font-weight: 900; background: white;">${dates.formattedStart}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="font-size: 8px; font-weight: bold; color: #2563eb; text-align: right; line-height: 1.2;">FECHA DE<br/>RETORNO</div>
              <div style="border: 2px solid black; padding: 4px 12px; font-size: 16px; font-weight: 900; background: white;">${dates.formattedEnd}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- C: MOTIVO -->
      <div style="display: flex; border-bottom: 2px solid black;">
        <div style="width: 32px; border-right: 2px solid black; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px;">C</div>
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; padding: 4px 16px;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-weight: bold; font-size: 9px;">PERSONALES</span>
              <div style="width: 14px; height: 14px; border: 1px solid black; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 11px;">
                ${flags.isPersonal ? 'X' : ''}
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-weight: bold; font-size: 9px;">SALUD</span>
              <div style="width: 14px; height: 14px; border: 1px solid black; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 11px;">
                ${flags.isSalud ? 'X' : ''}
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-weight: bold; font-size: 9px;">VACACIONES</span>
              <div style="width: 14px; height: 14px; border: 1px solid black; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 11px;">
                ${flags.isVacaciones ? 'X' : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- FIRMAS -->
      <div style="margin-top: 8px; padding: 0 16px;">
        <div style="margin-bottom: 8px; font-weight: bold; font-size: 9px; text-transform: uppercase;">
          ${employee.sede}, ${dates.formattedEmission}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 8px;">
          <div style="flex: 1; text-align: center;">
            <div style="height: 40px;"></div>
            <div style="border-top: 1px dotted black; padding-top: 4px;">
              <p style="margin:0; font-weight: bold; font-size: 8px;">${employer.representante}</p>
              <p style="margin:0; font-size: 7px;">DNI: ${employer.dni_representante}</p>
            </div>
          </div>
          <div style="flex: 1; text-align: center;">
            <div style="height: 40px;"></div>
            <div style="border-top: 1px dotted black; padding-top: 4px;">
              <p style="margin:0; font-weight: bold; font-size: 8px; color: #1e3a8a;">${employee.name}</p>
              <p style="margin:0; font-size: 7px;">DNI: ${employee.dni}</p>
            </div>
          </div>
          <div style="border: 1px solid black; width: 56px; height: 72px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 4px; background: white;">
            <span style="font-size: 5px; color: #9ca3af;">HUELLA</span>
            <div style="width: 30px; height: 30px; border-radius: 50%; border: 1px solid #e5e7eb;"></div>
            <span style="font-size: 5px; text-align: center; line-height: 1.1;">INDICE DERECHO</span>
          </div>
        </div>
      </div>

      <!-- PIE -->
      <div style="border-top: 3px solid black; height: 28px; display: flex; align-items: center;">
        <div style="flex: 1; padding: 0 16px; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 11px; font-weight: 900;">PAUSER</span>
          <span style="color: #9ca3af; font-size: 11px;">|</span>
          <span style="font-size: 7px; font-weight: bold; color: #6b7280;">RECURSOS HUMANOS</span>
        </div>
        <div style="border-left: 3px solid black; padding: 0 16px; height: 100%; display: flex; align-items: center; background: #f3f4f6;">
          <span style="font-size: 8px; font-weight: 900; font-style: italic; text-transform: uppercase;">COPIA ${copyType}</span>
        </div>
      </div>
    </div>
  `
}

const buildFullHTML = (data) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: white; padding: 16px; width: 794px; }
    </style>
  </head>
  <body>
    ${buildPapeletaHTML(data, 'EMPRESA')}
    <div style="border-bottom: 2px dashed #d1d5db; margin: 16px 0; text-align: center; line-height: 0;">
      <span style="display: inline-block; background: white; padding: 0 8px; font-size: 7px; color: #9ca3af; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">
        ✂ CORTAR AQUÍ
      </span>
    </div>
    ${buildPapeletaHTML(data, 'EMPLEADO')}
  </body>
  </html>
`

// ── Handler principal ────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verificar secret para que nadie externo pueda llamar este endpoint
  const secret = req.headers['x-pdf-secret']
  if (secret !== process.env.PDF_GENERATION_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { data } = req.body

    if (!data) {
      return res.status(400).json({ error: 'Missing data' })
    }

    // Lanzar Puppeteer con Chromium optimizado para Vercel
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 794, height: 1123 })
    await page.setContent(buildFullHTML(data), { waitUntil: 'networkidle0' })

    // Generar PDF con formato A4
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
    })

    await browser.close()

    // Devolver el PDF como buffer
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="papeleta.pdf"')
    return res.status(200).send(Buffer.from(pdfBuffer))

  } catch (error) {
    console.error('Error generating PDF:', error)
    return res.status(500).json({ error: error.message })
  }
}