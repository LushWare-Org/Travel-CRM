/**
 * Status color configurations for invoices
 */
export const STATUS_COLORS = {
  paid: { bg: "bg-green-50", badge: "bg-green-100 text-green-800" },
  pending: { bg: "bg-yellow-50", badge: "bg-yellow-100 text-yellow-800" },
  partial: { bg: "bg-blue-50", badge: "bg-blue-100 text-blue-800" },
  overdue: { bg: "bg-red-50", badge: "bg-red-100 text-red-800" },
};

/**
 * Filter status options
 */
export const FILTER_STATUS_OPTIONS = ["all", "paid", "pending", "partial", "overdue"];

/**
 * Default invoice template
 */
export const DEFAULT_INVOICE_TEMPLATE = {
  id: "",
  customerName: "",
  email: "",
  packageName: "",
  amount: 0,
  tax: 0,
  total: 0,
  status: "pending",
  dueDate: "",
  issuedDate: "",
  paymentDate: null,
  paymentMethod: null,
  paidAmount: 0,
  items: [],
  notes: "",
};

/**
 * Default invoice item template
 */
export const DEFAULT_INVOICE_ITEM = {
  description: "",
  quantity: 1,
  rate: 0,
  amount: 0,
};
