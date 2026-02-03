import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
    useEffect(() => {
        if (duration) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-500" />,
        error: <XCircle className="w-5 h-5 text-red-500" />,
        warning: <AlertCircle className="w-5 h-5 text-yellow-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />
    };

    const bgColors = {
        success: 'bg-white border-green-100',
        error: 'bg-white border-red-100',
        warning: 'bg-white border-yellow-100',
        info: 'bg-white border-blue-100'
    };

    return createPortal(
        <div className="fixed top-4 right-4 z-[9999] animate-fade-in-down">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${bgColors[type]} min-w-[300px] max-w-md`}>
                {icons[type]}
                <p className="flex-1 text-sm font-medium text-gray-700">{message}</p>
                <button 
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="w-4 h-4 text-gray-400" />
                </button>
            </div>
        </div>,
        document.body
    );
};

export default Toast;
