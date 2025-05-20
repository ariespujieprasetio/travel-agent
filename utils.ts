// utils.ts - Utility functions for Business Itinerary Planning System

/**
 * Calculate distance between two points in kilometers using Haversine formula
 */
export function haversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radius of Earth in km
    const toRad = (angle: number): number => (angle * Math.PI) / 180; // Convert degrees to radians
  
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
  
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
    return R * c; // Distance in km
  }
  
  /**
   * Format currency values consistently
   */
  export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }
  
  /**
   * Generate a PDF document from itinerary data
   * Note: This is a stub implementation. In a real application,
   * you would use a library like PDFKit or PDF-lib.
   */
  export function generatePDF(itineraryData: any): Buffer {
    // In a real implementation, this would use PDFKit or another PDF generation library
    console.log('Generating PDF for itinerary:', itineraryData.title);
    
    // Return an empty buffer for now
    // In a real implementation, this would be the PDF content
    return Buffer.from('PDF content would go here');
  }
  
  /**
   * Generate an Excel file from itinerary data
   * Note: This is a stub implementation. In a real application,
   * you would use a library like ExcelJS.
   */
  export function generateExcel(itineraryData: any): Buffer {
    // In a real implementation, this would use ExcelJS or another Excel generation library
    console.log('Generating Excel for itinerary:', itineraryData.title);
    
    // Return an empty buffer for now
    // In a real implementation, this would be the Excel content
    return Buffer.from('Excel content would go here');
  }
  
  /**
   * Parse ISO date string to a readable format
   */
  export function formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  /**
   * Calculate duration between two times in minutes
   */
  export function getDurationMinutes(startTime: string, endTime: string): number {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    let totalMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    
    // Handle overnight activities
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }
    
    return totalMinutes;
  }
  
  /**
   * Convert minutes to a readable duration format
   */
  export function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins} minutes`;
    } else if (mins === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
    }
  }
  
  /**
   * Check if a string represents a valid JSON
   */
  export function isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Simple JSON to plaintext converter for itinerary
   * This is a helper function to generate a text representation of the itinerary
   */
  export function itineraryToText(itineraryData: any): string {
    let text = '';
    
    // Title and date range
    text += `BUSINESS ITINERARY: ${itineraryData.title}\n`;
    text += `${formatDate(itineraryData.startDate)} to ${formatDate(itineraryData.endDate)}\n\n`;
    
    // Hotel information
    text += `HOTEL\n`;
    text += `Name: ${itineraryData.hotel.name}\n`;
    text += `Rating: ${itineraryData.hotel.rating}\n`;
    text += `Address: ${itineraryData.hotel.address}\n`;
    text += `Nightly Rate: ${formatCurrency(itineraryData.hotel.nightlyRate)}\n\n`;
    
    // Vehicle information if applicable
    if (itineraryData.vehicle) {
      text += `TRANSPORTATION\n`;
      text += `Vehicle: ${itineraryData.vehicle.type}\n`;
      text += `With Driver: ${itineraryData.vehicle.withDriver ? 'Yes' : 'No'}\n`;
      text += `Daily Rate: ${formatCurrency(itineraryData.vehicle.dailyRate)}\n\n`;
    }
    
    // Daily itineraries
    for (const day of itineraryData.days) {
      text += `== ${day.formattedDate} ==\n\n`;
      
      for (const item of day.items) {
        text += `${item.startTime} - ${item.endTime}: ${item.description}\n`;
        text += `Location: ${item.location}, ${item.address}\n`;
        
        if (item.cost > 0) {
          text += `Cost: ${formatCurrency(item.cost)}\n`;
        }
        
        if (item.notes) {
          text += `Notes: ${item.notes}\n`;
        }
        
        text += '\n';
      }
      
      text += `Daily Total: ${formatCurrency(day.totalCost)}\n\n`;
    }
    
    // Summary
    text += `ITINERARY SUMMARY\n`;
    text += `Total Estimated Cost: ${formatCurrency(itineraryData.totalCost)}\n`;
    
    return text;
  }