// supabase/functions/generate-papeleta/index.ts
// Edge Function que recibe el webhook de Supabase cuando se crea una solicitud
// y orquesta la generación + subida del PDF.
//
// DEPLOY: supabase functions deploy generate-papeleta

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VERCEL_PDF_URL    = Deno.env.get('VERCEL_PDF_URL')!       // https://tu-app.vercel.app/api/generate-pdf
const PDF_SECRET        = Deno.env.get('PDF_GENERATION_SECRET')! // mismo valor que en Vercel

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const formatDate = (dateString: string) => {
  if (!dateString) return '--/--/----'
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatLongDate = (date: Date) => {
  const months = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
    "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"]
  return `${date.getDate()} DE ${months[date.getMonth()]} DE ${date.getFullYear()}`
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json()

    // Supabase Database Webhooks envían { type, table, record, old_record }
    const record = payload.record

    if (!record || !record.id) {
      return new Response(JSON.stringify({ error: 'No record in payload' }), { status: 400 })
    }

    console.log(`Processing request: ${record.id}`)

    // 1. Obtener datos completos del empleado
    const { data: request, error: reqError } = await supabase
      .from('vacation_requests')
      .select(`
        *,
        employees!vacation_requests_employee_id_fkey (
          id, full_name, dni, position, sede, email
        )
      `)
      .eq('id', record.id)
      .single()

    if (reqError || !request) {
      throw new Error(`Error fetching request: ${reqError?.message}`)
    }

    const employee = request.employees as any

    // 2. Obtener el firmante (jefe inmediato) via RPC
    const { data: signerData } = await supabase
      .rpc('get_signing_authority', { p_employee_id: request.employee_id })

    const signer = signerData || {
      full_name: 'GIANCARLO URBINA GAITAN',
      dni: '18161904',
    }

    // 3. Construir renderData
    const requestType  = (request.request_type || 'VACACIONES').toUpperCase()
    const isVacaciones = requestType.includes('VACACIONES')
    const isSalud      = requestType.includes('SALUD') || requestType.includes('MEDICO')
    const emissionDate = new Date()

    const renderData = {
      employer: {
        nombre: 'PAUSER DISTRIBUCIONES S.A.C.',
        ruc: '20600869940',
        domicilio: 'JR. PEDRO MUÑIZ NRO. 253 DPTO. 1601 SEC. JORGE CHAVEZ LA LIBERTAD - TRUJILLO',
        representante: (signer.full_name || 'GIANCARLO URBINA GAITAN').toUpperCase(),
        dni_representante: signer.dni || '18161904',
      },
      employee: {
        name: (employee.full_name || '').toUpperCase(),
        dni: employee.dni || '00000000',
        position: (employee.position || '').toUpperCase(),
        sede: (employee.sede || 'TRUJILLO').toUpperCase(),
      },
      flags: {
        isPersonal:   !isVacaciones && !isSalud,
        isSalud,
        isVacaciones,
      },
      dates: {
        formattedStart:    formatDate(request.start_date),
        formattedEnd:      formatDate(request.end_date),
        formattedEmission: formatLongDate(emissionDate),
      },
    }

    // 4. Llamar a Vercel para generar el PDF
    console.log(`Calling PDF generator at ${VERCEL_PDF_URL}`)
    const pdfResponse = await fetch(VERCEL_PDF_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pdf-secret': PDF_SECRET,
      },
      body: JSON.stringify({ data: renderData }),
    })

    if (!pdfResponse.ok) {
      const errText = await pdfResponse.text()
      throw new Error(`PDF generation failed: ${pdfResponse.status} - ${errText}`)
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()
    console.log(`PDF generated: ${pdfBuffer.byteLength} bytes`)

    // 5. Subir a Supabase Storage
    const storagePath = `papeletas/${employee.dni}_${record.id}_${Date.now()}.pdf`

    const { error: uploadError } = await supabase.storage
      .from('papeletas')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

    // 6. Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('papeletas')
      .getPublicUrl(storagePath)

    // 7. Actualizar vacation_requests con la URL del PDF
    const { error: updateError } = await supabase
      .from('vacation_requests')
      .update({ pdf_url: urlData.publicUrl })
      .eq('id', record.id)

    if (updateError) throw new Error(`Update failed: ${updateError.message}`)

    console.log(`✅ PDF saved: ${urlData.publicUrl}`)

    return new Response(
      JSON.stringify({ success: true, pdf_url: urlData.publicUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})