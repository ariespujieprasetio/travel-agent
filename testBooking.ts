import { search_flights_booking } from "./src/config/bookingcom";

(async () => {
  const flights = await search_flights_booking("CGK", "DXB", "2025-09-25");
  console.log("Flights:", flights);
})();