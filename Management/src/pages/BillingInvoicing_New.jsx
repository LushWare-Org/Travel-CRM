import React from "react";
import { useLocation } from "wouter";
import Swal from "sweetalert2";
import {
  PageHeader,
  InvoiceStats,
  SearchBar,
  StatusFilter,
  InvoiceTable,
  InvoiceDetailsModal,
  InvoiceFormModal,
} from "../features/billing/components";
import { useInvoiceState } from "../features/billing/hooks";
import {
  computeInvoices,
  filterInvoices,
  calculateInvoiceStats,
} from "../features/billing/utils/helpers";
import { generateInvoicePDF } from "../features/billing/services/pdfService";
import { sendInvoiceEmail } from "../features/billing/services/emailService";
import { sampleInvoices } from "../features/billing/utils/sampleData";

/**
 * BillingInvoicing Page Component
 * Manages invoices, payments, and financial reports
 */
const BillingInvoicing = () => {
  const [, navigate] = useLocation();
  const today = "2025-10-22"; // TODO: Use actual current date

  // Initialize state with sample data
  const {
    invoices,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    selectedInvoice,
    setSelectedInvoice,
    showNewInvoiceDialog,
    showEditInvoiceDialog,
    editInvoiceData,
    addInvoice,
    updateInvoice,
    openNewInvoiceDialog,
    closeNewInvoiceDialog,
    openEditInvoiceDialog,
    closeEditInvoiceDialog,
    getNewInvoiceTemplate,
  } = useInvoiceState(sampleInvoices);

  // Compute invoices with overdue status
  const computedInvoices = computeInvoices(invoices, today);

  // Filter invoices based on search and status
  const filteredInvoices = filterInvoices(
    computedInvoices,
    searchTerm,
    filterStatus
  );

  // Calculate statistics
  const stats = calculateInvoiceStats(computedInvoices);

  /**
   * Handle view invoice
   */
  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
  };

  /**
   * Handle edit invoice
   */
  const handleEditInvoice = (invoice) => {
    openEditInvoiceDialog(invoice);
  };

  /**
   * Handle save new invoice
   */
  const handleSaveNewInvoice = (invoiceData) => {
    addInvoice(invoiceData);
    closeNewInvoiceDialog();
    Swal.fire("Success", "New invoice created successfully.", "success");
  };

  /**
   * Handle save edited invoice
   */
  const handleSaveEditedInvoice = (invoiceData) => {
    updateInvoice(invoiceData);
    closeEditInvoiceDialog();
    Swal.fire("Success", "Invoice updated successfully.", "success");
  };

  /**
   * Handle download invoice
   */
  const handleDownloadInvoice = (invoice) => {
    generateInvoicePDF(invoice);
  };

  /**
   * Handle send invoice
   */
  const handleSendInvoice = (invoice) => {
    sendInvoiceEmail(invoice);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Stats */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <PageHeader onNewInvoice={openNewInvoiceDialog} />
          <div className="mt-4">
            <InvoiceStats stats={stats} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {/* Search and Filter */}
        <div className="flex gap-4 mb-6">
          <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        </div>

        {/* Status Filter Tabs */}
        <StatusFilter
          filterStatus={filterStatus}
          onFilterChange={setFilterStatus}
          invoices={computedInvoices}
        />

        {/* Invoice Table */}
        <InvoiceTable
          invoices={filteredInvoices}
          onView={handleViewInvoice}
          onEdit={handleEditInvoice}
          onDownload={handleDownloadInvoice}
          onSend={handleSendInvoice}
        />

        {/* Invoice Details Modal */}
        <InvoiceDetailsModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onDownload={handleDownloadInvoice}
          onSend={handleSendInvoice}
        />

        {/* New Invoice Modal */}
        <InvoiceFormModal
          isOpen={showNewInvoiceDialog}
          title="Create New Invoice"
          description="Generate an invoice for a booking or service"
          formData={getNewInvoiceTemplate(today)}
          onSave={handleSaveNewInvoice}
          onCancel={closeNewInvoiceDialog}
          today={today}
        />

        {/* Edit Invoice Modal */}
        <InvoiceFormModal
          isOpen={showEditInvoiceDialog}
          title="Edit Invoice"
          description="Update invoice details"
          formData={editInvoiceData || getNewInvoiceTemplate(today)}
          onSave={handleSaveEditedInvoice}
          onCancel={closeEditInvoiceDialog}
          today={today}
        />
      </div>
    </div>
  );
};

export default BillingInvoicing;
