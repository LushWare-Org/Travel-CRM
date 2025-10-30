/**
 * Calculate computed invoices with overdue status
 * @param {Array} invoices - Array of invoices
 * @param {string} currentDate - Current date in YYYY-MM-DD format
 * @returns {Array} Computed invoices with updated status
 */
export const computeInvoices = (invoices, currentDate) => {
  return invoices.map((inv) => {
    if (inv.dueDate < currentDate && inv.status === "pending") {
      return { ...inv, status: "overdue" };
    }
    return inv;
  });
};

/**
 * Calculate total revenue from invoices
 * @param {Array} invoices - Array of invoices
 * @returns {number} Total revenue
 */
export const calculateTotalRevenue = (invoices) => {
  return invoices.reduce((sum, inv) => {
    if (inv.status === "paid") return sum + inv.total;
    if (inv.status === "partial") return sum + (inv.paidAmount || 0);
    return sum;
  }, 0);
};

/**
 * Calculate pending amount from invoices
 * @param {Array} invoices - Array of invoices
 * @returns {number} Total pending amount
 */
export const calculatePendingAmount = (invoices) => {
  return invoices.reduce((sum, inv) => {
    if (inv.status === "paid") return sum;
    if (inv.status === "partial") return sum + (inv.total - (inv.paidAmount || 0));
    return sum + inv.total;
  }, 0);
};

/**
 * Filter invoices based on search term and status
 * @param {Array} invoices - Array of invoices
 * @param {string} searchTerm - Search term
 * @param {string} filterStatus - Filter status
 * @returns {Array} Filtered invoices
 */
export const filterInvoices = (invoices, searchTerm, filterStatus) => {
  return invoices.filter((inv) => {
    const matchesSearch =
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || inv.status === filterStatus;
    return matchesSearch && matchesFilter;
  });
};

/**
 * Generate next invoice ID
 * @param {Array} invoices - Array of existing invoices
 * @returns {string} Next invoice ID
 */
export const generateInvoiceId = (invoices) => {
  const nextNumber = invoices.length + 1;
  return `INV-${nextNumber.toString().padStart(3, "0")}`;
};

/**
 * Calculate invoice statistics
 * @param {Array} invoices - Array of invoices
 * @returns {Object} Invoice statistics
 */
export const calculateInvoiceStats = (invoices) => {
  return {
    totalRevenue: calculateTotalRevenue(invoices),
    paidCount: invoices.filter((i) => i.status === "paid").length,
    pendingAmount: calculatePendingAmount(invoices),
    overdueCount: invoices.filter((i) => i.status === "overdue").length,
  };
};

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  return `$${amount.toLocaleString()}`;
};

/**
 * Validate invoice form data
 * @param {Object} formData - Invoice form data
 * @returns {Object} Validation result {isValid, errors}
 */
export const validateInvoiceForm = (formData) => {
  const errors = {};

  if (!formData.customerName.trim()) {
    errors.customerName = "Customer name is required";
  }

  if (!formData.email.trim()) {
    errors.email = "Email is required";
  } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
    errors.email = "Email is invalid";
  }

  if (!formData.packageName.trim()) {
    errors.packageName = "Package name is required";
  }

  if (!formData.dueDate) {
    errors.dueDate = "Due date is required";
  }

  if (formData.items.length === 0) {
    errors.items = "At least one item is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
