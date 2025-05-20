// src/services/placeService.ts

import prisma from '../utils/prisma';
import { google } from 'googleapis';
import { GOOGLE_API_KEY } from '../utils/config';

const places = google.places({ version: 'v1', auth: GOOGLE_API_KEY });
const fields = '...'; // Define relevant fields

interface Place {
  // Define the Place interface as needed
}

export async function findPlacesWithCache(query: string, requestBody: any): Promise<Place[]> {
  const cacheEntry = await prisma.cachedPlace.findUnique({ where: { query } });

  if (cacheEntry && cacheEntry.expiresAt > new Date()) {
    return cacheEntry.data as Place[];
  }

  // Make the API call
  const response = await places.places.searchText({ fields, requestBody });
  const placesData = response.data.places as Place[];

  // Update the cache
  await prisma.cachedPlace.upsert({
    where: { query },
    update: {
      data: placesData,
      expiresAt: new Date(Date.now() + 86400000), // Expires in 1 day
    },
    create: {
      query,
      data: placesData,
      expiresAt: new Date(Date.now() + 86400000),
    },
  });

  return placesData;
}