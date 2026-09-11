// Offer/segment shapes are the normalized Travelport response
// (flight-service's /flights/search) - loosely typed since the service
// itself is untyped JS with no response contract to check against, same
// precedent as every other untyped-API-boundary page in this app.

export interface FlightSegmentOffer {
  sequence?: number;
  origin?: string;
  destination?: string;
  departureAt?: string;
  arrivalAt?: string;
  durationMinutes?: number;
  stops?: number;
  marketingCarrier?: string;
  flightNumber?: string;
}

export interface FlightOffer {
  offerId: string;
  airline?: string;
  airlineCode?: string;
  cabinClass?: string;
  refundable?: boolean;
  baseFare?: number;
  taxes?: number;
  fareTotal: number;
  currency?: string;
  /** Journey legs (Duffel slices): 2 for a round trip. Absent on providers that do not report it. */
  legCount?: number;
  /** Provider (Duffel) passenger ids, in the adults → children → infants order the forms are built in. */
  passengerIds?: string[];
  segments?: FlightSegmentOffer[];
}

export type TravelerType = 'adult' | 'child' | 'infant';

export interface TravelerForm {
  type: TravelerType;
  title: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  passportNumber: string;
  passportExpiry: string;
  nationality: string;
  frequentFlyerNumber: string;
  passengerId?: string;
}

export interface ContactForm {
  name: string;
  email: string;
  phone: string;
}

export type TripType = 'oneWay' | 'roundTrip';

/** The search that produced the displayed offers — what the traveler form and the booking are built from. */
export interface FlightSearchContext {
  origin: string;
  destination: string;
  tripType: TripType;
  adults: number;
  children: number;
  infants: number;
}

export interface SearchFormState {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  adults: number;
  children: number;
  infants: number;
  cabinClass: string;
}

// Real enum, flight-service's Prisma schema (FlightBookingStatus):
// quoted | pending | confirmed | ticketed | cancelled | failed
export type FlightBookingStatus = 'quoted' | 'pending' | 'confirmed' | 'ticketed' | 'cancelled' | 'failed';

export interface FlightBookingTraveler {
  title?: string;
  firstName?: string;
  lastName?: string;
  type?: TravelerType;
}

export interface FlightBookingRecord {
  id: string;
  pnr?: string;
  status: FlightBookingStatus | string;
  totalAmount?: number;
  currency?: string;
  segments?: FlightSegmentOffer[];
  travelers?: FlightBookingTraveler[];
}

export type BookingStep = 'results' | 'travelers' | 'review' | 'confirmation';

export type FlightTab = 'search' | 'bookings';
