/**
 * AdminManagement Enhancement for Super Admin Support
 * 
 * Add these sections to the existing AdminManagement.jsx component
 * 
 * Instructions:
 * 1. Import Crown icon at the top: import { Crown } from 'lucide-react'
 * 2. Add the state variables for Super Admin dialogs
 * 3. Add the handler functions below
 * 4. Update your JSX to include the promote/demote buttons
 * 5. Add the dialogs at the bottom of the component
 */

// ==========================================
// ADD THESE IMPORTS AT THE TOP
// ==========================================

// Add Crown to your existing lucide-react imports:
// import { Plus, Edit, Trash, Shield, Mail, AlertCircle, CheckCircle, RotateCcw, Clock, Loader, Crown } from 'lucide-react';

// ==========================================
// ADD THESE STATE VARIABLES TO AdminManagement
// ==========================================

// Add these state variables after the existing ones:
const [showPromoteSuperAdminConfirm, setShowPromoteSuperAdminConfirm] = useState(false);
const [showDemoteSuperAdminConfirm, setShowDemoteSuperAdminConfirm] = useState(false);
const [adminToPromote, setAdminToPromote] = useState(null);
const [adminToDemote, setAdminToDemote] = useState(null);
const [newRoleForDemotion, setNewRoleForDemotion] = useState('admin');

// ==========================================
// ADD THESE HANDLER FUNCTIONS
// ==========================================

/**
 * Handle promoting admin to super admin
 */
const handlePromoteSuperAdmin = (admin) => {
  setAdminToPromote(admin);
  setShowPromoteSuperAdminConfirm(true);
};

/**
 * Confirm and execute super admin promotion
 */
const confirmPromoteSuperAdmin = async () => {
  if (!adminToPromote) return;

  try {
    setIsSubmitting(true);
    setError(null);

    const response = await adminService.promoteSuperAdmin({
      userId: adminToPromote.id,
    });

    if (response.status === 'success') {
      setSuccessMessage(`${adminToPromote.name} has been promoted to Super Admin ✓`);

      // Update local state
      setAdmins(admins.map(admin => 
        admin.id === adminToPromote.id 
          ? { ...admin, role: 'superAdmin', isSuperAdmin: true }
          : admin
      ));

      // Reset and close dialog
      setTimeout(() => {
        setShowPromoteSuperAdminConfirm(false);
        setAdminToPromote(null);
        setSuccessMessage('');
      }, 2000);
    }
  } catch (err) {
    setError(err.message || 'Failed to promote to super admin');
  } finally {
    setIsSubmitting(false);
  }
};

/**
 * Handle demoting super admin
 */
const handleDemoteSuperAdmin = (admin) => {
  setAdminToDemote(admin);
  setNewRoleForDemotion('admin');
  setShowDemoteSuperAdminConfirm(true);
};

/**
 * Confirm and execute super admin demotion
 */
const confirmDemoteSuperAdmin = async () => {
  if (!adminToDemote) return;

  try {
    setIsSubmitting(true);
    setError(null);

    const response = await adminService.demoteSuperAdmin({
      userId: adminToDemote.id,
      newRole: newRoleForDemotion,
    });

    if (response.status === 'success') {
      setSuccessMessage(`${adminToDemote.name} has been demoted to ${newRoleForDemotion} ✓`);

      // Update local state
      setAdmins(admins.map(admin => 
        admin.id === adminToDemote.id 
          ? { 
              ...admin, 
              role: newRoleForDemotion, 
              isSuperAdmin: false,
              permissions: newRoleForDemotion === 'admin' ? [] : []
            }
          : admin
      ));

      // Reset and close dialog
      setTimeout(() => {
        setShowDemoteSuperAdminConfirm(false);
        setAdminToDemote(null);
        setNewRoleForDemotion('admin');
        setSuccessMessage('');
      }, 2000);
    }
  } catch (err) {
    setError(err.message || 'Failed to demote from super admin');
  } finally {
    setIsSubmitting(false);
  }
};

// ==========================================
// UPDATE YOUR AdminTable COMPONENT PROPS
// ==========================================

// When calling AdminTable, add these props:
// <AdminTable
//   admins={paginatedData.data}
//   onEdit={openEditDialog}
//   onDelete={handleDeleteAdmin}
//   onSelectAdmin={setSelectedAdmin}
//   onResendInvite={handleResendInvitation}
//   onForcePasswordReset={handleForcePasswordReset}
//   onPromoteSuperAdmin={handlePromoteSuperAdmin}     // ADD THIS
//   onDemoteSuperAdmin={handleDemoteSuperAdmin}       // ADD THIS
// />

