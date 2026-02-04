import { useState, useEffect } from "react";
import { Search, Download, Eye, Send, Receipt, FileText, FileCheck, ExternalLink, Ticket, History, Calendar, X, ChevronRight, Sparkles, Filter, DollarSign, CreditCard, TrendingUp } from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { invoiceAPI, receiptAPI, quotationAPI, voucherAPI, paymentHistoryAPI } from "../services/api.js";

/**
 * BillingInvoicing - Redesigned
 * Modern layout with left sidebar navigation and card-based data display
 */
const BillingInvoicing = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("quotations");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [selectedPaymentHistory, setSelectedPaymentHistory] = useState(null);

  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Tab configuration
  const tabs = [
    { id: 'quotations', label: 'Quotations', shortLabel: 'Quotes', icon: FileCheck, color: 'blue', gradient: 'from-blue-500 to-indigo-600', count: quotations.length },
    { id: 'invoices', label: 'Invoices', shortLabel: 'Invoices', icon: FileText, color: 'emerald', gradient: 'from-emerald-500 to-teal-600', count: invoices.length },
    { id: 'receipts', label: 'Receipts', shortLabel: 'Receipts', icon: Receipt, color: 'violet', gradient: 'from-violet-500 to-purple-600', count: receipts.length },
    { id: 'vouchers', label: 'Vouchers', shortLabel: 'Vouchers', icon: Ticket, color: 'amber', gradient: 'from-amber-500 to-orange-600', count: vouchers.length },
    { id: 'payment-history', label: 'Payment History', shortLabel: 'History', icon: History, color: 'cyan', gradient: 'from-cyan-500 to-sky-600', count: paymentHistory.length },
  ];

  const currentTab = tabs.find(t => t.id === activeTab);

  // Fetch functions (preserved from original)
  const fetchQuotations = async () => {
    try {
      setLoadingQuotations(true);
      const params = { limit: 100, page: 1 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await quotationAPI.getAll(params);
      if (response.success || response.status === 'success') {
        setQuotations(response.data || []);
      } else {
        toast.error("Failed to fetch quotations");
      }
    } catch (error) {
      console.error("Error fetching quotations:", error);
      toast.error("Failed to fetch quotations");
    } finally {
      setLoadingQuotations(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const params = { limit: 100, page: 1 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await invoiceAPI.getAll(params);
      if (response.success || response.status === 'success') {
        setInvoices(response.data || []);
      } else {
        toast.error("Failed to fetch invoices");
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to fetch invoices");
    } finally {
      setLoadingInvoices(false);
    }
  };

  const fetchReceipts = async () => {
    try {
      setLoadingReceipts(true);
      const params = { limit: 100, page: 1 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await receiptAPI.getAll(params);
      if (response.success || response.status === 'success') {
        setReceipts(response.data || []);
      } else {
        toast.error("Failed to fetch receipts");
      }
    } catch (error) {
      console.error("Error fetching receipts:", error);
      toast.error("Failed to fetch receipts");
    } finally {
      setLoadingReceipts(false);
    }
  };

  const fetchVouchers = async () => {
    try {
      setLoadingVouchers(true);
      const params = { limit: 100, page: 1 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await voucherAPI.getAll(params);
      if (response.success || response.status === 'success') {
        setVouchers(response.data || []);
      } else {
        toast.error("Failed to fetch vouchers");
      }
    } catch (error) {
      console.error("Error fetching vouchers:", error);
      toast.error("Failed to fetch vouchers");
    } finally {
      setLoadingVouchers(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      setLoadingPaymentHistory(true);
      const params = { limit: 100, page: 1 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await paymentHistoryAPI.getAll(params);
      if (response.success || response.status === 'success') {
        setPaymentHistory(response.data || []);
      } else {
        toast.error('Failed to fetch payment history');
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast.error('Failed to fetch payment history');
    } finally {
      setLoadingPaymentHistory(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
    fetchInvoices();
    fetchReceipts();
    fetchVouchers();
    fetchPaymentHistory();
  }, []);

  useEffect(() => {
    if (activeTab === 'quotations') fetchQuotations();
    if (activeTab === 'invoices') fetchInvoices();
    if (activeTab === 'receipts') fetchReceipts();
    if (activeTab === 'vouchers') fetchVouchers();
    if (activeTab === 'payment-history') fetchPaymentHistory();
  }, [startDate, endDate, activeTab]);

  // Filter functions (preserved from original)
  const filteredQuotations = quotations.filter((quote) => {
    const customerName = quote.customer?.name || quote.lead?.name || "";
    const quotationNumber = quote.quotationNumber || "";
    const searchLower = searchTerm.toLowerCase();
    return customerName.toLowerCase().includes(searchLower) || quotationNumber.toLowerCase().includes(searchLower);
  });

  const filteredInvoices = invoices.filter((inv) => {
    const customerName = inv.customer?.name || inv.lead?.name || "";
    const invoiceNumber = inv.invoiceNumber || "";
    const searchLower = searchTerm.toLowerCase();
    return customerName.toLowerCase().includes(searchLower) || invoiceNumber.toLowerCase().includes(searchLower);
  });

  const filteredReceipts = receipts.filter((receipt) => {
    const customerName = receipt.customer?.name || receipt.lead?.name || "";
    const receiptNumber = receipt.receiptNumber || "";
    const searchLower = searchTerm.toLowerCase();
    return customerName.toLowerCase().includes(searchLower) || receiptNumber.toLowerCase().includes(searchLower);
  });

  const filteredVouchers = vouchers.filter((voucher) => {
    const customerName = voucher.customer?.name || voucher.lead?.name || "";
    const voucherNumber = voucher.voucherNumber || "";
    const searchLower = searchTerm.toLowerCase();
    return customerName.toLowerCase().includes(searchLower) || voucherNumber.toLowerCase().includes(searchLower);
  });

  const filteredPaymentHistory = paymentHistory.filter((ph) => {
    const customerName = ph.customer?.name || ph.lead?.name || '';
    const paymentHistoryNumber = ph.paymentHistoryNumber || '';
    const receiptNumber = ph.receipt?.receiptNumber || '';
    const searchLower = searchTerm.toLowerCase();
    return customerName.toLowerCase().includes(searchLower) || paymentHistoryNumber.toLowerCase().includes(searchLower) || receiptNumber.toLowerCase().includes(searchLower);
  });

  // Format functions (preserved from original)
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "N/A";
    return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Handler functions (preserved from original)
  const handleDownloadQuotationPDF = async (quotationId) => {
    try {
      await quotationAPI.downloadPDF(quotationId);
      toast.success("Quotation PDF downloaded");
    } catch (error) {
      console.error("Error downloading quotation PDF:", error);
      toast.error("Failed to download quotation PDF");
    }
  };

  const handleDownloadInvoicePDF = async (invoiceId) => {
    try {
      await invoiceAPI.downloadPDF(invoiceId);
      toast.success("Invoice PDF downloaded");
    } catch (error) {
      console.error("Error downloading invoice PDF:", error);
      toast.error("Failed to download invoice PDF");
    }
  };

  const handleDownloadReceiptPDF = async (receiptId) => {
    try {
      await receiptAPI.downloadPDF(receiptId);
      toast.success("Receipt PDF downloaded");
    } catch (error) {
      console.error("Error downloading receipt PDF:", error);
      toast.error("Failed to download receipt PDF");
    }
  };

  const handleSendQuotation = async (quotationId) => {
    try {
      await quotationAPI.send(quotationId);
      toast.success("Quotation sent successfully");
    } catch (error) {
      console.error("Error sending quotation:", error);
      toast.error("Failed to send quotation");
    }
  };

  const handleSendInvoice = async (invoiceId) => {
    try {
      await invoiceAPI.send(invoiceId);
      toast.success("Invoice sent successfully");
    } catch (error) {
      console.error("Error sending invoice:", error);
      toast.error("Failed to send invoice");
    }
  };

  const handleSendReceipt = async (receiptId) => {
    try {
      await receiptAPI.send(receiptId);
      toast.success("Receipt sent successfully");
    } catch (error) {
      console.error("Error sending receipt:", error);
      toast.error("Failed to send receipt");
    }
  };

  const handleDownloadVoucherPDF = async (voucherId) => {
    try {
      await voucherAPI.downloadPDF(voucherId);
      toast.success("Voucher PDF downloaded");
    } catch (error) {
      console.error("Error downloading voucher PDF:", error);
      toast.error("Failed to download voucher PDF");
    }
  };

  const handleSendVoucher = async (voucherId) => {
    try {
      await voucherAPI.sendEmail(voucherId);
      toast.success("Voucher sent successfully");
    } catch (error) {
      console.error("Error sending voucher:", error);
      toast.error("Failed to send voucher");
    }
  };

  const handleDownloadPaymentHistoryPDF = async (paymentHistoryId) => {
    try {
      await paymentHistoryAPI.downloadPDF(paymentHistoryId);
      toast.success('Payment history PDF downloaded');
    } catch (error) {
      console.error('Error downloading payment history PDF:', error);
      toast.error('Failed to download payment history PDF');
    }
  };

  const handleDownloadPaymentHistoryListPDF = async () => {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      await paymentHistoryAPI.downloadListPDF(params);
      toast.success('Payment history list PDF downloaded');
    } catch (error) {
      console.error('Error downloading payment history list PDF:', error);
      toast.error('Failed to download payment history list PDF');
    }
  };

  const handleClearDateFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  const handleNavigateToLead = (leadId) => {
    if (!leadId) {
      toast.error("Lead ID not found");
      return;
    }
    navigate(`/leads?leadId=${leadId}`);
  };

  // Status badge component
  const StatusBadge = ({ status, type = 'default' }) => {
    const statusStyles = {
      paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      partial: 'bg-blue-100 text-blue-700 border-blue-200',
      overdue: 'bg-rose-100 text-rose-700 border-rose-200',
      cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      rejected: 'bg-rose-100 text-rose-700 border-rose-200',
      converted: 'bg-blue-100 text-blue-700 border-blue-200',
      expired: 'bg-slate-100 text-slate-700 border-slate-200',
      sent: 'bg-amber-100 text-amber-700 border-amber-200',
      active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      used: 'bg-blue-100 text-blue-700 border-blue-200',
      reconciled: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      verified: 'bg-blue-100 text-blue-700 border-blue-200',
    };

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles[status] || statusStyles.pending}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1).replace(/-/g, ' ') || 'Draft'}
      </span>
    );
  };

  // Card component for list items
  const DataCard = ({ item, type, onClick, onView, onDownload, onSend }) => {
    const leadId = item.lead?._id || item.lead?.id || item.lead;

    return (
      <div
        className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer group"
        onClick={() => leadId && handleNavigateToLead(leadId)}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{type}</p>
            <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-1">
              {item.quotationNumber || item.invoiceNumber || item.receiptNumber || item.voucherNumber || item.paymentHistoryNumber || 'N/A'}
              {leadId && <ExternalLink className="w-3 h-3 opacity-50" />}
            </p>
          </div>
          <StatusBadge status={item.status || item.receiptStatus} />
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
              {(item.customer?.name || item.lead?.name || 'N')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">{item.customer?.name || item.lead?.name || 'N/A'}</p>
              <p className="text-xs text-slate-400">{item.customer?.email || item.lead?.email || ''}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div>
            {(item.totalAmount !== undefined || item.amount !== undefined) && (
              <p className="text-lg font-bold text-slate-800">{formatCurrency(item.totalAmount || item.amount)}</p>
            )}
            <p className="text-xs text-slate-400">{formatDate(item.createdAt || item.issueDate || item.paymentDate)}</p>
          </div>

          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onView}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={onDownload}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </button>
            {onSend && (
              <button
                onClick={onSend}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
                title="Send Email"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Calculate summary stats
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.outstandingAmount || 0), 0);
  const totalQuotations = quotations.reduce((sum, q) => sum + (q.totalAmount || 0), 0);

  // Loading spinner
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full" />
    </div>
  );

  // Empty state
  const EmptyState = ({ message }) => (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      <FileText className="w-12 h-12 mb-4 opacity-50" />
      <p>{message}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-violet-200/20 rounded-full blur-3xl" />
      </div>

      <div className="relative flex">
        {/* Left Sidebar */}
        <aside className="w-72 min-h-screen bg-white/80 backdrop-blur-xl border-r border-slate-200/60 sticky top-0 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-slate-200/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">Billing</h1>
                <p className="text-xs text-slate-500">Finance Management</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p>
                <p className="text-[10px] text-emerald-600/70 uppercase tracking-wider">Revenue</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <p className="text-lg font-bold text-amber-600">{formatCurrency(totalOutstanding)}</p>
                <p className="text-[10px] text-amber-600/70 uppercase tracking-wider">Outstanding</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Documents</p>

            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full group rounded-xl transition-all duration-300 ${isActive ? 'shadow-lg' : 'hover:bg-slate-50'}`}
                >
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${isActive ? `bg-gradient-to-r ${tab.gradient} text-white` : 'text-slate-600'}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? 'bg-white/20' : `bg-${tab.color}-50`}`}>
                      <TabIcon className={`w-5 h-5 ${isActive ? 'text-white' : `text-${tab.color}-600`}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-medium text-sm ${isActive ? 'text-white' : 'text-slate-700'}`}>{tab.shortLabel}</p>
                      <p className={`text-xs ${isActive ? 'text-white/70' : 'text-slate-400'}`}>{tab.count} items</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'text-white/80' : 'text-slate-300 group-hover:translate-x-1'}`} />
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-200/60">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-600">Quick Tip</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Click any document to view the linked lead. Use filters to find specific records.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Content Header */}
          <div className="bg-white/60 backdrop-blur-sm border-b border-slate-200/60 px-8 py-6 sticky top-0 z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                {currentTab && (
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currentTab.gradient} flex items-center justify-center shadow-lg`}>
                    <currentTab.icon className="w-6 h-6 text-white" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{currentTab?.label}</h2>
                  <p className="text-sm text-slate-500">{currentTab?.count} documents found</p>
                </div>
              </div>

              {activeTab === 'payment-history' && (
                <button
                  onClick={handleDownloadPaymentHistoryListPDF}
                  disabled={loadingPaymentHistory || filteredPaymentHistory.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/25 hover:shadow-xl transition-all disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Export All
                </button>
              )}
            </div>

            {/* Search and Filters */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${currentTab?.label.toLowerCase()}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full py-3 pl-12 pr-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <button
                onClick={() => setShowDateFilter(!showDateFilter)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${showDateFilter || startDate || endDate ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <Filter className="w-5 h-5" />
                {(startDate || endDate) && <span className="w-2 h-2 rounded-full bg-blue-500" />}
              </button>
            </div>

            {/* Date Filter Panel */}
            {showDateFilter && (
              <div className="flex items-center gap-3 mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <Calendar className="w-5 h-5 text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {(startDate || endDate) && (
                  <button onClick={handleClearDateFilter} className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Content Body */}
          <div className="p-8">
            {/* Quotations Grid */}
            {activeTab === "quotations" && (
              loadingQuotations ? <LoadingSpinner /> :
                filteredQuotations.length === 0 ? <EmptyState message="No quotations found" /> :
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredQuotations.map((quotation) => (
                      <DataCard
                        key={quotation._id || quotation.id}
                        item={quotation}
                        type="Quotation"
                        onView={() => setSelectedQuotation(quotation)}
                        onDownload={() => handleDownloadQuotationPDF(quotation._id || quotation.id)}
                        onSend={() => handleSendQuotation(quotation._id || quotation.id)}
                      />
                    ))}
                  </div>
            )}

            {/* Invoices Grid */}
            {activeTab === "invoices" && (
              loadingInvoices ? <LoadingSpinner /> :
                filteredInvoices.length === 0 ? <EmptyState message="No invoices found" /> :
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredInvoices.map((invoice) => (
                      <DataCard
                        key={invoice._id || invoice.id}
                        item={invoice}
                        type="Invoice"
                        onView={() => setSelectedInvoice(invoice)}
                        onDownload={() => handleDownloadInvoicePDF(invoice._id || invoice.id)}
                        onSend={() => handleSendInvoice(invoice._id || invoice.id)}
                      />
                    ))}
                  </div>
            )}

            {/* Receipts Grid */}
            {activeTab === "receipts" && (
              loadingReceipts ? <LoadingSpinner /> :
                filteredReceipts.length === 0 ? <EmptyState message="No receipts found" /> :
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredReceipts.map((receipt) => (
                      <DataCard
                        key={receipt._id || receipt.id}
                        item={receipt}
                        type="Receipt"
                        onView={() => setSelectedReceipt(receipt)}
                        onDownload={() => handleDownloadReceiptPDF(receipt._id || receipt.id)}
                        onSend={() => handleSendReceipt(receipt._id || receipt.id)}
                      />
                    ))}
                  </div>
            )}

            {/* Vouchers Grid */}
            {activeTab === "vouchers" && (
              loadingVouchers ? <LoadingSpinner /> :
                filteredVouchers.length === 0 ? <EmptyState message="No vouchers found" /> :
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredVouchers.map((voucher) => (
                      <DataCard
                        key={voucher._id || voucher.id}
                        item={voucher}
                        type="Voucher"
                        onView={() => setSelectedVoucher(voucher)}
                        onDownload={() => handleDownloadVoucherPDF(voucher._id || voucher.id)}
                        onSend={() => handleSendVoucher(voucher._id || voucher.id)}
                      />
                    ))}
                  </div>
            )}

            {/* Payment History Grid */}
            {activeTab === "payment-history" && (
              loadingPaymentHistory ? <LoadingSpinner /> :
                filteredPaymentHistory.length === 0 ? <EmptyState message="No payment history found" /> :
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredPaymentHistory.map((ph) => (
                      <DataCard
                        key={ph._id || ph.id}
                        item={ph}
                        type="Payment"
                        onView={() => setSelectedPaymentHistory(ph)}
                        onDownload={() => handleDownloadPaymentHistoryPDF(ph._id || ph.id)}
                      />
                    ))}
                  </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals - Redesigned */}
      {/* Quotation Modal */}
      {selectedQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center rounded-t-2xl">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Quotation</p>
                <h2 className="text-xl font-bold text-slate-800">{selectedQuotation.quotationNumber}</h2>
              </div>
              <button onClick={() => setSelectedQuotation(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Customer</p>
                  <p className="font-semibold text-slate-800">{selectedQuotation.customer?.name || selectedQuotation.lead?.name || 'N/A'}</p>
                  <p className="text-xs text-slate-400">{selectedQuotation.customer?.email || selectedQuotation.lead?.email || ''}</p>
                </div>
                <StatusBadge status={selectedQuotation.status} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">Issue Date</p>
                  <p className="font-medium text-slate-700">{formatDate(selectedQuotation.issueDate || selectedQuotation.createdAt)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">Valid Until</p>
                  <p className="font-medium text-slate-700">{formatDate(selectedQuotation.validUntil)}</p>
                </div>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 text-center border border-blue-100">
                <p className="text-sm text-blue-600 mb-1">Total Amount</p>
                <p className="text-3xl font-bold text-blue-700">{formatCurrency(selectedQuotation.totalAmount)}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleDownloadQuotationPDF(selectedQuotation._id || selectedQuotation.id)} className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Download
                </button>
                <button onClick={() => handleSendQuotation(selectedQuotation._id || selectedQuotation.id)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center rounded-t-2xl">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Invoice</p>
                <h2 className="text-xl font-bold text-slate-800">{selectedInvoice.invoiceNumber}</h2>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Customer</p>
                  <p className="font-semibold text-slate-800">{selectedInvoice.customer?.name || selectedInvoice.lead?.name || 'N/A'}</p>
                </div>
                <StatusBadge status={selectedInvoice.status} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-400 mb-1">Total</p>
                  <p className="font-bold text-slate-800">{formatCurrency(selectedInvoice.totalAmount)}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
                  <p className="text-xs text-emerald-600 mb-1">Paid</p>
                  <p className="font-bold text-emerald-700">{formatCurrency(selectedInvoice.paidAmount)}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
                  <p className="text-xs text-amber-600 mb-1">Due</p>
                  <p className="font-bold text-amber-700">{formatCurrency(selectedInvoice.outstandingAmount)}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleDownloadInvoicePDF(selectedInvoice._id || selectedInvoice.id)} className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Download
                </button>
                <button onClick={() => handleSendInvoice(selectedInvoice._id || selectedInvoice.id)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center rounded-t-2xl">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Receipt</p>
                <h2 className="text-xl font-bold text-slate-800">{selectedReceipt.receiptNumber}</h2>
              </div>
              <button onClick={() => setSelectedReceipt(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Payment From</p>
                  <p className="font-semibold text-slate-800">{selectedReceipt.customer?.name || selectedReceipt.lead?.name || 'N/A'}</p>
                </div>
                <StatusBadge status={selectedReceipt.receiptStatus} />
              </div>
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 text-center border border-emerald-100">
                <p className="text-sm text-emerald-600 mb-1">Payment Amount</p>
                <p className="text-3xl font-bold text-emerald-700">{formatCurrency(selectedReceipt.amount)}</p>
                <p className="text-xs text-emerald-500 mt-2">{selectedReceipt.paymentMethod?.charAt(0).toUpperCase() + selectedReceipt.paymentMethod?.slice(1) || 'N/A'}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleDownloadReceiptPDF(selectedReceipt._id || selectedReceipt.id)} className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Download
                </button>
                <button onClick={() => handleSendReceipt(selectedReceipt._id || selectedReceipt.id)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voucher Modal */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center rounded-t-2xl">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Voucher</p>
                <h2 className="text-xl font-bold text-slate-800">{selectedVoucher.voucherNumber}</h2>
              </div>
              <button onClick={() => setSelectedVoucher(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Customer</p>
                  <p className="font-semibold text-slate-800">{selectedVoucher.customer?.name || selectedVoucher.lead?.name || 'N/A'}</p>
                </div>
                <StatusBadge status={selectedVoucher.status} />
              </div>
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <p className="text-xs text-amber-600 mb-2">Package</p>
                <p className="font-semibold text-slate-800">{selectedVoucher.package?.name || selectedVoucher.customizedPackage?.name || selectedVoucher.packageDetails?.name || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">Travel Start</p>
                  <p className="font-medium text-slate-700">{formatDate(selectedVoucher.travelStartDate)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">Travel End</p>
                  <p className="font-medium text-slate-700">{formatDate(selectedVoucher.travelEndDate)}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleDownloadVoucherPDF(selectedVoucher._id || selectedVoucher.id)} className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Download
                </button>
                <button onClick={() => handleSendVoucher(selectedVoucher._id || selectedVoucher.id)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {selectedPaymentHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center rounded-t-2xl">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Payment History</p>
                <h2 className="text-xl font-bold text-slate-800">{selectedPaymentHistory.paymentHistoryNumber}</h2>
              </div>
              <button onClick={() => setSelectedPaymentHistory(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Payment From</p>
                  <p className="font-semibold text-slate-800">{selectedPaymentHistory.customer?.name || selectedPaymentHistory.lead?.name || 'N/A'}</p>
                </div>
                <StatusBadge status={selectedPaymentHistory.status} />
              </div>
              <div className="bg-gradient-to-r from-cyan-50 to-sky-50 rounded-xl p-6 text-center border border-cyan-100">
                <p className="text-sm text-cyan-600 mb-1">Payment Amount</p>
                <p className="text-3xl font-bold text-cyan-700">{formatCurrency(selectedPaymentHistory.amount)}</p>
                <p className="text-xs text-cyan-500 mt-2">{formatDate(selectedPaymentHistory.paymentDate)}</p>
              </div>
              {selectedPaymentHistory.notes && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-2">Notes</p>
                  <p className="text-sm text-slate-700">{selectedPaymentHistory.notes}</p>
                </div>
              )}
              <button onClick={() => handleDownloadPaymentHistoryPDF(selectedPaymentHistory._id || selectedPaymentHistory.id)} className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-sky-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingInvoicing;
