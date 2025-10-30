import Swal from "sweetalert2";

/**
 * Send invoice via email
 * @param {Object} invoice - Invoice data
 */
export const sendInvoiceEmail = (invoice) => {
  // TODO: Implement actual email sending logic
  // This is a placeholder for future implementation
  Swal.fire("Success", `Invoice sent to ${invoice.email}.`, "success");
};

export default {
  sendInvoiceEmail,
};
