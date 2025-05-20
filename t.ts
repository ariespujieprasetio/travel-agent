import * as dotenv from 'dotenv';
import { google } from 'googleapis';
import * as uuid from 'uuid';
import {
  haversine,
  formatCurrency,
  generatePDF,
  generateExcel
} from './utils';
import { writeFileSync } from 'fs';

// Load environment variables
dotenv.config();

// Initialize Google Places API
const places = google.places({
  version: 'v1',
  auth: process.env.GOOGLE_API_KEY
});

// Define the fields we want to retrieve from Google Places API
const fields = [
  // 'places.displayName',
  // 'places.formattedAddress',
  // 'places.nationalPhoneNumber',
  // 'places.internationalPhoneNumber',
  // 'places.websiteUri',
  // 'places.googleMapsUri',
  // 'places.dineIn',
  // 'places.reservable',
  // 'places.servesLunch',
  // 'places.servesDinner',
  // 'places.servesBeer',
  // 'places.servesWine',
  // 'places.priceLevel',
  // 'places.priceRange',
  // 'places.rating',
  // 'places.location'
  '*'
].join(',');

// Enums and Types
enum HotelRating {
  FOUR_STAR = "4-Star",
  FIVE_STAR = "5-Star",
  LUXURY_BOUTIQUE = "Luxury Boutique"
}

enum VehicleType {
  TOYOTA_ALPHARD = "Toyota Alphard",
  MERCEDES_S_CLASS = "Mercedes-Benz S-Class",
  BMW_7_SERIES = "BMW 7 Series",
  RANGE_ROVER = "Range Rover",
  LEXUS_LM = "Lexus LM"
}

enum CuisineType {
  LOCAL_INDONESIAN = "Local Indonesian",
  JAPANESE = "Japanese",
  CHINESE = "Chinese",
  THAI = "Thai",
  KOREAN = "Korean",
  ITALIAN = "Italian",
  FRENCH = "French",
  STEAKHOUSE = "Steakhouse",
  FINE_DINING = "Fine Dining"
}

enum DietaryRestriction {
  HALAL = "Halal",
  NON_HALAL = "Non-Halal",
  VEGETARIAN = "Vegetarian"
}

enum EntertainmentType {
  ROOFTOP_BAR = "Rooftop Bar",
  HIGH_END_LOUNGE = "High-end Lounge",
  PRIVATE_CLUB = "Private Members' Club"
}

enum BusinessSpaceType {
  HOTEL_MEETING_ROOM = "Hotel Meeting Room",
  PRIVATE_OFFICE = "Private Office",
  COWORKING_SPACE = "Co-working Space"
}

enum AttractionType {
  MUSEUM = "Museum",
  HISTORICAL_SITE = "Historical Site",
  BEACH = "Beach",
  PARK = "Park",
  TEMPLE = "Temple",
  MARKET = "Market",
  CULTURAL_VENUE = "Cultural Venue",
  LANDMARK = "Landmark",
  NATURE = "Nature Spot",
  ADVENTURE = "Adventure Activity"
}

enum BudgetRange {
  RANGE_5K_7_5K = "USD 5,000 - 7,500",
  RANGE_7_5K_10K = "USD 7,500 - 10,000",
  CUSTOM = "Custom"
}

enum ItemType {
  BUSINESS_MEETING = "business_meeting",
  MEAL = "meal",
  TRANSPORTATION = "transportation",
  ENTERTAINMENT = "entertainment",
  ATTRACTION = "attraction",
  HOTEL = "hotel",
  FREE_TIME = "free_time",
  BREAK = "break"
}

// Google Places API Response Types
interface DisplayName {
  text: string;
  languageCode: string;
}

interface Location {
  latitude: number;
  longitude: number;
}

interface GooglePlace {
  name?: string;
  formattedAddress: string;
  location: Location;
  rating?: number;
  googleMapsUri: string;
  websiteUri?: string;
  displayName: DisplayName;
  priceLevel?: number;
  nationalPhoneNumber?: string;
  servesLunch?: boolean;
  servesDinner?: boolean;
  dineIn?: boolean;
  reservable?: boolean;
}

// Business Itinerary Data Models
interface TimeWindow {
  startTime: Date;
  endTime: Date;
}

interface Address {
  street: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
}

class Place {
  id: string;
  name: string;
  address: Address;
  location: Location;
  rating?: number;
  googleMapsUri?: string;
  websiteUri?: string;
  phoneNumber?: string;

  constructor(googlePlace: GooglePlace) {
    this.id = uuid.v4();
    this.name = googlePlace.displayName.text;

    // Parse address (simplified)
    const addressParts = googlePlace.formattedAddress.split(', ');
    this.address = {
      street: addressParts[0] || '',
      city: addressParts[1] || '',
      country: addressParts[addressParts.length - 1] || ''
    };

    this.location = googlePlace.location;
    this.rating = googlePlace.rating;
    this.googleMapsUri = googlePlace.googleMapsUri;
    this.websiteUri = googlePlace.websiteUri;
    this.phoneNumber = googlePlace.nationalPhoneNumber;
  }

  distanceTo(other: Place): number {
    return haversine(
      this.location.latitude,
      this.location.longitude,
      other.location.latitude,
      other.location.longitude
    );
  }
}

class Hotel extends Place {
  hotelRating: HotelRating;
  nightlyRate: number;
  amenities: string[];
  hasBusinessCenter: boolean;
  hasMeetingRooms: boolean;
  hasRestaurant: boolean;

  constructor(googlePlace: GooglePlace, hotelRating: HotelRating) {
    super(googlePlace);
    this.hotelRating = hotelRating;

    // Estimate nightly rate based on price level and hotel rating
    const basePriceByRating = {
      [HotelRating.FOUR_STAR]: 200,
      [HotelRating.FIVE_STAR]: 400,
      [HotelRating.LUXURY_BOUTIQUE]: 600
    };

    const priceMultiplier = googlePlace.priceLevel || 2;
    this.nightlyRate = basePriceByRating[hotelRating] * (priceMultiplier / 2);

    // Random amenities for demo purposes
    this.amenities = ['Wi-Fi', 'Pool', 'Gym'];
    this.hasBusinessCenter = Math.random() > 0.3;
    this.hasMeetingRooms = Math.random() > 0.2;
    this.hasRestaurant = Math.random() > 0.1;
  }

  checkAvailability(checkIn: Date, checkOut: Date, numRooms: number): boolean {
    // In a real system, this would check a booking database
    return true;
  }
}

class Restaurant extends Place {
  cuisineTypes: CuisineType[];
  dietaryOptions: DietaryRestriction[];
  priceLevel: number;
  openingHours: TimeWindow[];
  reservationRequired: boolean;

  constructor(googlePlace: GooglePlace, cuisineType: CuisineType) {
    super(googlePlace);
    this.cuisineTypes = [cuisineType];

    // Add random secondary cuisines sometimes
    if (Math.random() > 0.7) {
      const availableCuisines = Object.values(CuisineType);
      const randomCuisine = availableCuisines[Math.floor(Math.random() * availableCuisines.length)];
      if (randomCuisine !== cuisineType) {
        this.cuisineTypes.push(randomCuisine);
      }
    }

    // Random dietary options for demo
    this.dietaryOptions = [];
    if (Math.random() > 0.3) this.dietaryOptions.push(DietaryRestriction.HALAL);
    if (Math.random() > 0.7) this.dietaryOptions.push(DietaryRestriction.VEGETARIAN);

    this.priceLevel = googlePlace.priceLevel || Math.floor(Math.random() * 4) + 2;

    // Generate typical restaurant hours
    this.openingHours = this.generateOpeningHours();

    this.reservationRequired = Math.random() > 0.5;
  }

