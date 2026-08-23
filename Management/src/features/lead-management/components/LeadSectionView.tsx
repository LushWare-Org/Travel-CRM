import { useState, useEffect } from 'react';
import {
  Loader2, Download, Eye, FileText, Receipt,
  FileCheck, Ticket, Clock, ExternalLink,
  Mail, Folder, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  quotationAPI,
  invoiceAPI,
  receiptAPI,
  voucherAPI,
} from '../../../services/api';
import toast from '@/lib/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type DocType = 'quotation' | 'invoice' | 'receipt' | 'voucher';
type TabKey = 'quotations' | 'invoices' | 'receipts' | 'vouchers';

interface Lead {
  _id?: string;
  id?: string;
  name: string;
  email?: string;
}

interface LeadSectionViewProps {
  lead: Lead | null;
  onClose: () => void;
}

const LeadSectionView = ({ lead, onClose }: LeadSectionViewProps) => {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Record<TabKey, any[]>>({
    quotations: [],
    invoices: [],
    receipts: [],
    vouchers: [],
  });
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfViewerType, setPdfViewerType] = useState<DocType | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('quotations');
  const [sendingDoc, setSendingDoc] = useState<{ id: string; type: DocType } | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ id: string; type: DocType } | null>(null);

  useEffect(() => {
    if (lead) {
      fetchDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead]);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const fetchDocuments = async () => {
    if (!lead) return;
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
      console.error('Error fetching documents:', error);
      toast.error('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (docId: string, type: DocType) => {
    setViewingDoc({ id: docId, type });
    try {
      let blob;

      if (type === 'quotation') {
        blob = await quotationAPI.getPDFBlob(docId);
      } else if (type === 'invoice') {
        blob = await invoiceAPI.getPDFBlob(docId);
      } else if (type === 'receipt') {
        blob = await receiptAPI.getPDFBlob(docId);
      } else if (type === 'voucher') {
        blob = await voucherAPI.getPDFBlob(docId);
      }

      if (!blob || !(blob instanceof Blob)) {
        throw new Error('Invalid PDF data received');
      }

      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfViewerType(type);
      setPdfViewerOpen(true);
    } catch (err) {
      console.error('View error:', err);
      toast.error('Failed to view document');
    } finally {
      setViewingDoc(null);
    }
  };

  const handleDownload = async (docId: string, type: DocType) => {
    try {
      if (type === 'quotation') {
        await quotationAPI.downloadPDF(docId);
      } else if (type === 'invoice') {
        await invoiceAPI.downloadPDF(docId);
      } else if (type === 'receipt') {
        await receiptAPI.downloadPDF(docId);
      } else if (type === 'voucher') {
        await voucherAPI.downloadPDF(docId);
      }
      toast.success('Download started');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download document');
    }
  };

  const handleSend = async (docId: string, type: DocType) => {
    if (!lead) return;
    setSendingDoc({ id: docId, type });
    try {
      if (type === 'quotation') {
        // Documents view is the verification surface — default to emailing the
        // lead's address; the full channel picker lives in the quotation modal.
        await quotationAPI.send(docId, { channel: 'email', ...(lead.email ? { email: lead.email } : {}) });
        toast.success('Quotation sent successfully');
      } else if (type === 'invoice') {
        await invoiceAPI.send(docId);
        toast.success('Invoice sent successfully');
      } else if (type === 'receipt') {
        await receiptAPI.send(docId);
        toast.success('Receipt sent successfully');
      } else if (type === 'voucher') {
        const email = lead.email || prompt('Enter email address:');
        if (email) {
          await voucherAPI.sendEmail(docId, email);
          toast.success('Voucher sent successfully');
        }
      }
    } catch (err) {
      console.error('Send error:', err);
      toast.error('Failed to send document');
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

  if (!lead) return null;

  const tabs: { key: TabKey; label: string; icon: LucideIcon; count: number }[] = [
    { key: 'quotations', label: 'Quotations', icon: FileText, count: documents.quotations.length },
    { key: 'invoices', label: 'Invoices', icon: Receipt, count: documents.invoices.length },
    { key: 'receipts', label: 'Receipts', icon: FileCheck, count: documents.receipts.length },
    { key: 'vouchers', label: 'Vouchers', icon: Ticket, count: documents.vouchers.length },
  ];

  const getDocType = (tabKey: TabKey): DocType => {
    const typeMap: Record<TabKey, DocType> = { quotations: 'quotation', invoices: 'invoice', receipts: 'receipt', vouchers: 'voucher' };
    return typeMap[tabKey];
  };

  const totalDocs = documents.quotations.length + documents.invoices.length +
    documents.receipts.length + documents.vouchers.length;

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-border space-y-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Folder className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <DialogTitle>Documents</DialogTitle>
                <DialogDescription>
                  {lead?.name} • {totalDocs} document{totalDocs !== 1 ? 's' : ''}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Tabs */}
          <div className="px-6 py-3 border-b border-border overflow-x-auto shrink-0">
            <div className="flex gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${isActive ? 'bg-primary-foreground/20' : 'bg-muted'}`}>
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
                <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mb-3" />
                <p className="text-muted-foreground">Loading documents...</p>
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
        </DialogContent>
      </Dialog>

      {/* PDF Viewer Modal */}
      <Dialog open={pdfViewerOpen && !!pdfUrl} onOpenChange={(open) => { if (!open) closePdfViewer(); }}>
        <DialogContent showCloseButton={false} className="max-w-5xl h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="font-semibold text-foreground capitalize">{pdfViewerType} Preview</span>
            </div>
            <div className="flex items-center gap-2">
              {pdfUrl && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Tab
                </a>
              )}
              <Button variant="ghost" size="icon" onClick={closePdfViewer}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          {pdfUrl && (
            <iframe
              src={pdfUrl}
              className="w-full flex-1"
              title="PDF Viewer"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

interface DocumentListProps {
  documents: any[];
  type: DocType;
  onView: (id: string, type: DocType) => void;
  onDownload: (id: string, type: DocType) => void;
  onSend: (id: string, type: DocType) => void;
  sendingDoc: { id: string; type: DocType } | null;
  viewingDoc: { id: string; type: DocType } | null;
}

// Document List Component
const DocumentList = ({ documents, type, onView, onDownload, onSend, sendingDoc, viewingDoc }: DocumentListProps) => {
  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <FileText className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground font-medium">No {type}s found</p>
        <p className="text-sm text-muted-foreground mt-1">Create a {type} to see it here</p>
      </div>
    );
  }

  const getDocumentNumber = (doc: any) => {
    return doc.quotationNumber || doc.invoiceNumber || doc.receiptNumber || doc.voucherNumber || 'N/A';
  };

  const formatDate = (doc: any) => {
    const date = doc.date || doc.issueDate || doc.createdAt;
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (doc: any) => {
    const amount = doc.totalAmount || doc.grandTotal || doc.amount;
    if (!amount) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: doc.currency || 'LKR',
    }).format(amount);
  };

  const statusClasses: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    sent: 'bg-primary/10 text-primary',
    paid: 'bg-success/10 text-success',
    pending: 'bg-warning/10 text-warning',
    cancelled: 'bg-destructive/10 text-destructive',
  };
  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    sent: 'Sent',
    paid: 'Paid',
    pending: 'Pending',
    cancelled: 'Cancelled',
  };

  const getStatusBadge = (status: string) => {
    const cls = statusClasses[status] || statusClasses.draft;
    const label = statusLabels[status] || statusLabels.draft;
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
        {label}
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
            className="p-4 bg-card border border-border rounded-lg hover:border-ring transition-colors"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">#{getDocumentNumber(doc)}</span>
                  {getStatusBadge(doc.status)}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(doc)}
                  </span>
                  {formatAmount(doc) && (
                    <span className="font-medium text-foreground">{formatAmount(doc)}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => onView(docId, type)} disabled={isViewing} title="View">
                  {isViewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  View
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDownload(docId, type)} title="Download">
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onSend(docId, type)} disabled={isSending} title="Send">
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LeadSectionView;
