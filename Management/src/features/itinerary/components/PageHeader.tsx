/**
 * Page Header Component
 * Displays the page title, description, and action buttons
 */

import { Plus, Sparkles } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  onNewPackage: () => void;
  onAIPackage: () => void;
}

const PageHeader = ({ onNewPackage, onAIPackage }: PageHeaderProps) => {
  const { user } = useAuth();

  // Check if user is a salesRep (read-only access)
  const isSalesRep = user?.role === 'salesRep';

  return (
    <div className="bg-card border-b border-border px-8 py-6 shadow-card z-10">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Package Management</h1>
            <p className="text-muted-foreground mt-1">
              {isSalesRep
                ? 'View published packages and download itineraries'
                : 'Create, edit, and manage travel packages with detailed itineraries'}
            </p>
          </div>
        </div>

        {/* Action buttons - only visible to admins and staff */}
        {!isSalesRep && (
          <div className="flex items-center gap-3">
            <Button onClick={onAIPackage} variant="outline" aria-label="Generate AI package">
              <Sparkles className="w-4 h-4" />
              AI Package
            </Button>
            <Button onClick={onNewPackage} aria-label="Create new package">
              <Plus className="w-4 h-4" />
              New Package
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