  private generateOpeningHours(): TimeWindow[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Lunch hours
    const lunchStart = new Date(today);
    lunchStart.setHours(11, 30, 0, 0);
    const lunchEnd = new Date(today);
    lunchEnd.setHours(14, 30, 0, 0);

    // Dinner hours
    const dinnerStart = new Date(today);
    dinnerStart.setHours(18, 0, 0, 0);
    const dinnerEnd = new Date(today);
    dinnerEnd.setHours(22, 30, 0, 0);

    return [
      { startTime: lunchStart, endTime: lunchEnd },
      { startTime: dinnerStart, endTime: dinnerEnd }
    ];
  }

  isOpenAt(dateTime: Date): boolean {
    const hours = dateTime.getHours();
    const minutes = dateTime.getMinutes();
    const timeAsMinutes = hours * 60 + minutes;

    return this.openingHours.some(window => {
      const startTimeMinutes = window.startTime.getHours() * 60 + window.startTime.getMinutes();
      const endTimeMinutes = window.endTime.getHours() * 60 + window.endTime.getMinutes();
      return timeAsMinutes >= startTimeMinutes && timeAsMinutes <= endTimeMinutes;
    });
  }
}

class EntertainmentVenue extends Place {
  venueType: EntertainmentType;
  priceLevel: number;
  openingHours: TimeWindow[];
  dressCode: string;
  reservationRecommended: boolean;

  constructor(googlePlace: GooglePlace, venueType: EntertainmentType) {
    super(googlePlace);
    this.venueType = venueType;
    this.priceLevel = googlePlace.priceLevel || Math.floor(Math.random() * 3) + 3; // 3-5 for high-end
    this.openingHours = this.generateOpeningHours();
    this.dressCode = this.venueType === EntertainmentType.PRIVATE_CLUB ? "Formal" : "Smart Casual";
    this.reservationRecommended = Math.random() > 0.3;
  }

  private generateOpeningHours(): TimeWindow[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Evening hours
    const eveningStart = new Date(today);
    eveningStart.setHours(17, 0, 0, 0);
    const eveningEnd = new Date(today);
    eveningEnd.setHours(2, 0, 0, 0);

    return [{ startTime: eveningStart, endTime: eveningEnd }];
  }

  isOpenAt(dateTime: Date): boolean {
    const hours = dateTime.getHours();
    const minutes = dateTime.getMinutes();
    const timeAsMinutes = hours * 60 + minutes;

    return this.openingHours.some(window => {
      const startTimeMinutes = window.startTime.getHours() * 60 + window.startTime.getMinutes();
      let endTimeMinutes = window.endTime.getHours() * 60 + window.endTime.getMinutes();

      // Handle venues open past midnight
      if (endTimeMinutes < startTimeMinutes) {
        endTimeMinutes += 24 * 60;
        if (timeAsMinutes < startTimeMinutes) {
          return timeAsMinutes + 24 * 60 <= endTimeMinutes;
        }
      }

      return timeAsMinutes >= startTimeMinutes && timeAsMinutes <= endTimeMinutes;
    });
  }
}

class BusinessVenue extends Place {
  venueType: BusinessSpaceType;
  capacity: number;
  hourlyRate: number;
  amenities: string[];
  availability: TimeWindow[];

  constructor(googlePlace: GooglePlace, venueType: BusinessSpaceType) {
    super(googlePlace);
    this.venueType = venueType;

    // Set capacity based on venue type
    if (venueType === BusinessSpaceType.HOTEL_MEETING_ROOM) {
      this.capacity = Math.floor(Math.random() * 30) + 10; // 10-40 people
    } else if (venueType === BusinessSpaceType.PRIVATE_OFFICE) {
      this.capacity = Math.floor(Math.random() * 10) + 5; // 5-15 people
    } else {
      this.capacity = Math.floor(Math.random() * 20) + 10; // 10-30 people
    }

    // Hourly rate based on venue type and price level
    const baseRateByType = {
      [BusinessSpaceType.HOTEL_MEETING_ROOM]: 100,
      [BusinessSpaceType.PRIVATE_OFFICE]: 80,
      [BusinessSpaceType.COWORKING_SPACE]: 50
    };

    const priceMultiplier = googlePlace.priceLevel || 2;
    this.hourlyRate = baseRateByType[venueType] * (priceMultiplier / 2);

    // Amenities
    this.amenities = ['Wi-Fi', 'Projector', 'Whiteboard'];
    if (Math.random() > 0.5) this.amenities.push('Videoconferencing');
    if (Math.random() > 0.7) this.amenities.push('Catering Services');

    // Typical business hours
    this.availability = this.generateAvailability();
  }



  private generateAvailability(): TimeWindow[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const businessStart = new Date(today);
    businessStart.setHours(8, 0, 0, 0);
    const businessEnd = new Date(today);
    businessEnd.setHours(18, 0, 0, 0);

    return [{ startTime: businessStart, endTime: businessEnd }];
  }

  isAvailableAt(dateTime: Date, duration: number): boolean {
    const timeAsMinutes = dateTime.getHours() * 60 + dateTime.getMinutes();
    const endTimeAsMinutes = timeAsMinutes + duration;

    return this.availability.some(window => {
      const startTimeMinutes = window.startTime.getHours() * 60 + window.startTime.getMinutes();
      const endTimeMinutes = window.endTime.getHours() * 60 + window.endTime.getMinutes();

      return timeAsMinutes >= startTimeMinutes && endTimeAsMinutes <= endTimeMinutes;
    });
  }
}

class Attraction extends Place {
  attractionType: AttractionType;
  entranceFee: number;
  recommendedVisitDuration: number; // in minutes
  openingHours: TimeWindow[];
  familyFriendly: boolean;

  constructor(googlePlace: GooglePlace, attractionType: AttractionType) {
    super(googlePlace);
    this.attractionType = attractionType;

    // Set entrance fee based on attraction type and price level
    const baseFeeByType = {
      [AttractionType.MUSEUM]: 15,
      [AttractionType.HISTORICAL_SITE]: 10,
      [AttractionType.BEACH]: 0,
      [AttractionType.PARK]: 5,
      [AttractionType.TEMPLE]: 8,
      [AttractionType.MARKET]: 0,
      [AttractionType.CULTURAL_VENUE]: 20,
      [AttractionType.LANDMARK]: 12,
      [AttractionType.NATURE]: 8,
      [AttractionType.ADVENTURE]: 30
    };

    const priceMultiplier = googlePlace.priceLevel || 1;
    this.entranceFee = baseFeeByType[attractionType] * priceMultiplier;

    // Set recommended visit duration based on attraction type
    const durationByType = {
      [AttractionType.MUSEUM]: 120,
      [AttractionType.HISTORICAL_SITE]: 90,
      [AttractionType.BEACH]: 180,
      [AttractionType.PARK]: 60,
      [AttractionType.TEMPLE]: 60,
      [AttractionType.MARKET]: 90,
      [AttractionType.CULTURAL_VENUE]: 120,
      [AttractionType.LANDMARK]: 60,
      [AttractionType.NATURE]: 120,
      [AttractionType.ADVENTURE]: 180
    };

    this.recommendedVisitDuration = durationByType[attractionType];

    // Generate typical opening hours
    this.openingHours = this.generateOpeningHours();

    // Determine if family friendly (most attractions are, but adventure may not be)
    this.familyFriendly = attractionType !== AttractionType.ADVENTURE || Math.random() > 0.3;
  }


