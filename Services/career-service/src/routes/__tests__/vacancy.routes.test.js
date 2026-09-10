import { describe, it, expect, vi } from 'vitest';

// The router pulls in `vacancy.controller.js`, which imports the Prisma client.
// Nothing here executes a handler — this suite only reads the router's own
// layer order — so the client is stubbed to keep the import side-effect free.
vi.mock('../../db/client.js', () => ({ default: {} }));

import router from '../vacancy.routes.js';

/**
 * Guards a regression that shipped: `GET /admin/all` was registered ABOVE
 * `router.use(requireAuth, authorize('admin', 'superAdmin'))`, so only
 * `extractUser` ran and any authenticated caller could read the admin vacancy
 * list. The gateway separately listed the same path as public, which made it
 * reachable with no token at all.
 *
 * Express 4 records every `router.use` handler and every route as its own layer
 * in `router.stack`, so the ordering invariant is directly assertable without
 * HTTP plumbing or a new dependency:
 *   - a route layer has `route.path` and `name === 'bound dispatch'`
 *   - a `router.use(fn)` layer carries `fn.name` (`requireAuth`)
 *
 * If this test fails, someone reordered the file. Do not "fix" it by moving the
 * assertion — move the route back below the gate.
 */
describe('vacancy router layer order', () => {
  const layers = router.stack;
  const indexOf = (predicate) => layers.findIndex(predicate);

  const gateIndex = indexOf((layer) => layer.name === 'requireAuth');
  const routeIndex = (path) => indexOf((layer) => layer.route?.path === path);

  it('registers the admin gate at all', () => {
    expect(gateIndex).toBeGreaterThanOrEqual(0);
  });

  it('registers GET /admin/all below the admin gate', () => {
    const adminAll = routeIndex('/admin/all');
    expect(adminAll).toBeGreaterThanOrEqual(0);
    expect(adminAll).toBeGreaterThan(gateIndex);
  });

  it('keeps the public vacancy list above the gate', () => {
    const publicList = routeIndex('/');
    expect(publicList).toBeGreaterThanOrEqual(0);
    expect(publicList).toBeLessThan(gateIndex);
  });

  it('gates every vacancy mutation below the admin gate', () => {
    for (const path of ['/', '/:id']) {
      const index = layers.findIndex(
        (layer) => layer.route?.path === path && !layer.route.methods.get,
      );
      if (index === -1) continue;
      expect(index).toBeGreaterThan(gateIndex);
    }
  });
});
