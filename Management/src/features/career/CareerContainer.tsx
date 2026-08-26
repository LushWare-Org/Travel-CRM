import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import toast from '@/lib/toast';
import { Eye, Edit2, Trash2, Search, ChevronLeft, ChevronRight, Download, Users, Clock, CheckCircle2, XCircle, Award } from 'lucide-react';
import careerService from '../../services/career.service';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { DataTable, type DataTableColumn } from '../../components/shared/DataTable';
import { StatCard } from '../../components/shared/StatCard';

interface Application {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  status: string;
  rating?: number;
  createdAt: string;
  coverLetter?: string;
  adminNotes?: string;
  feedback?: string;
  resumeUrl?: string;
}

interface Vacancy {
  id: string;
  position: string;
  status: string;
}

interface EditFormData {
  status: string;
  adminNotes: string;
  rating: string;
  feedback: string;
}

// Categorical differentiation of position tags reuses the chart-1..5
// palette, the system's one sanctioned multi-hue set (see DESIGN.md's
// "Chart" color section) - not a semantic/state color, just visual variety.
const positionColorClasses = [
  'bg-chart-1/10 text-chart-1 border-chart-1/20',
  'bg-chart-2/10 text-chart-2 border-chart-2/20',
  'bg-chart-3/10 text-chart-3 border-chart-3/20',
  'bg-chart-4/10 text-chart-4 border-chart-4/20',
  'bg-chart-5/10 text-chart-5 border-chart-5/20',
];

const statusBadgeClasses: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-transparent',
  'under-review': 'bg-primary/10 text-primary border-transparent',
  shortlisted: 'bg-success/10 text-success border-transparent',
  rejected: 'bg-destructive/10 text-destructive border-transparent',
  hired: 'bg-chart-4/10 text-chart-4 border-transparent',
};

