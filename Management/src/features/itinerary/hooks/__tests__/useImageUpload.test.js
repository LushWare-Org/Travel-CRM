import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { mockDeletePackageImage, mockDeleteCloudinaryImage, mockFire } = vi.hoisted(() => ({
  mockDeletePackageImage: vi.fn(),
  mockDeleteCloudinaryImage: vi.fn(),
  mockFire: vi.fn(),
}));

vi.mock('../../../../services/cloudinaryService', () => ({
  uploadPackageImages: vi.fn(),
  deleteImage: mockDeleteCloudinaryImage,
}));
vi.mock('../../services/apiService', () => ({
  default: { deletePackageImage: mockDeletePackageImage },
}));
vi.mock('sweetalert2', () => ({ default: { fire: mockFire } }));

import { useImageUpload } from '../useImageUpload';

describe('useImageUpload — removeImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes a persisted image via the package-image API and only then updates state', async () => {
    const { result } = renderHook(() => useImageUpload());
    act(() => {
      result.current.setImages([
        { id: 'img-1', url: 'https://cdn/a.jpg', publicId: 'p-a' },
        { id: 'img-2', url: 'https://cdn/b.jpg', publicId: 'p-b' },
      ]);
    });
    mockDeletePackageImage.mockResolvedValue({ success: true });

    await act(async () => {
      await result.current.removeImage(0, { packageId: 'pkg-1' });
    });

    expect(mockDeletePackageImage).toHaveBeenCalledWith('pkg-1', 'img-1');
    expect(mockDeleteCloudinaryImage).not.toHaveBeenCalled();
    expect(result.current.images).toEqual([{ id: 'img-2', url: 'https://cdn/b.jpg', publicId: 'p-b' }]);
  });

  it('deletes an unsaved (never-persisted) image directly from Cloudinary', async () => {
    const { result } = renderHook(() => useImageUpload());
    act(() => {
      result.current.setImages([{ url: 'https://cdn/new.jpg', publicId: 'p-new' }]);
    });
    mockDeleteCloudinaryImage.mockResolvedValue({ success: true });

    await act(async () => {
      await result.current.removeImage(0, { packageId: 'pkg-1' });
    });

    expect(mockDeleteCloudinaryImage).toHaveBeenCalledWith('p-new');
    expect(mockDeletePackageImage).not.toHaveBeenCalled();
    expect(result.current.images).toEqual([]);
  });

  it('removes a still-uploading temp image locally without calling any API', async () => {
    const { result } = renderHook(() => useImageUpload());
    act(() => {
      result.current.setImages([{ url: 'blob:1', publicId: 'temp-1', isTemp: true }]);
    });

    await act(async () => {
      await result.current.removeImage(0, { packageId: 'pkg-1' });
    });

    expect(mockDeletePackageImage).not.toHaveBeenCalled();
    expect(mockDeleteCloudinaryImage).not.toHaveBeenCalled();
    expect(result.current.images).toEqual([]);
  });

  it('leaves state unchanged and surfaces an error when the delete API call fails', async () => {
    const { result } = renderHook(() => useImageUpload());
    const original = [{ id: 'img-1', url: 'https://cdn/a.jpg', publicId: 'p-a' }];
    act(() => {
      result.current.setImages(original);
    });
    mockDeletePackageImage.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      await result.current.removeImage(0, { packageId: 'pkg-1' });
    });

    expect(result.current.images).toEqual(original);
    expect(mockFire).toHaveBeenCalledWith('Error', 'Network error', 'error');
  });

  it('tracks the deleting index while the delete call is in flight', async () => {
    const { result } = renderHook(() => useImageUpload());
    act(() => {
      result.current.setImages([{ id: 'img-1', url: 'https://cdn/a.jpg', publicId: 'p-a' }]);
    });

    let resolveDelete;
    mockDeletePackageImage.mockReturnValue(new Promise((resolve) => { resolveDelete = resolve; }));

    let removePromise;
    act(() => {
      removePromise = result.current.removeImage(0, { packageId: 'pkg-1' });
    });

    await waitFor(() => expect(result.current.deletingIndexes).toEqual([0]));

    await act(async () => {
      resolveDelete({ success: true });
      await removePromise;
    });

    expect(result.current.deletingIndexes).toEqual([]);
  });
});
