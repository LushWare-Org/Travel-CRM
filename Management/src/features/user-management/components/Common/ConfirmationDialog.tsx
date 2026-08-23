import type { ComponentType } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  isSubmitting?: boolean;
  icon?: ComponentType<{ className?: string }>;
}

const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDangerous = false,
  isLoading = false,
  isSubmitting = false,
  icon: Icon = AlertTriangle,
}: ConfirmationDialogProps) => {
  const isProcessing = isLoading || isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Icon className={isDangerous ? 'size-5 text-destructive' : 'size-5 text-primary'} />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={isProcessing} onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={isDangerous ? 'destructive' : 'default'} disabled={isProcessing} onClick={onConfirm}>
            {isProcessing ? 'Processing...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationDialog;
