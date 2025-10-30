/**
 * Image Upload Component
 * Handles image selection and display with Cloudinary upload
 */

import { Trash2, Upload, Image as ImageIcon } from 'lucide-react';

const ImageUpload = ({
  images,
  onImageUpload,
  onImageRemove,
  isUploading = false,
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
          className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors ${
            isUploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Upload className="w-5 h-5 text-gray-500" />
          <span className="text-sm text-gray-600">
            {isUploading ? 'Uploading...' : 'Click to upload images (or drag and drop)'}
          </span>
        </label>
      </div>

      {/* Upload Status */}
      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Uploading images to Cloudinary...</span>
        </div>
      )}

      {/* Image Grid */}
      {images && images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((img, idx) => {
            // Handle both string URLs (old format) and image objects (new format)
            const imageUrl = typeof img === 'string' ? img : img.url;
            const publicId = typeof img === 'object' ? img.public_id : null;
            
            return (
              <div key={publicId || idx} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors">
                  <img
                    src={imageUrl}
                    alt={`Package Image ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50" y="50" text-anchor="middle" dominant-baseline="middle"%3EImage%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
                <button
                  onClick={() => onImageRemove(idx)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                  type="button"
                  aria-label="Remove image"
                  title="Remove image"
                >
                  <Trash2 size={16} />
                </button>
                {/* Image number badge */}
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                  {idx + 1}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {(!images || images.length === 0) && !isUploading && (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No images uploaded yet</p>
          <p className="text-xs text-gray-400 mt-1">Click above to upload package images</p>
        </div>
      )}

      {/* Helper Text */}
      <p className="text-xs text-gray-500">
        Supported formats: JPEG, PNG, JPG • Max size: 5MB per image • Uploaded to Cloudinary
      </p>
    </div>
  );
};

export default ImageUpload;
