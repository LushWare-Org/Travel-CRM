/**
 * Package Card Component
 * Displays package information in card format with action buttons
 */

import {
  Calendar,
  MapPin,
  Briefcase,
  Star,
  Users,
  Edit,
  Eye,
  Download,
  Trash2,
  Copy,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { usePermission } from '../../../contexts/PermissionContext';
import { STATUS_COLORS, CATEGORY_COLORS } from '../utils/constants';
import { formatPriceINR } from '../utils/helpers';

const PackageCard = ({
  pkg,
  onView,
  onEdit,
  onDownload,
  onDelete,
  onDuplicate,
}) => {
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  
  // Guard: Return null if pkg is invalid
  if (!pkg || typeof pkg !== 'object') {
    return null;
  }

  const displayPrice = pkg.sellPrice ?? pkg.basePrice;
  const formattedPrice = displayPrice ? formatPriceINR(displayPrice) : null;
  // Derive status from isActive (no more draft/published enum)
  const status = pkg.isActive ? 'published' : 'draft';
  const statusLabel = pkg.isActive ? 'Published' : 'Draft';

  // Check if user is a salesRep (read-only access)
  const isSalesRep = user?.role === 'salesRep';
  
  // Check if user can edit packages (superAdmin, or admin/salesRep with manage_packages)
  const canEditPackages =
    user?.role === 'superAdmin' ||
    (user?.role === 'admin' && hasPermission('manage_packages')) ||
    (user?.role === 'salesRep' && hasPermission('manage_packages'));

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all flex flex-col group">
      {/* Image Section */}
      <div
        className={`h-40 relative overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform ${
          pkg.images && pkg.images.length > 0 ? 'bg-gray-100' : 'bg-gray-300'
        }`}
        style={
          pkg.images && pkg.images.length > 0
            ? {
                // Handle both string URLs and image objects
                backgroundImage: `url(${typeof pkg.images[0] === 'string' ? pkg.images[0] : pkg.images[0].url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : {}
        }
      >
        {!(pkg.images && pkg.images.length > 0) && (
          <ImageIcon className="w-12 h-12 text-white opacity-50" />
        )}
        <span
          className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${
            STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Content Section */}
      <div className="p-4 pb-2">
        <h3 className="text-lg font-bold text-gray-900">{pkg.title}</h3>
        <div className="flex gap-2 mt-2 flex-wrap">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              CATEGORY_COLORS[pkg.category] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {pkg.category}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
            {pkg.region}
          </span>
        </div>
      </div>

      {/* Details Section */}
      <div className="flex-1 px-4 space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            {pkg.durationDays || 'N/A'} days
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4" />
            {pkg.destination || 'N/A'}
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Briefcase className="w-4 h-4" />
            {pkg.accommodation || 'N/A'}
          </div>
        </div>

        {/* Rating and Price */}
        <div className="flex justify-between items-center pt-3 border-t border-gray-200">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-semibold">{pkg.rating || 0}</span>
            <span className="text-xs text-gray-500">({pkg.numReviews || 0})</span>
          </div>
          <div className="text-lg font-bold text-blue-600">{formattedPrice || 'Contact us'}</div>
        </div>

        {/* Bookings */}
        <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t border-gray-200">
          <Users className="w-4 h-4" />
          {pkg.bookings || 0} bookings
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-3 border-t border-gray-200">
          <button
            onClick={() => onView(pkg)}
            className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-1 text-sm"
            title="View package details"
          >
            <Eye className="w-4 h-4" />
            View
          </button>
          
          {/* Edit button - only visible to admins/staff with manage_packages permission or superAdmin */}
          {canEditPackages && (
            <button
              onClick={() => onEdit(pkg)}
              className="flex-1 px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors font-medium flex items-center justify-center gap-1 text-sm"
              title="Edit package"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
        
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onDownload(pkg)}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-1 text-sm"
            title="Download PDF"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          
          {/* Duplicate button - only visible to admins/staff with manage_packages permission or superAdmin */}
          {canEditPackages && (
            <button
              onClick={() => onDuplicate(pkg)}
              className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-1 text-sm"
              title="Duplicate package"
            >
              <Copy className="w-4 h-4" />
              Duplicate
            </button>
          )}
          
          {/* Delete button - visible to superAdmin, or admin/salesRep with manage_packages permission */}
          {canEditPackages && (
            <button
              onClick={() => onDelete(pkg._id || pkg.id)}
              className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-1 text-sm"
              title="Delete package"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
        <br />
      </div>
    </div>
  );
};

export default PackageCard;
