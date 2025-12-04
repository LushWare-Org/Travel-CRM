import { useState, useEffect } from 'react';
import { X, Edit, Save, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { leadAPI } from '../../../services/api';

const RemarksDialog = ({ isOpen, onClose, lead, onSuccess }) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [localRemarks, setLocalRemarks] = useState(lead?.remarks || []);

  // Update local remarks when lead changes
  useEffect(() => {
    if (lead?.remarks) {
      setLocalRemarks(lead.remarks);
    }
  }, [lead]);

  if (!isOpen || !lead) return null;

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditText(localRemarks[index]?.text || '');
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditText('');
  };

  const handleSave = async (index) => {
    if (!editText.trim()) {
      toast.error('Remark text cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      
      // Create updated remarks array, preserving all original fields
      const updatedRemarks = [...localRemarks];
      const originalRemark = updatedRemarks[index];
      updatedRemarks[index] = {
        text: editText.trim(),
        date: originalRemark.date || new Date(),
        addedBy: originalRemark.addedBy || originalRemark.addedBy?._id || originalRemark.addedBy?.id,
        addedAt: originalRemark.addedAt || originalRemark.date || new Date(),
        // Preserve _id if it exists (for subdocuments)
        ...(originalRemark._id && { _id: originalRemark._id }),
      };

      // Update the lead with modified remarks
      await leadAPI.updateLead(lead._id || lead.id, {
        remarks: updatedRemarks,
      });

      // Update local state
      setLocalRemarks(updatedRemarks);
      setEditingIndex(null);
      setEditText('');
      
      toast.success('Remark updated successfully');
      onSuccess?.(); // Refresh lead data in parent
    } catch (error) {
      console.error('Error updating remark:', error);
      toast.error(error.message || 'Failed to update remark');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Remarks - {lead.name}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {localRemarks?.length || 0} total remarks
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 group"
          >
            <X className="w-5 h-5 text-gray-700 group-hover:text-red-600 transition-colors duration-200" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {localRemarks && localRemarks.length > 0 ? (
            localRemarks.map((remark, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                {editingIndex === index ? (
                  // Edit mode
                  <div className="space-y-3">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={4}
                      placeholder="Enter remark text..."
                      disabled={isSaving}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSave(index)}
                        disabled={isSaving || !editText.trim()}
                        className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
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
                ) : (
                  // View mode
                  <>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm text-gray-900 flex-1">{remark.text}</p>
                      <button
                        onClick={() => handleEdit(index)}
                        className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors group flex-shrink-0"
                        title="Edit remark"
                      >
                        <Edit className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                      <span className="text-xs text-gray-500">
                        {remark.date ? new Date(remark.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'No date'}
                      </span>
                      <span className="text-xs font-medium text-gray-600">
                        Remark #{index + 1}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No remarks available</p>
              <p className="text-sm mt-2">No remarks have been added to this lead yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RemarksDialog;

