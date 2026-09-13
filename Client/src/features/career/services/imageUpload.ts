/**
 * imgbb image-hosting upload for career resumes.
 *
 * Feature-local service: only the Career page uploads files to imgbb, so this
 * deliberately lives under features/career/ instead of the shared
 * services/api/ layer. The endpoint and key come from BRANDING.integrations
 * (VITE_IMGBB_API_KEY), keeping them per-deployment configuration.
 */

import BRANDING from '../../../config/branding';

/** Response envelope returned by the imgbb upload endpoint. */
export interface ImgbbUploadResponse {
  success: boolean;
  data?: {
    url?: string;
  };
  error?: {
    message?: string;
  };
}

/** Whether this deployment has an imgbb API key configured. */
export const isImgbbConfigured = (): boolean => Boolean(BRANDING.integrations.imgbbApiKey);

/**
 * Uploads a file to imgbb and returns the hosted URL.
 * Throws on any failure (missing key, HTTP error, failed upload, no URL).
 */
export async function uploadResumeToImgbb(file: File): Promise<string> {
  if (!isImgbbConfigured()) {
    throw new Error('Resume upload is not configured for this site.');
  }

  const imgbbFormData = new FormData();
  imgbbFormData.append('image', file);

  const response = await fetch(
    `${BRANDING.integrations.imgbbUploadUrl}?key=${BRANDING.integrations.imgbbApiKey}`,
    {
      method: 'POST',
      body: imgbbFormData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`imgbb HTTP ${response.status}: ${errorText}`);
  }

  const imgbbData = (await response.json()) as ImgbbUploadResponse;

  if (!imgbbData.success) {
    throw new Error(imgbbData.error?.message || 'imgbb upload failed - success is false');
  }

  if (!imgbbData.data?.url) {
    throw new Error('imgbb did not return URL');
  }

  return imgbbData.data.url;
}
