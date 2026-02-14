import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, MapPin, Calendar, Banknote, Users, X } from 'lucide-react';
import { formatPriceINR } from '../utils/helpers';

const FALLBACK_FILE_NAME = 'travel-itinerary.pdf';

const PackagePDFPreviewDialog = ({
  isOpen,
  onClose,
  pdfBlob,
  fileName = FALLBACK_FILE_NAME,
  onDownload,
  packageData,
  isGenerating = false,
}) => {
  const [previewUrl, setPreviewUrl] = useState(null);

  const summaryItems = useMemo(() => {
    if (!packageData) return [];

    return [
      {
        label: 'Destination',
        value: packageData.destination || 'Not specified',
        icon: MapPin,
      },
      {
        label: 'Duration',
        value: packageData.duration ? `${packageData.duration} days` : 'Not specified',
        icon: Calendar,
      },
      {
        label: 'Package Price',
        value: formatPriceINR(packageData.price) || 'On request',
        icon: Banknote,
      },
      {
        label: 'Group Size',
        value: packageData.maxGroupSize ? `${packageData.maxGroupSize} guests` : 'Flexible',
        icon: Users,
      },
    ].filter((item) => !!item.value);
  }, [packageData]);

  useEffect(() => {
    if (!isOpen) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      return;
    }

    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setPreviewUrl(url);
      return () => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      };
    } else {
      setPreviewUrl(null);
    }
  }, [isOpen, pdfBlob]);

  if (!isOpen) {
    return null;
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }

    if (!pdfBlob) return;

    const link = document.createElement('a');
    link.href = previewUrl || URL.createObjectURL(pdfBlob);
    link.download = fileName || FALLBACK_FILE_NAME;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (!previewUrl) {
      URL.revokeObjectURL(link.href);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 px-0 py-0 sm:px-4 sm:py-6 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-none sm:rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-sky-700 via-sky-600 to-indigo-600 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3 text-white min-w-0">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur shrink-0">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-semibold tracking-wide">Itinerary Preview</h2>
              <p className="text-xs sm:text-sm text-white/80 truncate">
                {packageData?.name || 'Travel package'} · {fileName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={handleDownload}
              disabled={!pdfBlob || isGenerating}
              className="flex items-center gap-1 sm:gap-2 rounded-lg bg-white px-2 sm:px-4 py-2 font-semibold text-sky-600 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 text-sm"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-white transition hover:bg-white/20"
              aria-label="Close preview"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col lg:flex-row">
          {/* Preview Area */}
          <div className="relative flex-1 bg-gray-100">
            {isGenerating ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-gray-500">
                <div className="flex h-16 w-16 animate-spin items-center justify-center rounded-full border-4 border-sky-500 border-t-transparent"></div>
                <p className="text-lg font-medium">Crafting your premium itinerary...</p>
                <p className="text-sm text-gray-400">
                  This usually takes just a few seconds. We're styling the document for you.
                </p>
              </div>
            ) : previewUrl ? (
              <iframe
                key={previewUrl}
                src={previewUrl}
                title="Package PDF Preview"
                className="h-full w-full"
                style={{ border: 'none' }}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-500">
                <FileText className="h-12 w-12" />
                <p className="text-lg font-medium">Preview unavailable</p>
                <p className="max-w-sm text-center text-sm text-gray-400">
                  We couldn't render the PDF preview. Try downloading the itinerary instead.
                </p>
              </div>
            )}
          </div>

          {/* Summary Sidebar */}
          <aside className="w-full border-t border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-inner lg:w-80 lg:border-l lg:border-t-0">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <FileText className="h-5 w-5 text-sky-500" />
              Package Snapshot
            </h3>
            <p className="mt-1 text-xs uppercase tracking-wide text-gray-400">
              Auto-filled from your package details
            </p>

            <div className="mt-4 space-y-3">
              {summaryItems.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-3"
                >
                  <div className="mt-0.5 rounded-lg bg-white p-2 shadow-sm">
                    <Icon className="h-4 w-4 text-sky-500" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
                    <p className="text-sm font-semibold text-gray-800">{value}</p>
                  </div>
                </div>
              ))}

              {packageData?.highlights?.length ? (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-500">
                    Signature Highlights
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-indigo-900">
                    {packageData.highlights.slice(0, 4).map((highlight, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                    {packageData.highlights.length > 4 && (
                      <li className="mt-1 text-xs italic text-indigo-500">
                        +{packageData.highlights.length - 4} more curated experiences
                      </li>
                    )}
                  </ul>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-sky-200 px-4 py-3 text-xs text-sky-600">
                  Add highlights to your package to showcase unique experiences on the cover page.
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default PackagePDFPreviewDialog;


