import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 backdrop-blur-sm p-4 md:inset-0 h-modal md:h-full">
            <div className="relative w-full max-w-md h-full md:h-auto">
                {/* Modal content */}
                <div className="relative bg-white rounded-lg shadow-xl dark:bg-gray-700">
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
                    <div className="p-6 space-y-6">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
