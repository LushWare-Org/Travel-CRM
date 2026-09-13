import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface UserFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  submitLabel?: string;
  isLoading?: boolean;
  isSubmitting?: boolean;
  error?: string | null;
  successMessage?: string | null;
}

const UserFormDialog = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  subtitle,
  children,
  submitLabel = 'Save',
  isLoading = false,
  isSubmitting = false,
  error = null,
  successMessage = null,
}: UserFormDialogProps) => {
  const isProcessing = isLoading || isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>

        {/* Error Message - Form Validation Errors Only */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        )}

        {/* Success Message - Form Success Only */}
        {successMessage && (
          <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 p-4">
            <CheckCircle className="mt-0.5 size-5 shrink-0 text-success" />
            <p className="text-sm font-medium text-success">{successMessage}</p>
          </div>
        )}

        {children}

        <DialogFooter>
          <Button variant="outline" disabled={isProcessing} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={isProcessing} onClick={onSubmit}>
            {isProcessing ? 'Processing...' : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormDialog;
