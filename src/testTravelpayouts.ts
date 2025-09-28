import {
    find_hotels,
    find_top_rated_hotels,
    search_hotels,
    search_flights,
    find_car_rentals,
  } from "./config/travelpayouts";
  
  async function run() {
    console.log("=== 🏨 TEST HOTEL SEARCH (cache only) ===");
    const hotels = await find_hotels("Bali", 3);
    console.log("Hotels (raw cache):", hotels);
  
    console.log("\n=== 🏨 TEST HOTEL SEARCH (merged details) ===");
    const hotelsDetailed = await search_hotels("Bali", 3);
    console.log("Hotels (with lookup):", hotelsDetailed);
  
    console.log("\n=== ⭐ TEST TOP RATED HOTELS ===");
    const topHotels = await find_top_rated_hotels("Bali", 4, 3);
    console.log("Top Rated Hotels:", topHotels);
  
    console.log("\n=== ✈️ TEST FLIGHT SEARCH ===");
    const flights = await search_flights("CGK", "SIN", "2025-12-10");
    console.log("Flights:", flights);
  
    console.log("\n=== 🚗 TEST CAR RENTALS (ChatGPT dummy) ===");
    // param: city, count, days, currency
    const cars = await find_car_rentals("Jakarta", 3, 5, "USD");
    console.log("Cars:", cars);
  }
  
  run().catch((err) => {
    console.error("Test script failed:", err);
  });
  