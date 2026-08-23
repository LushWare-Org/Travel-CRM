/**
 * New/Edit Package Form Component
 * Sectioned form layout: Basic Info, Images, Itinerary, Price Calculation, Actions
 */

import { useState, useEffect, type ReactNode } from 'react';
import Swal from 'sweetalert2';
import {
  Save, Send, X, Info, Loader,
  FileText, DollarSign, Image, Calendar, Eye, Package,
} from 'lucide-react';
import BasicPackageInfo from './BasicPackageInfo';
import PriceCalculation from './PriceCalculation';
import ImageUpload from '../ImageUpload';
import ItineraryEditor from '../ItineraryEditor';
import ItineraryDisplay from '../ItineraryDisplay';
import { validateItinerary } from '../../utils/helpers';
import { createDefaultDay } from '../../types/index';
import { formatCurrency } from '../../../../utils/currency.js';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormDialogHeader, FormDialogBody, FormDialogSection, FormDialogFooter } from '@/components/shared/FormDialogSections';

interface NewEditPackageFormProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  formData: any;
  setFormData: (data: any) => void;
  onSave?: (data: any) => void;
  onImageUpload: (files: FileList) => void;
  onImageRemove: (index: number) => void;
  images: any[];
  isUploadingImages: boolean;
  deletingImageIndexes?: number[];
  coverImage?: string | null;
  onSetCover?: ((id: string) => void) | null;
  hideLeadManagementButtons?: boolean;
  onlyItineraryEditable?: boolean;
}

