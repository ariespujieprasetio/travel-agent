import prisma from "../models/prisma";

/**
 * Get all whitelisted IP addresses
 */
export async function getAllWhitelistedIps() {
  return prisma.ipWhitelist.findMany({
    orderBy: {
      createdAt: "desc"
    }
  });
}

/**
 * Add an IP to the whitelist
 */
export async function addIpToWhitelist(ipAddress: string, description?: string) {
  // Check if IP already exists
  const existingIp = await prisma.ipWhitelist.findFirst({
    where: { ipAddress }
  });
  
  if (existingIp) {
    // Update the existing entry
    return prisma.ipWhitelist.update({
      where: { id: existingIp.id },
      data: {
        description: description || existingIp.description,
        active: true,
        updatedAt: new Date()
      }
    });
  }
  
  // Create new whitelist entry
  return prisma.ipWhitelist.create({
    data: {
      ipAddress,
      description,
      active: true
    }
  });
}

/**
 * Remove an IP from the whitelist
 */
export async function removeIpFromWhitelist(id: string) {
  return prisma.ipWhitelist.delete({
    where: { id }
  });
}

/**
 * Update IP whitelist status
 */
export async function updateIpWhitelistStatus(
  id: string,
  data: {
    active?: boolean;
    description?: string;
  }
) {
  return prisma.ipWhitelist.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date()
    }
  });
}

/**
 * Bulk add IPs to the whitelist
 */
export async function bulkAddIpsToWhitelist(
  ips: Array<{
    ipAddress: string;
    description?: string;
  }>
) {
  const results = [];
  
  for (const ip of ips) {
    const result = await addIpToWhitelist(ip.ipAddress, ip.description);
    results.push(result);
  }
  
  return results;
}

/**
 * Bulk remove IPs from the whitelist
 */
export async function bulkRemoveIpsFromWhitelist(ids: string[]) {
  return prisma.ipWhitelist.deleteMany({
    where: {
      id: {
        in: ids
      }
    }
  });
}

/**
 * Bulk update IP whitelist status
 */
export async function bulkUpdateIpWhitelistStatus(
  ids: string[],
  data: {
    active: boolean;
  }
) {
  return prisma.ipWhitelist.updateMany({
    where: {
      id: {
        in: ids
      }
    },
    data: {
      ...data,
      updatedAt: new Date()
    }
  });
}