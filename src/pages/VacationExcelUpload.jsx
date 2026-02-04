import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { bulkUpdateVacations } from '../services/vacations'
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Save, RefreshCw, X } from 'lucide-react'

export default function VacationExcelUpload() {
    const [file, setFile] = useState(null)
    const [previewData, setPreviewData] = useState([])
    const [loading, setLoading] = useState(false)
    const [uploadResult, setUploadResult] = useState(null)
    const fileInputRef = useRef(null)

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0]
        if (selectedFile) {
            setFile(selectedFile)
            readExcel(selectedFile)
        }
    }

    const readExcel = (file) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result)
            const workbook = XLSX.read(data, { type: 'array' })
            const sheetName = workbook.SheetNames[0]
            const sheet = workbook.Sheets[sheetName]
            
            // INTENTO 3: Forzar el rango de lectura si existe !ref
            // Si hay filas vacías intermedias, sheet_to_json por defecto se detiene o las salta.
            // Vamos a leer como array de arrays primero para limpiar vacíos manualmente.
            const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false })
            
            // Asumimos que la fila 0 son las cabeceras
            if (rawData.length === 0) return

            // INTENTO 4: Smart Header Detection (Detectar en qué fila están los encabezados)
            let headerRowIndex = 0;
            const possibleDniHeaders = ['DNI', 'DOCUMENTO', 'CODIGO', 'ID'];
            
            // Buscamos en las primeras 50 filas (aumentado para mayor seguridad)
            for (let i = 0; i < Math.min(rawData.length, 50); i++) {
                const row = rawData[i];
                // Verificamos si alguna celda de esta fila contiene "DNI" o similar
                const hasDniHeader = row.some(cell => 
                    cell && typeof cell === 'string' && possibleDniHeaders.includes(cell.toUpperCase().trim())
                );
                
                if (hasDniHeader) {
                    headerRowIndex = i;
                    break;
                }
            }

            console.log("Encabezados detectados en fila:", headerRowIndex);

            const headers = rawData[headerRowIndex];
            const rows = rawData.slice(headerRowIndex + 1);

            // Convertir de vuelta a objetos usando las cabeceras
            const jsonData = rows.map(row => {
                const obj = {}
                headers.forEach((header, index) => {
                    // Si el header es válido y hay valor en la fila (aunque sea 0)
                    if (header) {
                         const val = row[index]
                         // Importante: No ignorar 0 o falsy values si son datos válidos
                         obj[header] = (val !== undefined && val !== null) ? val : ""
                    }
                })
                return obj
            }).filter(obj => {
                // Filtrado más permisivo: solo eliminar si está TOTALMENTE vacío de claves útiles
                const keys = Object.keys(obj)
                if (keys.length === 0) return false
                
                // Verificar si tiene al menos un dato relevante
                const hasData = keys.some(k => {
                    const val = obj[k]
                    return val !== "" && val !== null && val !== undefined
                })
                return hasData
            })
            
            // Función para encontrar columna insensible a mayúsculas/acentos
            const findCol = (row, possibleNames) => {
                const keys = Object.keys(row)
                for (const name of possibleNames) {
                    const foundKey = keys.find(k => 
                        k.toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === 
                        name.toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    )
                    if (foundKey) return row[foundKey]
                }
                return null
            }

            // Validar y formatear datos preliminares
            const formatted = jsonData.map((row, index) => {
                const dni = findCol(row, ['DNI', 'DOCUMENTO', 'CODIGO', 'ID'])
                const fechaIngreso = findCol(row, ['FECHA INGRESO', 'F. INGRESO', 'INGRESO', 'FECHA_INGRESO', 'F_INGRESO'])
                const diasTomados = findCol(row, ['DIAS GOZADOS', 'VACACIONES GOZADAS', 'DIAS_TOMADOS', 'GOZADOS', 'DIAS TOMADOS'])
                const nombres = findCol(row, ['NOMBRES', 'EMPLEADO', 'NOMBRE COMPLETO', 'APELLIDOS Y NOMBRES'])

                return {
                    id: index,
                    dni: dni ? String(dni).trim() : '',
                    entry_date: parseExcelDate(fechaIngreso),
                    legacy_days: diasTomados || 0,
                    full_name: nombres || 'Desconocido', 
                    isValid: Boolean(dni && parseExcelDate(fechaIngreso))
                }
            })

            setPreviewData(formatted)
            setUploadResult(null)
        }
        reader.readAsArrayBuffer(file)
    }

    // Helper robusto para fechas
    const parseExcelDate = (value) => {
        if (!value) return null
        
        // 1. Si es número serial de Excel (ej: 45000)
        if (typeof value === 'number') {
            const date = new Date(Math.round((value - 25569) * 86400 * 1000))
            return date.toISOString().split('T')[0]
        }
        
        // 2. Si es string
        const strVal = String(value).trim()
        
        // 2a. Formato ISO YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(strVal)) {
            return strVal
        }

        // 2b. Formato DD/MM/YYYY (común en Excel español)
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(strVal)) {
            const [day, month, year] = strVal.split('/')
            // Asegurar ceros a la izquierda
            const pad = (n) => n.padStart(2, '0')
            return `${year}-${pad(month)}-${pad(day)}`
        }

        // 2c. Intento genérico de JS (puede fallar con dd/mm vs mm/dd)
        const date = new Date(strVal)
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0]
        }

        return null // Inválido
    }

    const handleUpload = async () => {
        if (previewData.length === 0) return

        setLoading(true)
        try {
            // Filtrar solo válidos y mapear para RPC
            const payload = previewData
                .filter(item => item.isValid)
                .map(item => ({
                    dni: item.dni,
                    entry_date: item.entry_date,
                    legacy_days: item.legacy_days
                }))

            const { data, error } = await bulkUpdateVacations(payload)
            
            if (error) throw error

            setUploadResult({
                success: true,
                count: data.updated_count,
                errors: data.errors
            })
            setFile(null)
            setPreviewData([])
        } catch (err) {
            console.error(err)
            setUploadResult({
                success: false,
                message: err.message
            })
        } finally {
            setLoading(false)
        }
    }

    const clearFile = () => {
        setFile(null)
        setPreviewData([])
        setUploadResult(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Carga Masiva de Histórico</h1>
                    <p className="text-slate-500 text-sm">Actualiza fechas de ingreso y días consumidos (Excel)</p>
                </div>
                <button 
                    onClick={() => window.open('/template_vacaciones.xlsx')} // Placeholder
                    className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1"
                >
                    <FileSpreadsheet size={16} /> Descargar Plantilla
                </button>
            </div>

            {/* Zona de Carga */}
            <div className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
                file ? 'border-blue-200 bg-blue-50/30' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
            }`}>
                {!file ? (
                    <div 
                        onClick={() => fileInputRef.current.click()}
                        className="cursor-pointer flex flex-col items-center gap-3"
                    >
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                            <Upload size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700">Haz clic para subir tu Excel</h3>
                        <p className="text-slate-500 text-sm max-w-md">
                            El archivo debe contener las columnas: 
                            <span className="font-mono bg-slate-100 px-1 rounded ml-1">DNI</span>, 
                            <span className="font-mono bg-slate-100 px-1 rounded ml-1">FECHA INGRESO</span>, 
                            <span className="font-mono bg-slate-100 px-1 rounded ml-1">DIAS GOZADOS</span>
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4">
                        <FileSpreadsheet size={48} className="text-green-600" />
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{file.name}</h3>
                            <p className="text-slate-500 text-sm">{(file.size / 1024).toFixed(2)} KB</p>
                        </div>
                        <div className="flex gap-3 mt-2">
                            <button 
                                onClick={clearFile}
                                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium flex items-center gap-2"
                            >
                                <X size={16} /> Cancelar
                            </button>
                            <button 
                                onClick={handleUpload}
                                disabled={loading}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200 font-medium flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                                Procesar {previewData.length} Registros
                            </button>
                        </div>
                    </div>
                )}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".xlsx, .csv" 
                    onChange={handleFileChange} 
                />
            </div>

            {/* Resultados / Feedback */}
            {uploadResult && (
                <div className={`p-4 rounded-lg border flex items-start gap-3 ${
                    uploadResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                    {uploadResult.success ? <CheckCircle className="shrink-0" /> : <AlertTriangle className="shrink-0" />}
                    <div>
                        <h4 className="font-bold">{uploadResult.success ? 'Proceso Completado' : 'Error en la Carga'}</h4>
                        {uploadResult.success ? (
                            <div className="text-sm mt-1">
                                <p>Se actualizaron correctamente <strong>{uploadResult.count}</strong> empleados.</p>
                                {uploadResult.errors && uploadResult.errors.length > 0 && (
                                    <div className="mt-2 bg-white/50 p-2 rounded text-xs overflow-auto max-h-32">
                                        <p className="font-bold mb-1 text-red-700">Errores parciales:</p>
                                        <ul className="list-disc pl-4 space-y-1">
                                            {uploadResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm mt-1">{uploadResult.message}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Tabla de Previsualización */}
            {previewData.length > 0 && !uploadResult && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700">Previsualización de Datos</h3>
                        <span className="text-xs font-mono text-slate-500">Mostrando primeros 50 registros</span>
                    </div>
                    <div className="overflow-x-auto max-h-[400px]">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3">Estado</th>
                                    <th className="px-6 py-3">DNI</th>
                                    <th className="px-6 py-3">Nombre (Excel)</th>
                                    <th className="px-6 py-3">Fecha Ingreso</th>
                                    <th className="px-6 py-3 text-center">Días Históricos</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {previewData.slice(0, 50).map((row) => (
                                    <tr key={row.id} className={!row.isValid ? 'bg-red-50' : 'hover:bg-slate-50'}>
                                        <td className="px-6 py-3">
                                            {row.isValid ? (
                                                <span className="text-green-600 flex items-center gap-1 text-xs font-bold"><CheckCircle size={14} /> OK</span>
                                            ) : (
                                                <span className="text-red-600 flex items-center gap-1 text-xs font-bold"><AlertTriangle size={14} /> Faltan Datos</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 font-mono">{row.dni || '-'}</td>
                                        <td className="px-6 py-3">{row.full_name}</td>
                                        <td className="px-6 py-3">{row.entry_date || <span className="text-red-400">Inválido</span>}</td>
                                        <td className="px-6 py-3 text-center font-bold text-slate-700">{row.legacy_days}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
