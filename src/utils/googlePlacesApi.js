import { Client } from '@googlemaps/google-maps-services-js';
import { GOOGLE_PLACES_API_CONFIG } from '../config/googlePlaces';
import axios from 'axios';

const client = new Client({
  config: {
    adapter: axios.defaults.adapter
  }
});

export const findNearbyDoctors = async (latitude, longitude) => {
  try {
    console.log('Searching for nearby doctors at:', { latitude, longitude });
    const response = await client.placesNearby({
      params: {
        location: { lat: latitude, lng: longitude },
        type: GOOGLE_PLACES_API_CONFIG.placeType,
        key: GOOGLE_PLACES_API_CONFIG.apiKey,
        language: GOOGLE_PLACES_API_CONFIG.language,
        region: GOOGLE_PLACES_API_CONFIG.region,
        rankby: GOOGLE_PLACES_API_CONFIG.rankby,
      },
    });
    console.log('Places API Response status:', response.data.status);

    if (response.data.status === 'OK') {
      const places = response.data.results;
      console.log('Number of places found:', places.length);
      const detailedPlaces = await Promise.all(
        places.map(async (place) => {
          try {
            const detailsResponse = await client.placeDetails({
              params: {
                place_id: place.place_id,
                fields: GOOGLE_PLACES_API_CONFIG.fields,
                key: GOOGLE_PLACES_API_CONFIG.apiKey,
              },
            });

            if (detailsResponse.data.status === 'OK') {
              const details = detailsResponse.data.result;
              console.log('Successfully retrieved details for:', details.name);
              return {
                id: place.place_id,
                name: details.name,
                latitude: details.geometry.location.lat,
                longitude: details.geometry.location.lng,
                address: details.formatted_address,
                phone: details.formatted_phone_number,
                rating: details.rating,
                available: details.opening_hours?.open_now ?? false,
                type: 'hospital',
                emergency_service: false,
              };
            }
            return null;
          } catch (error) {
            console.error('Error fetching place details:', error);
            return null;
          }
        })
      );

      const filteredPlaces = detailedPlaces.filter(Boolean);
      console.log('Final number of doctors with details:', filteredPlaces.length);
      return filteredPlaces;
    }
    console.log('No places found in the area');
    return [];
  } catch (error) {
    console.error('Error finding nearby doctors:', error);
    throw error;
  }
};