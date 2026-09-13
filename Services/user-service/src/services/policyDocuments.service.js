import prisma from '../db/client.js';

export async function listPolicyDocuments() {
  return prisma.policyDocument.findMany({ orderBy: { title: 'asc' } });
}

export async function getPolicyDocumentById(id) {
  return prisma.policyDocument.findUnique({ where: { id } });
}

export async function createPolicyDocument(data, updatedById) {
  return prisma.policyDocument.create({
    data: { title: data.title, body: data.body, updatedById: updatedById ?? null },
  });
}

export async function updatePolicyDocument(id, data, updatedById) {
  const update = { updatedById: updatedById ?? null };
  if (Object.prototype.hasOwnProperty.call(data, 'title')) update.title = data.title;
  if (Object.prototype.hasOwnProperty.call(data, 'body')) update.body = data.body;
  return prisma.policyDocument.update({ where: { id }, data: update });
}

export async function deletePolicyDocument(id) {
  return prisma.policyDocument.delete({ where: { id } });
}
