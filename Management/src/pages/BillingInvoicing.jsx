import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Search, Download, Eye, Send, MoreVertical, DollarSign, CheckCircle, Clock, AlertCircle, Edit, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { jsPDF } from "jspdf";

const BillingInvoicing = () => {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showNewInvoiceDialog, setShowNewInvoiceDialog] = useState(false);
  const [showEditInvoiceDialog, setShowEditInvoiceDialog] = useState(false);
  const [editInvoiceData, setEditInvoiceData] = useState(null);

  const today = "2025-10-22";

  const [invoices, setInvoices] = useState([
    {
      id: "INV-001",
      customerName: "John Smith",
      email: "john@example.com",
      packageName: "Paris Romance Getaway",
      amount: 2499,
      tax: 250,
      total: 2749,
      status: "paid",
      dueDate: "2025-10-20",
      issuedDate: "2025-10-01",
      paymentDate: "2025-10-15",
      paymentMethod: "Credit Card",
      items: [
        { description: "Flight Tickets", quantity: 2, rate: 800, amount: 1600 },
        { description: "Hotel Accommodation (4 nights)", quantity: 1, rate: 600, amount: 600 },
        { description: "Tour Guide & Activities", quantity: 1, rate: 299, amount: 299 },
      ],
      notes: "Payment received. Thank you!",
    },
    {
      id: "INV-002",
      customerName: "Emma Wilson",
      email: "emma@example.com",
      packageName: "Bali Family Adventure",
      amount: 1899,
      tax: 190,
      total: 2089,
      status: "pending",
      dueDate: "2025-10-25",
      issuedDate: "2025-10-05",
      paymentDate: null,
      paymentMethod: null,
      items: [
        { description: "Flight Tickets", quantity: 4, rate: 400, amount: 1600 },
        { description: "Resort Accommodation (6 nights)", quantity: 1, rate: 299, amount: 299 },
      ],
      notes: "Awaiting customer payment",
    },
    {
      id: "INV-003",
      customerName: "Robert Brown",
      email: "robert@example.com",
      packageName: "Dubai Luxury Escape",
      amount: 3299,
      tax: 330,
      total: 3629,
      status: "partial",
      dueDate: "2025-10-30",
      issuedDate: "2025-10-08",
      paymentDate: "2025-10-18",
      paymentMethod: "Bank Transfer",
      paidAmount: 1815,
      items: [
        { description: "Flight Tickets", quantity: 3, rate: 1000, amount: 3000 },
        { description: "Luxury Hotel (3 nights)", quantity: 1, rate: 299, amount: 299 },
      ],
      notes: "Advance payment received. Balance due before travel date.",
    },
  ]);

  const computedInvoices = invoices.map((inv) => {
    if (inv.dueDate < today && inv.status === "pending") {
      return { ...inv, status: "overdue" };
    }
    return inv;
  });

  const statusColors = {
    paid: { bg: "bg-green-50", badge: "bg-green-100 text-green-800" },
    pending: { bg: "bg-yellow-50", badge: "bg-yellow-100 text-yellow-800" },
    partial: { bg: "bg-blue-50", badge: "bg-blue-100 text-blue-800" },
    overdue: { bg: "bg-red-50", badge: "bg-red-100 text-red-800" },
  };

  const totalRevenue = computedInvoices.reduce((sum, inv) => {
    if (inv.status === "paid") return sum + inv.total;
    if (inv.status === "partial") return sum + (inv.paidAmount || 0);
    return sum;
  }, 0);

  const pendingAmount = computedInvoices.reduce((sum, inv) => {
    if (inv.status === "paid") return sum;
    if (inv.status === "partial") return sum + (inv.total - (inv.paidAmount || 0));
    return sum + inv.total;
  }, 0);

  const filteredInvoices = computedInvoices.filter((inv) => {
    const matchesSearch = inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || inv.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || inv.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleEditInvoice = (invoice) => {
    setEditInvoiceData({ ...invoice, items: [...invoice.items] });
    setShowEditInvoiceDialog(true);
  };

  const handleSaveEditInvoice = () => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === editInvoiceData.id ? editInvoiceData : inv))
    );
    setShowEditInvoiceDialog(false);
    setEditInvoiceData(null);
    Swal.fire("Success", "Invoice updated successfully.", "success");
  };

  const handleDownload = (invoice) => {
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
  };

  const handleSend = (invoice) => {
    Swal.fire("Success", `Invoice sent to ${invoice.email}.`, "success");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Billing & Invoicing</h1>
              <p className="text-gray-600 mt-1">Manage invoices, payments, and financial reports</p>
            </div>
          </div>
          <button onClick={() => setShowNewInvoiceDialog(true)} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Invoice
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
            <div className="bg-green-500 p-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Total Revenue</p>
              <p className="text-lg font-bold text-gray-900">${totalRevenue.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
            <div className="bg-green-500 p-2 rounded-lg">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Paid Invoices</p>
              <p className="text-lg font-bold text-gray-900">{computedInvoices.filter((i) => i.status === "paid").length}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Pending</p>
              <p className="text-lg font-bold text-gray-900">${pendingAmount.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
            <div className="bg-red-500 p-2 rounded-lg">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Overdue</p>
              <p className="text-lg font-bold text-gray-900">{computedInvoices.filter((i) => i.status === "overdue").length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Search & Filter */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer name or invoice ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {["all", "paid", "pending", "partial", "overdue"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filterStatus === status ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {status === "all" ? "All Invoices" : status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">
                {status === "all" ? computedInvoices.length : computedInvoices.filter((i) => i.status === status).length}
              </span>
            </button>
          ))}
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Invoice List</h2>
            <p className="text-sm text-gray-600 mt-1">All invoices and payment records</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Invoice ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Package</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Due Date</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-gray-900">{invoice.id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{invoice.customerName}</p>
                        <p className="text-xs text-gray-500">{invoice.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{invoice.packageName}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-gray-900">${invoice.total}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[invoice.status].badge}`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{invoice.dueDate}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => setSelectedInvoice(invoice)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleEditInvoice(invoice)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDownload(invoice)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleSend(invoice)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                          <Send className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Detail Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Invoice {selectedInvoice.id}</h2>
                  <p className="text-gray-600 mt-1">Invoice details and payment information</p>
                </div>
                <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">BILL TO</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{selectedInvoice.customerName}</p>
                    <p className="text-xs text-gray-600">{selectedInvoice.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-medium mb-1">Invoice Date: {selectedInvoice.issuedDate}</p>
                    <p className="text-xs text-gray-500 font-medium mb-1">Due Date: {selectedInvoice.dueDate}</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusColors[selectedInvoice.status].badge} mt-2`}>
                      {selectedInvoice.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Invoice Items</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 text-gray-700 font-medium">Description</th>
                        <th className="text-center py-2 text-gray-700 font-medium">Qty</th>
                        <th className="text-right py-2 text-gray-700 font-medium">Rate</th>
                        <th className="text-right py-2 text-gray-700 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="py-2 text-gray-900">{item.description}</td>
                          <td className="py-2 text-center text-gray-700">{item.quantity}</td>
                          <td className="py-2 text-right text-gray-700">${item.rate}</td>
                          <td className="py-2 text-right text-gray-900 font-semibold">${item.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-700">Subtotal:</span>
                      <span className="text-gray-900 font-semibold">${selectedInvoice.amount}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-700">Tax:</span>
                      <span className="text-gray-900 font-semibold">${selectedInvoice.tax}</span>
                    </div>
                    <div className="flex justify-between py-3 bg-gray-50 px-3 rounded-lg">
                      <span className="text-gray-900 font-bold">Total:</span>
                      <span className="text-lg font-bold text-blue-600">${selectedInvoice.total}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                {selectedInvoice.paymentDate && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-green-900 mb-2">Payment Information</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-green-800">
                      <div>
                        <p className="text-gray-600">Payment Date:</p>
                        <p className="font-semibold">{selectedInvoice.paymentDate}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Payment Method:</p>
                        <p className="font-semibold">{selectedInvoice.paymentMethod}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Notes</label>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedInvoice.notes}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button onClick={() => handleDownload(selectedInvoice)} className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                  <button onClick={() => handleSend(selectedInvoice)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    Send Email
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Invoice Dialog */}
        {showNewInvoiceDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="border-b border-gray-200 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Create New Invoice</h2>
                  <p className="text-gray-600 mt-1">Generate an invoice for a booking or service</p>
                </div>
                <button onClick={() => setShowNewInvoiceDialog(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <NewEditInvoiceForm
                  formData={{
                    id: `INV-${(invoices.length + 1).toString().padStart(3, "0")}`,
                    customerName: "",
                    email: "",
                    packageName: "",
                    amount: 0,
                    tax: 0,
                    total: 0,
                    status: "pending",
                    dueDate: "",
                    issuedDate: today,
                    paymentDate: null,
                    paymentMethod: null,
                    paidAmount: 0,
                    items: [],
                    notes: "",
                  }}
                  setFormData={(data) => setInvoices((prev) => [...prev, data])}
                  onSave={() => {
                    setShowNewInvoiceDialog(false);
                    Swal.fire("Success", "New invoice created successfully.", "success");
                  }}
                  onCancel={() => setShowNewInvoiceDialog(false)}
                  today={today}
                />
              </div>
            </div>
          </div>
        )}

        {/* Edit Invoice Dialog */}
        {showEditInvoiceDialog && editInvoiceData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="border-b border-gray-200 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Edit Invoice</h2>
                  <p className="text-gray-600 mt-1">Update invoice details</p>
                </div>
                <button onClick={() => setShowEditInvoiceDialog(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <NewEditInvoiceForm
                  formData={editInvoiceData}
                  setFormData={setEditInvoiceData}
                  onSave={handleSaveEditInvoice}
                  onCancel={() => setShowEditInvoiceDialog(false)}
                  today={today}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// New/Edit Invoice Form Component
const NewEditInvoiceForm = ({ formData, setFormData, onSave, onCancel, today }) => {
  const [localData, setLocalData] = useState(() => ({ ...formData, items: [...formData.items] }));

  useEffect(() => {
    setLocalData({ ...formData, items: [...formData.items] });
  }, [formData]);

  useEffect(() => {
    const amount = localData.items.reduce((sum, item) => sum + item.amount, 0);
    const tax = parseFloat(localData.tax) || 0;
    const total = amount + tax;
    setLocalData((prev) => ({ ...prev, amount, total }));
  }, [localData.items, localData.tax]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLocalData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTaxChange = (e) => {
    const value = parseFloat(e.target.value);
    setLocalData((prev) => ({ ...prev, tax: isNaN(value) ? 0 : value }));
  };

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

  const addItem = () => {
    setLocalData((prev) => ({
      ...prev,
      items: [...prev.items, { description: "", quantity: 1, rate: 0, amount: 0 }],
    }));
  };

  const removeItem = (index) => {
    setLocalData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Customer Name</label>
          <input
            type="text"
            name="customerName"
            value={localData.customerName}
            onChange={handleInputChange}
            placeholder="Enter customer name"
            className="px-3 py-2 border border-gray-300 rounded-lg w-full"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={localData.email}
            onChange={handleInputChange}
            placeholder="Enter customer email"
            className="px-3 py-2 border border-gray-300 rounded-lg w-full"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Package Name</label>
        <input
          type="text"
          name="packageName"
          value={localData.packageName}
          onChange={handleInputChange}
          placeholder="Enter package name"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Issued Date</label>
          <input
            type="date"
            name="issuedDate"
            value={localData.issuedDate}
            onChange={handleInputChange}
            className="px-3 py-2 border border-gray-300 rounded-lg w-full"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Due Date</label>
          <input
            type="date"
            name="dueDate"
            value={localData.dueDate}
            onChange={handleInputChange}
            className="px-3 py-2 border border-gray-300 rounded-lg w-full"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Status</label>
        <select
          name="status"
          value={localData.status}
          onChange={handleStatusChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="pending">Pending (Awaiting payment)</option>
          <option value="paid">Paid (Full payment received)</option>
          <option value="partial">Partial (Partial payment received)</option>
        </select>
      </div>
      {(localData.status === "paid" || localData.status === "partial") && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Payment Date</label>
            <input
              type="date"
              name="paymentDate"
              value={localData.paymentDate || ""}
              onChange={handleInputChange}
              className="px-3 py-2 border border-gray-300 rounded-lg w-full"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Payment Method</label>
            <input
              type="text"
              name="paymentMethod"
              value={localData.paymentMethod || ""}
              onChange={handleInputChange}
              placeholder="e.g., Credit Card, Bank Transfer"
              className="px-3 py-2 border border-gray-300 rounded-lg w-full"
            />
          </div>
        </div>
      )}
      {localData.status === "partial" && (
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Paid Amount</label>
          <input
            type="number"
            name="paidAmount"
            value={localData.paidAmount || 0}
            onChange={(e) => setLocalData((prev) => ({ ...prev, paidAmount: parseFloat(e.target.value) || 0 }))}
            placeholder="Enter paid amount"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      )}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Tax Amount</label>
        <input
          type="number"
          value={localData.tax || 0}
          onChange={handleTaxChange}
          placeholder="Enter tax amount"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Items (Add line items for the invoice)</h3>
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 mb-2 font-medium text-gray-700">
          <span>Description</span>
          <span>Quantity</span>
          <span>Rate</span>
          <span>Amount</span>
          <span></span>
        </div>
        {localData.items.map((item, index) => (
          <div key={index} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 mb-2">
            <input
              type="text"
              value={item.description}
              onChange={(e) => updateItem(index, "description", e.target.value)}
              placeholder="Enter item description"
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="number"
              value={item.quantity}
              onChange={(e) => updateItem(index, "quantity", e.target.value)}
              placeholder="Qty"
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="number"
              value={item.rate}
              onChange={(e) => updateItem(index, "rate", e.target.value)}
              placeholder="Rate"
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
            <span className="px-3 py-2 bg-gray-100 rounded-lg">${item.amount}</span>
            <button onClick={() => removeItem(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button onClick={addItem} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
        <textarea
          name="notes"
          value={localData.notes}
          onChange={handleInputChange}
          placeholder="Enter any additional notes"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => {
            setFormData(localData);
            onSave();
          }}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium"
        >
          {formData.id.startsWith("INV-00") ? "Create" : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-200 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default BillingInvoicing;