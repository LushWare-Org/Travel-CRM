import { useState, useEffect } from 'react';
import { Edit, Save, XCircle, Loader2, MessageSquare, Clock, Hash, Plus, Trash2 } from 'lucide-react';
import toast from '@/lib/toast';
import { leadAPI } from '../../../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface Remark {
  text: string;
  date?: string | Date;
  addedAt?: string | Date;
  addedBy?: any;
  _id?: string;
}

interface Lead {
  _id?: string;
  id?: string;
  name: string;
  remarks?: Remark[];
}

interface RemarksDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSuccess?: () => void;
}

const RemarksDialog = ({ isOpen, onClose, lead, onSuccess }: RemarksDialogProps) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [localRemarks, setLocalRemarks] = useState<Remark[]>(lead?.remarks || []);
  const [newRemarkText, setNewRemarkText] = useState('');
  const [showAddNew, setShowAddNew] = useState(false);

  useEffect(() => {
    if (lead?.remarks) {
      setLocalRemarks(lead.remarks);
    }
  }, [lead]);

  if (!lead) return null;

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditText(localRemarks[index]?.text || '');
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditText('');
  };

  const handleSave = async (index: number) => {
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

      await leadAPI.updateLead(lead._id || lead.id, { remarks: updatedRemarks });

      setLocalRemarks(updatedRemarks);
      setEditingIndex(null);
      setEditText('');

      toast.success('Remark updated successfully');
      onSuccess?.();
    } catch (error: any) {
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

      const newRemark: Remark = {
        text: newRemarkText.trim(),
        date: new Date(),
        addedAt: new Date(),
      };

      const updatedRemarks = [...localRemarks, newRemark];

      await leadAPI.updateLead(lead._id || lead.id, { remarks: updatedRemarks });

      setLocalRemarks(updatedRemarks);
      setNewRemarkText('');
      setShowAddNew(false);

      toast.success('Remark added successfully');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error adding remark:', error);
      toast.error(error.message || 'Failed to add remark');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (index: number) => {
    try {
      setIsSaving(true);

      const updatedRemarks = localRemarks.filter((_, i) => i !== index);

      await leadAPI.updateLead(lead._id || lead.id, { remarks: updatedRemarks });

      setLocalRemarks(updatedRemarks);
      toast.success('Remark deleted');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error deleting remark:', error);
      toast.error(error.message || 'Failed to delete remark');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'No date';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="bg-primary text-primary-foreground p-6 shrink-0 space-y-0">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary-foreground/10">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-primary-foreground">Remarks</DialogTitle>
              <DialogDescription className="text-primary-foreground/80 mt-0.5">
                {lead.name} • {localRemarks?.length || 0} remarks
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Add New Button */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          {!showAddNew ? (
            <Button onClick={() => setShowAddNew(true)} className="w-full">
              <Plus className="w-5 h-5" />
              Add New Remark
            </Button>
          ) : (
            <div className="space-y-3 p-4 bg-primary/5 rounded-xl border border-primary/20">
              <Textarea
                value={newRemarkText}
                onChange={(e) => setNewRemarkText(e.target.value)}
                rows={3}
                placeholder="Enter your remark here..."
                disabled={isSaving}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddNew(false);
                    setNewRemarkText('');
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddNew} disabled={isSaving || !newRemarkText.trim()}>
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
                </Button>
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
                  className="group relative p-5 bg-card rounded-2xl border-2 border-border hover:border-primary/30 hover:shadow-[var(--shadow-card)] transition-all"
                >
                  {editingIndex === index ? (
                    // Edit mode
                    <div className="space-y-4">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={4}
                        placeholder="Enter remark text..."
                        disabled={isSaving}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(remark.date)}
                        </span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                            <XCircle className="w-4 h-4" />
                            Cancel
                          </Button>
                          <Button size="sm" onClick={() => handleSave(index)} disabled={isSaving || !editText.trim()}>
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
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-foreground leading-relaxed flex-1">{remark.text}</p>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDelete(index)}
                            className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                            title="Delete remark"
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </button>
                          <button
                            onClick={() => handleEdit(index)}
                            className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                            title="Edit remark"
                          >
                            <Edit className="w-4 h-4 text-muted-foreground hover:text-primary" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(remark.date)}
                        </span>
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground">
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
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-foreground mb-1">No remarks yet</p>
              <p className="text-sm text-muted-foreground">Add your first remark using the button above</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RemarksDialog;
