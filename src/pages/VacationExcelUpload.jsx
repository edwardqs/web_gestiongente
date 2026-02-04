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
            
            // ====================================================================
            // SOLUCIÓN DEFINITIVA: Leer TODAS las filas sin filtrar espacios vacíos
            // ====================================================================
            const rawData = XLSX.utils.sheet_to_json(sheet, { 
                header: 1,
                blankrows: true,  // Mantener filas vacías para indexación correcta
                defval: null,     // Valores nulos para celdas vacías
                raw: false        // Convertir todo a string primero
            })
            
            if (rawData.length === 0) {
                alert('⚠️ El archivo está vacío o no se pudo leer.');
                return;
            }

            console.log(`📊 Filas totales leídas del Excel: ${rawData.length}`);

            // ====================================================================
            // PASO 1: Detectar fila de encabezados (Mejorado)
            // ====================================================================
            let headerRowIndex = -1;
            const possibleDniHeaders = ['DNI', 'DOCUMENTO', 'CODIGO', 'ID'];
            
            // Buscamos en las primeras 50 filas
            for (let i = 0; i < Math.min(rawData.length, 50); i++) {
                const row = rawData[i];
                if (!row || !Array.isArray(row)) continue;
                
                const hasDniHeader = row.some(cell => {
                    if (!cell) return false;
                    const cellStr = String(cell).toUpperCase().trim();
                    return possibleDniHeaders.some(header => cellStr.includes(header));
                });
                
                if (hasDniHeader) {
                    headerRowIndex = i;
                    break;
                }
            }

            if (headerRowIndex === -1) {
                alert('⚠️ No se encontró la fila de encabezados. Asegúrate de que el Excel tenga una columna "DNI".');
                return;
            }

            console.log(`✅ Encabezados detectados en fila: ${headerRowIndex + 1}`);

            // Construir cabeceras combinadas (Fila detectada + Siguiente)
            const primaryHeaders = rawData[headerRowIndex];
            const secondaryHeaders = rawData[headerRowIndex + 1];
            
            const headers = primaryHeaders.map((h, idx) => {
                const primary = h ? String(h).trim() : '';
                const secondary = (secondaryHeaders && secondaryHeaders[idx]) ? String(secondaryHeaders[idx]).trim() : '';
                return (primary + ' ' + secondary).trim();
            });

            // ====================================================================
            // PASO 2: Buscar índice de columnas importantes
            // ====================================================================
            const dniColIndex = headers.findIndex(h => 
                h && h.toUpperCase().includes('DNI')
            );

            if (dniColIndex === -1) {
                alert('⚠️ No se encontró la columna DNI en los encabezados.');
                return;
            }

            console.log(`✅ Columna DNI en índice: ${dniColIndex}`);

            // ====================================================================
            // PASO 3: Detectar primera fila con datos reales
            // ====================================================================
            let dataStartIndex = headerRowIndex + 1;
            
            // Saltar posibles sub-encabezados hasta encontrar un DNI válido
            for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 10, rawData.length); i++) {
                const row = rawData[i];
                if (!row) continue;
                
                const dniValue = row[dniColIndex];
                const dniStr = String(dniValue || "").trim();
                
                // Verificar si es un DNI real (8-12 dígitos numéricos)
                if (/^\d{8,12}$/.test(dniStr)) {
                    dataStartIndex = i;
                    console.log(`✅ Primera fila de datos en: ${i + 1}`);
                    break;
                }
            }

            // ====================================================================
            // PASO 4: Procesar TODAS las filas desde dataStartIndex hasta el final
            // ====================================================================
            const allRows = rawData.slice(dataStartIndex);
            
            console.log(`📊 Procesando ${allRows.length} filas desde la fila ${dataStartIndex + 1}...`);

            // Función para buscar columna de manera flexible
            const findColIndex = (possibleNames) => {
                for (const name of possibleNames) {
                    const normalized = name.toUpperCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/\s+/g, " ")
                        .trim();
                    
                    const index = headers.findIndex(h => {
                        if (!h) return false;
                        const hNorm = h.toUpperCase()
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "")
                            .replace(/\s+/g, " ")
                            .trim();
                        return hNorm === normalized || hNorm.includes(normalized);
                    });
                    
                    if (index !== -1) return index;
                }
                return -1;
            };

            // Encontrar índices de columnas
            const nombreColIndex = findColIndex(['APELLIDOS Y NOMBRES', 'NOMBRES', 'NOMBRE COMPLETO', 'EMPLEADO']);
            const fechaIngresoColIndex = findColIndex(['F. DE INGRESO', 'F DE INGRESO', 'FECHA DE INGRESO', 'FECHA INGRESO', 'F. INGRESO', 'INGRESO']);
            const diasGozadosColIndex = findColIndex(['DIAS GOZADOS', 'DIAS GOZADAS', 'VACACIONES GOZADAS', 'GOZADOS']);

            console.log(`📍 Índices de columnas:
  - DNI: ${dniColIndex}
  - Nombre: ${nombreColIndex}
  - Fecha Ingreso: ${fechaIngresoColIndex}
  - Días Gozados: ${diasGozadosColIndex}`);

            // ====================================================================
            // PASO 5: Mapear y validar cada fila
            // ====================================================================
            const formatted = allRows.map((row, index) => {
                if (!row || !Array.isArray(row)) {
                    return null;
                }

                // Extraer valores
                const dniRaw = row[dniColIndex];
                const nombreRaw = nombreColIndex !== -1 ? row[nombreColIndex] : null;
                const fechaIngresoRaw = fechaIngresoColIndex !== -1 ? row[fechaIngresoColIndex] : null;
                const diasGozadosRaw = diasGozadosColIndex !== -1 ? row[diasGozadosColIndex] : null;

                // Procesar DNI
                const dni = dniRaw ? String(dniRaw).trim() : '';
                
                // Validar DNI (debe ser numérico 8-12 dígitos)
                if (!dni || !/^\d{8,12}$/.test(dni)) {
                    return null; // Fila inválida
                }

                // Procesar fecha
                const entryDate = parseExcelDate(fechaIngresoRaw);

                // Procesar días gozados
                let legacyDays = 0;
                if (diasGozadosRaw !== null && diasGozadosRaw !== "") {
                    if (typeof diasGozadosRaw === 'number') {
                        legacyDays = Math.max(0, Math.round(diasGozadosRaw));
                    } else if (typeof diasGozadosRaw === 'string') {
                        const numMatch = String(diasGozadosRaw).match(/[\d.]+/);
                        if (numMatch) {
                            legacyDays = Math.max(0, Math.round(parseFloat(numMatch[0])));
                        }
                    }
                }

                return {
                    id: index,
                    dni: dni,
                    entry_date: entryDate,
                    legacy_days: legacyDays,
                    full_name: nombreRaw ? String(nombreRaw).trim().toUpperCase() : 'DESCONOCIDO',
                    isValid: Boolean(dni && entryDate)
                };
            }).filter(item => item !== null); // Eliminar nulls

            const validRecords = formatted.filter(f => f.isValid);
            
            console.log(`✅ Total procesado: ${formatted.length}`);
            console.log(`✅ Registros válidos: ${validRecords.length}`);
            
            // Diagnóstico adicional
            console.log(`\n📦 MUESTRA DE PRIMEROS 3 REGISTROS:`);
            validRecords.slice(0, 3).forEach((r, i) => {
                console.log(`  ${i+1}. DNI: ${r.dni}, Días: ${r.legacy_days}, Fecha: ${r.entry_date}`);
            });

            setPreviewData(formatted);
            setUploadResult(null);
        };
        reader.readAsArrayBuffer(file);
    };

    // Helper para parsear fechas de Excel
    const parseExcelDate = (value) => {
        if (!value) return null;
        
        // Si es número serial de Excel
        if (typeof value === 'number') {
            const date = new Date(Math.round((value - 25569) * 86400 * 1000));
            return date.toISOString().split('T')[0];
        }
        
        const strVal = String(value).trim();
        
        // Formato ISO YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(strVal)) {
            return strVal;
        }

        // Formato DD/MM/YYYY
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(strVal)) {
            const [day, month, year] = strVal.split('/');
            const pad = (n) => String(n).padStart(2, '0');
            return `${year}-${pad(month)}-${pad(day)}`;
        }

        // Intentar parseo genérico
        const date = new Date(strVal);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }

        return null;
    };

    const handleUpload = async () => {
        if (previewData.length === 0) return;

        setLoading(true);
        try {
            const payload = previewData
                .filter(item => item.isValid)
                .map(item => ({
                    dni: item.dni,
                    entry_date: item.entry_date,
                    legacy_days: item.legacy_days
                }));

            console.log(`🚀 Enviando ${payload.length} registros al servidor...`);
            console.log('📦 Primeros 3 registros a enviar:', payload.slice(0, 3));

            const { data, error } = await bulkUpdateVacations(payload);
            
            if (error) throw error;

            setUploadResult({
                success: true,
                count: data.updated_count,
                errors: data.errors || []
            });
            
            setFile(null);
            setPreviewData([]);
        } catch (err) {
            console.error('❌ Error en upload:', err);
            setUploadResult({
                success: false,
                message: err.message
            });
        } finally {
            setLoading(false);
        }
    };

    const clearFile = () => {
        setFile(null);
        setPreviewData([]);
        setUploadResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Carga Masiva de Histórico</h1>
                    <p className="text-slate-500 text-sm">Actualiza fechas de ingreso y días consumidos (Excel)</p>
                </div>
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
                            Soporta archivos con filas vacías intercaladas. 
                            Columnas requeridas: <span className="font-mono bg-slate-100 px-1 rounded">DNI</span>, 
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
                                disabled={loading || previewData.filter(p => p.isValid).length === 0}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                                Procesar {previewData.filter(p => p.isValid).length} Registros
                            </button>
                        </div>
                    </div>
                )}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".xlsx, .xls" 
                    onChange={handleFileChange} 
                />
            </div>

            {/* Resultados */}
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
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-mono text-slate-500">
                                Total: {previewData.length} | Válidos: {previewData.filter(p => p.isValid).length}
                            </span>
                            <span className="text-xs text-slate-400">Mostrando primeros 100</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-[400px]">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3">Estado</th>
                                    <th className="px-6 py-3">DNI</th>
                                    <th className="px-6 py-3">Nombre</th>
                                    <th className="px-6 py-3">Fecha Ingreso</th>
                                    <th className="px-6 py-3 text-center">Días Históricos</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {previewData.slice(0, 100).map((row) => (
                                    <tr key={row.id} className={!row.isValid ? 'bg-red-50' : 'hover:bg-slate-50'}>
                                        <td className="px-6 py-3">
                                            {row.isValid ? (
                                                <span className="text-green-600 flex items-center gap-1 text-xs font-bold">
                                                    <CheckCircle size={14} /> OK
                                                </span>
                                            ) : (
                                                <span className="text-red-600 flex items-center gap-1 text-xs font-bold">
                                                    <AlertTriangle size={14} /> Inválido
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 font-mono">{row.dni || '-'}</td>
                                        <td className="px-6 py-3">{row.full_name}</td>
                                        <td className="px-6 py-3">{row.entry_date || <span className="text-red-400">Sin fecha</span>}</td>
                                        <td className="px-6 py-3 text-center">
                                            <span className={`font-bold ${row.legacy_days > 0 ? 'text-blue-700' : 'text-slate-400'}`}>
                                                {row.legacy_days}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}