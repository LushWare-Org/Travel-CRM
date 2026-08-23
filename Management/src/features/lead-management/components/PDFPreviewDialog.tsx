import { useState, useEffect } from 'react';
import { X, Download, Loader2, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.lushtravelcloud.com/api/v1';

interface PDFPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  documentName?: string;
  // Only ever checked for truthiness to decide whether to show the Download
  // button - PDFPreviewDialog always runs its own internal handleDownload,
  // it never invokes this. Callers pass either a real callback
  // (VoucherDialog) or a bare boolean flag (InvoiceDialog's `onDownload`
  // shorthand) - both are pre-existing, real usages, so the type accepts both.
  onDownload?: boolean | (() => void);
  onBack?: () => void;
  documents?: unknown[];
  currentIndex?: number;
  onNavigate?: (index: number) => void;
}

const PDFPreviewDialog = ({
  isOpen,
  onClose,
  pdfUrl,
  documentName,
  onDownload,
  onBack,
  documents = [],
  currentIndex = 0,
  onNavigate,
}: PDFPreviewDialogProps) => {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && pdfUrl) {
      setLoading(true);
      // Revoke previous blob URL if exists
      if (pdfBlobUrl) {
        window.URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const fullUrl = pdfUrl.startsWith('http') ? pdfUrl : `${API_BASE_URL}${pdfUrl}`;

      if (!token) {
        console.error('No authentication token found. Please login again.');
        setLoading(false);
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      fetch(fullUrl, { headers })
        .then((response) => {
          if (!response.ok) {
            console.error(`HTTP Error: ${response.status}. Token: ${token ? 'present' : 'missing'}`);
            throw new Error('Failed to load PDF');
          }
          return response.blob();
        })
        .then((blob) => {
          const url = window.URL.createObjectURL(blob);
          setPdfBlobUrl(url);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error loading PDF:', error);
          setLoading(false);
        });
    }

    return () => {
      if (pdfBlobUrl) {
        window.URL.revokeObjectURL(pdfBlobUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pdfUrl]);

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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 w-full max-w-6xl h-full sm:h-[90vh] rounded-none sm:rounded-xl flex flex-col"
      >
        {/* Header */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-border flex items-center justify-between bg-primary rounded-t-none sm:rounded-t-xl">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={handleBack} className="text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground" title="Back to Form">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            )}
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-primary-foreground">PDF Preview</h2>
              <p className="text-primary-foreground/80 text-sm mt-1">
                {documentName || 'Document'}
                {canNavigate && (
                  <span className="ml-2 opacity-75">
                    ({currentIndex + 1} of {documents.length})
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {/* Navigation Buttons */}
            {canNavigate && (
              <div className="flex items-center gap-1 sm:gap-2 mr-1 sm:mr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevious}
                  disabled={!canGoPrevious}
                  className="text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground disabled:opacity-50"
                  title="Previous Document"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className="text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground disabled:opacity-50"
                  title="Next Document"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            )}
            {onDownload && pdfBlobUrl && !loading && (
              <Button variant="secondary" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            )}
            <button
              onClick={onClose}
              className="text-primary-foreground hover:opacity-80 transition-colors"
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
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading PDF...</span>
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
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Failed to load PDF</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PDFPreviewDialog;
