import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import Modal from '../ui/Modal'

export default function TerminationModal({ isOpen, onClose, employee, onSuccess }) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: '', // 'RENUNCIA', 'TERMINO_CONTRATO', 'PERIODO_PRUEBA', 'MUTUO_DISENSO', 'ABANDONO_TRABAJO', 'NO_RENOVACION'
    terminationDate: new Date().toLocaleDateString('en-CA'),
    files: []
  })

  useEffect(() => {
    if (isOpen) {
      setFormData({
        type: '',
        terminationDate: new Date().toLocaleDateString('en-CA'),
        files: []
      })
    }
  }, [isOpen])

  const handleTermination = async () => {
    // Validaciones
    if (!formData.type) {
        showToast('Debes seleccionar un tipo de baja', 'error')
        return
    }

    let finalReason = ''
    let finalTerminationDate = new Date().toISOString() // Default to now if not specified

    if (formData.type === 'RENUNCIA') {
        finalReason = '[RENUNCIA]'
    } else if (formData.type === 'TERMINO_CONTRATO') {
        finalReason = '[TERMINO_CONTRATO] Término de Contrato'
        if (formData.terminationDate) {
            finalTerminationDate = new Date(formData.terminationDate).toISOString()
        }
    } else if (formData.type === 'PERIODO_PRUEBA') {
        finalReason = '[PERIODO_PRUEBA] Periodo de Prueba'
        if (formData.terminationDate) {
            finalTerminationDate = new Date(formData.terminationDate).toISOString()
        }
    } else if (formData.type === 'MUTUO_DISENSO') {
        finalReason = '[MUTUO_DISENSO] Mutuo Disenso'
        if (formData.terminationDate) {
            finalTerminationDate = new Date(formData.terminationDate).toISOString()
        }
    } else if (formData.type === 'ABANDONO_TRABAJO') {
        finalReason = '[ABANDONO_TRABAJO] Abandono de Trabajo'
    } else if (formData.type === 'NO_RENOVACION') {
        finalReason = '[NO_RENOVACION] No Renovación'
    }

    setLoading(true)
    try {
      let documentUrls = []
      
      if (formData.files && formData.files.length > 0) {
        for (let i = 0; i < formData.files.length; i++) {
            const file = formData.files[i]
            const fileExt = file.name.split('.').pop()
            const fileName = `${employee.id}_baja_${i}_${Date.now()}.${fileExt}`
            const { error: uploadError } = await supabase.storage.from('documents').upload(`bajas/${fileName}`, file)
            
            if (!uploadError) {
                const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(`bajas/${fileName}`)
                documentUrls.push(publicUrlData.publicUrl)
            }
        }
      }
      
      const documentUrl = documentUrls.length > 0 ? JSON.stringify(documentUrls) : null

      const updatePayload = {
          is_active: false,
          termination_date: finalTerminationDate,
          termination_reason: finalReason,
          termination_document_url: documentUrl,
      }

      const { error: updateError } = await supabase.from('employees')
        .update(updatePayload)
        .eq('id', employee.id)
      
      if (updateError) throw updateError
      
      showToast('Empleado dado de baja correctamente', 'success')
      if (onSuccess) onSuccess()
      onClose()
    } catch (error) {
      showToast('Error al procesar la baja: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 3) {
        alert('Solo puedes subir hasta 3 archivos')
        e.target.value = '' // Reset
        setFormData(prev => ({ ...prev, files: [] }))
    } else {
        setFormData(prev => ({ ...prev, files: files }))
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title={`Dar de Baja: ${employee?.full_name || ''}`}
      confirmText={loading ? "Procesando..." : "Confirmar Baja"} 
      onConfirm={handleTermination} 
      type="warning" 
      showCancel
    >
        <div className="space-y-5">
          {/* Paso 1: Selección de Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Seleccione el tipo de baja:</label>
            
            {/* GRUPO: FORZADOS */}
            <div className="mb-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Forzados</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <button type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, type: 'TERMINO_CONTRATO' }))}
                        className={`p-3 text-xs font-medium border rounded-lg transition-all ${formData.type === 'TERMINO_CONTRATO' ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        Término de Contrato
                    </button>
                    <button type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, type: 'PERIODO_PRUEBA' }))}
                        className={`p-3 text-xs font-medium border rounded-lg transition-all ${formData.type === 'PERIODO_PRUEBA' ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        Periodo de Prueba
                    </button>
                    <button type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, type: 'MUTUO_DISENSO' }))}
                        className={`p-3 text-xs font-medium border rounded-lg transition-all ${formData.type === 'MUTUO_DISENSO' ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        Mutuo Disenso
                    </button>
                </div>
            </div>

            {/* GRUPO: NO FORZADOS */}
            <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">No Forzados</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <button type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, type: 'RENUNCIA' }))}
                        className={`p-3 text-xs font-medium border rounded-lg transition-all ${formData.type === 'RENUNCIA' ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        Renuncia
                    </button>
                    <button type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, type: 'ABANDONO_TRABAJO' }))}
                        className={`p-3 text-xs font-medium border rounded-lg transition-all ${formData.type === 'ABANDONO_TRABAJO' ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        Abandono de Trabajo
                    </button>
                    <button type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, type: 'NO_RENOVACION' }))}
                        className={`p-3 text-xs font-medium border rounded-lg transition-all ${formData.type === 'NO_RENOVACION' ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        No Renovación
                    </button>
                </div>
            </div>
          </div>

          {/* Paso 2: Campos Específicos */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 min-h-[100px]">
            {!formData.type && <p className="text-sm text-gray-400 text-center py-4">Seleccione una opción arriba para continuar.</p>}

            {formData.type === 'RENUNCIA' && (
                <div className="space-y-3 animate-fade-in">
                    <p className="text-sm text-blue-700 font-medium mb-1">Detalles de Renuncia</p>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Archivos Adjuntos (Máx 3)</label>
                        <input 
                            type="file" 
                            multiple 
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                            onChange={handleFileChange} 
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                            {formData.files && formData.files.length > 0 
                                ? `${formData.files.length} archivo(s) seleccionado(s)` 
                                : 'Ningún archivo seleccionado'}
                        </p>
                    </div>
                </div>
            )}

            {(formData.type === 'TERMINO_CONTRATO' || formData.type === 'PERIODO_PRUEBA' || formData.type === 'MUTUO_DISENSO') && (
                <div className="space-y-3 animate-fade-in">
                    <p className="text-sm text-blue-700 font-medium mb-1">Detalles de Finalización</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de Ingreso</label>
                            <div className="p-2 bg-gray-100 border border-gray-200 rounded text-sm text-gray-600">
                                {employee?.entry_date ? new Date(employee.entry_date + 'T00:00:00').toLocaleDateString('es-PE') : 'No registrada'}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de Finalización</label>
                            <input type="date" 
                                value={formData.terminationDate}
                                onChange={e => setFormData(prev => ({ ...prev, terminationDate: e.target.value }))}
                                className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                    </div>
                </div>
            )}
          </div>
          
          <p className="text-xs text-gray-500 bg-yellow-50 p-2 rounded border border-yellow-100 flex items-start gap-2">
            <span className="text-yellow-600 font-bold">⚠</span>
            Al confirmar, el empleado pasará a estado Inactivo y no tendrá acceso al sistema.
          </p>
        </div>
    </Modal>
  )
}
