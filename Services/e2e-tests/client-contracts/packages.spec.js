import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ApiPackage } from '@travel-crm/contracts';
import { apiClient } from '../helpers/api-client.js';

describe.sequential('client contract: packages', () => {
  let samplePackageId;

  it('GET /packages returns an envelope whose data matches ApiPackage[]', async () => {
    const res = await apiClient.get('/packages?limit=5');
    expect(res.status).toBe(200);
    const parsed = z.array(ApiPackage).safeParse(res.body?.data);
    if (!parsed.success) throw new Error(`ApiPackage[] mismatch: ${JSON.stringify(parsed.error.issues)}`);
    expect(parsed.data.length).toBeGreaterThan(0);
    samplePackageId = parsed.data[0].id;
  });

  it('GET /packages/featured/all returns an envelope whose data matches ApiPackage[]', async () => {
    const res = await apiClient.get('/packages/featured/all?limit=5');
    expect(res.status).toBe(200);
    const parsed = z.array(ApiPackage).safeParse(res.body?.data);
    if (!parsed.success) throw new Error(`ApiPackage[] mismatch: ${JSON.stringify(parsed.error.issues)}`);
  });

  it('GET /packages/:id returns an envelope whose data matches ApiPackage', async () => {
    expect(samplePackageId).toBeTruthy();
    const res = await apiClient.get(`/packages/${samplePackageId}`);
    expect(res.status).toBe(200);
    const parsed = ApiPackage.safeParse(res.body?.data);
    if (!parsed.success) throw new Error(`ApiPackage mismatch: ${JSON.stringify(parsed.error.issues)}`);
    expect(parsed.data.id).toBe(samplePackageId);
  });
});
