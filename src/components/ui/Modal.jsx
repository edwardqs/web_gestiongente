import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    message, 
    onConfirm, 
    confirmText = 'Aceptar', 
    cancelText = 'Cancelar',
    showCancel = false,
    type = 'info' // info, warning, error
}) {
    if (!isOpen) return null;

    // Colores de botón según tipo
    const confirmButtonClass = type === 'warning' 
        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-300' 
        : type === 'error'
            ? 'bg-red-600 hover:bg-red-700 focus:ring-red-300'
            : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 backdrop-blur-sm p-4 md:inset-0 h-modal md:h-full">
            <div className="relative w-full max-w-md h-full md:h-auto">
                {/* Modal content */}
                <div className="relative bg-white rounded-lg shadow-xl dark:bg-gray-700 flex flex-col max-h-[90vh]">
                    {/* Modal header */}
                    <div className="flex items-start justify-between p-4 border-b rounded-t dark:border-gray-600">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {title}
                        </h3>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
                        >
                            <X size={20} />
                            <span className="sr-only">Cerrar modal</span>
                        </button>
                    </div>
                    {/* Modal body */}
                    <div className="p-6 space-y-6 overflow-y-auto">
                        {message && (
                            <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400">
                                {message}
                            </p>
                        )}
                        {children}
                    </div>
                    
                    {/* Modal footer (Solo si hay acción de confirmar o se pide mostrar cancelar explícitamente en footer) */}
                    {(onConfirm || showCancel) && (
                        <div className="flex items-center justify-end p-6 space-x-2 border-t border-gray-200 rounded-b dark:border-gray-600">
                            {showCancel && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600"
                                >
                                    {cancelText}
                                </button>
                            )}
                            {onConfirm && (
                                <button
                                    type="button"
                                    onClick={onConfirm}
                                    className={`text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 text-center ${confirmButtonClass}`}
                                >
                                    {confirmText}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
