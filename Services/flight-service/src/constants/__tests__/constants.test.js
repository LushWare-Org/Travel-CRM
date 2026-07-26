import { describe, it, expect } from 'vitest';
import {
  SALES_REP, ADMIN, SUPER_ADMIN, VENDOR, CUSTOMER,
  FLIGHT_AUTHORISED_ROLES, SCOPED_ROLES,
} from '../roles.js';
import {
  OK, CREATED, BAD_REQUEST, UNAUTHORIZED, FORBIDDEN,
  NOT_FOUND, INTERNAL_SERVER_ERROR, BAD_GATEWAY, SERVICE_UNAVAILABLE,
} from '../httpStatus.js';
import {
  SEARCH_REQUIRED_FIELDS, OFFER_ID_REQUIRED, OFFER_REQUIRED,
  TRAVELERS_REQUIRED, CONTACT_EMAIL_REQUIRED, BOOKING_NOT_FOUND,
  BOOKING_ALREADY_CANCELLED, TRAVELPORT_NOT_CONFIGURED,
  ROLE_NOT_AUTHORIZED, NOT_AUTHORIZED,
} from '../errorMessages.js';

describe('roles', () => {
  it('should export all five role constants', () => {
    expect(SALES_REP).toBe('salesRep');
    expect(ADMIN).toBe('admin');
    expect(SUPER_ADMIN).toBe('superAdmin');
    expect(VENDOR).toBe('vendor');
    expect(CUSTOMER).toBe('customer');
  });

  it('should include all three authorized roles for flight endpoints', () => {
    expect(FLIGHT_AUTHORISED_ROLES).toEqual(['salesRep', 'admin', 'superAdmin']);
  });

  it('should scope only salesRep', () => {
    expect(SCOPED_ROLES).toEqual(['salesRep']);
  });
});

describe('httpStatus', () => {
  it('should export correct numeric values', () => {
    expect(OK).toBe(200);
    expect(CREATED).toBe(201);
    expect(BAD_REQUEST).toBe(400);
    expect(UNAUTHORIZED).toBe(401);
    expect(FORBIDDEN).toBe(403);
    expect(NOT_FOUND).toBe(404);
    expect(INTERNAL_SERVER_ERROR).toBe(500);
    expect(BAD_GATEWAY).toBe(502);
    expect(SERVICE_UNAVAILABLE).toBe(503);
  });
});

describe('errorMessages', () => {
  it('should export search validation message', () => {
    expect(SEARCH_REQUIRED_FIELDS).toContain('origin');
  });

  it('should export role-specific auth message', () => {
    expect(ROLE_NOT_AUTHORIZED('vendor')).toContain('vendor');
  });

  it('should export static auth message', () => {
    expect(NOT_AUTHORIZED).toContain('Not authorized');
  });

  it('should export booking error messages', () => {
    expect(BOOKING_NOT_FOUND).toContain('not found');
    expect(BOOKING_ALREADY_CANCELLED).toContain('already cancelled');
  });

  it('should export travelport config message', () => {
    expect(TRAVELPORT_NOT_CONFIGURED).toContain('not configured');
  });
});
