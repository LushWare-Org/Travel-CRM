import type { ChangeEvent } from 'react';
import { Save, X } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** Editable profile fields, mirroring the shape accepted by services/api/account's updateProfile. */
export type ProfileFormData = {
  name: string;
  email: string;
  phone: string;
};

/** Inline feedback banner state produced by the profile-save flow. */
export interface UpdateMessage {
  type: 'success' | 'error';
  text: string;
}

interface ProfileEditModalProps {
  formData: ProfileFormData;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  updateMessage: UpdateMessage | null;
}

export default function ProfileEditModal({
  formData,
  onChange,
  onSave,
  onCancel,
  isSaving,
  updateMessage,
}: ProfileEditModalProps) {
  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onCancel(); }}>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col rounded-3xl bg-white p-0 text-gray-900 shadow-modal ring-1 ring-gray-200 max-w-lg"
      >
        <DialogHeader className="flex-row items-center justify-between gap-4 border-b border-gray-200 px-8 py-6 max-sm:px-5 max-sm:py-5 rounded-t-3xl">
          <div className="min-w-0">
            <DialogTitle className="text-2xl font-bold text-gray-900 leading-tight">
              Edit Profile
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Update your personal details
            </DialogDescription>
          </div>
          <DialogClose
            aria-label="Close edit profile dialog"
            className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <X className="w-6 h-6 text-gray-500" />
          </DialogClose>
        </DialogHeader>

        <div className="px-8 py-6 max-sm:px-5">
          {updateMessage && (
            <div className={`mb-6 p-4 rounded-xl text-sm ${updateMessage.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
              {updateMessage.text}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={onChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-600 transition-colors bg-white"
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={onChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-600 transition-colors bg-white"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={onChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-600 transition-colors bg-white"
                placeholder="Enter your phone number"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-8 py-6 flex gap-4 rounded-b-3xl border-t border-gray-200 max-sm:px-5">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex-1 px-6 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
