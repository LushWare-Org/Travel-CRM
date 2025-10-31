import { useState, useEffect } from 'react';
import { X, Mail, Phone, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { leadAPI } from '../../../services/api';

const EditLeadDialog = ({ isOpen, onClose, lead, salesReps, onSuccess }) => {
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
    status: "new",
  });

  // Initialize form when lead changes
  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || "",
        email: lead.email || "",
        phone: lead.phone || "",
        city: lead.city || "",
        whatsapp: lead.whatsapp || "",
        salesRep: lead.salesRep || lead.adviser || "",
        assignedTo: lead.assignedTo?._id || lead.assignedTo || "",
        destination: lead.destination || "",
        platform: lead.platform || "",
        travelDate: lead.travelDate ? new Date(lead.travelDate).toISOString().split('T')[0] : "",
        time: lead.time || "",
        status: lead.status || "new",
      });
    }
  }, [lead]);

  const handleSave = async () => {
    if (!lead) return;
    
    try {
      setIsSubmitting(true);
      await leadAPI.updateLead(lead._id || lead.id, formData);
      toast.success('Lead updated successfully');
      onSuccess?.();
      onClose();
    } catch (error) {
      alert(`Failed to update lead: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Lead - {formData.name}</h2>
            <p className="text-gray-600 mt-1">Update lead information</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 group">
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
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact No. *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Departure</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">E-mail ID *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                onChange={(e) => setFormData({...formData, destination: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
              <select
                value={formData.platform}
                onChange={(e) => setFormData({...formData, platform: e.target.value})}
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
                onChange={(e) => setFormData({...formData, travelDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
              <input
                type="text"
                value={formData.time}
                onChange={(e) => setFormData({...formData, time: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="interested">Interested</option>
              <option value="quoted">Quoted</option>
              <option value="converted">Converted</option>
              <option value="lost">Lost</option>
              <option value="not-interested">Not Interested</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4">
            <a
              href={`mailto:${formData.email}`}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Email
            </a>
            <a
              href={`https://wa.me/${formData.whatsapp?.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" />
              WhatsApp
            </a>
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditLeadDialog;

