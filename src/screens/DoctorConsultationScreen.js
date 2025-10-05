import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { Text } from '@rneui/themed';
import { findNearbyDoctors } from '../utils/googlePlacesApi';

const INITIAL_REGION = {
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.0122,
  longitudeDelta: 0.0121,
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const DoctorConsultationScreen = ({ navigation }) => {
  const mapRef = React.useRef(null);
  const [region, setRegion] = useState(INITIAL_REGION);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission denied', 'Location permission is required to find nearby doctors.');
          return;
        }

        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0122,
          longitudeDelta: 0.0121,
        };
        
        mapRef.current?.animateToRegion(newRegion, 1000);
        setRegion(newRegion);
        setUserLocation(location.coords);
        
        const nearbyDocs = await findNearbyDoctors(
          location.coords.latitude,
          location.coords.longitude
        );

        const docsWithDistance = nearbyDocs.map(doctor => ({
          ...doctor,
          distance: calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            doctor.latitude,
            doctor.longitude
          ),
          phone: doctor.phone || 'Not available'
        }));

        setSelectedDoctor(null);
        setDoctors(docsWithDistance);
      } catch (error) {
        console.error('Error fetching nearby doctors:', error);
        Alert.alert('Error', 'Failed to fetch nearby doctors. Please try again.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleMarkerPress = (doctor) => {
    setSelectedDoctor(doctor);
    mapRef.current?.animateToRegion({
      latitude: doctor.latitude,
      longitude: doctor.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 500);
  };

  const handleCallPress = (phoneNumber) => {
    if (phoneNumber && phoneNumber !== 'Not available') {
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert('Phone number not available');
    }
  };

  const handleDirectionsPress = (latitude, longitude) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
          {/* Modern Header - Fixed to not go under status bar */}
          <View style={styles.header}>
          {Platform.OS === 'android' && <StatusBar translucent backgroundColor="transparent" />}
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Nearby Doctors</Text>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons name="pill" size={24} color="#fff" />
            </View>
          </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Map Section with white background */}
        <View style={styles.sectionBackground}>
          <View style={styles.card}>
            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                style={styles.map}
                region={region}
                onRegionChangeComplete={setRegion}
                showsUserLocation
                showsMyLocationButton
                showsCompass
                rotateEnabled={false}
              >
                {doctors.map((doctor) => (
                  <Marker
                    key={doctor.id}
                    coordinate={{
                      latitude: doctor.latitude,
                      longitude: doctor.longitude,
                    }}
                    pinColor={doctor.available ? '#4CAF50' : '#f44336'}
                    onPress={() => handleMarkerPress(doctor)}
                  >
                    <Callout>
                      <View style={styles.calloutContainer}>
                        <Text style={styles.calloutTitle}>{doctor.name}</Text>
                        <Text style={styles.calloutText}>{doctor.specialty}</Text>
                        <View style={styles.calloutRow}>
                          <MaterialIcons name="star" size={16} color="#FFD700" />
                          <Text style={styles.calloutText}>{doctor.rating}</Text>
                        </View>
                        <View style={styles.calloutRow}>
                          <MaterialIcons name="phone" size={16} color="#2089dc" />
                          <Text style={styles.phoneNumber}>{doctor.phone}</Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.directionsButton}
                          onPress={() => handleDirectionsPress(doctor.latitude, doctor.longitude)}
                        >
                          <Text style={styles.directionsButtonText}>Get Directions</Text>
                        </TouchableOpacity>
                      </View>
                    </Callout>
                  </Marker>
                ))}
              </MapView>
            </View>
          </View>
        </View>

        {/* Doctors List with white background */}
        <View style={styles.sectionBackground}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby Specialists</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{doctors.length}</Text>
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color="#3A86FF" style={styles.loading} />
          ) : (
            doctors.map((doctor) => (
              <View 
                key={doctor.id}
                style={[
                  styles.doctorCard,
                  selectedDoctor?.id === doctor.id && styles.selectedCard
                ]}
              >
                <View style={styles.doctorInfoContainer}>
                  <View style={styles.avatarContainer}>
                    <MaterialCommunityIcons 
                      name="doctor" 
                      size={28} 
                      color="#3A86FF" 
                    />
                  </View>

                  <View style={styles.doctorDetails}>
                    <Text style={styles.doctorName}>{doctor.name}</Text>
                    <Text style={styles.specialty}>{doctor.specialty}</Text>
                    
                    <View style={styles.metaContainer}>
                      <View style={styles.metaItem}>
                        <FontAwesome name="star" size={14} color="#FFD700" />
                        <Text style={styles.metaText}>{doctor.rating}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <MaterialCommunityIcons name="map-marker-distance" size={14} color="#3A86FF" />
                        <Text style={styles.metaText}>{doctor.distance.toFixed(1)} km</Text>
                      </View>
                      <View style={[
                        styles.availabilityBadge,
                        { backgroundColor: doctor.available ? '#E8F5E9' : '#FFEBEE' }
                      ]}>
                        <MaterialCommunityIcons 
                          name={doctor.available ? "check-circle" : "close-circle"} 
                          size={14} 
                          color={doctor.available ? '#4CAF50' : '#F44336'} 
                        />
                        <Text style={[
                          styles.availabilityText,
                          { color: doctor.available ? '#4CAF50' : '#F44336' }
                        ]}>
                          {doctor.available ? 'Available' : 'Unavailable'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.callButton}
                    onPress={() => handleCallPress(doctor.phone)}
                  >
                    <MaterialIcons name="call" size={18} color="#fff" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.directionsButton}
                    onPress={() => handleDirectionsPress(doctor.latitude, doctor.longitude)}
                  >
                    <MaterialCommunityIcons name="directions" size={18} color="#3A86FF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    zIndex: 2,
    marginBottom: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3A86FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 0,
    margin: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  mapContainer: {
    height: Dimensions.get('window').height * 0.35,
    width: '100%',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  calloutContainer: {
    width: 200,
    padding: 12,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 14,
    color: '#555',
  },
  calloutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  directionsButton: {
    backgroundColor: '#3A86FF',
    padding: 6,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  directionsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3A86FF',
  },
  loading: {
    marginVertical: 40,
  },
  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  selectedCard: {
    borderWidth: 1.5,
    borderColor: '#3A86FF',
    backgroundColor: '#f5f9ff',
  },
  doctorInfoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(58, 134, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  specialty: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 6,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  availabilityText: {
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  callButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 10,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionsButton: {
    backgroundColor: 'rgba(58, 134, 255, 0.1)',
    borderRadius: 12,
    padding: 10,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(58, 134, 255, 0.3)',
  },
  countBadge: {
    backgroundColor: '#3A86FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  phoneNumber: {
    color: '#2089dc',
    marginLeft: 4,
  },
  sectionBackground: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    margin: 0,
    marginBottom: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  }
});

export default DoctorConsultationScreen;  