import { useState, useEffect } from "react";
import { DEFAULT_INVOICE_ITEM } from "../utils/constants";

/**
 * Custom hook for managing invoice form state
 */
export const useInvoiceForm = (initialData) => {
  const [localData, setLocalData] = useState(() => ({
    ...initialData,
    items: [...initialData.items],
  }));

  // Sync with prop changes
  useEffect(() => {
    setLocalData({ ...initialData, items: [...initialData.items] });
  }, [initialData]);

  // Auto-calculate totals when items or tax changes
  useEffect(() => {
    const amount = localData.items.reduce((sum, item) => sum + item.amount, 0);
    const tax = parseFloat(localData.tax) || 0;
    const total = amount + tax;
    setLocalData((prev) => ({ ...prev, amount, total }));
  }, [localData.items, localData.tax]);

  /**
   * Handle input change
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLocalData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Handle tax change
   */
  const handleTaxChange = (e) => {
    const value = parseFloat(e.target.value);
    setLocalData((prev) => ({ ...prev, tax: isNaN(value) ? 0 : value }));
  };

  /**
   * Handle status change
   */
  const handleStatusChange = (e) => {
    const status = e.target.value;
    setLocalData((prev) => ({
      ...prev,
      status,
      paymentDate: status === "pending" || status === "overdue" ? null : prev.paymentDate,
      paymentMethod: status === "pending" || status === "overdue" ? null : prev.paymentMethod,
      paidAmount: status !== "partial" ? 0 : prev.paidAmount,
    }));
  };

  /**
   * Add new item
   */
  const addItem = () => {
    setLocalData((prev) => ({
      ...prev,
      items: [...prev.items, { ...DEFAULT_INVOICE_ITEM }],
    }));
  };

  /**
   * Remove item
   */
  const removeItem = (index) => {
    setLocalData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  /**
   * Update item
   */
  const updateItem = (index, field, value) => {
    setLocalData((prev) => {
      const items = [...prev.items];
      if (field === "quantity" || field === "rate") {
        const val = parseFloat(value);
        items[index][field] = isNaN(val) ? 0 : val;
        items[index].amount = items[index].quantity * items[index].rate;
      } else {
        items[index][field] = value;
      }
      return { ...prev, items };
    });
  };

  /**
   * Handle paid amount change
   */
  const handlePaidAmountChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setLocalData((prev) => ({ ...prev, paidAmount: value }));
  };

  /**
   * Reset form
   */
  const resetForm = () => {
    setLocalData({ ...initialData, items: [...initialData.items] });
  };

  return {
    localData,
    setLocalData,
    handleInputChange,
    handleTaxChange,
    handleStatusChange,
    addItem,
    removeItem,
    updateItem,
    handlePaidAmountChange,
    resetForm,
  };
};

export default useInvoiceForm;
