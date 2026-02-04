/**
 * Package Form Modal Component - Redesigned
 * Modern modal wrapper with glassmorphism and premium design
 */

import { X, Package } from 'lucide-react';

const PackageFormModal = ({
  isOpen,
  title,
  subtitle,
  children,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200/50">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-8 py-6">
          {/* Decorative pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full transform translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full transform -translate-x-1/2 translate-y-1/2" />
          </div>

          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{title}</h2>
                {subtitle && (
                  <div className="text-violet-100 mt-1 text-sm">
                    {typeof subtitle === 'string' ? <p>{subtitle}</p> : subtitle}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all text-white"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(92vh-120px)] bg-gradient-to-b from-slate-50 to-white">
          <div className="p-8">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default PackageFormModal;