const NewEditPackageForm = ({
  isOpen,
  onClose,
  title,
  subtitle,
  formData,
  setFormData,
  onSave,
  onImageUpload,
  onImageRemove,
  images,
  isUploadingImages,
  deletingImageIndexes = [],
  coverImage = null,
  onSetCover = null,
  hideLeadManagementButtons = false,
  onlyItineraryEditable = false,
}: NewEditPackageFormProps) => {
  const [localFormData, setLocalFormData] = useState(formData);
  const [saving] = useState(false);
  const [showItinerary, setShowItinerary] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    details: true,
    images: true,
    itinerary: true,
  });

  useEffect(() => {
    const initialData = { ...formData };

    // Duration is derived from the itinerary, not stored separately. Seed one
    // default day only when starting from a blank create (no days yet) so the
    // pricing breakdown has something to work with.
    if (!initialData.days || initialData.days.length === 0) {
      initialData.days = [createDefaultDay(1)];
    }

    setLocalFormData(initialData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section as keyof typeof prev] }));
  };

  const handleBasicInfoChange = (data: any) => {
    setLocalFormData(data);
  };

  const handleDetailsChange = (data: any) => {
    setLocalFormData(data);
  };

  const handleDayChange = (dayNumber: number, dayData: any) => {
    setLocalFormData((prev: any) => ({
      ...prev,
      days: (prev.days || []).filter(Boolean).map((day: any) =>
        day.dayNumber === dayNumber ? { ...day, ...dayData } : day
      ),
    }));
  };

  const handleAddDay = () => {
    setLocalFormData((prev: any) => {
      const newDayNumber = (prev.days?.length || 0) + 1;
      return {
        ...prev,
        days: [...(prev.days || []), createDefaultDay(newDayNumber)],
      };
    });
  };

  const handleRemoveDay = (dayNumber: number) => {
    setLocalFormData((prev: any) => {
      const filteredDays = (prev.days || []).filter((day: any) => day && day.dayNumber !== dayNumber);
      const renumberedDays = filteredDays.map((day: any, index: number) => ({
        ...day,
        dayNumber: index + 1,
      }));
      return { ...prev, days: renumberedDays };
    });
  };

  const handleItinerarySubmit = () => {
    const errors = validateItinerary(localFormData.days);

    if (Object.keys(errors).length > 0) {
      Swal.fire({
        title: 'Incomplete Itinerary',
        html: `
          <p>Some itinerary fields are incomplete:</p>
          <ul style="text-align: left; margin-top: 10px;">
            ${Object.entries(errors).map(([day, fields]) =>
          `<li><strong>Day ${day}:</strong> ${fields}</li>`
        ).join('')}
          </ul>
          <p style="margin-top: 15px;"><em>You can still save as draft with incomplete data.</em></p>
        `,
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    setShowItinerary(true);
    Swal.fire('Success', 'Itinerary is complete and ready for preview!', 'success');
  };

  const handleResetItinerary = () => {
    setLocalFormData((prev: any) => ({ ...prev, days: [] }));
    setShowItinerary(false);
  };

  const handleSave = (status: string) => {
    const packageId = localFormData._id || localFormData.id;

    const dataToSave = {
      ...localFormData,
      days: localFormData.days || [],
      status,
      updatedDate: new Date().toISOString().split('T')[0],
    };
    // Pricing is always recomputed server-side from the itinerary on save, so
    // never persist a stale/edited basePrice as an explicit override.
    delete dataToSave.basePrice;

    if (packageId) {
      dataToSave._id = packageId;
      if (localFormData.id) {
        dataToSave.id = localFormData.id;
      }
    }

    setFormData(dataToSave);
    onSave?.(dataToSave);
  };

  const itineraryDays = (localFormData.days || []).filter(Boolean);
  const duration = itineraryDays.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[95vh] p-0 gap-0 overflow-hidden flex flex-col">
        <FormDialogHeader icon={Package} title={title} subtitle={subtitle} />
        <FormDialogBody>
      {/* Basic Info Section */}
      {!onlyItineraryEditable ? (
        <FormDialogSection
          id="basic"
          expanded={expandedSections.basic}
          onToggle={toggleSection}
          icon={FileText}
          title="Basic Information"
          subtitle="Package name, destination, and description"
        >
          <BasicPackageInfo
            formData={localFormData}
            onChange={handleBasicInfoChange}
            packageId={localFormData._id || localFormData.id || null}
          />
        </FormDialogSection>
      ) : (
        <div className="bg-muted rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-heading font-semibold text-foreground">Basic Information</h3>
              <p className="text-xs text-muted-foreground">Read-only</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card rounded-lg p-4 border border-border">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Package Name</p>
              <p className="font-medium text-foreground">{localFormData.name || 'N/A'}</p>
            </div>
            <div className="bg-card rounded-lg p-4 border border-border">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Category</p>
              <p className="font-medium text-foreground">{localFormData.category || 'N/A'}</p>
            </div>
            <div className="bg-card rounded-lg p-4 border border-border md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Destination</p>
              <p className="font-medium text-foreground">{localFormData.destination || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Images Section */}
      {!onlyItineraryEditable && (
        <FormDialogSection
          id="images"
          expanded={expandedSections.images}
          onToggle={toggleSection}
          icon={Image}
          title="Package Images"
          subtitle="Upload attractive images for your package"
        >
          <ImageUpload
            images={images || localFormData.images || []}
            onImageUpload={onImageUpload}
            onImageRemove={onImageRemove}
            isUploading={isUploadingImages}
            deletingIndexes={deletingImageIndexes}
            coverUrl={coverImage}
            onSetCover={onSetCover}
          />
        </FormDialogSection>
      )}

      {/* Itinerary Section */}
      <FormDialogSection
        id="itinerary"
        expanded={expandedSections.itinerary}
        onToggle={toggleSection}
        icon={Calendar}
        title="Day-wise Itinerary"
        subtitle="Plan activities and experiences for each day"
      >
        {!showItinerary ? (
          <div className="space-y-6">
            <ItineraryEditor
              days={localFormData.days || []}
              onDayChange={handleDayChange}
              onAddDay={handleAddDay}
              onRemoveDay={handleRemoveDay}
              destination={localFormData.destination || ''}
              packageType={localFormData.packageType || ''}
              category={localFormData.category || ''}
              hideDescription={onlyItineraryEditable}
            />

            {!hideLeadManagementButtons && (
              <div className="flex gap-3">
                <Button onClick={handleItinerarySubmit} className="flex-1">
                  <Eye className="w-4 h-4" />
                  Validate & Preview Itinerary
                </Button>
                <Button onClick={handleResetItinerary} variant="outline">
                  Reset
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <ItineraryDisplay days={localFormData.days || []} />
            <Button onClick={() => setShowItinerary(false)} variant="outline" className="w-full">
              Edit Itinerary
            </Button>
          </div>
        )}
      </FormDialogSection>

      {/* Price Calculation Section */}
      {!onlyItineraryEditable ? (
        <FormDialogSection
          id="details"
          expanded={expandedSections.details}
          onToggle={toggleSection}
          icon={DollarSign}
          title="Price Calculation"
          subtitle="Live pricing breakdown computed from itinerary costs"
        >
          <PriceCalculation
            formData={localFormData}
            onFormChange={handleDetailsChange}
            duration={duration}
          />
        </FormDialogSection>
      ) : (
        <div className="bg-muted rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-heading font-semibold text-foreground">Price Calculation</h3>
              <p className="text-xs text-muted-foreground">Read-only</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card rounded-lg p-4 border border-border">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Duration</p>
              <p className="font-medium font-mono tabular-nums text-foreground">{duration} Days</p>
            </div>
            <div className="bg-card rounded-lg p-4 border border-border">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Price</p>
              <p className="font-medium font-mono tabular-nums text-foreground">{formatCurrency(localFormData.price, { minimumFractionDigits: 2 })}</p>
            </div>
            {localFormData.highlights && localFormData.highlights.length > 0 && (
              <div className="bg-card rounded-lg p-4 border border-border md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Highlights</p>
                <ul className="space-y-1">
                  {localFormData.highlights.map((highlight: string, idx: number) => (
                    <li key={idx} className="text-sm text-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {localFormData.inclusions && localFormData.inclusions.length > 0 && (
              <div className="bg-card rounded-lg p-4 border border-border md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Inclusions</p>
                <ul className="space-y-1">
                  {localFormData.inclusions.map((inclusion: string, idx: number) => (
                    <li key={idx} className="text-sm text-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-success rounded-full" />
                      {inclusion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {localFormData.exclusions && localFormData.exclusions.length > 0 && (
              <div className="bg-card rounded-lg p-4 border border-border md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Exclusions</p>
                <ul className="space-y-1">
                  {localFormData.exclusions.map((exclusion: string, idx: number) => (
                    <li key={idx} className="text-sm text-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-destructive rounded-full" />
                      {exclusion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tip Box — informational, scrolls with the form content rather than
          living in the pinned footer, which is buttons-only. */}
      {!hideLeadManagementButtons && (
        <div className="bg-primary/5 rounded-lg p-4 border border-primary/10 flex items-start gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-primary" />
          </div>
          <p className="text-sm text-primary">
            <strong>Tip:</strong> You can save as draft at any time, even with incomplete itinerary data.
            Your progress will be preserved and you can continue editing later.
          </p>
        </div>
      )}
        </FormDialogBody>

        <FormDialogFooter>
          {!hideLeadManagementButtons ? (
            <>
              <Button onClick={() => handleSave('draft')} disabled={saving} variant="outline" className="flex-1">
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save as Draft'}
              </Button>
              <Button onClick={() => handleSave('published')} disabled={saving} className="flex-1">
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {saving ? 'Publishing...' : 'Publish'}
              </Button>
              <Button onClick={onClose} variant="outline">
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => handleSave('published')} className="flex-1">
                <Save className="w-4 h-4" />
                Save Customized Package
              </Button>
              <Button onClick={onClose} variant="outline">
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </>
          )}
        </FormDialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewEditPackageForm;
