import { createFlightClient } from '../clients/index.js';

/**
 * Middleware that injects the flight API client onto the request object.
 * Use `req.flightClient` in controllers instead of importing provider-specific code.
 */
export const injectFlightClient = (req, res, next) => {
  req.flightClient = createFlightClient();
  next();
};
