// prisma/seed.ts

import { PrismaClient } from "@prisma/client";
import { config } from "../src/config/env";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seed...");

  // Seed default IP addresses for development if IP whitelist is enabled
  if (config.security.enableIpWhitelist) {
    console.log("Seeding default IP whitelist entries...");
    
    for (const ip of config.security.defaultAllowedIps) {
      // Check if IP already exists in the whitelist
      const existingIp = await prisma.ipWhitelist.findFirst({
        where: { ipAddress: ip },
      });

      if (!existingIp) {
        // Add the IP to the whitelist
        await prisma.ipWhitelist.create({
          data: {
            ipAddress: ip,
            description: "Default allowed IP",
            active: true,
          },
        });
        console.log(`Added default IP to whitelist: ${ip}`);
      } else {
        console.log(`Default IP already in whitelist: ${ip}`);
      }
    }
  }

  console.log("Seeding completed.");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });