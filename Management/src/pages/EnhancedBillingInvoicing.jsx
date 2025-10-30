import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Plus, Filter } from 'lucide-react';
import { leadAPI } from '../services/api';

// Import components
import TabNavigation from '../features/billing/components/TabNavigation';
import SearchBar from '../features/billing/components/SearchBar';
import StatusFilter from '../features/billing/components/StatusFilter';
import QuotationsTable from '../features/billing/components/QuotationsTable';
import InvoiceTable from '../features/billing/components/InvoiceTable';
import PaymentReceiptsTable from '../features/billing/components/PaymentReceiptsTable';
import EnhancedQuotationForm from '../features/billing/components/form/EnhancedQuotationForm';
import EnhancedInvoiceForm from '../features/billing/components/form/EnhancedInvoiceForm';
import PaymentReceiptForm from '../features/billing/components/form/PaymentReceiptForm';

// Import utilities
import { QUOTATION_STATUS, INVOICE_STATUS, RECEIPT_STATUS } from '../features/billing/types';

const BillingInvoicing = () => {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('quotations');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // State for leads and packages
  const [leads, setLeads] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);

  // State for quotations
  const [quotations, setQuotations] = useState([]);
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);

  // State for invoices
  const [invoices, setInvoices] = useState([]);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);

  // State for receipts
  const [receipts, setReceipts] = useState([]);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState(null);

  // Form data states
  const [quotationFormData, setQuotationFormData] = useState(getEmptyQuotationForm());
  const [invoiceFormData, setInvoiceFormData] = useState(getEmptyInvoiceForm());
  const [receiptFormData, setReceiptFormData] = useState(getEmptyReceiptForm());

  // Fetch leads and packages on component mount
  useEffect(() => {
    fetchLeads();
    fetchPackages();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoadingLeads(true);
      const response = await leadAPI.getAllLeads({ limit: 1000 });
      if (response.success) {
        setLeads(response.data);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoadingLeads(false);
    }
  };

  const fetchPackages = async () => {
    try {
      setLoadingPackages(true);
      // Using mock data for now, update with actual API call
      const mockPackages = [
        {
          id: '1',
          name: 'Swiss Alps Adventure',
          destination: 'Switzerland',
          duration: 7,
          price: 2500,
          description: 'Experience the breathtaking beauty of the Swiss Alps with guided mountain tours and luxury accommodation.',
        },
        {
          id: '2',
          name: 'Paris Romance Escape',
          destination: 'France',
          duration: 5,
          price: 1800,
          description: 'Romantic getaway to the City of Light with Eiffel Tower visits and Seine river cruises.',
        },
        {
          id: '3',
          name: 'Bali Beach Resort',
          destination: 'Indonesia',
          duration: 10,
          price: 1200,
          description: 'Tropical paradise with pristine beaches, cultural experiences, and luxury spa treatments.',
        },
      ];
      setPackages(mockPackages);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoadingPackages(false);
    }
  };

  // Empty form functions
  function getEmptyQuotationForm() {
    const today = new Date().toISOString().split('T')[0];
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    
    return {
      id: null,
      leadId: '',
      customerName: '',
      email: '',
      phone: '',
      address: '',
      gstNumber: '',
      packageId: '',
      packageName: '',
      destination: '',
      duration: 0,
      items: [],
      amount: 0,
      taxRate: 10,
      taxAmount: 0,
      discountType: 'none',
      discountValue: 0,
      discountAmount: 0,
      serviceChargeRate: 0,
      serviceChargeAmount: 0,
      total: 0,
      status: 'draft',
      validUntil: validUntil.toISOString().split('T')[0],
      issuedDate: today,
      paymentTerms: 'net-30',
      terms: 'Payment is due within 30 days of quotation date. This quotation is valid for 30 days. Cancellation charges may apply.',
      notes: '',
      type: 'package-based',
    };
  }

  function getEmptyInvoiceForm() {
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);
    
    return {
      id: null,
      leadId: '',
      quotationId: '',
      customerName: '',
      email: '',
      phone: '',
      packageName: '',
      amount: 0,
      tax: 10,
      discount: 0,
      total: 0,
      status: 'draft',
      dueDate: dueDate.toISOString().split('T')[0],
      issuedDate: today,
      paymentDate: null,
      paidAmount: 0,
      items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
      notes: '',
    };
  }

  function getEmptyReceiptForm() {
    const today = new Date().toISOString().split('T')[0];
    
    return {
      id: null,
      leadId: '',
      invoiceId: '',
      customerName: '',
      email: '',
      phone: '',
      amount: 0,
      paymentMethod: '',
      paymentDate: today,
      status: 'paid-in-advance',
      transactionId: '',
      invoiceTotal: 0,
      previousPayments: 0,
      remainingBalance: 0,
      notes: '',
      issuedDate: today,
    };
  }

  // Quotation handlers
  const handleNewQuotation = () => {
    setQuotationFormData(getEmptyQuotationForm());
    setEditingQuotation(null);
    setShowQuotationForm(true);
  };

  const handleEditQuotation = (quotation) => {
    setQuotationFormData(quotation);
    setEditingQuotation(quotation);
    setShowQuotationForm(true);
  };

  const handleSaveQuotation = () => {
    if (editingQuotation) {
      // Update existing quotation
      setQuotations(quotations.map(q => q.id === editingQuotation.id ? quotationFormData : q));
    } else {
      // Create new quotation
      const newQuotation = {
        ...quotationFormData,
        id: `QUO-${String(quotations.length + 1).padStart(3, '0')}`,
      };
      setQuotations([...quotations, newQuotation]);
    }
    setShowQuotationForm(false);
    setEditingQuotation(null);
  };

  const handleDeleteQuotation = (quotation) => {
    if (window.confirm(`Delete quotation ${quotation.id}?`)) {
      setQuotations(quotations.filter(q => q.id !== quotation.id));
    }
  };

  const handleDuplicateQuotation = (quotation) => {
    const newQuotation = {
      ...quotation,
      id: `QUO-${String(quotations.length + 1).padStart(3, '0')}`,
      status: 'draft',
      issuedDate: new Date().toISOString().split('T')[0],
    };
    setQuotations([...quotations, newQuotation]);
  };

  const handleConvertToInvoice = (quotation) => {
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);
    
    const invoiceData = {
      ...getEmptyInvoiceForm(),
      leadId: quotation.leadId,
      quotationId: quotation.id,
      customerName: quotation.leadName,
      email: quotation.email,
      phone: quotation.phone,
      packageName: quotation.packageName,
      amount: quotation.amount,
      tax: quotation.tax,
      discount: quotation.discount,
      total: quotation.total,
      items: quotation.items,
      status: 'draft',
      dueDate: dueDate.toISOString().split('T')[0],
      issuedDate: today,
    };
    
    setInvoiceFormData(invoiceData);
    setEditingInvoice(null);
    setShowInvoiceForm(true);
    setActiveTab('invoices');
  };

  // Invoice handlers
  const handleNewInvoice = () => {
    setInvoiceFormData(getEmptyInvoiceForm());
    setEditingInvoice(null);
    setShowInvoiceForm(true);
  };

  const handleEditInvoice = (invoice) => {
    setInvoiceFormData(invoice);
    setEditingInvoice(invoice);
    setShowInvoiceForm(true);
  };

  const handleSaveInvoice = () => {
    if (editingInvoice) {
      // Update existing invoice
      setInvoices(invoices.map(inv => inv.id === editingInvoice.id ? invoiceFormData : inv));
    } else {
      // Create new invoice
      const newInvoice = {
        ...invoiceFormData,
        id: `INV-${String(invoices.length + 1).padStart(3, '0')}`,
      };
      setInvoices([...invoices, newInvoice]);
    }
    setShowInvoiceForm(false);
    setEditingInvoice(null);
  };

  const handleDeleteInvoice = (invoice) => {
    if (window.confirm(`Delete invoice ${invoice.id}?`)) {
      setInvoices(invoices.filter(inv => inv.id !== invoice.id));
    }
  };

  // Receipt handlers
  const handleNewReceipt = () => {
    setReceiptFormData(getEmptyReceiptForm());
    setEditingReceipt(null);
    setShowReceiptForm(true);
  };

  const handleEditReceipt = (receipt) => {
    setReceiptFormData(receipt);
    setEditingReceipt(receipt);
    setShowReceiptForm(true);
  };

  const handleSaveReceipt = () => {
    if (editingReceipt) {
      // Update existing receipt
      setReceipts(receipts.map(rec => rec.id === editingReceipt.id ? receiptFormData : rec));
    } else {
      // Create new receipt
      const newReceipt = {
        ...receiptFormData,
        id: `REC-${String(receipts.length + 1).padStart(3, '0')}`,
      };
      setReceipts([...receipts, newReceipt]);
      
      // Update corresponding invoice
      if (receiptFormData.invoiceId) {
        const invoice = invoices.find(inv => inv.id === receiptFormData.invoiceId);
        if (invoice) {
          const totalPaid = (invoice.paidAmount || 0) + receiptFormData.amount;
          const updatedInvoice = {
            ...invoice,
            paidAmount: totalPaid,
            status: totalPaid >= invoice.total ? 'paid' : 'partial',
            paymentDate: totalPaid >= invoice.total ? receiptFormData.paymentDate : invoice.paymentDate,
          };
          setInvoices(invoices.map(inv => inv.id === invoice.id ? updatedInvoice : inv));
        }
      }
    }
    setShowReceiptForm(false);
    setEditingReceipt(null);
  };

  const handleDeleteReceipt = (receipt) => {
    if (window.confirm(`Delete receipt ${receipt.id}?`)) {
      setReceipts(receipts.filter(rec => rec.id !== receipt.id));
    }
  };

  // Download and Send handlers (placeholders)
  const handleDownload = (item, type) => {
    alert(`Downloading ${type} ${item.id} as PDF...`);
  };

  const handleSend = (item, type) => {
    alert(`Sending ${type} ${item.id} to ${item.email || item.customerName}...`);
  };

  // Filtering logic
  const getFilteredData = () => {
    let data = [];
    
    if (activeTab === 'quotations') {
      data = quotations;
    } else if (activeTab === 'invoices') {
      data = invoices;
    } else if (activeTab === 'receipts') {
      data = receipts;
    }

    // Filter by search term
    if (searchTerm) {
      data = data.filter(item =>
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.leadName || item.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.leadId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.packageName || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      data = data.filter(item => item.status === filterStatus);
    }

    return data;
  };

  const filteredData = getFilteredData();

  // Get status options based on active tab
  const getStatusOptions = () => {
    if (activeTab === 'quotations') {
      return [
        { value: 'all', label: 'All Status' },
        { value: 'draft', label: 'Draft' },
        { value: 'sent', label: 'Sent' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'expired', label: 'Expired' },
      ];
    } else if (activeTab === 'invoices') {
      return [
        { value: 'all', label: 'All Status' },
        { value: 'draft', label: 'Draft' },
        { value: 'sent', label: 'Sent' },
        { value: 'paid', label: 'Paid' },
        { value: 'partial', label: 'Partial' },
        { value: 'overdue', label: 'Overdue' },
        { value: 'cancelled', label: 'Cancelled' },
      ];
    } else {
      return [
        { value: 'all', label: 'All Status' },
        { value: 'paid-in-advance', label: 'Paid in Advance' },
        { value: 'paid-in-full', label: 'Paid in Full' },
      ];
    }
  };

  // Get tab counts
  const tabCounts = {
    quotations: quotations.length,
    invoices: invoices.length,
    receipts: receipts.length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Billing & Invoicing
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage quotations, invoices, and payment receipts
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <TabNavigation
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setSearchTerm('');
            setFilterStatus('all');
          }}
          counts={tabCounts}
        />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Search and Filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4 flex-1">
            <SearchBar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              placeholder={`Search ${activeTab}...`}
            />
            <StatusFilter
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              statusOptions={getStatusOptions()}
            />
          </div>

          {/* Action Button */}
          <button
            onClick={() => {
              if (activeTab === 'quotations') handleNewQuotation();
              else if (activeTab === 'invoices') handleNewInvoice();
              else handleNewReceipt();
            }}
            className="ml-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            New {activeTab === 'quotations' ? 'Quotation' : activeTab === 'invoices' ? 'Invoice' : 'Receipt'}
          </button>
        </div>

        {/* Tables */}
        {activeTab === 'quotations' && (
          <QuotationsTable
            quotations={filteredData}
            onView={(q) => alert(`View quotation ${q.id}`)}
            onEdit={handleEditQuotation}
            onDelete={handleDeleteQuotation}
            onDownload={(q) => handleDownload(q, 'quotation')}
            onSend={(q) => handleSend(q, 'quotation')}
            onDuplicate={handleDuplicateQuotation}
            onConvertToInvoice={handleConvertToInvoice}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoiceTable
            invoices={filteredData}
            onView={(inv) => alert(`View invoice ${inv.id}`)}
            onEdit={handleEditInvoice}
            onDelete={handleDeleteInvoice}
            onDownload={(inv) => handleDownload(inv, 'invoice')}
            onSend={(inv) => handleSend(inv, 'invoice')}
          />
        )}

        {activeTab === 'receipts' && (
          <PaymentReceiptsTable
            receipts={filteredData}
            onView={(rec) => alert(`View receipt ${rec.id}`)}
            onEdit={handleEditReceipt}
            onDelete={handleDeleteReceipt}
            onDownload={(rec) => handleDownload(rec, 'receipt')}
            onSend={(rec) => handleSend(rec, 'receipt')}
          />
        )}
      </div>

      {/* Forms (Modals) */}
      {showQuotationForm && (
        <EnhancedQuotationForm
          formData={quotationFormData}
          setFormData={setQuotationFormData}
          onSave={handleSaveQuotation}
          onCancel={() => setShowQuotationForm(false)}
          leads={leads}
          packages={packages}
        />
      )}

      {showInvoiceForm && (
        <EnhancedInvoiceForm
          formData={invoiceFormData}
          setFormData={setInvoiceFormData}
          onSave={handleSaveInvoice}
          onCancel={() => setShowInvoiceForm(false)}
          leads={leads}
          quotations={quotations.filter(q => q.status === 'accepted')}
        />
      )}

      {showReceiptForm && (
        <PaymentReceiptForm
          formData={receiptFormData}
          setFormData={setReceiptFormData}
          onSave={handleSaveReceipt}
          onCancel={() => setShowReceiptForm(false)}
          leads={leads}
          invoices={invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled')}
        />
      )}
    </div>
  );
};

export default BillingInvoicing;
