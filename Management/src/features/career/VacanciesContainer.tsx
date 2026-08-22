import { useState, useEffect, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import careerService from '../../services/career.service';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Card, CardContent } from '../../components/ui/card';

interface Vacancy {
  id: string;
  position: string;
  description: string;
  type: string;
  location: string;
  experienceMin?: number;
  status: string;
  applicationsCount?: number;
}

interface VacancyFormData {
  position: string;
  description: string;
  type: string;
  location: string;
  experienceMin: number;
  status: string;
}

const emptyForm: VacancyFormData = {
  position: '',
  description: '',
  type: 'Full Time',
  location: '',
  experienceMin: 0,
  status: 'draft',
};

const statusBadgeClasses: Record<string, string> = {
  active: 'bg-success/10 text-success border-transparent',
  closed: 'bg-destructive/10 text-destructive border-transparent',
  draft: 'bg-warning/10 text-warning border-transparent',
};

const VacanciesContainer = () => {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | null }>({ show: false, id: null });

  const [formData, setFormData] = useState<VacancyFormData>(emptyForm);

  useEffect(() => {
    fetchVacancies();
  }, []);

  const fetchVacancies = async () => {
    try {
      setLoading(true);
      const response = await careerService.getAllVacancies();
      if (response.status === 'success' && response.data) {
        setVacancies(response.data.vacancies || []);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load vacancies');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.position || !formData.location || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = editingId
        ? await careerService.updateVacancy(editingId, formData)
        : await careerService.createVacancy(formData);

      if (response.status === 'success') {
        toast.success(editingId ? 'Vacancy updated successfully' : 'Vacancy created successfully');
        resetForm();
        fetchVacancies();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save vacancy');
    }
  };

  const handleEdit = (vacancy: Vacancy) => {
    setEditingId(vacancy.id);
    setFormData({
      position: vacancy.position,
      description: vacancy.description,
      type: vacancy.type,
      location: vacancy.location,
      experienceMin: vacancy.experienceMin ?? 0,
      status: vacancy.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm({ show: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;

    try {
      const response = await careerService.deleteVacancy(deleteConfirm.id);
      if (response.status === 'success') {
        toast.success('Vacancy deleted successfully');
        setDeleteConfirm({ show: false, id: null });
        fetchVacancies();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to delete vacancy');
    }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const filteredVacancies = vacancies.filter(v =>
    filter === 'all' || v.status === filter
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-muted border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 sm:px-8 py-4 shadow-card sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="pl-10 md:pl-0">
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Vacancies Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Create and manage job openings</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Vacancy</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          {['all', 'active', 'draft', 'closed'].map(status => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              className="capitalize"
              onClick={() => setFilter(status)}
            >
              {status}
            </Button>
          ))}
        </div>

        {/* Vacancies List */}
        <div className="space-y-4">
          {filteredVacancies.length > 0 ? (
            filteredVacancies.map(vacancy => (
              <Card key={vacancy.id} className="border-l-4 border-l-primary">
                <CardContent>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-heading text-lg font-bold text-foreground">{vacancy.position}</h3>
                    </div>
                    <Badge className={`capitalize ${statusBadgeClasses[vacancy.status] || 'bg-muted text-muted-foreground border-transparent'}`}>
                      {vacancy.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-medium text-foreground">{vacancy.type}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Location</p>
                      <p className="font-medium text-foreground">{vacancy.location}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Experience</p>
                      <p className="font-medium text-foreground">{vacancy.experienceMin ?? 0}+ years</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Applications</p>
                      <p className="font-mono tabular-nums font-medium text-foreground">{vacancy.applicationsCount || 0}</p>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(vacancy)}>
                      <Edit2 className="w-4 h-4 text-success" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(vacancy.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground">No vacancies found</p>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={(open) => (open ? setShowForm(true) : resetForm())}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Vacancy' : 'Create New Vacancy'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Position *</label>
                <Input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="e.g., Sales Executive"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Location *</label>
                <Input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Delhi, India"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Type</label>
                <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: String(value) }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full Time">Full Time</SelectItem>
                    <SelectItem value="Part Time">Part Time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Temporary">Temporary</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Min Experience (years)</label>
                <Input
                  type="number"
                  value={formData.experienceMin}
                  onChange={(e) => setFormData(prev => ({ ...prev, experienceMin: Number(e.target.value) }))}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Job Description *</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter job description, responsibilities, and requirements..."
                rows={4}
              />
            </div>

            {/* Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Status</label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: String(value) }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Form Actions */}
            <DialogFooter className="-mx-0 -mb-0 border-t-0 bg-transparent p-0 pt-2">
              <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1">{editingId ? 'Update Vacancy' : 'Create Vacancy'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirm.show} onOpenChange={(open) => !open && setDeleteConfirm({ show: false, id: null })}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Vacancy?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">Are you sure you want to delete this vacancy? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm({ show: false, id: null })} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} className="flex-1">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VacanciesContainer;
