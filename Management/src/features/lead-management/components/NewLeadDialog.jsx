import { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { leadAPI } from '../../../services/api';

const NewLeadDialog = ({ isOpen, onClose, salesReps, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    whatsapp: "",
    salesRep: "",
    assignedTo: "",
    destination: "",
    platform: "",
    travelDate: "",
    time: "",
    remarks: [{ text: "", date: "" }],
  });

  const addRemarkField = () => {
    setFormData({
      ...formData,
      remarks: [...formData.remarks, { text: "", date: "" }],
    });
  };

  const updateRemark = (index, field, value) => {
    const updatedRemarks = [...formData.remarks];
    updatedRemarks[index] = { ...updatedRemarks[index], [field]: value };
    setFormData({
      ...formData,
      remarks: updatedRemarks,
    });
  };

  const removeRemark = (index) => {
    const updatedRemarks = formData.remarks.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      remarks: updatedRemarks.length > 0 ? updatedRemarks : [{ text: "", date: "" }],
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      alert("Please fill in required fields: Name, Email, and Phone");
      return;
    }

    try {
      setIsSubmitting(true);
      const leadData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        city: formData.city || undefined,
        whatsapp: formData.whatsapp || undefined,
        salesRep: formData.salesRep || undefined,
        assignedTo: formData.assignedTo || undefined,
        destination: formData.destination || undefined,
        platform: formData.platform || "Manual Entry",
        source: "manual",
        travelDate: formData.travelDate || undefined,
        time: formData.time || undefined,
        remarks: formData.remarks.filter((r) => r.text.trim() !== "").map(r => ({
          text: r.text.trim(),
          date: r.date || new Date().toISOString().split("T")[0]
        })),
        status: "new"
      };

      await leadAPI.createLead(leadData);
      toast.success('Lead created successfully');
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        city: "",
        whatsapp: "",
        salesRep: "",
        assignedTo: "",
        destination: "",
        platform: "",
        travelDate: "",
        time: "",
        remarks: [{ text: "", date: "" }],
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      alert(`Failed to create lead: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add New Lead</h2>
            <p className="text-sm text-gray-600 mt-1">Fill in all lead information</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 group"
          >
            <X className="w-5 h-5 text-gray-700 group-hover:text-red-600 transition-colors duration-200" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact No. *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1-555-0000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Departure</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter departure city"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">E-mail ID *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1-555-0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sales Rep</label>
              <select
                value={formData.assignedTo || ''}
                onChange={(e) => {
                  const id = e.target.value;
                  const rep = salesReps.find(r => r.id === id);
                  setFormData({ ...formData, assignedTo: id, salesRep: rep ? rep.name : '' });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Sales Rep</option>
                {salesReps.map((rep) => (
                  <option key={rep.id} value={rep.id}>{rep.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Paris, France"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
              <select
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Platform</option>
                <option value="Website Form">Website Form</option>
                <option value="Social Media">Social Media</option>
                <option value="Phone Call">Phone Call</option>
                <option value="Referral">Referral</option>
                <option value="Email">Email</option>
                <option value="Walk-in">Walk-in</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Travel Date</label>
              <input
                type="date"
                value={formData.travelDate}
                onChange={(e) => setFormData({ ...formData, travelDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
              <input
                type="text"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 10:30 AM or 14:00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
            <div className="space-y-2">
              {formData.remarks.map((remark, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={remark.text}
                    onChange={(e) => updateRemark(index, "text", e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Remark ${index + 1}`}
                  />
                  <input
                    type="date"
                    value={remark.date}
                    onChange={(e) => updateRemark(index, "date", e.target.value)}
                    className="w-40 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formData.remarks.length > 1 && (
                    <button
                      onClick={() => removeRemark(index)}
                      className="px-3 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addRemarkField}
                className="w-full px-3 py-2 border border-dashed border-gray-400 text-gray-600 rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Another Remark
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Lead"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewLeadDialog;