// ==========================================
// ADD THESE DIALOGS AT THE END OF THE RETURN JSX
// ==========================================

{/* Promote to Super Admin Confirmation Dialog */}
{showPromoteSuperAdminConfirm && (
  <ConfirmationDialog
    isOpen={showPromoteSuperAdminConfirm}
    onClose={() => {
      setShowPromoteSuperAdminConfirm(false);
      setAdminToPromote(null);
    }}
    title="Promote to Super Admin?"
    icon={Crown}
    iconColor="amber"
    message={`Are you sure you want to promote ${adminToPromote?.name} to Super Admin? This will grant them full system access and all permissions.`}
    details={[
      '✓ Full system access',
      '✓ All permissions automatically assigned',
      '✓ Cannot be deleted or deactivated',
      '✓ Can manage other admins',
      '⚠️ This action cannot be undone by regular admins'
    ]}
    confirmText="Yes, Promote to Super Admin"
    cancelText="Cancel"
    isDangerous={true}
    isLoading={isSubmitting}
    onConfirm={confirmPromoteSuperAdmin}
  />
)}

{/* Demote from Super Admin Confirmation Dialog */}
{showDemoteSuperAdminConfirm && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Demote from Super Admin?</h3>
            <p className="text-sm text-gray-600 mt-1">This will remove super admin privileges</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <p className="text-gray-700">
          Are you sure you want to demote <span className="font-semibold">{adminToDemote?.name}</span> from Super Admin?
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-900 mb-2">This user will lose:</p>
          <ul className="text-xs text-amber-800 space-y-1">
            <li>✗ Super Admin status</li>
            <li>✗ Full system access</li>
            <li>✗ Deletion protection</li>
            <li>✗ All admin permissions</li>
          </ul>
        </div>

        <div className="space-y-2">
          <label className="block">
            <p className="text-sm font-medium text-gray-700 mb-2">New Role:</p>
            <select
              value={newRoleForDemotion}
              onChange={(e) => setNewRoleForDemotion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="admin">Admin</option>
              <option value="salesRep">Sales Representative</option>
              <option value="vendor">Vendor</option>
              <option value="customer">Customer</option>
            </select>
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={() => {
              setShowDemoteSuperAdminConfirm(false);
              setAdminToDemote(null);
              setNewRoleForDemotion('admin');
            }}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={confirmDemoteSuperAdmin}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Demoting...' : 'Demote'}
          </button>
        </div>
      </div>
    </div>
  </div>
)}

// ==========================================
// UPDATE YOUR ADMIN SERVICE (admin.service.js)
// ==========================================

// Add these methods to your adminService:

/**
 * Promote admin to super admin
 */
export const promoteSuperAdmin = async (data) => {
  return api.post('/admin/super/promote', data);
};

/**
 * Demote super admin
 */
export const demoteSuperAdmin = async (data) => {
  return api.post('/admin/super/demote', data);
};

/**
 * Get super admin info
 */
export const getSuperAdminInfo = async () => {
  return api.get('/admin/super/info');
};

/**
 * List all super admins
 */
export const listSuperAdmins = async () => {
  return api.get('/admin/super/list');
};

// ==========================================
// UPDATE YOUR ADMIN TABLE (AdminTable.jsx)
// ==========================================

// Add these columns/cells to your AdminTable component:

// Example table row actions:
<div className="flex items-center gap-2">
  {admin.role === 'superAdmin' ? (
    <>
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
        <Crown className="w-3 h-3" />
        Super Admin
      </span>
      {/* Demote button - only shown if it's not the current user */}
      <button
        onClick={() => onDemoteSuperAdmin(admin)}
        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        title="Demote from Super Admin"
      >
        <Shield className="w-4 h-4" />
      </button>
    </>
  ) : (
    <>
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
        <Shield className="w-3 h-3" />
        Admin
      </span>
      {/* Promote button */}
      <button
        onClick={() => onPromoteSuperAdmin(admin)}
        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
        title="Promote to Super Admin"
      >
        <Crown className="w-4 h-4" />
      </button>
    </>
  )}
  {/* Delete button - disabled for Super Admin */}
  <button
    onClick={() => onDelete(admin)}
    disabled={admin.role === 'superAdmin'}
    className={`p-2 rounded-lg transition-colors ${
      admin.role === 'superAdmin'
        ? 'text-gray-400 cursor-not-allowed'
        : 'text-red-600 hover:bg-red-50'
    }`}
    title={admin.role === 'superAdmin' ? 'Cannot delete super admin' : 'Delete admin'}
  >
    <Trash className="w-4 h-4" />
  </button>
</div>
