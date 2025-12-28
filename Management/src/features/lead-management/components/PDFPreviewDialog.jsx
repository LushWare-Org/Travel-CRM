import { useState, useEffect } from 'react';
import { X, Download, Loader2, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const PDFPreviewDialog = ({ 
  isOpen, 
  onClose, 
  pdfUrl, 
  documentName, 
  onDownload,
  onBack,
  documents = [],
  currentIndex = 0,
  onNavigate
}) => {
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && pdfUrl) {
      setLoading(true);
      // Revoke previous blob URL if exists
      if (pdfBlobUrl) {
        window.URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }

      const token = localStorage.getItem('token');
      const fullUrl = pdfUrl.startsWith('http') ? pdfUrl : `${API_BASE_URL}${pdfUrl}`;

      fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(response => {
          if (!response.ok) throw new Error('Failed to load PDF');
          return response.blob();
        })
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          setPdfBlobUrl(url);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error loading PDF:', error);
          setLoading(false);
        });
    }

    return () => {
      if (pdfBlobUrl) {
        window.URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [isOpen, pdfUrl]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (pdfBlobUrl) {
      const link = document.createElement('a');
      link.href = pdfBlobUrl;
      link.download = `${documentName || 'document'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0 && onNavigate) {
      onNavigate(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < documents.length - 1 && onNavigate) {
      onNavigate(currentIndex + 1);
    }
  };

  const canNavigate = documents.length > 1;
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < documents.length - 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded transition-colors font-medium"
                title="Back to Form"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <div>
              <h2 className="text-2xl font-bold text-white">PDF Preview</h2>
              <p className="text-blue-100 text-sm mt-1">
                {documentName || 'Document'}
                {canNavigate && (
                  <span className="ml-2 opacity-75">
                    ({currentIndex + 1} of {documents.length})
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Navigation Buttons */}
            {canNavigate && (
              <div className="flex items-center gap-2 mr-2">
                <button
                  onClick={handlePrevious}
                  disabled={!canGoPrevious}
                  className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous Document"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next Document"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
            {onDownload && pdfBlobUrl && !loading && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded hover:bg-blue-50 transition-colors font-medium"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-hidden relative">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading PDF...</span>
            </div>
          ) : pdfBlobUrl ? (
            <iframe
              src={pdfBlobUrl}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Failed to load PDF</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFPreviewDialog;

