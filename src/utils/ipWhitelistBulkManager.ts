import fs from 'fs';
import readline from 'readline';
import * as ipWhitelistService from '../services/ipWhitelistService';

/**
 * Import IP addresses from a file
 * File format: One IP address per line, optionally followed by a description after a comma
 * Example:
 * 192.168.1.1, Office IP
 * 203.0.113.0, Data center
 */
export async function importIpsFromFile(filePath: string): Promise<Array<{
  ipAddress: string;
  description?: string;
  success: boolean;
  message?: string;
}>> {
  const results: Array<{
    ipAddress: string;
    description?: string;
    success: boolean;
    message?: string;
  }> = [];
  
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  // Regular expressions for validating IP formats
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  for await (const line of rl) {
    // Skip empty lines
    if (!line.trim()) continue;
    
    // Split by comma to separate IP and description
    const parts = line.split(',');
    const ipAddress = parts[0].trim();
    const description = parts[1]?.trim();
    
    // Validate IP format
    if (!ipv4Regex.test(ipAddress) && !ipv6Regex.test(ipAddress)) {
      results.push({
        ipAddress,
        description,
        success: false,
        message: 'Invalid IP address format'
      });
      continue;
    }
    
    try {
      // Add IP to whitelist
      await ipWhitelistService.addIpToWhitelist(ipAddress, description);
      
      results.push({
        ipAddress,
        description,
        success: true
      });
    } catch (error) {
      results.push({
        ipAddress,
        description,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return results;
}

/**
 * Export IP addresses to a file
 */
export async function exportIpsToFile(filePath: string): Promise<boolean> {
  try {
    const ips = await ipWhitelistService.getAllWhitelistedIps();
    
    const fileContent = ips.map(ip => 
      `${ip.ipAddress}${ip.description ? `, ${ip.description}` : ''}`
    ).join('\n');
    
    fs.writeFileSync(filePath, fileContent);
    
    return true;
  } catch (error) {
    console.error('Error exporting IPs to file:', error);
    return false;
  }
}