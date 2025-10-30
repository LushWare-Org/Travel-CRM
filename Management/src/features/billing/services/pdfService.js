import { jsPDF } from "jspdf";
import Swal from "sweetalert2";

/**
 * Generate and download invoice PDF
 * @param {Object} invoice - Invoice data
 */
export const generateInvoicePDF = (invoice) => {
  try {
    const doc = new jsPDF();

    // Branded Header
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 255);
    doc.text("Trip Sky Way.", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Your Ultimate Travel Partner", 105, 30, { align: "center" });
    doc.setDrawColor(0, 0, 255);
    doc.line(20, 35, 190, 35);

    // Invoice Title
    doc.setFontSize(18);
    doc.text(`Invoice ${invoice.id}`, 20, 50);

    // Bill To
    doc.setFontSize(12);
    doc.text("Bill To:", 20, 60);
    doc.text(invoice.customerName, 20, 65);
    doc.text(invoice.email, 20, 70);

    // Dates and Status
    doc.text(`Issued Date: ${invoice.issuedDate}`, 120, 60);
    doc.text(`Due Date: ${invoice.dueDate}`, 120, 65);
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 120, 70);

    // Items Table
    let yPos = 80;
    doc.setFillColor(173, 216, 230);
    doc.rect(20, yPos, 170, 10, "F");
    doc.text("Description", 25, yPos + 7);
    doc.text("Qty", 110, yPos + 7);
    doc.text("Rate", 140, yPos + 7);
    doc.text("Amount", 180, yPos + 7, { align: "right" });
    yPos += 15;

    invoice.items.forEach((item) => {
      const descLines = doc.splitTextToSize(item.description, 80);
      let itemHeight = descLines.length * 7;
      doc.text(descLines, 25, yPos);
      doc.text(item.quantity.toString(), 110, yPos);
      doc.text(`$${item.rate}`, 140, yPos);
      doc.text(`$${item.amount}`, 180, yPos, { align: "right" });
      yPos += itemHeight + 5;
    });

    // Totals
    doc.setDrawColor(0, 0, 255);
    doc.line(140, yPos, 190, yPos);
    yPos += 10;
    doc.text("Subtotal:", 140, yPos);
    doc.text(`$${invoice.amount}`, 180, yPos, { align: "right" });
    yPos += 10;
    doc.text("Tax:", 140, yPos);
    doc.text(`$${invoice.tax}`, 180, yPos, { align: "right" });
    yPos += 10;
    doc.text("Total:", 140, yPos);
    doc.text(`$${invoice.total}`, 180, yPos, { align: "right" });

    // Payment Info
    if (invoice.paymentDate) {
      yPos += 20;
      doc.text(`Payment Date: ${invoice.paymentDate}`, 20, yPos);
      yPos += 10;
      doc.text(`Payment Method: ${invoice.paymentMethod}`, 20, yPos);
      if (invoice.status === "partial") {
        yPos += 10;
        doc.text(`Paid Amount: $${invoice.paidAmount}`, 20, yPos);
      }
    }

    // Notes
    if (invoice.notes) {
      yPos += 20;
      doc.text("Notes:", 20, yPos);
      yPos += 5;
      const notesLines = doc.splitTextToSize(invoice.notes, 170);
      doc.text(notesLines, 20, yPos);
    }

    // Footer
    doc.setDrawColor(0, 0, 255);
    doc.line(20, 270, 190, 270);
    doc.setFontSize(10);
    doc.text("Contact us: info@tripskyway.com | +1-800-TRAVEL", 105, 280, { align: "center" });

    doc.save(`Invoice_${invoice.id}.pdf`);
    Swal.fire("Success", `Invoice ${invoice.id} downloaded as PDF.`, "success");
  } catch (error) {
    console.error("Error generating PDF:", error);
    Swal.fire("Error", "Failed to generate PDF. Please try again.", "error");
  }
};

export default {
  generateInvoicePDF,
};
