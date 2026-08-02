import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', danger = true }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800 transition-all transform scale-100">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${danger ? 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400' : 'bg-brand-100 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400'}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>

          <div className="space-y-1 pr-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title || 'Confirm Action'}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{message || 'Are you sure you want to proceed?'}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all ${
              danger
                ? 'bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-500/20'
                : 'bg-brand-600 hover:bg-brand-700 focus:ring-4 focus:ring-brand-500/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
