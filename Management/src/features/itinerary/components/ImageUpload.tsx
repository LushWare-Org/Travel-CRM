/**
 * Image Upload Component
 * Drag-and-drop interface for package images, backed by Cloudinary
 */

import { Upload, Image as ImageIcon, Cloud, Check, Loader2, X, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageItem {
  url?: string;
  publicId?: string;
  public_id?: string;
  isTemp?: boolean;
  id?: string;
}

interface ImageUploadProps {
  images: (string | ImageItem)[];
  onImageUpload: (files: FileList) => void;
  onImageRemove: (index: number) => void;
  isUploading?: boolean;
  deletingIndexes?: number[];
  coverUrl?: string | null;
  onSetCover?: ((id: string) => void) | null;
}

const ImageUpload = ({
  images,
  onImageUpload,
  onImageRemove,
  isUploading = false,
  deletingIndexes = [],
  coverUrl = null,
  onSetCover = null,
}: ImageUploadProps) => {
  return (
    <div className="space-y-4">
      {/* Upload Input */}
      <div className="relative">
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/jpg"
          onChange={(e) => e.target.files && onImageUpload(e.target.files)}
          disabled={isUploading}
          className="hidden"
          id="image-upload-input"
        />
        <label
          htmlFor="image-upload-input"
          className={cn(
            'flex flex-col items-center justify-center gap-4 px-8 py-10 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
            isUploading
              ? 'border-primary/30 bg-primary/5 cursor-not-allowed'
              : 'border-border bg-muted hover:border-primary/40 hover:bg-primary/5'
          )}
        >
          {isUploading ? (
            <>
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Uploading to Cloudinary...</p>
                <p className="text-xs text-muted-foreground mt-1">Please wait while we process your images</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  <span className="text-primary">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, JPEG up to 5MB each</p>
              </div>
            </>
          )}
        </label>
      </div>

      {/* Image Grid */}
      {images && images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">Uploaded Images ({images.length})</h4>
            <div className="flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-1 rounded-full">
              <Cloud className="w-3 h-3" />
              <span>Cloudinary</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((img, idx) => {
              const imageUrl = typeof img === 'string' ? img : img.url;
              const publicId = typeof img === 'object' ? (img.publicId || img.public_id) : null;
              const isTemp = typeof img === 'object' && img.isTemp;
              const isDeleting = deletingIndexes.includes(idx);
              const isCover = !!coverUrl && imageUrl === coverUrl;
              const canSetCover = !!onSetCover && !isTemp && typeof img === 'object' && !!img.id;

              return (
                <div key={publicId || idx} className="relative group">
                  <div className={cn(
                    'aspect-square rounded-lg overflow-hidden border-2 transition-colors',
                    isTemp
                      ? 'border-primary/40 ring-2 ring-primary/10'
                      : isCover
                        ? 'border-warning ring-2 ring-warning/20'
                        : 'border-border hover:border-primary/40'
                  )}>
                    <img
                      src={imageUrl}
                      alt={`Package Image ${idx + 1}`}
                      className={cn('w-full h-full object-cover', (isTemp || isDeleting) && 'opacity-60')}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50" y="50" text-anchor="middle" dominant-baseline="middle"%3EImage%3C/text%3E%3C/svg%3E';
                      }}
                    />

                    {/* Loading overlay for temp images / in-flight deletes - a fixed dark
                        scrim over a photo, independent of app theme (matches DialogOverlay's
                        own raw bg-black/N precedent for the same reason). */}
                    {(isTemp || isDeleting) && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Set as cover button */}
                  {canSetCover && (
                    <button
                      onClick={() => onSetCover!((img as ImageItem).id!)}
                      disabled={isCover}
                      className={cn(
                        'absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center shadow-dropdown transition-colors',
                        isCover
                          ? 'bg-warning text-warning-foreground'
                          : 'bg-card text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-warning'
                      )}
                      type="button"
                      aria-label={isCover ? 'Cover image' : 'Set as cover image'}
                      title={isCover ? 'Cover image' : 'Set as cover image'}
                    >
                      <Star size={14} fill={isCover ? 'currentColor' : 'none'} />
                    </button>
                  )}

                  {/* Remove button */}
                  <button
                    onClick={() => onImageRemove(idx)}
                    disabled={isDeleting}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-dropdown opacity-0 group-hover:opacity-100 disabled:opacity-60"
                    type="button"
                    aria-label="Remove image"
                    title="Remove image"
                  >
                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                  </button>

                  {/* Image number badge - fixed dark scrim over a photo, see note above */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md">
                    {!isTemp && <Check className="w-3 h-3 text-success" />}
                    <span>{idx + 1}</span>
                    {isCover && <span className="text-warning font-medium ml-1">Cover</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!images || images.length === 0) && !isUploading && (
        <div className="text-center py-8 bg-muted rounded-lg border border-dashed border-border">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No images uploaded yet</p>
          <p className="text-xs text-muted-foreground mt-1">Click above to upload package images</p>
        </div>
      )}

      {/* Helper Text */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md">
          <span>JPEG</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md">
          <span>PNG</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md">
          <span>JPG</span>
        </div>
        <span className="text-muted-foreground">•</span>
        <span>Max 5MB per image</span>
        <span className="text-muted-foreground">•</span>
        <span className="flex items-center gap-1">
          <Cloud className="w-3 h-3" /> Uploaded to Cloudinary
        </span>
      </div>
    </div>
  );
};

export default ImageUpload;
