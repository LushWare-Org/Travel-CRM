import { useState, useEffect } from "react";
import {
  Loader2, Download, Eye, X, FileText, Receipt,
  FileCheck, Ticket, Clock, DollarSign, Hash, ExternalLink,
  Mail, CheckCircle, AlertCircle, XCircle, Send,
  Folder
} from "lucide-react";
import {
  leadAPI,
  quotationAPI,
  invoiceAPI,
  receiptAPI,
  voucherAPI,
} from "../../../services/api";
import toast from 'react-hot-toast';

const LeadSectionView = ({ lead, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState({
    quotations: [],
    invoices: [],
    receipts: [],
    vouchers: [],
  });
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfViewerType, setPdfViewerType] = useState(null);
  const [activeTab, setActiveTab] = useState('quotations');
  const [sendingDoc, setSendingDoc] = useState(null);
  const [viewingDoc, setViewingDoc] = useState(null);

  useEffect(() => {
    if (lead) {
      fetchDocuments();
    }
  }, [lead]);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const leadId = lead._id || lead.id;
      const [quotationsRes, invoicesRes, receiptsRes, vouchersRes] =
        await Promise.all([
          quotationAPI.getByLead(leadId),
          invoiceAPI.getByLead(leadId),
          receiptAPI.getByLead(leadId),
          voucherAPI.getByLead(leadId),
        ]);
      setDocuments({
        quotations: quotationsRes?.data || [],
        invoices: invoicesRes?.data || [],
        receipts: receiptsRes?.data || [],
        vouchers: vouchersRes?.data || [],
      });
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (docId, type) => {
    setViewingDoc({ id: docId, type });
    try {
      let blob;

      if (type === "quotation") {
        blob = await quotationAPI.getPDFBlob(docId);
      } else if (type === "invoice") {
        blob = await invoiceAPI.getPDFBlob(docId);
      } else if (type === "receipt") {
        blob = await receiptAPI.getPDFBlob(docId);
      } else if (type === "voucher") {
        blob = await voucherAPI.getPDFBlob(docId);
      }

      if (!blob || !(blob instanceof Blob)) {
        throw new Error("Invalid PDF data received");
      }

      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfViewerType(type);
      setPdfViewerOpen(true);
    } catch (err) {
      console.error("View error:", err);
      toast.error("Failed to view document");
    } finally {
      setViewingDoc(null);
    }
  };

  const handleDownload = async (docId, type) => {
    try {
      if (type === "quotation") {
        await quotationAPI.downloadPDF(docId);
      } else if (type === "invoice") {
        await invoiceAPI.downloadPDF(docId);
      } else if (type === "receipt") {
        await receiptAPI.downloadPDF(docId);
      } else if (type === "voucher") {
        await voucherAPI.downloadPDF(docId);
      }
      toast.success("Download started");
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to download document");
    }
  };

  const handleSend = async (docId, type) => {
    setSendingDoc({ id: docId, type });
    try {
      if (type === "quotation") {
        await quotationAPI.send(docId);
        toast.success("Quotation sent successfully");
      } else if (type === "invoice") {
        await invoiceAPI.send(docId);
        toast.success("Invoice sent successfully");
      } else if (type === "receipt") {
        await receiptAPI.send(docId);
        toast.success("Receipt sent successfully");
      } else if (type === "voucher") {
        const email = lead.email || prompt("Enter email address:");
        if (email) {
          await voucherAPI.sendEmail(docId, email);
          toast.success("Voucher sent successfully");
        }
      }
    } catch (err) {
      console.error("Send error:", err);
      toast.error("Failed to send document");
    } finally {
      setSendingDoc(null);
    }
  };

  const closePdfViewer = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setPdfViewerOpen(false);
    setPdfViewerType(null);
  };

  const tabs = [
    { key: 'quotations', label: 'Quotations', icon: FileText, count: documents.quotations.length },
    { key: 'invoices', label: 'Invoices', icon: Receipt, count: documents.invoices.length },
    { key: 'receipts', label: 'Receipts', icon: FileCheck, count: documents.receipts.length },
    { key: 'vouchers', label: 'Vouchers', icon: Ticket, count: documents.vouchers.length },
  ];

  const getDocType = (tabKey) => {
    const typeMap = { quotations: 'quotation', invoices: 'invoice', receipts: 'receipt', vouchers: 'voucher' };
    return typeMap[tabKey];
  };

  const totalDocs = documents.quotations.length + documents.invoices.length +
    documents.receipts.length + documents.vouchers.length;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={() => onClose()}
    >
      <div
        className="bg-white rounded-xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Folder className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
              <p className="text-sm text-gray-500">
                {lead?.name} • {totalDocs} document{totalDocs !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 py-3 border-b border-gray-100 overflow-x-auto">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs ${isActive ? 'bg-white/20' : 'bg-gray-100'
                    }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-3" />
              <p className="text-gray-500">Loading documents...</p>
            </div>
          ) : (
            <DocumentList
              documents={documents[activeTab]}
              type={getDocType(activeTab)}
              onView={handleView}
              onDownload={handleDownload}
              onSend={handleSend}
              sendingDoc={sendingDoc}
              viewingDoc={viewingDoc}
            />
          )}
        </div>
      </div>

      {/* PDF Viewer Modal */}
      {pdfViewerOpen && pdfUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]"
          onClick={closePdfViewer}
        >
          <div
            className="bg-white rounded-xl w-full max-w-5xl h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-600" />
                <span className="font-semibold text-gray-900 capitalize">{pdfViewerType} Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Tab
                </a>
                <button
                  onClick={closePdfViewer}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <iframe
              src={pdfUrl}
              className="w-full h-[calc(100%-70px)]"
              title="PDF Viewer"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Document List Component
const DocumentList = ({ documents, type, onView, onDownload, onSend, sendingDoc, viewingDoc }) => {
  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <FileText className="w-12 h-12 text-gray-200 mb-4" />
        <p className="text-gray-500 font-medium">No {type}s found</p>
        <p className="text-sm text-gray-400 mt-1">Create a {type} to see it here</p>
      </div>
    );
  }

  const getDocumentNumber = (doc) => {
    return doc.quotationNumber || doc.invoiceNumber || doc.receiptNumber || doc.voucherNumber || "N/A";
  };

  const formatDate = (doc) => {
    const date = doc.date || doc.issueDate || doc.createdAt;
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatAmount = (doc) => {
    const amount = doc.totalAmount || doc.grandTotal || doc.amount;
    if (!amount) return null;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: doc.currency || "LKR",
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Draft' },
      sent: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Sent' },
      paid: { bg: 'bg-green-50', text: 'text-green-600', label: 'Paid' },
      pending: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Pending' },
      cancelled: { bg: 'bg-red-50', text: 'text-red-600', label: 'Cancelled' },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {documents.map((doc) => {
        const docId = doc._id || doc.id;
        const isSending = sendingDoc?.id === docId && sendingDoc?.type === type;
        const isViewing = viewingDoc?.id === docId && viewingDoc?.type === type;

        return (
          <div
            key={docId}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">#{getDocumentNumber(doc)}</span>
                  {getStatusBadge(doc.status)}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(doc)}
                  </span>
                  {formatAmount(doc) && (
                    <span className="font-medium text-gray-700">{formatAmount(doc)}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onView(docId, type)}
                  disabled={isViewing}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  title="View"
                >
                  {isViewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  View
                </button>
                <button
                  onClick={() => onDownload(docId, type)}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onSend(docId, type)}
                  disabled={isSending}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  title="Send"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LeadSectionView;
