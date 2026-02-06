import { useState, useEffect } from 'react';
import { X, Edit, Save, XCircle, Loader2, MessageSquare, Clock, User, Hash, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { leadAPI } from '../../../services/api';

const RemarksDialog = ({ isOpen, onClose, lead, onSuccess }) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [localRemarks, setLocalRemarks] = useState(lead?.remarks || []);
  const [newRemarkText, setNewRemarkText] = useState('');
  const [showAddNew, setShowAddNew] = useState(false);

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

      const updatedRemarks = [...localRemarks];
      const originalRemark = updatedRemarks[index];
      updatedRemarks[index] = {
        text: editText.trim(),
        date: originalRemark.date || new Date(),
        addedBy: originalRemark.addedBy || originalRemark.addedBy?._id || originalRemark.addedBy?.id,
        addedAt: originalRemark.addedAt || originalRemark.date || new Date(),
        ...(originalRemark._id && { _id: originalRemark._id }),
      };

      await leadAPI.updateLead(lead._id || lead.id, {
        remarks: updatedRemarks,
      });

      setLocalRemarks(updatedRemarks);
      setEditingIndex(null);
      setEditText('');

      toast.success('Remark updated successfully');
      onSuccess?.();
    } catch (error) {
      console.error('Error updating remark:', error);
      toast.error(error.message || 'Failed to update remark');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNew = async () => {
    if (!newRemarkText.trim()) {
      toast.error('Please enter a remark');
      return;
    }

    try {
      setIsSaving(true);

      const newRemark = {
        text: newRemarkText.trim(),
        date: new Date(),
        addedAt: new Date(),
      };

      const updatedRemarks = [...localRemarks, newRemark];

      await leadAPI.updateLead(lead._id || lead.id, {
        remarks: updatedRemarks,
      });

      setLocalRemarks(updatedRemarks);
      setNewRemarkText('');
      setShowAddNew(false);

      toast.success('Remark added successfully');
      onSuccess?.();
    } catch (error) {
      console.error('Error adding remark:', error);
      toast.error(error.message || 'Failed to add remark');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (index) => {
    try {
      setIsSaving(true);

      const updatedRemarks = localRemarks.filter((_, i) => i !== index);

      await leadAPI.updateLead(lead._id || lead.id, {
        remarks: updatedRemarks,
      });

      setLocalRemarks(updatedRemarks);
      toast.success('Remark deleted');
      onSuccess?.();
    } catch (error) {
      console.error('Error deleting remark:', error);
      toast.error(error.message || 'Failed to delete remark');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'No date';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Remarks</h2>
                <p className="text-sm text-blue-200 mt-0.5">{lead.name} • {localRemarks?.length || 0} remarks</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Add New Button */}
        <div className="px-6 py-4 border-b border-gray-100 shrink-0">
          {!showAddNew ? (
            <button
              onClick={() => setShowAddNew(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg shadow-blue-500/25"
            >
              <Plus className="w-5 h-5" />
              Add New Remark
            </button>
          ) : (
            <div className="space-y-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <textarea
                value={newRemarkText}
                onChange={(e) => setNewRemarkText(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 resize-none transition-all"
                rows={3}
                placeholder="Enter your remark here..."
                disabled={isSaving}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowAddNew(false);
                    setNewRemarkText('');
                  }}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNew}
                  disabled={isSaving || !newRemarkText.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/25"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Remark
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Remarks List */}
        <div className="flex-1 overflow-y-auto p-6">
          {localRemarks && localRemarks.length > 0 ? (
            <div className="space-y-4">
              {localRemarks.map((remark, index) => (
                <div
                  key={index}
                  className="group relative p-5 bg-white rounded-2xl border-2 border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all"
                >
                  {editingIndex === index ? (
                    // Edit mode
                    <div className="space-y-4">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 resize-none transition-all"
                        rows={4}
                        placeholder="Enter remark text..."
                        disabled={isSaving}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(remark.date)}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSave(index)}
                            disabled={isSaving || !editText.trim()}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50"
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
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-gray-800 leading-relaxed flex-1">{remark.text}</p>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDelete(index)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete remark"
                          >
                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                          </button>
                          <button
                            onClick={() => handleEdit(index)}
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit remark"
                          >
                            <Edit className="w-4 h-4 text-gray-400 hover:text-blue-500" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(remark.date)}
                        </span>
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-500">
                          <Hash className="w-3 h-3" />
                          {index + 1}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-lg font-semibold text-gray-600 mb-1">No remarks yet</p>
              <p className="text-sm text-gray-400">Add your first remark using the button above</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RemarksDialog;
