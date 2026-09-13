import { Download, Send } from 'lucide-react';
import { formatCurrency } from '../../utils/currency.js';
import StatusBadge from './StatusBadge';
import { getDocumentNumber, getDocumentStatus } from './helpers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { BillingDocument, DocumentType, Invoice, Receipt, Voucher, PaymentHistoryRecord } from './types';

const TYPE_LABELS: Record<DocumentType, string> = {
  quotation: 'Quotation',
  invoice: 'Invoice',
  receipt: 'Receipt',
  voucher: 'Voucher',
  'payment-history': 'Payment History',
};

interface DocumentDetailDialogProps {
  documentType: DocumentType;
  open: boolean;
  onClose: () => void;
  data: BillingDocument | null;
  formatDate: (value?: string) => string;
  onDownload: () => void;
  onSend?: () => void;
}

export default function DocumentDetailDialog({
  documentType,
  open,
  onClose,
  data,
  formatDate,
  onDownload,
  onSend,
}: DocumentDetailDialogProps) {
  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{TYPE_LABELS[documentType]}</p>
          <DialogTitle className="font-mono text-lg">{getDocumentNumber(documentType, data)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{documentType === 'receipt' ? 'Payment From' : 'Customer'}</p>
              <p className="font-semibold text-foreground">{data.customerName || 'N/A'}</p>
              {data.customerEmail && <p className="text-xs text-muted-foreground">{data.customerEmail}</p>}
            </div>
            <StatusBadge documentType={documentType} status={getDocumentStatus(documentType, data)} />
          </div>

          {documentType === 'quotation' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-muted/50 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Issue Date</p>
                  <p className="font-mono text-sm tabular-nums text-foreground">{formatDate((data as { issueDate?: string; createdAt?: string }).issueDate || data.createdAt)}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/50 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Valid Until</p>
                  <p className="font-mono text-sm tabular-nums text-foreground">{formatDate((data as { validUntil?: string }).validUntil)}</p>
                </div>
              </div>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 text-center">
                <p className="mb-1 text-sm text-primary">Total Amount</p>
                <p className="font-mono text-3xl font-bold tabular-nums text-primary">
                  {formatCurrency((data as { totalAmount: number }).totalAmount)}
                </p>
              </div>
            </>
          )}

          {documentType === 'invoice' && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
                <p className="mb-1 text-xs text-muted-foreground">Total</p>
                <p className="font-mono text-sm font-bold tabular-nums text-foreground">{formatCurrency((data as Invoice).totalAmount)}</p>
              </div>
              <div className="rounded-lg border border-success/20 bg-success/10 p-4 text-center">
                <p className="mb-1 text-xs text-success">Paid</p>
                <p className="font-mono text-sm font-bold tabular-nums text-success">{formatCurrency((data as Invoice).paidAmount)}</p>
              </div>
              <div className="rounded-lg border border-warning/20 bg-warning/10 p-4 text-center">
                <p className="mb-1 text-xs text-warning">Due</p>
                <p className="font-mono text-sm font-bold tabular-nums text-warning">{formatCurrency((data as Invoice).outstandingAmount)}</p>
              </div>
            </div>
          )}

          {documentType === 'receipt' && (
            <div className="rounded-lg border border-success/20 bg-success/10 p-6 text-center">
              <p className="mb-1 text-sm text-success">Payment Amount</p>
              <p className="font-mono text-3xl font-bold tabular-nums text-success">{formatCurrency((data as Receipt).amount)}</p>
              {(data as Receipt).paymentMethod && (
                <p className="mt-2 text-xs capitalize text-success/80">{(data as Receipt).paymentMethod}</p>
              )}
            </div>
          )}

          {documentType === 'voucher' && (
            <>
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="mb-2 text-xs text-muted-foreground">Package</p>
                <p className="font-semibold text-foreground">{(data as Voucher).packageDetails?.name || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-muted/50 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Travel Start</p>
                  <p className="font-mono text-sm tabular-nums text-foreground">{formatDate((data as Voucher).travelStartDate)}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/50 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Travel End</p>
                  <p className="font-mono text-sm tabular-nums text-foreground">{formatDate((data as Voucher).travelEndDate)}</p>
                </div>
              </div>
            </>
          )}

          {documentType === 'payment-history' && (
            <>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 text-center">
                <p className="mb-1 text-sm text-primary">Payment Amount</p>
                <p className="font-mono text-3xl font-bold tabular-nums text-primary">{formatCurrency((data as PaymentHistoryRecord).amount)}</p>
                <p className="mt-2 font-mono text-xs tabular-nums text-primary/80">{formatDate((data as PaymentHistoryRecord).paymentDate)}</p>
              </div>
              {(data as PaymentHistoryRecord).notes && (
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <p className="mb-2 text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm text-foreground">{(data as PaymentHistoryRecord).notes}</p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onDownload} className="w-full sm:w-auto">
            <Download className="h-4 w-4" /> Download
          </Button>
          {onSend && (
            <Button onClick={onSend} className="w-full sm:w-auto">
              <Send className="h-4 w-4" /> Send
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
