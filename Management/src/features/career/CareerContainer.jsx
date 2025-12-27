import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Eye, Edit2, Trash2, Search, Filter, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import careerService from '../../services/career.service';

const CareerContainer = () => {
  const { user } = useAuth();
  const token = localStorage.getItem('token');

  if (user?.role !== 'superAdmin') {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only Super Admin can access Career Management</p>
        </div>
      </div>
    );
  }

  const [applications, setApplications] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [stats, setStats] = useState({
    totalApplications: 0,
    pendingCount: 0,
    shortlistedCount: 0,
    rejectedCount: 0,
    hiredCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedApp, setSelectedApp] = useState(null);
  const [editingApp, setEditingApp] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    status: '',
    adminNotes: '',
    rating: '',
    feedback: ''
  });

  const itemsPerPage = 10;

  useEffect(() => {
    fetchVacancies();
    fetchApplications();
    fetchStats();
  }, []);

  const fetchVacancies = async () => {
    try {
      const response = await careerService.getAllVacancies();
      if (response.status === 'success' && response.data) {
        setVacancies(response.data.vacancies || []);
      }
    } catch (error) {
      console.error('Error fetching vacancies:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await careerService.getAllApplications();
      if (response.status === 'success' && response.data) {
        const apps = response.data.applications || response.data || [];
        setApplications(apps);
      }
    } catch (error) {
      console.error('Fetch applications error:', error);
      toast.error(`Failed to load applications: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await careerService.getCareerStats();
      if (response.status === 'success' && response.data) {
        const statsData = response.data;
        const totalApplications = statsData.totalApplications?.[0]?.count || 0;
        const pendingCount = statsData.pendingCount?.[0]?.count || 0;
        const byStatus = statsData.byStatus || [];
        const shortlistedCount = byStatus.find(s => s._id === 'shortlisted')?.count || 0;
        const rejectedCount = byStatus.find(s => s._id === 'rejected')?.count || 0;
        const hiredCount = byStatus.find(s => s._id === 'hired')?.count || 0;
        
        setStats({
          totalApplications,
          pendingCount,
          shortlistedCount,
          rejectedCount,
          hiredCount
        });
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  // Filters
  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.phone.includes(searchQuery);
    const matchesStatus = !filterStatus || app.status === filterStatus;
    const matchesPosition = !filterPosition || app.position === filterPosition;
    return matchesSearch && matchesStatus && matchesPosition;
  });

  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedApps = filteredApplications.slice(startIdx, startIdx + itemsPerPage);

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      'under-review': 'bg-blue-100 text-blue-800',
      shortlisted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      hired: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPositionColor = (position) => {
    const colors = [
      'bg-blue-50 border-blue-200 text-blue-700',
      'bg-purple-50 border-purple-200 text-purple-700',
      'bg-pink-50 border-pink-200 text-pink-700',
      'bg-orange-50 border-orange-200 text-orange-700',
      'bg-green-50 border-green-200 text-green-700',
      'bg-red-50 border-red-200 text-red-700'
    ];
    const index = vacancies.findIndex(v => v.position === position);
    return index >= 0 ? colors[index % colors.length] : 'bg-gray-50 border-gray-200 text-gray-700';
  };

  const handleViewDetails = (app) => {
    setSelectedApp(app);
    setShowDetailModal(true);
  };

  const handleEditStatus = (app) => {
    setEditingApp(app);
    setEditFormData({
      status: app.status,
      adminNotes: app.adminNotes || '',
      rating: app.rating || '',
      feedback: app.feedback || ''
    });
    setShowEditModal(true);
  };

  const handleSaveStatus = async () => {
    try {
      const response = await careerService.updateApplicationStatus(
        editingApp._id,
        editFormData
      );
      if (response.status === 'success') {
        toast.success('Application updated successfully');
        setShowEditModal(false);
        fetchApplications();
        fetchStats();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update application');
    }
  };

  // Delete Application
  const handleDeleteApplication = async (id) => {
    if (!window.confirm('Are you sure you want to delete this application?')) return;
    try {
      const response = await careerService.deleteApplication(id);
      if (response.status === 'success') {
        toast.success('Application deleted successfully');
        fetchApplications();
        fetchStats();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to delete application');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-900">Career Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage job applications and candidates</p>
      </div>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <p className="text-gray-600 text-sm">Total Applications</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalApplications || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <p className="text-gray-600 text-sm">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.pendingCount || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <p className="text-gray-600 text-sm">Shortlisted</p>
            <p className="text-3xl font-bold text-green-600">{stats.shortlistedCount || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <p className="text-gray-600 text-sm">Rejected</p>
            <p className="text-3xl font-bold text-red-600">{stats.rejectedCount || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <p className="text-gray-600 text-sm">Hired</p>
            <p className="text-3xl font-bold text-purple-600">{stats.hiredCount || 0}</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="under-review">Under Review</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="rejected">Rejected</option>
              <option value="hired">Hired</option>
            </select>
            <select
              value={filterPosition}
              onChange={(e) => {
                setFilterPosition(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Positions</option>
              {vacancies.map(vacancy => (
                <option key={vacancy._id} value={vacancy.position}>{vacancy.position}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('');
                setFilterPosition('');
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Position</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Contact</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Rating</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedApps.length > 0 ? (
                paginatedApps.map((app) => (
                  <tr key={app._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{app.fullName}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPositionColor(app.position)}`}>
                        {app.position}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="text-gray-900">{app.email}</div>
                      <div className="text-gray-500 text-xs">{app.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(app.status)}`}>
                        {app.status.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-1">
                        {app.rating ? (
                          <>
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={i < app.rating ? 'text-yellow-400 text-lg' : 'text-gray-300 text-lg'}>
                                ⭐
                              </span>
                            ))}
                          </>
                        ) : (
                          <span className="text-gray-400 text-sm">Not rated</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetails(app)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleEditStatus(app)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="Edit Status"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteApplication(app._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No applications found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {startIdx + 1} to {Math.min(startIdx + itemsPerPage, filteredApplications.length)} of {filteredApplications.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-100"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-2 rounded-lg ${
                      currentPage === i + 1
                        ? 'bg-blue-500 text-white'
                        : 'border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-100"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Details Modal */}
      {showDetailModal && selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-100 overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Application Details</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Full Name</p>
                    <p className="text-gray-900 font-medium">{selectedApp.fullName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-gray-900 font-medium">{selectedApp.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="text-gray-900 font-medium">{selectedApp.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Position</p>
                    <p className="text-gray-900 font-medium">{selectedApp.position}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="text-gray-900 font-medium capitalize">{selectedApp.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Applied On</p>
                    <p className="text-gray-900 font-medium">{new Date(selectedApp.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cover Letter</p>
                  <p className="text-gray-900 mt-1 p-3 bg-gray-50 rounded">{selectedApp.coverLetter}</p>
                </div>
                {selectedApp.resume?.url && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Resume</p>
                    <a
                      href={selectedApp.resume.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      <Download className="w-4 h-4" />
                      Download Resume
                    </a>
                  </div>
                )}
                {selectedApp.adminNotes && (
                  <div>
                    <p className="text-sm text-gray-600">Admin Notes</p>
                    <p className="text-gray-900 mt-1 p-3 bg-gray-50 rounded">{selectedApp.adminNotes}</p>
                  </div>
                )}
                {selectedApp.feedback && (
                  <div>
                    <p className="text-sm text-gray-600">Feedback</p>
                    <p className="text-gray-900 mt-1 p-3 bg-gray-50 rounded">{selectedApp.feedback}</p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Status Modal */}
      {showEditModal && editingApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Update Application Status</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="under-review">Under Review</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="rejected">Rejected</option>
                    <option value="hired">Hired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                  <textarea
                    value={editFormData.adminNotes}
                    onChange={(e) => setEditFormData({ ...editFormData, adminNotes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Internal notes..."
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <button
                  onClick={handleSaveStatus}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CareerContainer;
