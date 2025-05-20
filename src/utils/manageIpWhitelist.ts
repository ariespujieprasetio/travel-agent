// src/utils/manageIpWhitelist.ts

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function listIps() {
  const ips = await prisma.ipWhitelist.findMany({
    orderBy: { createdAt: "desc" },
  });
  
  console.log("\nIP Whitelist Entries:");
  console.log("---------------------");
  
  if (ips.length === 0) {
    console.log("No IP addresses in the whitelist");
  } else {
    ips.forEach((ip) => {
      console.log(`ID: ${ip.id}`);
      console.log(`IP Address: ${ip.ipAddress}`);
      console.log(`Description: ${ip.description || "N/A"}`);
      console.log(`Status: ${ip.active ? "Active" : "Inactive"}`);
      console.log(`Created: ${ip.createdAt}`);
      console.log(`Updated: ${ip.updatedAt}`);
      console.log("---------------------");
    });
  }
}

async function addIp(ipAddress: string, description?: string) {
  try {
    // Check if IP already exists
    const existingIp = await prisma.ipWhitelist.findFirst({
      where: { ipAddress },
    });
    
    if (existingIp) {
      // Update the existing entry
      const updatedIp = await prisma.ipWhitelist.update({
        where: { id: existingIp.id },
        data: {
          description: description || existingIp.description,
          active: true,
        },
      });
      
      console.log(`IP ${ipAddress} already exists and has been updated`);
      return updatedIp;
    }
    
    // Create new entry
    const newIp = await prisma.ipWhitelist.create({
      data: {
        ipAddress,
        description,
        active: true,
      },
    });
    
    console.log(`Added IP ${ipAddress} to whitelist`);
    return newIp;
  } catch (error) {
    console.error("Error adding IP:", error);
    throw error;
  }
}

async function removeIp(ipAddress: string) {
  try {
    const ip = await prisma.ipWhitelist.findFirst({
      where: { ipAddress },
    });
    
    if (!ip) {
      console.log(`IP ${ipAddress} not found in whitelist`);
      return;
    }
    
    await prisma.ipWhitelist.delete({
      where: { id: ip.id },
    });
    
    console.log(`Removed IP ${ipAddress} from whitelist`);
  } catch (error) {
    console.error("Error removing IP:", error);
    throw error;
  }
}

async function setStatus(ipAddress: string, active: boolean) {
  try {
    const ip = await prisma.ipWhitelist.findFirst({
      where: { ipAddress },
    });
    
    if (!ip) {
      console.log(`IP ${ipAddress} not found in whitelist`);
      return;
    }
    
    const updatedIp = await prisma.ipWhitelist.update({
      where: { id: ip.id },
      data: { active },
    });
    
    console.log(`IP ${ipAddress} status set to ${active ? "active" : "inactive"}`);
    return updatedIp;
  } catch (error) {
    console.error("Error updating IP status:", error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case "list":
        await listIps();
        break;
        
      case "add":
        if (!args[1]) {
          console.error("IP address is required");
          process.exit(1);
        }
        await addIp(args[1], args[2]);
        break;
        
      case "remove":
        if (!args[1]) {
          console.error("IP address is required");
          process.exit(1);
        }
        await removeIp(args[1]);
        break;
        
      case "activate":
        if (!args[1]) {
          console.error("IP address is required");
          process.exit(1);
        }
        await setStatus(args[1], true);
        break;
        
      case "deactivate":
        if (!args[1]) {
          console.error("IP address is required");
          process.exit(1);
        }
        await setStatus(args[1], false);
        break;
        
      default:
        console.log(`
Usage: ts-node manageIpWhitelist.ts COMMAND [ARGS]

Commands:
  list                    List all IP whitelist entries
  add [ip] [description]  Add an IP to the whitelist
  remove [ip]             Remove an IP from the whitelist
  activate [ip]           Activate an IP in the whitelist
  deactivate [ip]         Deactivate an IP in the whitelist
        `);
        break;
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();