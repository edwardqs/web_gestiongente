import React from 'react';
import { Mail, Phone, MapPin, Briefcase, Calendar, Building2, Store, CreditCard } from 'lucide-react';

export default function EmployeeProfileCard({ employee }) {
  if (!employee) return null;

  // Banner color generator based on name (pseudo-random consistent color)
  const getBannerColor = (name) => {
    const colors = [
      'bg-blue-600',
      'bg-indigo-600',
      'bg-purple-600', 
      'bg-pink-600',
      'bg-emerald-600',
      'bg-orange-600'
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  return (
    <div className="w-full bg-white rounded-lg overflow-hidden">
      {/* Banner */}
      <div className={`h-32 ${getBannerColor(employee.full_name)} relative`}>
        {/* Decorative pattern or just solid color */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
      </div>

      {/* Profile Header */}
      <div className="px-6 pb-6 relative">
        {/* Avatar */}
        <div className="absolute -top-16 left-6">
          {employee.profile_picture_url ? (
            <img 
              src={employee.profile_picture_url} 
              alt={employee.full_name}
              className="w-32 h-32 rounded-full border-4 border-white shadow-md object-cover bg-white"
            />
          ) : (
            <div className="w-32 h-32 rounded-full border-4 border-white shadow-md bg-gray-100 flex items-center justify-center text-4xl font-bold text-gray-400">
              {employee.full_name.charAt(0)}
            </div>
          )}
          {/* Online/Status Indicator (Optional visual flair) */}
          <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-white ${employee.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
        </div>

        {/* Basic Info (Right of Avatar/Below) */}
        <div className="pt-20">
          <h2 className="text-2xl font-bold text-gray-900">{employee.full_name}</h2>
          <p className="text-gray-500 font-medium flex items-center gap-2">
            {employee.position}
          </p>
        </div>

        {/* Badges/Tags */}
        <div className="mt-4 flex flex-wrap gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                (employee.employee_type || 'OPERATIVO') === 'ADMINISTRATIVO' 
                ? 'bg-purple-100 text-purple-700 border-purple-200' 
                : 'bg-orange-100 text-orange-700 border-orange-200'
            }`}>
                {employee.employee_type || 'OPERATIVO'}
            </span>
            
            {employee.business_unit && (
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1">
                    <Store size={12} />
                    {employee.business_unit}
                </span>
            )}
        </div>

        <div className="my-6 border-t border-gray-100"></div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
            {/* Sede */}
            <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
                    <MapPin size={20} />
                </div>
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Sede</p>
                    <p className="text-gray-900 font-medium">{employee.sede || 'No asignada'}</p>
                </div>
            </div>

            {/* Fecha de Ingreso */}
            <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
                    <Calendar size={20} />
                </div>
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Fecha de Ingreso</p>
                    <p className="text-gray-900 font-medium">{employee.entry_date || 'No registrada'}</p>
                </div>
            </div>

            {/* DNI */}
            <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
                    <CreditCard size={20} />
                </div>
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Documento (DNI/CE)</p>
                    <p className="text-gray-900 font-medium font-mono">{employee.dni}</p>
                </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
                    <Mail size={20} />
                </div>
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Correo</p>
                    <p className="text-gray-900 font-medium break-all">{employee.email || 'No registrado'}</p>
                </div>
            </div>

            {/* Telefono */}
            <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
                    <Phone size={20} />
                </div>
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Teléfono</p>
                    <p className="text-gray-900 font-medium">{employee.phone || 'No registrado'}</p>
                </div>
            </div>
            
            {/* Área (si existe mapa o campo) */}
            {employee.area_name && (
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
                        <Building2 size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Área</p>
                        <p className="text-gray-900 font-medium">{employee.area_name}</p>
                    </div>
                </div>
            )}
        </div>
      </div>
      
      {/* Footer / Extra Info */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
            ID de Empleado: {employee.id}
        </p>
      </div>
    </div>
  );
}