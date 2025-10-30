import { useState } from "react";
import { DEFAULT_INVOICE_TEMPLATE } from "../utils/constants";
import { generateInvoiceId } from "../utils/helpers";

/**
 * Custom hook for managing invoice state
 */
export const useInvoiceState = (initialInvoices = []) => {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showNewInvoiceDialog, setShowNewInvoiceDialog] = useState(false);
  const [showEditInvoiceDialog, setShowEditInvoiceDialog] = useState(false);
  const [editInvoiceData, setEditInvoiceData] = useState(null);

  /**
   * Add new invoice
   */
  const addInvoice = (invoice) => {
    setInvoices((prev) => [...prev, invoice]);
  };

  /**
   * Update existing invoice
   */
  const updateInvoice = (updatedInvoice) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv))
    );
  };

  /**
   * Delete invoice
   */
  const deleteInvoice = (invoiceId) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
  };

  /**
   * Open new invoice dialog
   */
  const openNewInvoiceDialog = () => {
    setShowNewInvoiceDialog(true);
  };

  /**
   * Close new invoice dialog
   */
  const closeNewInvoiceDialog = () => {
    setShowNewInvoiceDialog(false);
  };

  /**
   * Open edit invoice dialog
   */
  const openEditInvoiceDialog = (invoice) => {
    setEditInvoiceData({ ...invoice, items: [...invoice.items] });
    setShowEditInvoiceDialog(true);
  };

  /**
   * Close edit invoice dialog
   */
  const closeEditInvoiceDialog = () => {
    setShowEditInvoiceDialog(false);
    setEditInvoiceData(null);
  };

  /**
   * Get new invoice template
   */
  const getNewInvoiceTemplate = (currentDate) => {
    return {
      ...DEFAULT_INVOICE_TEMPLATE,
      id: generateInvoiceId(invoices),
      issuedDate: currentDate,
    };
  };

  return {
    invoices,
    setInvoices,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    selectedInvoice,
    setSelectedInvoice,
    showNewInvoiceDialog,
    showEditInvoiceDialog,
    editInvoiceData,
    setEditInvoiceData,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    openNewInvoiceDialog,
    closeNewInvoiceDialog,
    openEditInvoiceDialog,
    closeEditInvoiceDialog,
    getNewInvoiceTemplate,
  };
};

export default useInvoiceState;