  private generateOpeningHours(): TimeWindow[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Set opening and closing times based on attraction type
    let openingTime = new Date(today);
    let closingTime = new Date(today);

    switch (this.attractionType) {
      case AttractionType.MUSEUM:
        openingTime.setHours(9, 0, 0, 0);
        closingTime.setHours(17, 0, 0, 0);
        break;
      case AttractionType.HISTORICAL_SITE:
        openingTime.setHours(8, 0, 0, 0);
        closingTime.setHours(18, 0, 0, 0);
        break;
      case AttractionType.BEACH:
        openingTime.setHours(6, 0, 0, 0);
        closingTime.setHours(19, 0, 0, 0);
        break;
      case AttractionType.PARK:
        openingTime.setHours(7, 0, 0, 0);
        closingTime.setHours(20, 0, 0, 0);
        break;
      case AttractionType.TEMPLE:
        openingTime.setHours(8, 0, 0, 0);
        closingTime.setHours(19, 0, 0, 0);
        break;
      case AttractionType.MARKET:
        openingTime.setHours(9, 0, 0, 0);
        closingTime.setHours(21, 0, 0, 0);
        break;
      case AttractionType.CULTURAL_VENUE:
        openingTime.setHours(10, 0, 0, 0);
        closingTime.setHours(18, 0, 0, 0);
        break;
      case AttractionType.LANDMARK:
        openingTime.setHours(8, 0, 0, 0);
        closingTime.setHours(18, 0, 0, 0);
        break;
      case AttractionType.NATURE:
        openingTime.setHours(7, 0, 0, 0);
        closingTime.setHours(19, 0, 0, 0);
        break;
      case AttractionType.ADVENTURE:
        openingTime.setHours(8, 0, 0, 0);
        closingTime.setHours(17, 0, 0, 0);
        break;
      default:
        openingTime.setHours(9, 0, 0, 0);
        closingTime.setHours(17, 0, 0, 0);
    }

    return [{ startTime: openingTime, endTime: closingTime }];
  }

  isOpenAt(dateTime: Date): boolean {
    const hours = dateTime.getHours();
    const minutes = dateTime.getMinutes();
    const timeAsMinutes = hours * 60 + minutes;

    return this.openingHours.some(window => {
      const startTimeMinutes = window.startTime.getHours() * 60 + window.startTime.getMinutes();
      const endTimeMinutes = window.endTime.getHours() * 60 + window.endTime.getMinutes();
      return timeAsMinutes >= startTimeMinutes && timeAsMinutes <= endTimeMinutes;
    });
  }
}

class Vehicle {
  id: string;
  vehicleType: VehicleType;
  capacity: number;
  hourlyRate: number;
  dailyRate: number;
  withDriver: boolean;
  driverDailyRate: number;

  constructor(vehicleType: VehicleType, withDriver: boolean) {
    this.id = uuid.v4();
    this.vehicleType = vehicleType;

    // Set capacity and rates based on vehicle type
    switch (vehicleType) {
      case VehicleType.TOYOTA_ALPHARD:
        this.capacity = 7;
        this.hourlyRate = 50;
        this.dailyRate = 250;
        break;
      case VehicleType.MERCEDES_S_CLASS:
        this.capacity = 4;
        this.hourlyRate = 70;
        this.dailyRate = 350;
        break;
      case VehicleType.BMW_7_SERIES:
        this.capacity = 4;
        this.hourlyRate = 65;
        this.dailyRate = 325;
        break;
      case VehicleType.RANGE_ROVER:
        this.capacity = 5;
        this.hourlyRate = 80;
        this.dailyRate = 400;
        break;
      case VehicleType.LEXUS_LM:
        this.capacity = 6;
        this.hourlyRate = 75;
        this.dailyRate = 375;
        break;
      default:
        this.capacity = 4;
        this.hourlyRate = 60;
        this.dailyRate = 300;
    }

    this.withDriver = withDriver;
    this.driverDailyRate = withDriver ? 100 : 0;
  }

  get totalDailyRate(): number {
    return this.dailyRate + this.driverDailyRate;
  }
}

class BusinessMeeting {
  id: string;
  title: string;
  venue: BusinessVenue;
  startTime: Date;
  endTime: Date;
  participants: string[];
  priority: number;

  constructor(title: string, venue: BusinessVenue, startTime: Date, endTime: Date, participants: string[]) {
    this.id = uuid.v4();
    this.title = title;
    this.venue = venue;
    this.startTime = startTime;
    this.endTime = endTime;
    this.participants = participants;
    this.priority = 5; // High priority by default for business meetings
  }

  get duration(): number {
    return (this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60); // Duration in minutes
  }
}

class ItineraryItem {
  id: string;
  type: ItemType;
  startTime: Date;
  endTime: Date;
  place: Place;
  description: string;
  notes: string;
  cost: number;

  // References to specific entities
  businessMeeting?: BusinessMeeting;
  restaurant?: Restaurant;
  vehicle?: Vehicle;
  entertainmentVenue?: EntertainmentVenue;
  hotel?: Hotel;
  // Add to existing properties
  attraction?: Attraction;

  constructor(
    type: ItemType,
    startTime: Date,
    endTime: Date,
    place: Place,
    description: string,
    cost: number,
    notes: string = ""
  ) {
    this.id = uuid.v4();
    this.type = type;
    this.startTime = startTime;
    this.endTime = endTime;
    this.place = place;
    this.description = description;
    this.notes = notes;
    this.cost = cost;
  }

  get duration(): number {
    return (this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60); // Duration in minutes
  }

