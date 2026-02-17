import React from 'react'

export const PapeletaTemplate = ({ data, copyType }) => {
  const { employer, employee, flags, dates } = data;
  
  return (
    <div className="border-[3px] border-black flex flex-col bg-white" style={{ fontFamily: 'Arial, sans-serif', color: 'black', backgroundColor: 'white' }}>
      {/* TÍTULO */}
      <div className="border-b-[3px] border-black py-1 text-center bg-gray-50" style={{ backgroundColor: '#f9fafb' }}>
        <h1 className="text-xl font-black tracking-[0.2em] uppercase">PAPELETA DE VACACIONES</h1>
      </div>

      {/* A: EMPLEADOR */}
      <div className="flex border-b-[2px] border-black">
        <div className="w-8 border-r-[2px] border-black flex items-center justify-center font-black text-xl">A</div>
        <div className="flex-1">
          <div className="flex border-b border-black">
            <div className="w-24 p-1 font-bold border-r border-black text-[10px] flex items-center">EL EMPLEADOR</div>
            <div className="p-1 font-black text-blue-800 text-[10px] flex-1" style={{ color: '#1e40af' }}>{employer.nombre}</div>
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
            <div className="p-1 font-black text-blue-800 text-[10px] flex-1" style={{ color: '#1e40af' }}>{employee.name}</div>
          </div>
          <div className="flex border-b border-black">
             <div className="w-1/2 flex border-r border-black">
                <div className="w-12 p-1 font-bold border-r border-black text-[9px]">DNI Nº</div>
                <div className="p-1 font-black text-blue-800 text-[9px]" style={{ color: '#1e40af' }}>{employee.dni}</div>
             </div>
             <div className="w-1/2 flex">
                <div className="w-14 p-1 font-bold border-r border-black text-[9px]">CARGO</div>
                <div className="p-1 font-bold text-[9px] uppercase">{employee.position}</div>
             </div>
          </div>
          
          {/* FECHAS */}
          <div className="flex items-center justify-around py-2">
            <div className="flex items-center gap-2">
               <div className="text-[8px] font-bold text-blue-600 text-right leading-tight" style={{ color: '#2563eb' }}>FECHA DE<br/>SALIDA</div>
               <div className="border-[2px] border-black px-3 py-1 text-lg font-black bg-white" style={{ backgroundColor: 'white' }}>
                 {dates.formattedStart}
               </div>
            </div>
            <div className="flex items-center gap-2">
               <div className="text-[8px] font-bold text-blue-600 text-right leading-tight" style={{ color: '#2563eb' }}>FECHA DE<br/>TÉRMINO</div>
               <div className="border-[2px] border-black px-3 py-1 text-lg font-black bg-white" style={{ backgroundColor: 'white' }}>
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
               <p className="font-bold text-[8px] text-blue-900 leading-tight" style={{ color: '#1e3a8a' }}>{employee.name}</p>
               <p className="text-[7px] leading-tight">DNI: {employee.dni}</p>
             </div>
          </div>

          <div className="border border-black w-14 h-20 flex flex-col items-center justify-between p-1 bg-white" style={{ backgroundColor: 'white' }}>
            <span className="text-[5px] text-gray-400" style={{ color: '#9ca3af' }}>HUELLA</span>
            <div className="w-8 h-8 rounded-full border border-gray-100" style={{ borderColor: '#f3f4f6' }}></div>
            <span className="text-[5px] text-center leading-none">INDICE DERECHO</span>
          </div>
        </div>
      </div>

      {/* PIE DE PÁGINA */}
      <div className="border-t-[3px] border-black flex h-8 items-center">
        <div className="flex-1 flex items-center px-4 gap-2">
          {/* <img src={pauserLogo} alt="Logo" className="h-6" /> */}
          <span className="text-[10px] font-black">PAUSER</span>
          <div className="w-[1px] h-3 bg-gray-400" style={{ backgroundColor: '#9ca3af' }}></div>
          <span className="text-[7px] text-gray-500 font-bold" style={{ color: '#6b7280' }}>RECURSOS HUMANOS</span>
        </div>
        <div className="border-l-[3px] border-black px-4 h-full flex items-center bg-gray-100" style={{ backgroundColor: '#f3f4f6' }}>
          <span className="text-[8px] font-black uppercase italic">COPIA {copyType}</span>
        </div>
      </div>
    </div>
  )
}
