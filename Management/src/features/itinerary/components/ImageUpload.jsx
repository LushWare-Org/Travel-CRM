/**
 * Image Upload Component - Redesigned
 * Modern drag-and-drop interface with premium styling
 * Handles image selection and display with Cloudinary upload
 */

import { Trash2, Upload, Image as ImageIcon, Cloud, Check, Loader2, X, Star } from 'lucide-react';

const ImageUpload = ({
  images,
  onImageUpload,
  onImageRemove,
  isUploading = false,
  deletingIndexes = [],
  coverUrl = null,
  onSetCover = null,
}) => {
  return (
    <div className="space-y-4">
      {/* Upload Input */}
      <div className="relative">
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/jpg"
          onChange={(e) => onImageUpload(e.target.files)}
          disabled={isUploading}
          className="hidden"
          id="image-upload-input"
        />
        <label
          htmlFor="image-upload-input"
          className={`flex flex-col items-center justify-center gap-4 px-8 py-10 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${isUploading
              ? 'border-violet-300 bg-violet-50/50 cursor-not-allowed'
              : 'border-slate-300 bg-slate-50 hover:border-violet-400 hover:bg-violet-50'
            }`}
        >
          {isUploading ? (
            <>
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-violet-700">Uploading to Cloudinary...</p>
                <p className="text-xs text-violet-500 mt-1">Please wait while we process your images</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center">
                <Upload className="w-8 h-8 text-violet-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">
                  <span className="text-violet-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-500 mt-1">PNG, JPG, JPEG up to 5MB each</p>
              </div>
            </>
          )}
        </label>
      </div>

      {/* Image Grid */}
      {images && images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-700">Uploaded Images ({images.length})</h4>
            <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
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
                  <div className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${isTemp
                      ? 'border-violet-300 ring-2 ring-violet-100'
                      : isCover
                        ? 'border-amber-400 ring-2 ring-amber-100'
                        : 'border-slate-200 hover:border-violet-400 hover:shadow-lg'
                    }`}>
                    <img
                      src={imageUrl}
                      alt={`Package Image ${idx + 1}`}
                      className={`w-full h-full object-cover ${isTemp || isDeleting ? 'opacity-60' : ''}`}
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50" y="50" text-anchor="middle" dominant-baseline="middle"%3EImage%3C/text%3E%3C/svg%3E';
                      }}
                    />

                    {/* Loading overlay for temp images / in-flight deletes */}
                    {(isTemp || isDeleting) && (
                      <div className="absolute inset-0 bg-violet-900/30 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Set as cover button */}
                  {canSetCover && (
                    <button
                      onClick={() => onSetCover(img.id)}
                      disabled={isCover}
                      className={`absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-colors ${isCover
                          ? 'bg-amber-400 text-white'
                          : 'bg-white text-slate-400 opacity-0 group-hover:opacity-100 hover:text-amber-500'
                        }`}
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
                    className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors shadow-lg opacity-0 group-hover:opacity-100 disabled:opacity-60"
                    type="button"
                    aria-label="Remove image"
                    title="Remove image"
                  >
                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                  </button>

                  {/* Image number badge */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg">
                    {!isTemp && <Check className="w-3 h-3 text-emerald-400" />}
                    <span>{idx + 1}</span>
                    {isCover && <span className="text-amber-300 font-medium ml-1">Cover</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!images || images.length === 0) && !isUploading && (
        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">No images uploaded yet</p>
          <p className="text-xs text-slate-400 mt-1">Click above to upload package images</p>
        </div>
      )}

      {/* Helper Text */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md">
          <span>JPEG</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md">
          <span>PNG</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md">
          <span>JPG</span>
        </div>
        <span className="text-slate-400">•</span>
        <span>Max 5MB per image</span>
        <span className="text-slate-400">•</span>
        <span className="flex items-center gap-1">
          <Cloud className="w-3 h-3" /> Uploaded to Cloudinary
        </span>
      </div>
    </div>
  );
};

export default ImageUpload;
