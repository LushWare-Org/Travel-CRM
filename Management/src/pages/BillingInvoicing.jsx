import { useState, useEffect } from "react";
import { ArrowLeft, Search, Download, Eye, Send, MoreVertical, Receipt, FileText, FileCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import { invoiceAPI, receiptAPI, quotationAPI } from "../services/api.js";

const BillingInvoicing = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("quotations"); // 'quotations', 'invoices', or 'receipts'
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  
  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingReceipts, setLoadingReceipts] = useState(false);

  // Fetch quotations
  const fetchQuotations = async () => {
    try {
      setLoadingQuotations(true);
      const response = await quotationAPI.getAll({ limit: 100, page: 1 });
      if (response.success || response.status === 'success') {
        setQuotations(response.data || []);
      } else {
        toast.error('Failed to fetch quotations');
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
      toast.error('Failed to fetch quotations');
    } finally {
      setLoadingQuotations(false);
    }
  };

  // Fetch invoices
  const fetchInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const response = await invoiceAPI.getAll({ limit: 100, page: 1 });
      if (response.success || response.status === 'success') {
        setInvoices(response.data || []);
      } else {
        toast.error('Failed to fetch invoices');
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to fetch invoices');
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Fetch receipts
  const fetchReceipts = async () => {
    try {
      setLoadingReceipts(true);
      const response = await receiptAPI.getAll({ limit: 100, page: 1 });
      if (response.success || response.status === 'success') {
        setReceipts(response.data || []);
      } else {
        toast.error('Failed to fetch receipts');
      }
    } catch (error) {
      console.error('Error fetching receipts:', error);
      toast.error('Failed to fetch receipts');
    } finally {
      setLoadingReceipts(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
    fetchInvoices();
    fetchReceipts();
  }, []);

  // Filter quotations based on search
  const filteredQuotations = quotations.filter((quote) => {
    const customerName = quote.customer?.name || quote.lead?.name || '';
    const quotationNumber = quote.quotationNumber || '';
    const searchLower = searchTerm.toLowerCase();
    return (
      customerName.toLowerCase().includes(searchLower) ||
      quotationNumber.toLowerCase().includes(searchLower)
    );
  });

  // Filter invoices based on search
  const filteredInvoices = invoices.filter((inv) => {
    const customerName = inv.customer?.name || inv.lead?.name || '';
    const invoiceNumber = inv.invoiceNumber || '';
    const searchLower = searchTerm.toLowerCase();
    return (
      customerName.toLowerCase().includes(searchLower) ||
      invoiceNumber.toLowerCase().includes(searchLower)
    );
  });

  // Filter receipts based on search
  const filteredReceipts = receipts.filter((receipt) => {
    const customerName = receipt.customer?.name || receipt.lead?.name || '';
    const receiptNumber = receipt.receiptNumber || '';
    const searchLower = searchTerm.toLowerCase();
    return (
      customerName.toLowerCase().includes(searchLower) ||
      receiptNumber.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'N/A';
    return `INR ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleDownloadQuotationPDF = async (quotationId) => {
    try {
      await quotationAPI.downloadPDF(quotationId);
      toast.success('Quotation PDF downloaded');
    } catch (error) {
      console.error('Error downloading quotation PDF:', error);
      toast.error('Failed to download quotation PDF');
    }
  };

  const handleDownloadInvoicePDF = async (invoiceId) => {
    try {
      await invoiceAPI.downloadPDF(invoiceId);
      toast.success('Invoice PDF downloaded');
    } catch (error) {
      console.error('Error downloading invoice PDF:', error);
      toast.error('Failed to download invoice PDF');
    }
  };

  const handleDownloadReceiptPDF = async (receiptId) => {
    try {
      await receiptAPI.downloadPDF(receiptId);
      toast.success('Receipt PDF downloaded');
    } catch (error) {
      console.error('Error downloading receipt PDF:', error);
      toast.error('Failed to download receipt PDF');
    }
  };

  const handleSendQuotation = async (quotationId) => {
    try {
      await quotationAPI.send(quotationId);
      toast.success('Quotation sent successfully');
    } catch (error) {
      console.error('Error sending quotation:', error);
      toast.error('Failed to send quotation');
    }
  };

  const handleSendInvoice = async (invoiceId) => {
    try {
      await invoiceAPI.send(invoiceId);
      toast.success('Invoice sent successfully');
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.error('Failed to send invoice');
    }
  };

  const handleSendReceipt = async (receiptId) => {
    try {
      await receiptAPI.send(receiptId);
      toast.success('Receipt sent successfully');
    } catch (error) {
      console.error('Error sending receipt:', error);
      toast.error('Failed to send receipt');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm z-10">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Billing & Invoicing</h1>
            <p className="text-gray-600 mt-1">Manage quotations, invoices, and payment receipts</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("quotations")}
            className={`px-4 py-2 font-medium transition-colors relative ${
              activeTab === "quotations"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              Quotations ({quotations.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-4 py-2 font-medium transition-colors relative ${
              activeTab === "invoices"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Invoices ({invoices.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab("receipts")}
            className={`px-4 py-2 font-medium transition-colors relative ${
              activeTab === "receipts"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Receipts ({receipts.length})
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Search */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab === "quotations" ? "quotations" : activeTab === "invoices" ? "invoices" : "receipts"} by customer name or ${activeTab === "quotations" ? "quotation" : activeTab === "invoices" ? "invoice" : "receipt"} number...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Quotations List */}
        {activeTab === "quotations" && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Quotation List</h2>
              <p className="text-sm text-gray-600 mt-1">All quotations ({filteredQuotations.length})</p>
            </div>

            {loadingQuotations ? (
              <div className="p-8 text-center text-gray-500">Loading quotations...</div>
            ) : filteredQuotations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No quotations found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Quotation Number</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Lead ID</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Issue Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Valid Until</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuotations.map((quotation) => (
                      <tr key={quotation._id || quotation.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-900">{quotation.quotationNumber || 'N/A'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {quotation.customer?.name || quotation.lead?.name || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {quotation.customer?.email || quotation.lead?.email || ''}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {quotation.lead?._id || quotation.lead?.id || quotation.lead || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-gray-900">{formatCurrency(quotation.totalAmount)}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-700">{formatDate(quotation.issueDate || quotation.createdAt)}</td>
                        <td className="py-3 px-4 text-gray-700">{formatDate(quotation.validUntil)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            quotation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                            quotation.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            quotation.status === 'converted' ? 'bg-blue-100 text-blue-800' :
                            quotation.status === 'expired' ? 'bg-gray-100 text-gray-800' :
                            quotation.status === 'sent' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {quotation.status?.charAt(0).toUpperCase() + quotation.status?.slice(1) || 'Draft'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => setSelectedQuotation(quotation)}
                              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadQuotationPDF(quotation._id || quotation.id)}
                              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSendQuotation(quotation._id || quotation.id)}
                              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
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
            )}
          </div>
        )}

        {/* Invoices List */}
        {activeTab === "invoices" && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Invoice List</h2>
              <p className="text-sm text-gray-600 mt-1">All invoices ({filteredInvoices.length})</p>
            </div>

            {loadingInvoices ? (
              <div className="p-8 text-center text-gray-500">Loading invoices...</div>
            ) : filteredInvoices.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No invoices found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Invoice Number</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Lead ID</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Amount</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Paid Amount</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Outstanding</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Issue Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Due Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice._id || invoice.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-900">{invoice.invoiceNumber || 'N/A'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {invoice.customer?.name || invoice.lead?.name || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {invoice.customer?.email || invoice.lead?.email || ''}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {invoice.lead?._id || invoice.lead?.id || invoice.lead || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-gray-900">{formatCurrency(invoice.totalAmount)}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-gray-700">{formatCurrency(invoice.paidAmount)}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-gray-700">{formatCurrency(invoice.outstandingAmount)}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-700">{formatDate(invoice.createdAt)}</td>
                        <td className="py-3 px-4 text-gray-700">{formatDate(invoice.dueDate)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                            invoice.status === 'partial' ? 'bg-blue-100 text-blue-800' :
                            invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            invoice.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1) || 'Draft'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => setSelectedInvoice(invoice)}
                              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadInvoicePDF(invoice._id || invoice.id)}
                              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSendInvoice(invoice._id || invoice.id)}
                              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
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
            )}
          </div>
        )}

        {/* Receipts List */}
        {activeTab === "receipts" && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Payment Receipt List</h2>
              <p className="text-sm text-gray-600 mt-1">All payment receipts ({filteredReceipts.length})</p>
            </div>

            {loadingReceipts ? (
              <div className="p-8 text-center text-gray-500">Loading receipts...</div>
            ) : filteredReceipts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No receipts found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Receipt Number</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Lead ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Invoice Number</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Payment Method</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Payment Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReceipts.map((receipt) => (
                      <tr key={receipt._id || receipt.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-900">{receipt.receiptNumber || 'N/A'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {receipt.customer?.name || receipt.lead?.name || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {receipt.customer?.email || receipt.lead?.email || ''}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {receipt.lead?._id || receipt.lead?.id || receipt.lead || 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-gray-700">
                            {receipt.invoice?.invoiceNumber || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-gray-900">{formatCurrency(receipt.amount)}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {receipt.paymentMethod ? receipt.paymentMethod.charAt(0).toUpperCase() + receipt.paymentMethod.slice(1) : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-gray-700">{formatDate(receipt.paymentDate)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            receipt.receiptStatus === 'paid-in-full' ? 'bg-green-100 text-green-800' :
                            receipt.receiptStatus === 'partial-payment' ? 'bg-blue-100 text-blue-800' :
                            receipt.receiptStatus === 'refunded' ? 'bg-red-100 text-red-800' :
                            receipt.receiptStatus === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {receipt.receiptStatus?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Pending'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => setSelectedReceipt(receipt)}
                              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadReceiptPDF(receipt._id || receipt.id)}
                              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSendReceipt(receipt._id || receipt.id)}
                              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
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
            )}
          </div>
        )}
      </div>

      {/* Quotation Detail Modal */}
      {selectedQuotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Quotation {selectedQuotation.quotationNumber}</h2>
                <p className="text-gray-600 mt-1">Quotation details</p>
              </div>
              <button
                onClick={() => setSelectedQuotation(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-200">
                <div>
                  <p className="text-xs text-gray-500 font-medium">QUOTE TO</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {selectedQuotation.customer?.name || selectedQuotation.lead?.name || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {selectedQuotation.customer?.email || selectedQuotation.lead?.email || ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 font-medium mb-1">
                    Issue Date: {formatDate(selectedQuotation.issueDate || selectedQuotation.createdAt)}
                  </p>
                  <p className="text-xs text-gray-500 font-medium mb-1">
                    Valid Until: {formatDate(selectedQuotation.validUntil)}
                  </p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${
                    selectedQuotation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                    selectedQuotation.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    selectedQuotation.status === 'converted' ? 'bg-blue-100 text-blue-800' :
                    selectedQuotation.status === 'expired' ? 'bg-gray-100 text-gray-800' :
                    selectedQuotation.status === 'sent' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedQuotation.status?.toUpperCase() || 'DRAFT'}
                  </span>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-700">Subtotal:</span>
                    <span className="text-gray-900 font-semibold">{formatCurrency(selectedQuotation.subtotal)}</span>
                  </div>
                  {selectedQuotation.taxAmount > 0 && (
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-700">Tax:</span>
                      <span className="text-gray-900 font-semibold">{formatCurrency(selectedQuotation.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-3 bg-gray-50 px-3 rounded-lg">
                    <span className="text-gray-900 font-bold">Total:</span>
                    <span className="text-lg font-bold text-blue-600">{formatCurrency(selectedQuotation.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleDownloadQuotationPDF(selectedQuotation._id || selectedQuotation.id)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                <button
                  onClick={() => handleSendQuotation(selectedQuotation._id || selectedQuotation.id)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Invoice {selectedInvoice.invoiceNumber}</h2>
                <p className="text-gray-600 mt-1">Invoice details and payment information</p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-200">
                <div>
                  <p className="text-xs text-gray-500 font-medium">BILL TO</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {selectedInvoice.customer?.name || selectedInvoice.lead?.name || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {selectedInvoice.customer?.email || selectedInvoice.lead?.email || ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 font-medium mb-1">
                    Issue Date: {formatDate(selectedInvoice.createdAt)}
                  </p>
                  <p className="text-xs text-gray-500 font-medium mb-1">
                    Due Date: {formatDate(selectedInvoice.dueDate)}
                  </p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${
                    selectedInvoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                    selectedInvoice.status === 'partial' ? 'bg-blue-100 text-blue-800' :
                    selectedInvoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedInvoice.status?.toUpperCase() || 'DRAFT'}
                  </span>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-700">Subtotal:</span>
                    <span className="text-gray-900 font-semibold">{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  {selectedInvoice.taxAmount > 0 && (
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-700">Tax:</span>
                      <span className="text-gray-900 font-semibold">{formatCurrency(selectedInvoice.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-3 bg-gray-50 px-3 rounded-lg">
                    <span className="text-gray-900 font-bold">Total:</span>
                    <span className="text-lg font-bold text-blue-600">{formatCurrency(selectedInvoice.totalAmount)}</span>
                  </div>
                  {selectedInvoice.paidAmount > 0 && (
                    <div className="flex justify-between py-2 border-t border-gray-200 mt-2">
                      <span className="text-gray-700">Paid:</span>
                      <span className="text-green-600 font-semibold">{formatCurrency(selectedInvoice.paidAmount)}</span>
                    </div>
                  )}
                  {selectedInvoice.outstandingAmount > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Outstanding:</span>
                      <span className="text-red-600 font-semibold">{formatCurrency(selectedInvoice.outstandingAmount)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleDownloadInvoicePDF(selectedInvoice._id || selectedInvoice.id)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                <button
                  onClick={() => handleSendInvoice(selectedInvoice._id || selectedInvoice.id)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Detail Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Receipt {selectedReceipt.receiptNumber}</h2>
                <p className="text-gray-600 mt-1">Payment receipt details</p>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-200">
                <div>
                  <p className="text-xs text-gray-500 font-medium">PAYMENT FROM</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {selectedReceipt.customer?.name || selectedReceipt.lead?.name || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {selectedReceipt.customer?.email || selectedReceipt.lead?.email || ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 font-medium mb-1">
                    Payment Date: {formatDate(selectedReceipt.paymentDate)}
                  </p>
                  <p className="text-xs text-gray-500 font-medium mb-1">
                    Payment Method: {selectedReceipt.paymentMethod ? selectedReceipt.paymentMethod.charAt(0).toUpperCase() + selectedReceipt.paymentMethod.slice(1) : 'N/A'}
                  </p>
                  {selectedReceipt.invoice?.invoiceNumber && (
                    <p className="text-xs text-gray-500 font-medium mb-1">
                      Invoice: {selectedReceipt.invoice.invoiceNumber}
                    </p>
                  )}
                </div>
              </div>

              {/* Amount */}
              <div className="flex justify-center">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Payment Amount</p>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(selectedReceipt.amount)}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleDownloadReceiptPDF(selectedReceipt._id || selectedReceipt.id)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                <button
                  onClick={() => handleSendReceipt(selectedReceipt._id || selectedReceipt.id)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingInvoicing;
