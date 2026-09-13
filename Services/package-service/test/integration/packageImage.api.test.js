import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const { mockPrisma, mockCloudinaryDestroy } = vi.hoisted(() => ({
  mockPrisma: {
    packageImage: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    package: {
      update: vi.fn(),
    },
  },
  mockCloudinaryDestroy: vi.fn(),
}));

vi.mock('../../src/db/client.js', () => ({ default: mockPrisma }));
vi.mock('../../src/utils/cloudinary.js', () => ({
  default: { uploader: { destroy: mockCloudinaryDestroy } },
  configureCloudinary: vi.fn(),
}));

const { default: app } = await import('../../src/app.js');

function authHeaders(overrides = {}) {
  return {
    'x-user-id': overrides.id || 'agent-1',
    'x-user-role': overrides.role || 'admin',
    'x-user-email': overrides.email || 'agent@test.com',
    'x-user-name': overrides.name || 'Test Agent',
    'x-user-permissions': JSON.stringify(overrides.permissions || []),
    'x-user-is-super-admin': String(overrides.isSuperAdmin ?? false),
  };
}

describe('DELETE /api/v1/packages/:packageId/images/:imageId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes the DB row and destroys the Cloudinary asset by its stored publicId', async () => {
    mockPrisma.packageImage.findUnique.mockResolvedValue({
      id: 'img-1',
      packageId: 'pkg-1',
      url: 'https://res.cloudinary.com/x/img-1.jpg',
      publicId: 'travel-crm/packages/img-1',
    });
    mockPrisma.packageImage.delete.mockResolvedValue({});
    mockCloudinaryDestroy.mockResolvedValue({ result: 'ok' });

    const res = await request(app)
      .delete('/api/v1/packages/pkg-1/images/img-1')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.packageImage.delete).toHaveBeenCalledWith({ where: { id: 'img-1' } });
    expect(mockCloudinaryDestroy).toHaveBeenCalledWith('travel-crm/packages/img-1');
  });

  it('still deletes the DB row when the Cloudinary destroy call throws', async () => {
    mockPrisma.packageImage.findUnique.mockResolvedValue({
      id: 'img-1',
      packageId: 'pkg-1',
      url: 'https://res.cloudinary.com/x/img-1.jpg',
      publicId: 'travel-crm/packages/img-1',
    });
    mockPrisma.packageImage.delete.mockResolvedValue({});
    mockCloudinaryDestroy.mockRejectedValue(new Error('Cloudinary unavailable'));

    const res = await request(app)
      .delete('/api/v1/packages/pkg-1/images/img-1')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.packageImage.delete).toHaveBeenCalled();
  });

  it('skips Cloudinary cleanup for a legacy image with no stored publicId', async () => {
    mockPrisma.packageImage.findUnique.mockResolvedValue({
      id: 'img-1',
      packageId: 'pkg-1',
      url: 'https://res.cloudinary.com/x/img-1.jpg',
      publicId: null,
    });
    mockPrisma.packageImage.delete.mockResolvedValue({});

    const res = await request(app)
      .delete('/api/v1/packages/pkg-1/images/img-1')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(mockCloudinaryDestroy).not.toHaveBeenCalled();
  });

  it('returns 404 when the image does not belong to the package', async () => {
    mockPrisma.packageImage.findUnique.mockResolvedValue({
      id: 'img-1',
      packageId: 'some-other-package',
      url: 'https://res.cloudinary.com/x/img-1.jpg',
      publicId: 'p-1',
    });

    const res = await request(app)
      .delete('/api/v1/packages/pkg-1/images/img-1')
      .set(authHeaders());

    expect(res.status).toBe(404);
    expect(mockPrisma.packageImage.delete).not.toHaveBeenCalled();
  });

  it('returns 404 when the image does not exist', async () => {
    mockPrisma.packageImage.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/v1/packages/pkg-1/images/img-missing')
      .set(authHeaders());

    expect(res.status).toBe(404);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).delete('/api/v1/packages/pkg-1/images/img-1');
    expect(res.status).toBe(401);
    expect(mockPrisma.packageImage.findUnique).not.toHaveBeenCalled();
  });
});

describe('PUT /api/v1/packages/:packageId/cover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets Package.coverImage to the chosen image URL', async () => {
    mockPrisma.packageImage.findUnique.mockResolvedValue({
      id: 'img-2',
      packageId: 'pkg-1',
      url: 'https://res.cloudinary.com/x/img-2.jpg',
      publicId: 'p-2',
    });
    mockPrisma.package.update.mockResolvedValue({
      id: 'pkg-1',
      coverImage: 'https://res.cloudinary.com/x/img-2.jpg',
    });

    const res = await request(app)
      .put('/api/v1/packages/pkg-1/cover')
      .set(authHeaders())
      .send({ imageId: 'img-2' });

    expect(res.status).toBe(200);
    expect(res.body.data.coverImage).toBe('https://res.cloudinary.com/x/img-2.jpg');
    expect(mockPrisma.package.update).toHaveBeenCalledWith({
      where: { id: 'pkg-1' },
      data: { coverImage: 'https://res.cloudinary.com/x/img-2.jpg' },
    });
  });

  it('rejects a request missing imageId', async () => {
    const res = await request(app)
      .put('/api/v1/packages/pkg-1/cover')
      .set(authHeaders())
      .send({});

    expect(res.status).toBe(400);
    expect(mockPrisma.package.update).not.toHaveBeenCalled();
  });

  it('returns 404 when the image belongs to a different package', async () => {
    mockPrisma.packageImage.findUnique.mockResolvedValue({
      id: 'img-2',
      packageId: 'some-other-package',
      url: 'https://res.cloudinary.com/x/img-2.jpg',
      publicId: 'p-2',
    });

    const res = await request(app)
      .put('/api/v1/packages/pkg-1/cover')
      .set(authHeaders())
      .send({ imageId: 'img-2' });

    expect(res.status).toBe(404);
    expect(mockPrisma.package.update).not.toHaveBeenCalled();
  });
});
