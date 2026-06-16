import { getResourceItemBySlug } from '@/lib/resources';

export type ResourceAccessLead = {
  email: string;
  resourceSlug: string;
  sourcePath: string;
  company?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  createdAt: string;
};

const memoryResourceAccessLeads: ResourceAccessLead[] = [];

export async function recordResourceAccessLead(input: Omit<ResourceAccessLead, 'createdAt'>) {
  const resource = getResourceItemBySlug(input.resourceSlug);

  if (!resource) {
    throw new Error('RESOURCE_NOT_FOUND');
  }

  const lead: ResourceAccessLead = {
    ...input,
    email: input.email.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
  };

  memoryResourceAccessLeads.push(lead);
  return lead;
}

export function getResourceAccessLeads() {
  return [...memoryResourceAccessLeads];
}