  get formattedStartTime(): string {
    return this.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  get formattedEndTime(): string {
    return this.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  get formattedCost(): string {
    return formatCurrency(this.cost);
  }
}

class DayPlan {
  date: Date;
  items: ItineraryItem[];

  constructor(date: Date) {
    this.date = date;
    this.items = [];
  }

  get totalCost(): number {
    return this.items.reduce((sum, item) => sum + item.cost, 0);
  }

  get formattedDate(): string {
    return this.date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  addItem(item: ItineraryItem): void {
    // Insert item in chronological order
    let index = 0;
    while (index < this.items.length && this.items[index].startTime < item.startTime) {
      index++;
    }
    this.items.splice(index, 0, item);
  }


  hasConflict(item: ItineraryItem): boolean {
    for (const existingItem of this.items) {
      // Check for time overlap with buffer
      const bufferMinutes = 15; // 15-minute buffer between events
      const itemStartWithBuffer = new Date(item.startTime.getTime() - bufferMinutes * 60000);
      const itemEndWithBuffer = new Date(item.endTime.getTime() + bufferMinutes * 60000);

      const existingItemStartWithBuffer = new Date(existingItem.startTime.getTime() - bufferMinutes * 60000);
      const existingItemEndWithBuffer = new Date(existingItem.endTime.getTime() + bufferMinutes * 60000);

      if (
        (itemStartWithBuffer < existingItemEndWithBuffer && itemEndWithBuffer > existingItemStartWithBuffer)
      ) {
        // Check distances between locations if both items have places
        if (item.place && existingItem.place && item.place.location && existingItem.place.location) {
          // Calculate travel time based on distance
          const distance = haversine(
            item.place.location.latitude,
            item.place.location.longitude,
            existingItem.place.location.latitude,
            existingItem.place.location.longitude
          );

          // If places are very close (less than 1km), we can be more lenient with timing
          if (distance < 1) {
            // If very close, only consider it a conflict if the actual times overlap
            if (item.startTime < existingItem.endTime && item.endTime > existingItem.startTime) {
              return true;
            }
          } else {
            // For places further apart, maintain the buffer
            return true;
          }
        } else {
          // If we don't have location data, be conservative
          return true;
        }
      }
    }
    return false;
  }

  // Add a new method to print day schedule for debugging
  printSchedule(): void {
    console.log(`Schedule for ${this.formattedDate}:`);

    // Sort items by start time
    const sortedItems = [...this.items].sort((a, b) =>
      a.startTime.getTime() - b.startTime.getTime()
    );

    for (const item of sortedItems) {
      console.log(`${item.formattedStartTime} - ${item.formattedEndTime}: ${item.description}`);
    }

    console.log("Free time blocks:");
    const freeBlocks = this.getFreeTimeBlocks(
      new Date(this.date.setHours(8, 0, 0, 0)),
      new Date(this.date.setHours(22, 0, 0, 0))
    );

    for (const block of freeBlocks) {
      const start = block.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const end = block.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const duration = (block.endTime.getTime() - block.startTime.getTime()) / (1000 * 60);

      if (duration >= 30) { // Only show blocks longer than 30 minutes
        console.log(`${start} - ${end} (${duration} minutes free)`);
      }
    }
  }

  getFreeTimeBlocks(dayStart: Date, dayEnd: Date): TimeWindow[] {
    const freeBlocks: TimeWindow[] = [];

    // Sort items by start time
    const sortedItems = [...this.items].sort((a, b) =>
      a.startTime.getTime() - b.startTime.getTime()
    );

    let currentTime = new Date(dayStart);

    for (const item of sortedItems) {
      if (item.startTime > currentTime) {
        freeBlocks.push({
          startTime: new Date(currentTime),
          endTime: new Date(item.startTime)
        });
      }
      currentTime = new Date(Math.max(currentTime.getTime(), item.endTime.getTime()));
    }

    // Add final block if needed
    if (currentTime < dayEnd) {
      freeBlocks.push({
        startTime: new Date(currentTime),
        endTime: new Date(dayEnd)
      });
    }

    return freeBlocks;
  }
}

class Itinerary {
  id: string;
  title: string;
  days: DayPlan[];
  hotel: Hotel;
  vehicle?: Vehicle;
  totalParticipants: number;

  constructor(title: string, hotel: Hotel, totalParticipants: number, vehicle?: Vehicle) {
    this.id = uuid.v4();
    this.title = title;
    this.days = [];
    this.hotel = hotel;
    this.vehicle = vehicle;
    this.totalParticipants = totalParticipants;
  }

  get totalCost(): number {
    // Sum all day costs
    const dayCosts = this.days.reduce((sum, day) => sum + day.totalCost, 0);

    // Add hotel costs
    const numNights = this.days.length - 1; // Assuming consecutive days
    const hotelCost = this.hotel.nightlyRate * numNights * Math.ceil(this.totalParticipants / 2); // Assuming double occupancy

    // Add vehicle costs if applicable
    let vehicleCost = 0;
    if (this.vehicle) {
      vehicleCost = this.vehicle.totalDailyRate * this.days.length;
    }

    return dayCosts + hotelCost + vehicleCost;
  }

  get startDate(): Date {
    return this.days.length > 0
      ? new Date(Math.min(...this.days.map(day => day.date.getTime())))
      : new Date();
  }

  get endDate(): Date {
    return this.days.length > 0
      ? new Date(Math.max(...this.days.map(day => day.date.getTime())))
      : new Date();
  }

  get formattedTotalCost(): string {
    return formatCurrency(this.totalCost);
  }

  addDay(day: DayPlan): void {
    this.days.push(day);
    // Sort days by date
    this.days.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  toJSON(): any {
    return {
      id: this.id,
      title: this.title,
      totalParticipants: this.totalParticipants,
      startDate: this.startDate.toISOString(),
      endDate: this.endDate.toISOString(),
      hotel: {
        name: this.hotel.name,
        rating: this.hotel.hotelRating,
        address: `${this.hotel.address.street}, ${this.hotel.address.city}, ${this.hotel.address.country}`,
        nightlyRate: this.hotel.nightlyRate
      },
      days: this.days.map(day => ({
        date: day.date.toISOString(),
        formattedDate: day.formattedDate,
        items: day.items.map(item => ({
          type: item.type,
          startTime: item.formattedStartTime,
          endTime: item.formattedEndTime,
          description: item.description,
          location: item.place.name,
          address: `${item.place.address.street}, ${item.place.address.city}`,
          cost: item.cost,
          formattedCost: item.formattedCost,
          notes: item.notes
        })),
        totalCost: day.totalCost
      })),
      vehicle: this.vehicle ? {
        type: this.vehicle.vehicleType,
        withDriver: this.vehicle.withDriver,
        dailyRate: this.vehicle.totalDailyRate
      } : undefined,
      totalCost: this.totalCost,
      formattedTotalCost: this.formattedTotalCost
    };
  }

  generatePDF(): Buffer {
    return generatePDF(this.toJSON());
  }

  generateExcel(): Buffer {
    return generateExcel(this.toJSON());
  }
}

interface BusinessTravelPreferences {
  // Step 1: Number of Participants
  numParticipants: number;

  // Step 2: Destination
  destinationCity: string;

  // Step 3: Duration
  startDate: Date;
  endDate: Date;

  // Step 4: Hotel Preferences
  hotelRating: HotelRating;

  // Step 5: Transportation Preferences
  needVehicle: boolean;
  vehicleType?: VehicleType;
  withDriver?: boolean;

  // Step 6: Meal Preferences
  cuisinePreferences: CuisineType[];
  dietaryRestrictions: DietaryRestriction[];

  // Step 7: Entertainment Preferences
  includeEntertainment: boolean;
  entertainmentPreferences: EntertainmentType[];

  // Step 7.5: Attraction Preferences
  includeAttractions: boolean;
  attractionPreferences: AttractionType[];
  maxAttractionsPerDay: number;

  // Step 8: Business Space
  needBusinessSpace: boolean;
  businessSpaceType?: BusinessSpaceType;

  // Step 9: Budget
  budgetRange: BudgetRange;
  customBudget?: number;

  // Step 10: Additional Requests
  additionalRequests: string;

  // Schedule preferences
  dayStartTime?: Date;
  dayEndTime?: Date;
}

// Google Places API Integration Functions
async function findHotels(city: string, stars: number): Promise<GooglePlace[]> {
  try {
    const data = await places.places.searchText({
      fields,
      requestBody: {
        textQuery: `${stars} stars hotel in ${city}`,
        maxResultCount: 5,
      },
    });
    return data.data.places as GooglePlace[];
  } catch (error) {
    console.error('Error finding hotels:', error);
    return [];
  }
}

async function findAttractions(
  city: string,
  attractionType: string,
  count: number = 3
): Promise<GooglePlace[]> {
  try {
    const data = await places.places.searchText({
      fields,
      requestBody: {
        textQuery: `${attractionType} attraction in ${city}`,
        maxResultCount: count,
      },
    });
    return data.data.places as GooglePlace[];
  } catch (error) {
    console.error('Error finding attractions:', error);
    return [];
  }
}

async function findRestaurants(city: string, cuisine: string, count: number = 3): Promise<GooglePlace[]> {
  try {
    const data = await places.places.searchText({
      fields,
      requestBody: {
        textQuery: `${cuisine} restaurants in ${city}`,
        maxResultCount: count,
      },
    });
    return data.data.places as GooglePlace[];
  } catch (error) {
    console.error('Error finding restaurants:', error);
    return [];
  }
}

async function findNightlife(city: string, type: string, count: number = 3): Promise<GooglePlace[]> {
  try {
    const data = await places.places.searchText({
      fields,
      requestBody: {
        textQuery: `${type} in ${city}`,
        maxResultCount: count,
      },
    });
    return data.data.places as GooglePlace[];
  } catch (error) {
    console.error('Error finding nightlife venues:', error);
    return [];
  }
}

async function findMeetingVenues(city: string, type: string, count: number = 3): Promise<GooglePlace[]> {
  try {
    const data = await places.places.searchText({
      fields,
      requestBody: {
        textQuery: `${type} in ${city}`,
        maxResultCount: count,
      },
    });
    return data.data.places as GooglePlace[];
  } catch (error) {
    console.error('Error finding meeting venues:', error);
    return [];
  }
}

async function findTopRatedPlaces(city: string, type: string, minRating: number = 4.0, count: number = 3): Promise<GooglePlace[]> {
  try {
    const data = await places.places.searchText({
      fields,
      requestBody: {
        textQuery: `${type} in ${city}`,
        maxResultCount: count * 2, // Fetch more to filter by rating
      },
    });

    let placesData = data.data.places as GooglePlace[];

    // Filter by rating and sort by highest rating
    placesData = placesData
      .filter(place => place.rating && place.rating >= minRating)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, count);

    return placesData;
  } catch (error) {
    console.error(`Error finding top-rated ${type}:`, error);
    return [];
  }
}

// Business Itinerary Planner Class
class BusinessItineraryPlanner {
  preferences: BusinessTravelPreferences;
  hotels: Hotel[] = [];
  restaurants: Restaurant[] = [];
  businessVenues: BusinessVenue[] = [];
  entertainmentVenues: EntertainmentVenue[] = [];
  vehicles: Vehicle[] = [];
  scheduledMeetings: BusinessMeeting[] = [];
  attractions: Attraction[] = [];
  constructor(preferences: BusinessTravelPreferences) {
    this.preferences = preferences;

    // Initialize vehicles (these don't come from Google Places API)
    this.initializeVehicles();
  }

  private initializeVehicles(): void {
    // Create vehicles of each type
    const vehicleTypes = Object.values(VehicleType);
    for (const type of vehicleTypes) {
      this.vehicles.push(new Vehicle(type, true));  // with driver
      this.vehicles.push(new Vehicle(type, false)); // without driver
    }
  }




  async loadData(): Promise<void> {
    // Load hotels
    const hotelStars = this.preferences.hotelRating === HotelRating.FOUR_STAR ? 4 : 5;
    const googleHotels = await findTopRatedPlaces(
      this.preferences.destinationCity,
      `${hotelStars} stars hotel`,
      4.0,
      5
    );

    for (const googleHotel of googleHotels) {
      this.hotels.push(new Hotel(googleHotel, this.preferences.hotelRating));
    }

    // Load restaurants based on cuisine preferences
    for (const cuisine of this.preferences.cuisinePreferences) {
      const googleRestaurants = await findRestaurants(
        this.preferences.destinationCity,
        cuisine.toString(),
        2 // 2 restaurants per cuisine type
      );

      for (const googleRestaurant of googleRestaurants) {
        this.restaurants.push(new Restaurant(googleRestaurant, cuisine));
      }
    }

    // Load business venues if needed
    if (this.preferences.needBusinessSpace && this.preferences.businessSpaceType) {
      const googleBusinessVenues = await findMeetingVenues(
        this.preferences.destinationCity,
        this.preferences.businessSpaceType.toString(),
        3
      );

      for (const googleVenue of googleBusinessVenues) {
        this.businessVenues.push(new BusinessVenue(googleVenue, this.preferences.businessSpaceType));
      }
    }

    // Load entertainment venues if needed
    if (this.preferences.includeEntertainment) {
      for (const entertainment of this.preferences.entertainmentPreferences) {
        const googleEntertainmentVenues = await findNightlife(
          this.preferences.destinationCity,
          entertainment.toString(),
          2
        );

        for (const googleVenue of googleEntertainmentVenues) {
          this.entertainmentVenues.push(new EntertainmentVenue(googleVenue, entertainment));
        }
      }
    }

    // Load attractions if needed
    if (this.preferences.includeAttractions) {
      for (const attractionType of this.preferences.attractionPreferences) {
        const googleAttractions = await findAttractions(
          this.preferences.destinationCity,
          attractionType.toString(),
          16 // 2 attractions per type
        );

        for (const googleAttraction of googleAttractions) {
          this.attractions.push(new Attraction(googleAttraction, attractionType));
        }
      }
    }
  }

  selectHotel(): Hotel {
    // Filter by rating first
    let matchingHotels = this.hotels.filter(h => h.hotelRating === this.preferences.hotelRating);

    if (matchingHotels.length === 0) {
      // Fallback to any hotel
      matchingHotels = this.hotels;

      if (matchingHotels.length === 0) {
        throw new Error(`No hotels found in ${this.preferences.destinationCity}`);
      }
    }

    // If we have business venues, prioritize hotels closer to them
    if (this.businessVenues.length > 0 && this.scheduledMeetings.length > 0) {
      // Find the most common meeting venue
      const meetingLocations: Record<string, number> = {};
      for (const meeting of this.scheduledMeetings) {
        const locId = meeting.venue.id;
        meetingLocations[locId] = (meetingLocations[locId] || 0) + 1;
      }

      const mostCommonVenueId = Object.entries(meetingLocations)
        .sort((a, b) => b[1] - a[1])[0][0];

      const mostCommonVenue = this.businessVenues.find(v => v.id === mostCommonVenueId)
        || this.businessVenues[0];

      // Sort hotels by distance to this venue
      matchingHotels.sort((a, b) =>
        a.distanceTo(mostCommonVenue) - b.distanceTo(mostCommonVenue)
      );

      return matchingHotels[0];
    }

    // If no specific criteria, pick the highest-rated hotel
    matchingHotels.sort((a, b) =>
      (b.rating || 0) - (a.rating || 0)
    );

    return matchingHotels[0];
  }

  selectVehicle(): Vehicle | undefined {
    if (!this.preferences.needVehicle || !this.preferences.vehicleType) {
      return undefined;
    }

    let matchingVehicles = this.vehicles.filter(v =>
      v.vehicleType === this.preferences.vehicleType &&
      v.withDriver === this.preferences.withDriver &&
      v.capacity >= this.preferences.numParticipants
    );

    if (matchingVehicles.length === 0) {
      // Fallback to any matching vehicle type
      matchingVehicles = this.vehicles.filter(v =>
        v.vehicleType === this.preferences.vehicleType &&
        v.capacity >= this.preferences.numParticipants
      );

      if (matchingVehicles.length === 0) {
        // Fallback to any vehicle with sufficient capacity
        matchingVehicles = this.vehicles.filter(v =>
          v.capacity >= this.preferences.numParticipants
        );

        if (matchingVehicles.length === 0) {
          return undefined;
        }
      }
    }

    // Pick the most cost-effective option
    matchingVehicles.sort((a, b) => a.totalDailyRate - b.totalDailyRate);
    return matchingVehicles[0];
  }

  selectRestaurant(
    mealTime: string,
    mealDateTime: Date,
    previousSelections: string[] = []
  ): Restaurant | undefined {
    // Filter restaurants by cuisine preferences and dietary restrictions
    let matchingRestaurants = this.restaurants.filter(restaurant => {
      // Skip if already selected (avoid duplicates)
      if (previousSelections.includes(restaurant.id)) {
        return false;
      }

      // Check if open at meal time
      if (!restaurant.isOpenAt(mealDateTime)) {
        return false;
      }

      // Check if matches cuisine preferences
      let hasMatchingCuisine = false;
      if (this.preferences.cuisinePreferences.length === 0) {
        hasMatchingCuisine = true;
      } else {
        for (const cuisine of restaurant.cuisineTypes) {
          if (this.preferences.cuisinePreferences.includes(cuisine)) {
            hasMatchingCuisine = true;
            break;
          }
        }
      }

      if (!hasMatchingCuisine) {
        return false;
      }

      // Check dietary restrictions
      for (const diet of this.preferences.dietaryRestrictions) {
        if (!restaurant.dietaryOptions.includes(diet)) {
          return false;
        }
      }

      return true;
    });

    if (matchingRestaurants.length === 0) {
      // Fallback to any restaurant that's open
      matchingRestaurants = this.restaurants.filter(r =>
        !previousSelections.includes(r.id) &&
        r.isOpenAt(mealDateTime)
      );

      if (matchingRestaurants.length === 0) {
        // As a last resort, pick any restaurant
        matchingRestaurants = this.restaurants.filter(r =>
          !previousSelections.includes(r.id)
        );

        if (matchingRestaurants.length === 0) {
          return undefined;
        }
      }
    }

    // Prioritize by rating and price level
    // For business travelers, prioritize higher-end options
    matchingRestaurants.sort((a, b) =>
      ((b.rating || 0) * 2 + b.priceLevel) - ((a.rating || 0) * 2 + a.priceLevel)
    );

    return matchingRestaurants[0];
  }

  selectEntertainmentVenue(
    eveningDateTime: Date,
    previousSelections: string[] = []
  ): EntertainmentVenue | undefined {
    if (!this.preferences.includeEntertainment) {
      return undefined;
    }

    // Filter venues by preferences
    let matchingVenues = this.entertainmentVenues.filter(venue => {
      // Skip if already selected
      if (previousSelections.includes(venue.id)) {
        return false;
      }

      // Check if open
      if (!venue.isOpenAt(eveningDateTime)) {
        return false;
      }

      // Check if matches preferences
      if (this.preferences.entertainmentPreferences.length > 0) {
        if (!this.preferences.entertainmentPreferences.includes(venue.venueType)) {
          return false;
        }
      }

      return true;
    });

    if (matchingVenues.length === 0) {
      // Fallback to any venue that's open
      matchingVenues = this.entertainmentVenues.filter(v =>
        !previousSelections.includes(v.id) &&
        v.isOpenAt(eveningDateTime)
      );

      if (matchingVenues.length === 0) {
        return undefined;
      }
    }

    // Sort by rating (prefer higher rated)
    matchingVenues.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return matchingVenues[0];
  }

  createBusinessMeeting(
    title: string,
    participants: string[],
    date: Date,
    durationMinutes: number = 90
  ): BusinessMeeting | undefined {
    if (!this.preferences.needBusinessSpace || !this.preferences.businessSpaceType || this.businessVenues.length === 0) {
      return undefined;
    }

    // Find an available business venue
    // Default meeting time at 10:00 AM
    const meetingDate = new Date(date);
    meetingDate.setHours(10, 0, 0, 0);

    // Try different time slots if needed - now with more business-appropriate hours
    const possibleStartTimes = [9, 10, 11, 14, 15, 16];

    for (const startHour of possibleStartTimes) {
      meetingDate.setHours(startHour, 0, 0, 0);
      const endTime = new Date(meetingDate.getTime() + durationMinutes * 60000);

      for (const venue of this.businessVenues) {
        if (venue.isAvailableAt(meetingDate, durationMinutes)) {
          return new BusinessMeeting(
            title,
            venue,
            meetingDate,
            endTime,
            participants
          );
        }
      }
    }

    // If all slots are unavailable, use the first venue anyway with the first time slot
    // In a real system, you might want to handle this differently
    meetingDate.setHours(possibleStartTimes[0], 0, 0, 0);
    const endTime = new Date(meetingDate.getTime() + durationMinutes * 60000);

    return new BusinessMeeting(
      title,
      this.businessVenues[0],
      meetingDate,
      endTime,
      participants
    );
  }



  // Enhanced selectAttraction method to ensure variety across days
  selectAttraction(
    timeSlot: Date,
    previousSelections: string[] = [],
    globalSelections: string[] = [] // New parameter to track selections across all days
  ): Attraction | undefined {
    if (!this.preferences.includeAttractions || this.attractions.length === 0) {
      return undefined;
    }

    // Filter attractions by preferences
    let matchingAttractions = this.attractions.filter(attraction => {
      // Skip if already selected (either on this day or any previous day)
      if (previousSelections.includes(attraction.id) || globalSelections.includes(attraction.id)) {
        return false;
      }

      // Check if open at the given time
      if (!attraction.isOpenAt(timeSlot)) {
        return false;
      }

      // Check if matches preferences
      if (this.preferences.attractionPreferences.length > 0) {
        return this.preferences.attractionPreferences.includes(attraction.attractionType);
      }

      return true;
    });

    if (matchingAttractions.length === 0) {
      // If no fresh attractions match, try with just the day's selections (allow repeats across days)
      matchingAttractions = this.attractions.filter(a =>
        !previousSelections.includes(a.id) &&
        a.isOpenAt(timeSlot)
      );

      if (matchingAttractions.length === 0) {
        return undefined;
      }
    }

    // Prioritize attractions by rating and type variety
    matchingAttractions.sort((a, b) => {
      // First prioritize by rating
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;

      // If ratings are the same, prioritize attractions with shorter durations
      // to help fit more into the schedule
      return a.recommendedVisitDuration - b.recommendedVisitDuration;
    });

    return matchingAttractions[0];
  }

  // Modified createDayPlan method to use globalAttractionSelections
  createDayPlan(
    date: Date,
    meetings: BusinessMeeting[] = [],
    restaurantSelections: string[] = [],
    entertainmentSelections: string[] = [],
    globalAttractionSelections: string[] = [] // New parameter
  ): DayPlan {
    const dayPlan = new DayPlan(date);
    const attractionSelections: string[] = [];

    // Add all standard items as before...

    // Improved attraction scheduling algorithm
    if (this.preferences.includeAttractions) {
      // Define multiple time slots for attractions throughout the day
      const attractionTimeSlots = [
        { startHour: 9, startMin: 0 },    // Early morning
        { startHour: 10, startMin: 30 },  // Late morning
        { startHour: 14, startMin: 0 },   // Early afternoon
        { startHour: 15, startMin: 30 }   // Late afternoon
      ];

      // Try to schedule up to the maximum number of attractions per day
      let attractionsAdded = 0;

      for (const slot of attractionTimeSlots) {
        if (attractionsAdded >= this.preferences.maxAttractionsPerDay) {
          break;
        }

        const timeSlot = new Date(date);
        timeSlot.setHours(slot.startHour, slot.startMin, 0, 0);

        // Find suitable attraction, passing both day-specific and global selections
        const attraction = this.selectAttraction(
          timeSlot,
          [...attractionSelections],
          globalAttractionSelections
        );

        if (attraction) {
          const startTime = new Date(timeSlot);
          // Use the actual recommended duration from the attraction
          const endTime = new Date(startTime.getTime() + attraction.recommendedVisitDuration * 60000);

          // Create temporary item to check for conflicts
          const tempItem = new ItineraryItem(
            ItemType.ATTRACTION,
            startTime,
            endTime,
            {} as Place,
            "",
            0
          );

          if (!dayPlan.hasConflict(tempItem)) {
            // Add the attraction to selections to avoid duplicates
            attractionSelections.push(attraction.id);

            // Also add to global selections to prevent repeats across days
            globalAttractionSelections.push(attraction.id);

            // Create the attraction item
            const attractionItem = new ItineraryItem(
              ItemType.ATTRACTION,
              startTime,
              endTime,
              attraction,
              `Visit ${attraction.name}`,
              attraction.entranceFee * this.preferences.numParticipants,
              `Type: ${attraction.attractionType}, Recommended duration: ${attraction.recommendedVisitDuration / 60} hour(s)`
            );

            attractionItem.attraction = attraction;
            dayPlan.addItem(attractionItem);
            attractionsAdded++;
          }
        }
      }

      console.log(`Scheduled ${attractionsAdded} attractions for ${date.toDateString()}`);
    }

    return dayPlan;
  }

  // Modified createItinerary method to use globalAttractionSelections
  async createItinerary(): Promise<Itinerary> {
    // Load all required data first
    await this.loadData();

    // Select hotel and vehicle
    const selectedHotel = this.selectHotel();
    const selectedVehicle = this.selectVehicle();

    // Create the itinerary object
    const itinerary = new Itinerary(
      `Business Trip to ${this.preferences.destinationCity}`,
      selectedHotel,
      this.preferences.numParticipants,
      selectedVehicle
    );

    // Create one business meeting per day if needed (except last day)
    const meetings: BusinessMeeting[] = [];
    if (this.preferences.needBusinessSpace) {
      // Create meetings as before...
    }

    // Create day plans for each date in the range
    const restaurantSelections: string[] = [];
    const entertainmentSelections: string[] = [];
    const globalAttractionSelections: string[] = []; // New array to track attractions across all days

    const dateIterator = new Date(this.preferences.startDate);
    const endDate = new Date(this.preferences.endDate);

    while (dateIterator <= endDate) {
      const dayPlan = this.createDayPlan(
        new Date(dateIterator), // Clone the date
        meetings,
        restaurantSelections,
        entertainmentSelections,
        globalAttractionSelections // Pass the global selections
      );

      itinerary.addDay(dayPlan);

      // Move to next day
      dateIterator.setDate(dateIterator.getDate() + 1);
    }

    // Update hotel references in all hotel items
    for (const day of itinerary.days) {
      for (const item of day.items) {
        if (item.type === ItemType.HOTEL) {
          item.place = selectedHotel;
          item.hotel = selectedHotel;
        }
      }
    }

    return itinerary;
  }
}

// Export function to create an itinerary from user input
export async function createBusinessItinerary(userInput: any): Promise<any> {
  try {
    // Parse user input
    const preferences: BusinessTravelPreferences = {

      // Step 1: Number of Participants
      numParticipants: parseInt(userInput.num_participants || '1', 10),

      // Step 2: Destination
      destinationCity: userInput.destination || 'Jakarta',

      // Step 3: Duration
      startDate: userInput.start_date ? new Date(userInput.start_date) : new Date(),
      endDate: userInput.end_date ? new Date(userInput.end_date) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),

      // Step 4: Hotel Preferences
      hotelRating: userInput.hotel_rating === '4-Star' ? HotelRating.FOUR_STAR : HotelRating.FIVE_STAR,

      // Step 5: Transportation Preferences
      needVehicle: userInput.need_vehicle === 'Yes',
      vehicleType: userInput.vehicle_type ? VehicleType[userInput.vehicle_type.toUpperCase().replace(/\s+/g, '_') as keyof typeof VehicleType] : undefined,
      withDriver: userInput.with_driver === 'Yes',

      // Step 6: Meal Preferences
      cuisinePreferences: (userInput.cuisine_preferences || ['Local Indonesian']).map((cuisine: string) => {
        const key = cuisine.toUpperCase().replace(/\s+/g, '_') as keyof typeof CuisineType;
        return CuisineType[key] || CuisineType.LOCAL_INDONESIAN;
      }),
      dietaryRestrictions: (userInput.dietary_restrictions || ['Halal']).map((restriction: string) => {
        const key = restriction.toUpperCase().replace(/\s+/g, '_') as keyof typeof DietaryRestriction;
        return DietaryRestriction[key] || DietaryRestriction.HALAL;
      }),

      // Step 7: Entertainment Preferences
      includeEntertainment: userInput.include_entertainment === 'Yes',
      entertainmentPreferences: (userInput.entertainment_preferences || ['Rooftop Bar']).map((ent: string) => {
        const key = ent.toUpperCase().replace(/\s+/g, '_') as keyof typeof EntertainmentType;
        return EntertainmentType[key] || EntertainmentType.ROOFTOP_BAR;
      }),

      // Step 7.5: Attraction Preferences
      includeAttractions: userInput.include_attractions === 'Yes',
      attractionPreferences: (userInput.attraction_preferences || ['Museum', 'Historical Site']).map((attr: string) => {
        const key = attr.toUpperCase().replace(/\s+/g, '_') as keyof typeof AttractionType;
        return AttractionType[key] || AttractionType.MUSEUM;
      }),
      maxAttractionsPerDay: parseInt(userInput.max_attractions_per_day || '2', 10),

      // Step 8: Business Space
      needBusinessSpace: userInput.need_business_space === 'Yes',
      businessSpaceType: userInput.business_space_type ?
        BusinessSpaceType[userInput.business_space_type.toUpperCase().replace(/\s+/g, '_') as keyof typeof BusinessSpaceType] :
        undefined,

      // Step 9: Budget
      budgetRange: BudgetRange.RANGE_7_5K_10K,
      customBudget: userInput.custom_budget ? parseFloat(userInput.custom_budget) : undefined,

      // Step 10: Additional Requests
      additionalRequests: userInput.additional_requests || '',
    };

    // Create the planner and generate itinerary
    const planner = new BusinessItineraryPlanner(preferences);
    const itinerary = await planner.createItinerary();

    // Return the itinerary data
    return itinerary.toJSON();
  } catch (error) {
    console.error('Error creating itinerary:', error);
    throw error;
  }
}
// Test case for the improved itinerary planning system
const userInput: Record<string, any> = {
  num_participants: '3',
  destination: 'Bali, Indonesia',
  start_date: '2025-03-07',
  end_date: '2025-03-10',
  hotel_rating: '5-Star',
  need_vehicle: 'Yes',
  vehicle_type: 'Mercedes-Benz S-Class',
  with_driver: 'Yes',
  cuisine_preferences: ['Local Indonesian', 'Seafood'],
  dietary_restrictions: ['Halal'],
  include_entertainment: 'Yes',
  entertainment_preferences: ['Rooftop Bar'],
  need_business_space: 'Yes',
  business_space_type: 'Hotel Meeting Room',
  include_attractions: 'Yes',
  // Additional attraction types for a more comprehensive itinerary
  attraction_preferences: ['Temple', 'Beach', 'Museum', 'Cultural Venue', 'Market', 'Nature Spot'],
  max_attractions_per_day: '10', // Increased to 4 attractions per day
  additional_requests: 'All venues should be within 15 minutes of the hotel if possible.',
};

// Parse preferences for the business itinerary planner
function parsePreferences(input: Record<string, any>): BusinessTravelPreferences {
  return {
    numParticipants: parseInt(input.num_participants || '1', 10),
    destinationCity: input.destination || 'Jakarta',
    startDate: input.start_date ? new Date(input.start_date) : new Date(),
    endDate: input.end_date ? new Date(input.end_date) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    hotelRating: input.hotel_rating === '4-Star' ? HotelRating.FOUR_STAR : HotelRating.FIVE_STAR,
    needVehicle: input.need_vehicle === 'Yes',
    vehicleType: input.vehicle_type ?
      VehicleType[input.vehicle_type.toUpperCase().replace(/\s+/g, '_') as keyof typeof VehicleType] :
      undefined,
    withDriver: input.with_driver === 'Yes',
    cuisinePreferences: (input.cuisine_preferences || ['Local Indonesian']).map((cuisine: string) => {
      const key = cuisine.toUpperCase().replace(/\s+/g, '_') as keyof typeof CuisineType;
      return CuisineType[key] || CuisineType.LOCAL_INDONESIAN;
    }),
    dietaryRestrictions: (input.dietary_restrictions || ['Halal']).map((restriction: string) => {
      const key = restriction.toUpperCase().replace(/\s+/g, '_') as keyof typeof DietaryRestriction;
      return DietaryRestriction[key] || DietaryRestriction.HALAL;
    }),
    includeEntertainment: input.include_entertainment === 'Yes',
    entertainmentPreferences: (input.entertainment_preferences || ['Rooftop Bar']).map((ent: string) => {
      const key = ent.toUpperCase().replace(/\s+/g, '_') as keyof typeof EntertainmentType;
      return EntertainmentType[key] || EntertainmentType.ROOFTOP_BAR;
    }),
    includeAttractions: input.include_attractions === 'Yes',
    attractionPreferences: (input.attraction_preferences || ['Museum', 'Historical Site']).map((attr: string) => {
      const key = attr.toUpperCase().replace(/\s+/g, '_') as keyof typeof AttractionType;
      return AttractionType[key] || AttractionType.MUSEUM;
    }),
    maxAttractionsPerDay: parseInt(input.max_attractions_per_day || '3', 10),
    needBusinessSpace: input.need_business_space === 'Yes',
    businessSpaceType: input.business_space_type ?
      BusinessSpaceType[input.business_space_type.toUpperCase().replace(/\s+/g, '_') as keyof typeof BusinessSpaceType] :
      undefined,
    budgetRange: BudgetRange.RANGE_7_5K_10K,
    customBudget: input.custom_budget ? parseFloat(input.custom_budget) : undefined,
    additionalRequests: input.additional_requests || '',
  };
}

// Main function to generate the enhanced itinerary
async function generateEnhancedItinerary() {
  try {
    console.log("--------------------------------------------------");
    console.log("Generating Enhanced Business Itinerary");
    console.log("--------------------------------------------------");
    console.log(`Destination: ${userInput.destination}`);
    console.log(`Dates: ${userInput.start_date} to ${userInput.end_date}`);
    console.log(`Max Attractions Per Day: ${userInput.max_attractions_per_day}`);
    console.log("--------------------------------------------------");

    // Create the planner with parsed preferences
    const preferences = parsePreferences(userInput);
    const planner = new BusinessItineraryPlanner(preferences);

    // Load data
    console.log("Loading destination data...");
    await planner.loadData();

    // Generate the itinerary
    console.log("Generating comprehensive itinerary...");
    const itinerary = await planner.createItinerary();

    // Print detailed information for each day
    console.log("\n===== ITINERARY DETAILS =====");
    for (const day of itinerary.days) {
      console.log(`\n--- ${day.formattedDate} ---`);

      // Sort items by start time
      const sortedItems = [...day.items].sort((a, b) =>
        a.startTime.getTime() - b.startTime.getTime()
      );

      for (const item of sortedItems) {
        console.log(`${item.formattedStartTime} - ${item.formattedEndTime}: ${item.description}`);
        console.log(`  Location: ${item.place.name}`);
        if (item.notes) console.log(`  Notes: ${item.notes}`);
        if (item.cost > 0) console.log(`  Cost: ${item.formattedCost}`);
      }

      console.log(`  Total activities: ${day.items.length}`);
      console.log(`  Daily cost: ${day.totalCost}`);
    }

    // Print summary
    console.log("\n===== ITINERARY SUMMARY =====");
    console.log(`Total Days: ${itinerary.days.length}`);

    // Count activities by type
    const activityCounts: Record<string, number> = {};
    let totalActivities = 0;

    for (const day of itinerary.days) {
      for (const item of day.items) {
        activityCounts[item.type] = (activityCounts[item.type] || 0) + 1;
        totalActivities++;
      }
    }

    console.log(`Total Activities: ${totalActivities}`);
    console.log("Activity breakdown:");

    for (const [type, count] of Object.entries(activityCounts)) {
      console.log(`  ${type}: ${count}`);
    }

    console.log(`Total Cost: ${itinerary.formattedTotalCost}`);
    console.log("--------------------------------------------------");

    return itinerary.toJSON();
  } catch (error) {
    console.error("Error generating itinerary:", error);
    throw error;
  }
}

// Run the generator
// generateEnhancedItinerary()
//   .then(result => {
//     console.log("Itinerary generation complete!");
//   })
//   .catch(err => console.error("Failed to generate itinerary:", err));

// import { Client, TravelMode } from "@googlemaps/google-maps-services-js";

// const client = new Client({});



// const route = [
//   { origin: "Paris CDG Airport", destination: "31 Av. George V, 75008 Paris, France" },
//   { origin: "31 Av. George V, 75008 Paris, France", destination: "Av. Gustave Eiffel, 75007 Paris, France" },
//   { origin: "Av. Gustave Eiffel, 75007 Paris, France", destination: "Tuileries Garden, 75001 Paris, France" },
//   { origin: "Tuileries Garden, 75001 Paris, France", destination: "Le Confidentiel, 75001 Paris, France" }
// ];

// for (const { origin, destination } of route) {

//   client
//     .distancematrix({
//       params: {
//         origins: [origin],
//         destinations: [destination],
//         mode: TravelMode.driving,
//         key: process.env.GOOGLE_API_KEY!
//       },
//       timeout: 1000, // milliseconds
//     })
//     .then((r) => {
//       console.log(JSON.stringify(r.data));
//     })
//     .catch((e) => {
//       console.log(e.response.data.error_message);
//     });
// }



findHotels("paris", 5).then((r) => {
  writeFileSync('r.json', JSON.stringify(r))
})