import { Edit, Trash, Eye, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VENDOR_TYPE_COLORS } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';
import type { Vendor } from './VendorManagement';

const VENDOR_TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  transport: 'Transportation',
  activity: 'Activity',
  restaurant: 'Restaurant',
  guide: 'Tour Guide',
  other: 'Other',
};

export interface VendorTableProps {
  vendors: Vendor[];
  onEdit: (vendor: Vendor) => void;
  onDelete: (vendor: Vendor) => void;
  onViewDetails: (vendor: Vendor) => void;
  onResendInvite?: (vendor: Vendor) => void;
}

const VendorTable = ({ vendors, onEdit, onDelete, onViewDetails, onResendInvite }: VendorTableProps) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-muted/50">
          <tr>
            <th className="border-r border-border px-4 py-3 text-left text-xs font-bold tracking-wider text-muted-foreground uppercase">Business Name</th>
            <th className="border-r border-border px-4 py-3 text-left text-xs font-bold tracking-wider text-muted-foreground uppercase">Type</th>
            <th className="border-r border-border px-4 py-3 text-left text-xs font-bold tracking-wider text-muted-foreground uppercase">Email</th>
            <th className="border-r border-border px-4 py-3 text-left text-xs font-bold tracking-wider text-muted-foreground uppercase">Phone</th>
            <th className="border-r border-border px-4 py-3 text-left text-xs font-bold tracking-wider text-muted-foreground uppercase">Rating</th>
            <th className="border-r border-border px-4 py-3 text-left text-xs font-bold tracking-wider text-muted-foreground uppercase">Registered</th>
            <th className="px-4 py-3 text-left text-xs font-bold tracking-wider text-muted-foreground uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {vendors && vendors.length > 0 ? (
            vendors.map((vendor) => (
              <tr key={vendor.id} className="transition-colors hover:bg-muted/50">
                <td className="border-r border-border px-4 py-3 text-sm font-semibold text-foreground">
                  {vendor.businessName || vendor.name || '—'}
                </td>
                <td className="border-r border-border px-4 py-3 text-sm">
                  <Badge variant="secondary" className={VENDOR_TYPE_COLORS[vendor.serviceType || ''] || 'bg-muted text-muted-foreground'}>
                    {VENDOR_TYPE_LABELS[vendor.serviceType || ''] || vendor.serviceType || '—'}
                  </Badge>
                </td>
                <td className="truncate border-r border-border px-4 py-3 text-sm text-muted-foreground">{vendor.email || '—'}</td>
                <td className="border-r border-border px-4 py-3 text-sm text-muted-foreground">{vendor.phone || '—'}</td>
                <td className="border-r border-border px-4 py-3 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="fill-warning text-warning">★</span>
                    <span className="font-mono font-semibold tabular-nums text-foreground">
                      {vendor.rating && vendor.rating > 0 ? vendor.rating.toFixed(1) : 'N/A'}
                    </span>
                  </div>
                </td>
                <td className="border-r border-border px-4 py-3 text-sm text-muted-foreground">
                  {vendor.createdAt ? formatDate(vendor.createdAt) : '—'}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap gap-1">
                    <Button variant="ghost" size="icon-sm" title="View Vendor Details" onClick={() => onViewDetails(vendor)}>
                      <Eye className="size-4" />
                    </Button>

                    {vendor.accountStatus === 'pending_first_login' && (
                      <Button variant="ghost" size="icon-sm" title="Resend Invitation Email" onClick={() => onResendInvite?.(vendor)}>
                        <Mail className="size-4" />
                      </Button>
                    )}

                    <Button variant="ghost" size="icon-sm" title="Edit Vendor" onClick={() => onEdit(vendor)}>
                      <Edit className="size-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Delete Vendor"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onDelete(vendor)}
                    >
                      <Trash className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                <p className="text-lg">No vendors found</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default VendorTable;