const CareerContainer = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superAdmin';

  const [applications, setApplications] = useState<Application[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
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
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    status: '',
    adminNotes: '',
    rating: '',
    feedback: ''
  });

  const itemsPerPage = 10;

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchVacancies();
    fetchApplications();
    fetchStats();
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Only Super Admin can access Career Management</p>
        </div>
      </div>
    );
  }

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
    } catch (error: any) {
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
        // The Prisma/Postgres careers.stats endpoint returns
        // { total, byStatus: [{ status, _count }] } - this used to parse a
        // MongoDB-era { totalApplications: [{count}], byStatus: [{_id,count}] }
        // shape that no longer matches, so every stat silently rendered 0.
        const byStatus = statsData.byStatus || [];
        const countFor = (status: string) => byStatus.find((s: any) => s.status === status)?._count || 0;
        const totalApplications = statsData.total || 0;
        const pendingCount = countFor('pending');
        const shortlistedCount = countFor('shortlisted');
        const rejectedCount = countFor('rejected');
        const hiredCount = countFor('hired');

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

  const getPositionColor = (position: string) => {
    const index = vacancies.findIndex(v => v.position === position);
    return index >= 0 ? positionColorClasses[index % positionColorClasses.length] : 'bg-muted text-muted-foreground border-transparent';
  };

  const handleViewDetails = (app: Application) => {
    setSelectedApp(app);
    setShowDetailModal(true);
  };

  const handleEditStatus = (app: Application) => {
    setEditingApp(app);
    setEditFormData({
      status: app.status,
      adminNotes: app.adminNotes || '',
      rating: app.rating ? String(app.rating) : '',
      feedback: app.feedback || ''
    });
    setShowEditModal(true);
  };

  const handleSaveStatus = async () => {
    if (!editingApp) return;
    try {
      const response = await careerService.updateApplicationStatus(
        editingApp.id,
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
  const handleDeleteApplication = async (id: string) => {
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
      <div className="h-full flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-muted border-t-primary"></div>
      </div>
    );
  }

  const columns: DataTableColumn<Application>[] = [
    { key: 'fullName', header: 'Name', render: (app) => <span className="font-medium text-foreground">{app.fullName}</span> },
    {
      key: 'position', header: 'Position', render: (app) => (
        <Badge className={getPositionColor(app.position)}>{app.position}</Badge>
      )
    },
    {
      key: 'contact', header: 'Contact', render: (app) => (
        <div>
          <div className="text-foreground">{app.email}</div>
          <div className="text-muted-foreground text-xs">{app.phone}</div>
        </div>
      )
    },
    {
      key: 'status', header: 'Status', render: (app) => (
        <Badge className={statusBadgeClasses[app.status] || 'bg-muted text-muted-foreground border-transparent'}>
          {app.status.replace('-', ' ')}
        </Badge>
      )
    },
    {
      key: 'rating', header: 'Rating', render: (app) => (
        app.rating ? (
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={i < app.rating! ? 'text-warning text-lg leading-none' : 'text-muted-foreground/30 text-lg leading-none'}>
                &#9733;
              </span>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Not rated</span>
        )
      )
    },
    {
      key: 'createdAt', header: 'Date', render: (app) => (
        <span className="font-mono tabular-nums text-muted-foreground">{new Date(app.createdAt).toLocaleDateString()}</span>
      )
    },
    {
      key: 'actions', header: 'Actions', render: (app) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => handleViewDetails(app)} title="View Details">
            <Eye className="w-4 h-4 text-primary" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => handleEditStatus(app)} title="Edit Status">
            <Edit2 className="w-4 h-4 text-success" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteApplication(app.id)} title="Delete">
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="bg-card border-b border-border px-4 sm:px-8 py-4 shadow-card sticky top-0 z-10">
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground pl-10 md:pl-0">Career Management</h1>
        <p className="text-sm text-muted-foreground mt-1 pl-10 md:pl-0">Manage job applications and candidates</p>
      </div>

      <div className="p-4 sm:p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <StatCard icon={Users} label="Total Applications" value={stats.totalApplications || 0} color="muted" />
          <StatCard icon={Clock} label="Pending" value={stats.pendingCount || 0} color="warning" />
          <StatCard icon={CheckCircle2} label="Shortlisted" value={stats.shortlistedCount || 0} color="success" />
          <StatCard icon={XCircle} label="Rejected" value={stats.rejectedCount || 0} color="destructive" />
          <StatCard icon={Award} label="Hired" value={stats.hiredCount || 0} color="primary" className="col-span-2 sm:col-span-1" />
        </div>

        {/* Search and Filters */}
        <div className="bg-card border border-border rounded-lg shadow-card p-4 mb-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9 pl-9 w-full"
                />
              </div>
            </div>
            <Select value={filterStatus || 'all'} onValueChange={(value) => { setFilterStatus(value === 'all' ? '' : String(value)); setCurrentPage(1); }}>
              <SelectTrigger className="h-9 min-w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under-review">Under Review</SelectItem>
                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="hired">Hired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPosition || 'all'} onValueChange={(value) => { setFilterPosition(value === 'all' ? '' : String(value)); setCurrentPage(1); }}>
              <SelectTrigger className="h-9 min-w-40"><SelectValue placeholder="All Positions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                {vacancies.map(vacancy => (
                  <SelectItem key={vacancy.id} value={vacancy.position}>{vacancy.position}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('');
                setFilterPosition('');
                setCurrentPage(1);
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={paginatedApps}
          getRowKey={(app) => app.id}
          emptyMessage="No applications found"
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 sm:px-6 py-4 bg-card border border-t-0 border-border rounded-b-lg flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Showing {startIdx + 1} to {Math.min(startIdx + itemsPerPage, filteredApplications.length)} of {filteredApplications.length}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {[...Array(totalPages)].map((_, i) => (
                <Button
                  key={i + 1}
                  size="sm"
                  variant={currentPage === i + 1 ? 'default' : 'outline'}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* View Details Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedApp && (
            <>
              <DialogHeader>
                <DialogTitle>Application Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Full Name</p>
                    <p className="text-foreground font-medium">{selectedApp.fullName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-foreground font-medium break-all">{selectedApp.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-foreground font-medium">{selectedApp.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Position</p>
                    <p className="text-foreground font-medium">{selectedApp.position}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-foreground font-medium capitalize">{selectedApp.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Applied On</p>
                    <p className="text-foreground font-medium font-mono tabular-nums">{new Date(selectedApp.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cover Letter</p>
                  <p className="text-foreground mt-1 p-3 bg-muted rounded-lg text-sm">{selectedApp.coverLetter}</p>
                </div>
                {selectedApp.resumeUrl && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Resume</p>
                    <Button render={<a href={selectedApp.resumeUrl} target="_blank" rel="noopener noreferrer" />}>
                      <Download className="w-4 h-4" />
                      Download Resume
                    </Button>
                  </div>
                )}
                {selectedApp.adminNotes && (
                  <div>
                    <p className="text-xs text-muted-foreground">Admin Notes</p>
                    <p className="text-foreground mt-1 p-3 bg-muted rounded-lg text-sm">{selectedApp.adminNotes}</p>
                  </div>
                )}
                {selectedApp.feedback && (
                  <div>
                    <p className="text-xs text-muted-foreground">Feedback</p>
                    <p className="text-foreground mt-1 p-3 bg-muted rounded-lg text-sm">{selectedApp.feedback}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Status Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Application Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Status</label>
              <Select value={editFormData.status} onValueChange={(value) => setEditFormData({ ...editFormData, status: String(value) })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under-review">Under Review</SelectItem>
                  <SelectItem value="shortlisted">Shortlisted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="hired">Hired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Admin Notes</label>
              <Textarea
                value={editFormData.adminNotes}
                onChange={(e) => setEditFormData({ ...editFormData, adminNotes: e.target.value })}
                rows={3}
                placeholder="Internal notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleSaveStatus}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CareerContainer;
