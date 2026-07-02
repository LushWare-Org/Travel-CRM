/**
 * Raw SQL helpers for cross-schema access to crm_users.User.
 * Auth-service owns crm_auth (OTP table). It reads/writes crm_users.User
 * using raw SQL since they share the same Supabase PostgreSQL database.
 */
import { Prisma } from '@prisma/client';
import prisma from './client.js';
import crypto from 'crypto';

// ─── Read ──────────────────────────────────────────────────────────────────────

export async function findUserByEmail(email) {
  const rows = await prisma.$queryRaw`
    SELECT id, name, email, phone, password, role::text AS role,
           "isSuperAdmin", permissions, "isActive", "isEmailVerified",
           "isTempPassword", "mustChangePassword", "avatarUrl",
           "passwordChangedAt", "emailVerificationToken", "emailVerificationExpire",
           "resetPasswordToken", "resetPasswordExpire", "lastLogin", "lastActivity",
           "createdAt", "updatedAt"
    FROM crm_users."User"
    WHERE email = ${email}
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function findUserById(id) {
  const rows = await prisma.$queryRaw`
    SELECT id, name, email, phone, role::text AS role,
           "isSuperAdmin", permissions, "isActive", "isEmailVerified",
           "isTempPassword", "mustChangePassword", "avatarUrl",
           "lastLogin", "lastActivity", "createdAt", "updatedAt",
           "passwordChangedAt"
    FROM crm_users."User"
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function findUserByResetToken(hashedToken) {
  const rows = await prisma.$queryRaw`
    SELECT id, name, email, role::text AS role, "isSuperAdmin", permissions, "isActive"
    FROM crm_users."User"
    WHERE "resetPasswordToken" = ${hashedToken}
      AND "resetPasswordExpire" > NOW()
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function findUserByVerificationToken(hashedToken) {
  const rows = await prisma.$queryRaw`
    SELECT id, name, email, role::text AS role, "isEmailVerified"
    FROM crm_users."User"
    WHERE "emailVerificationToken" = ${hashedToken}
      AND "emailVerificationExpire" > NOW()
    LIMIT 1
  `;
  return rows[0] || null;
}

// ─── Write ─────────────────────────────────────────────────────────────────────

export async function createUser({ name, email, phone = null, password, role = 'customer', isTempPassword = false, mustChangePassword = false }) {
  const id = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO crm_users."User"
      (id, name, email, phone, password, role, "isTempPassword", "mustChangePassword",
       permissions, "isSuperAdmin", "isActive", "isEmailVerified", "canBeDeleted",
       "lastActivity", "createdAt", "updatedAt")
    VALUES
      (${id}, ${name}, ${email}, ${phone}, ${password},
       ${role}::"crm_users"."UserRole", ${isTempPassword}, ${mustChangePassword},
       ARRAY[]::text[], false, true, false, true,
       NOW(), NOW(), NOW())
  `;
  return findUserById(id);
}

export async function updateLastLogin(id) {
  await prisma.$executeRaw`
    UPDATE crm_users."User"
    SET "lastLogin" = NOW(), "lastActivity" = NOW(), "updatedAt" = NOW()
    WHERE id = ${id}
  `;
}

export async function updatePassword(id, hashedPassword) {
  await prisma.$executeRaw`
    UPDATE crm_users."User"
    SET password = ${hashedPassword},
        "passwordChangedAt" = NOW(),
        "mustChangePassword" = false,
        "isTempPassword" = false,
        "resetPasswordToken" = NULL,
        "resetPasswordExpire" = NULL,
        "updatedAt" = NOW()
    WHERE id = ${id}
  `;
}

export async function setResetPasswordToken(id, hashedToken, expireDate) {
  await prisma.$executeRaw`
    UPDATE crm_users."User"
    SET "resetPasswordToken" = ${hashedToken},
        "resetPasswordExpire" = ${expireDate},
        "updatedAt" = NOW()
    WHERE id = ${id}
  `;
}

export async function setEmailVerificationToken(id, hashedToken, expireDate) {
  await prisma.$executeRaw`
    UPDATE crm_users."User"
    SET "emailVerificationToken" = ${hashedToken},
        "emailVerificationExpire" = ${expireDate},
        "updatedAt" = NOW()
    WHERE id = ${id}
  `;
}

export async function markEmailVerified(id) {
  await prisma.$executeRaw`
    UPDATE crm_users."User"
    SET "isEmailVerified" = true,
        "emailVerificationToken" = NULL,
        "emailVerificationExpire" = NULL,
        "updatedAt" = NOW()
    WHERE id = ${id}
  `;
}

export async function updateUserProfile(id, { name, phone }) {
  const parts = [];
  const values = [];

  if (name !== undefined) { parts.push(`name = $${parts.length + 2}`); values.push(name); }
  if (phone !== undefined) { parts.push(`phone = $${parts.length + 2}`); values.push(phone); }
  if (!parts.length) return;

  parts.push(`"updatedAt" = NOW()`);
  await prisma.$executeRawUnsafe(
    `UPDATE crm_users."User" SET ${parts.join(', ')} WHERE id = $1`,
    id,
    ...values
  );
}
