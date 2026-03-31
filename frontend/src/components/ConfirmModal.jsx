import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-start">
          <div className="flex items-center">
            <div className="bg-red-100 p-2 rounded-full mr-3 text-red-600">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-xl font-black text-gray-900">{title}</h3>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-gray-600 font-medium">{message}</p>
        </div>
        <div className="p-6 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
          <button 
            onClick={onCancel} 
            className="px-6 py-2.5 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 hover:text-gray-900 transition-all shadow-sm"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            className="px-6 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-md shadow-red-200"
          >
            Confirm Action
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;