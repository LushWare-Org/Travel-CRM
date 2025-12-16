import { useState, useEffect } from "react";
import { Loader2, Download, Send, Eye, X } from "lucide-react";
import {
  leadAPI,
  quotationAPI,
  invoiceAPI,
  receiptAPI,
  voucherAPI,
} from "../../../services/api";

const LeadSectionView = ({ lead, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [activeTab, setActiveTab] = useState("quotations");
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    if (!lead) return;

    const fetchDocuments = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await leadAPI.getLeadDocuments(lead._id || lead.id);
        if (res.success) {
          setQuotations(res.data.quotations || []);
          setInvoices(res.data.invoices || []);
          setReceipts(res.data.receipts || []);
          setVouchers(res.data.vouchers || []);
        } else {
          setError(res.message || "Failed to fetch documents");
        }
      } catch (err) {
        console.error(err);
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [lead]);

  const handleView = async (docId, type) => {
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

      // Create a blob URL for viewing
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfViewerOpen(true);
    } catch (err) {
      console.error("View error:", err);
      alert("Failed to view document: " + (err.message || "Unknown error"));
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
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to download document");
    }
  };

  const handleSend = async (docId, type) => {
    try {
      if (type === "quotation") {
        await quotationAPI.send(docId);
        alert("Quotation sent successfully!");
      } else if (type === "invoice") {
        await invoiceAPI.send(docId);
        alert("Invoice sent successfully!");
      } else if (type === "receipt") {
        await receiptAPI.send(docId);
        alert("Receipt sent successfully!");
      } else if (type === "voucher") {
        const email = lead.email || prompt("Enter email address:");
        if (email) {
          await voucherAPI.sendEmail(docId, email);
          alert("Voucher sent successfully!");
        }
      }
    } catch (err) {
      console.error("Send error:", err);
      alert("Failed to send document");
    }
  };

  const closePdfViewer = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setPdfViewerOpen(false);
  };

  if (!lead) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50">
        <div className="bg-white rounded-lg shadow-lg w-[90%] max-w-5xl p-6 overflow-auto max-h-[80vh]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {lead.name}'s Documents
              </h2>
              <p className="text-sm text-gray-600">
                Lead ID: {lead._id || lead.id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 font-semibold text-gray-700 transition-colors bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>

          <div className="flex gap-2 mb-6 overflow-x-auto">
            {[
              {
                key: "quotations",
                label: "Quotations",
                count: quotations.length,
              },
              { key: "invoices", label: "Invoices", count: invoices.length },
              { key: "receipts", label: "Receipts", count: receipts.length },
              { key: "vouchers", label: "Vouchers", count: vouchers.length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="ml-3 text-gray-600">Loading documents...</span>
            </div>
          )}

          {error && (
            <div className="p-4 text-red-700 border border-red-300 rounded-lg bg-red-50">
              <strong>Error:</strong> {error}
            </div>
          )}

          {!loading && !error && (
            <div className="mt-4">
              {activeTab === "quotations" && (
                <DocumentList
                  documents={quotations}
                  type="quotation"
                  onView={handleView}
                  onDownload={handleDownload}
                  onSend={handleSend}
                />
              )}
              {activeTab === "invoices" && (
                <DocumentList
                  documents={invoices}
                  type="invoice"
                  onView={handleView}
                  onDownload={handleDownload}
                  onSend={handleSend}
                />
              )}
              {activeTab === "receipts" && (
                <DocumentList
                  documents={receipts}
                  type="receipt"
                  onView={handleView}
                  onDownload={handleDownload}
                  onSend={handleSend}
                />
              )}
              {activeTab === "vouchers" && (
                <DocumentList
                  documents={vouchers}
                  type="voucher"
                  onView={handleView}
                  onDownload={handleDownload}
                  onSend={handleSend}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* PDF Viewer Modal */}
      {pdfViewerOpen && pdfUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
          <div className="relative bg-white rounded-lg shadow-2xl w-[95%] h-[95vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                Document Preview
              </h3>
              <button
                onClick={closePdfViewer}
                className="p-2 text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={pdfUrl}
                className="w-full h-full"
                title="PDF Viewer"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const DocumentList = ({ documents, type, onView, onDownload, onSend }) => {
  if (documents.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 rounded-lg bg-gray-50">
        <p className="text-lg">No {type}s available for this lead.</p>
      </div>
    );
  }

  const getDocumentNumber = (doc) => {
    return (
      doc.quotationNumber ||
      doc.invoiceNumber ||
      doc.receiptNumber ||
      doc.voucherNumber ||
      doc.documentNumber ||
      doc._id ||
      doc.id ||
      "N/A"
    );
  };

  const formatDate = (doc) => {
    const dateValue = doc.date || doc.issueDate || doc.createdAt;
    if (!dateValue) return "N/A";

    try {
      return new Date(dateValue).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const formatAmount = (doc) => {
    const amount = doc.totalAmount || doc.amount;
    if (!amount && amount !== 0) return "N/A";

    return `$${parseFloat(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      paid: "bg-green-100 text-green-800",
      sent: "bg-blue-100 text-blue-800",
      pending: "bg-yellow-100 text-yellow-800",
      draft: "bg-gray-100 text-gray-800",
      overdue: "bg-red-100 text-red-800",
    };

    const normalizedStatus = status?.toLowerCase() || "draft";
    const colorClass = statusConfig[normalizedStatus] || statusConfig.draft;

    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClass}`}
      >
        {normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)}
      </span>
    );
  };

  return (
    <div className="overflow-hidden border border-gray-200 rounded-lg shadow-sm">
      <div className="overflow-x-auto max-h-[50vh]">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-xs font-bold tracking-wider text-left text-gray-700 uppercase">
                #
              </th>
              <th className="px-4 py-3 text-xs font-bold tracking-wider text-left text-gray-700 uppercase">
                {type.charAt(0).toUpperCase() + type.slice(1)} Number
              </th>
              <th className="px-4 py-3 text-xs font-bold tracking-wider text-left text-gray-700 uppercase">
                Date
              </th>
              <th className="px-4 py-3 text-xs font-bold tracking-wider text-left text-gray-700 uppercase">
                Amount
              </th>
              <th className="px-4 py-3 text-xs font-bold tracking-wider text-left text-gray-700 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-bold tracking-wider text-center text-gray-700 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.map((doc, idx) => (
              <tr
                key={doc._id || doc.id}
                className="transition-colors hover:bg-gray-50"
              >
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {idx + 1}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                  {getDocumentNumber(doc)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {formatDate(doc)}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-emerald-600 whitespace-nowrap">
                  {formatAmount(doc)}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  {getStatusBadge(doc.status)}
                </td>
                <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onView(doc._id || doc.id, type)}
                      className="p-2 text-purple-600 transition-colors rounded-lg hover:bg-purple-50"
                      title="View PDF"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDownload(doc._id || doc.id, type)}
                      className="p-2 text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onSend(doc._id || doc.id, type)}
                      className="p-2 text-green-600 transition-colors rounded-lg hover:bg-green-50"
                      title="Send Email"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeadSectionView;
