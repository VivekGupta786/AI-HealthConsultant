// Google Places API configuration
export const GOOGLE_PLACES_API_CONFIG = {
  apiKey: process.env.GOOGLE_PLACES_API_KEY || 'AIzaSyBPN7RRVsLqmooD6udddU3y9rqmdnmGK7w',
  searchRadius: 5000,
  placeType: 'doctor',
  fields: ['name', 'formatted_address', 'formatted_phone_number', 'rating', 'opening_hours', 'geometry', 'place_id'],
  region: 'in',
  language: 'en',
  rankby: 'distance'
};