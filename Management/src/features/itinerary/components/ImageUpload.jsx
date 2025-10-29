/**
 * Image Upload Component
 * Handles image selection and display
 */

import { Trash2 } from 'lucide-react';

const ImageUpload = ({
  images,
  onImageUpload,
  onImageRemove,
  isUploading = false,
}) => {
  return (
    <div>
      <input
        type="file"
        multiple
        onChange={(e) => onImageUpload(e.target.files)}
        disabled={isUploading}
        className="px-3 py-2 border border-gray-300 rounded-md w-full disabled:opacity-50"
      />
      <div className="flex space-x-2 mt-2 flex-wrap gap-2">
        {(images || []).map((img, idx) => (
          <div key={idx} className="relative">
            <img
              src={img}
              alt={`Package Image ${idx}`}
              className="w-24 h-24 object-cover rounded"
            />
            <button
              onClick={() => onImageRemove(idx)}
              className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              type="button"
              aria-label="Remove image"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      {isUploading && (
        <p className="text-sm text-gray-500 mt-2">Uploading images...</p>
      )}
    </div>
  );
};

export default ImageUpload;
