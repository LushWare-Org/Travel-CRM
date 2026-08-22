/**
 * Package Form Modal Component
 * Dialog wrapper for the create/edit package form
 */

import { ReactNode } from 'react';
import { Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface PackageFormModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  onClose: () => void;
}

const PackageFormModal = ({
  isOpen,
  title,
  subtitle,
  children,
  onClose,
}: PackageFormModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
              {subtitle && (
                <DialogDescription>
                  {typeof subtitle === 'string' ? <span>{subtitle}</span> : subtitle}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>
        <div>{children}</div>
      </DialogContent>
    </Dialog>
  );
};

export default PackageFormModal;
