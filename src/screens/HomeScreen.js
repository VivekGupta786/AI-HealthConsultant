import React, { useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Text, 
  Dimensions, 
  Modal, 
  TextInput, 
  Alert, 
  Linking,
  StatusBar, // Add this import
  Platform    // Add this import
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Video } from 'expo-av';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Animatable from 'react-native-animatable';

const { width } = Dimensions.get('window');
const VIDEO_HEIGHT = 370; // Height of the video section
const FEATURE_CARD_HEIGHT = 170;

const EMERGENCY_NUMBERS = [
  { name: 'Police', number: '100', icon: 'police-badge', color: '#3A86FF' },
  { name: 'Ambulance', number: '108', icon: 'ambulance', color: '#FF006E' },  
  { name: 'Fire Brigade', number: '101', icon: 'fire-truck', color: '#FB5607' },
  { name: 'Women Helpline', number: '1091', icon: 'account-heart', color: '#8338EC' },
  { name: 'Child Helpline', number: '1098', icon: 'baby-face-outline', color: '#06D6A0' },
  { name: 'Disaster Management', number: '1078', icon: 'weather-hurricane', color: '#FFBE0B' },
];

const EMERGENCY_NUMBER = '112'; // Universal emergency number

const features = [
  {
    title: "AI Medicine Scanner",
    icon: "🔍",
    navigateTo: 'MedicineScanner',
    color: '#2089dc'
  },
  {
    title: "Urgent Medical Assistance",
    icon: "🚑",
    navigateTo: 'UrgentAssistance',
    color: '#e74c3c'
  },
  {
    title: "Doctors Near Me",
    icon: "👨‍⚕️",
    navigateTo: 'DoctorConsultation',
    color: '#2ecc71'
  },
  {
    title: "Drug Analysis",
    icon: "💊",
    navigateTo: 'DrugAnalysis',
    color: '#9b59b6'
  },
  {
    title: "Disease Detection",
    icon: "🔬",
    navigateTo: 'DiseaseDetection',
    color: '#f39c12'
  },
  {
    title: "Paperless Prescription",
    icon: "📝",
    navigateTo: 'Prescription',
    color: '#1abc9c'
  }
];

const HomeScreen = ({ navigation, route }) => {
  const { currentUser, login, signup, logout, updateUserProfile } = useAuth();
  const videoRef = useRef(null);
  const [activeTab, setActiveTab] = useState('Home');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Check if we need to show login modal from navigation params
  React.useEffect(() => {
    if (route?.params?.showLogin) {
      setShowProfileModal(true);
      setIsRegistering(false);
      // Clear the parameter after showing modal
      navigation.setParams({ showLogin: undefined });
    }
  }, [route?.params]);

  const handleEmergencyCall = () => {
    Alert.alert(
      'Emergency Call',
      `Are you sure you want to call ${EMERGENCY_NUMBER}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => Linking.openURL(`tel:${EMERGENCY_NUMBER}`) }
      ]
    );
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      console.log(result.assets[0]);
    }
  };

  const handleSignup = async () => {
    if (!displayName || !userEmail || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const { user } = await signup(userEmail, password);

      await updateUserProfile(user, {
        displayName: displayName
      });

      await setDoc(doc(db, 'users', user.uid), {
        displayName: displayName,
        email: userEmail,
        createdAt: serverTimestamp(),
        role: 'user',
        profileComplete: false
      });

      setShowProfileModal(false);
      // Handle navigation back to returnScreen if specified
      if (route?.params?.returnScreen) {
        navigation.navigate(route.params.returnScreen);
        navigation.setParams({ returnScreen: undefined });
      }
      Alert.alert('Success', 'Account created successfully!');
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Error', error.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!userEmail || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      await login(userEmail, password);
      setShowProfileModal(false);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowProfileModal(false);
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Prescriptions':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>My Prescriptions</Text>
            <Text style={styles.comingSoon}>Prescriptions will appear here</Text>
          </View>
        );
      case 'Appointments':
        return (
          <ScrollView style={styles.tabContent}>
            <Animatable.View 
              animation="fadeInUp" 
              duration={800}
              style={styles.emergencyContainer}
            >
              <Text style={styles.sectionTitle}>Emergency Alert</Text>
              <Text style={styles.sectionSubtitle}>Use this in life-threatening situations</Text>
              
              <TouchableOpacity 
                style={styles.emergencyButton}
                onPress={handleEmergencyCall}
              >
                <Animatable.View 
                  animation="pulse" 
                  easing="ease-out"
                  iterationCount="infinite"
                  duration={2000}
                >
                  <MaterialCommunityIcons name="alert-octagon" size={40} color="white" />
                </Animatable.View>
                <Text style={styles.emergencyButtonText}>EMERGENCY CALL</Text>
                <Text style={styles.emergencyButtonSubtext}>Dial {EMERGENCY_NUMBER} immediately</Text>
              </TouchableOpacity>
            </Animatable.View>
      
            <View style={styles.numbersContainer}>
              <Text style={styles.numbersTitle}>Important Emergency Numbers</Text>
              <View style={styles.numbersGrid}>
                {EMERGENCY_NUMBERS.map((service, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.numberCard, { borderColor: service.color }]}
                    onPress={() => Linking.openURL(`tel:${service.number}`)}
                  >
                    <View style={[styles.numberIconContainer, { backgroundColor: `${service.color}20` }]}>
                      <MaterialCommunityIcons 
                        name={service.icon} 
                        size={24} 
                        color={service.color} 
                      />
                    </View>
                    <Text style={[styles.numberName, { color: service.color }]}>{service.name}</Text>
                    <Text style={styles.number}>{service.number}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        );
      case 'Doctors':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Nearby Doctors</Text>
            <Text style={styles.comingSoon}>Available doctors will appear here</Text>
          </View>
        );
      default:
        return (
          <ScrollView style={styles.scrollContent}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeText}>Welcome, <Text style={styles.userName}>{currentUser ? currentUser.displayName || currentUser.email.split('@')[0] : 'Guest!'}</Text></Text>
            </View>

            <View style={styles.servicesSection}>
              <Text style={styles.sectionTitle}>Our Services</Text>
              <View style={styles.featuresGrid}>
                {features.map((feature, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.featureCard, { borderColor: feature.color }]}
                    onPress={() => {
                      if (feature.navigateTo === 'Prescription' && !currentUser) {
                        setShowProfileModal(true);
                        setIsRegistering(false);
                      } else {
                        navigation.navigate(feature.navigateTo);
                      }
                    }}
                  >
                    <View style={[styles.featureIconContainer, { backgroundColor: `${feature.color}20` }]}>
                      <Text style={[styles.featureIcon, { color: feature.color }]}>{feature.icon}</Text>
                    </View>
                    <Text style={[styles.featureTitle, { color: feature.color }]}>{feature.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        );
    }
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'android' && <StatusBar translucent backgroundColor="transparent" />}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showProfileModal}
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowProfileModal(false)}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>

            {currentUser ? (
              <>
                <View style={styles.profileHeader}>
                  <FontAwesome name="user-circle" size={80} color="#2089dc" />
                  <Text style={styles.modalUserName}>{currentUser.displayName || currentUser.email.split('@')[0]}</Text>
                  <Text style={styles.modalUserEmail}>{currentUser.email}</Text>
                </View>
                
                <View style={styles.profileMenu}>
                  <TouchableOpacity style={styles.menuItem}>
                    <MaterialIcons name="settings" size={24} color="#555" />
                    <Text style={styles.menuText}>Settings</Text>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.logoutButton]}
                  onPress={handleLogout}
                >
                  <MaterialIcons name="exit-to-app" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Logout</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <FontAwesome name="user-circle" size={80} color="#2089dc" style={styles.guestIcon} />
                <Text style={styles.modalTitle}>{isRegistering ? 'Create Account' : 'Welcome!'}</Text>
                <Text style={styles.modalSubtitle}>{isRegistering ? 'Please fill in your details' : 'Sign in to access your profile'}</Text>
                
                {isRegistering && (
                  <TextInput
                    style={styles.input}
                    placeholder="Username"
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="none"
                  />
                )}

                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={userEmail}
                  onChangeText={setUserEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />

                {isRegistering && (
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                )}
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.loginButton, loading && styles.disabledButton]}
                  onPress={isRegistering ? handleSignup : handleLogin}
                  disabled={loading}
                >
                  <MaterialIcons name={isRegistering ? 'person-add' : 'login'} size={20} color="#fff" />
                  <Text style={styles.buttonText}>{loading ? 'Please wait...' : (isRegistering ? 'Sign Up' : 'Login')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.secondaryButton]}
                  onPress={() => {
                    setIsRegistering(!isRegistering);
                    setPassword('');
                    setConfirmPassword('');
                    setDisplayName('');
                  }}
                >
                  <Text style={styles.secondaryButtonText}>
                    {isRegistering ? 'Already have an account? Login' : 'Create Account'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <View style={styles.videoSection}>
        <Video
          ref={videoRef}
          source={require('../../assets/backgroundVideo.mov')}
          style={styles.videoBackground}
          resizeMode="cover"
          shouldPlay
          isLooping
          isMuted
          rate={1.0}
        />
        
        <View style={styles.videoOverlay} />
        
        <View style={styles.header}>
          <View style={styles.locationContainer}>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => setShowProfileModal(true)}
          >
            <FontAwesome name="user-circle" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.videoBottomCurve} />
      </View>

      {renderContent()}

      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => setActiveTab('Home')}
        >
          <Text style={[styles.navIcon, activeTab === 'Home' && styles.activeNavIcon]}>🏠</Text>
          <Text style={[styles.navLabel, activeTab === 'Home' && styles.activeNavLabel]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => {
            if (!currentUser) {
              setShowProfileModal(true);
              setIsRegistering(false);
            } else {
              setActiveTab('Prescriptions');
              navigation.navigate('Prescription');
            }
          }}
        >
          <Text style={[styles.navIcon, activeTab === 'Prescriptions' && styles.activeNavIcon]}>💊</Text>
          <Text style={[styles.navLabel, activeTab === 'Prescriptions' && styles.activeNavLabel]}>Prescriptions</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.cameraButton}
          onPress={() => navigation.navigate('MedicineScanner')}
        >
          <View style={styles.cameraButtonOuter}>
            <View style={styles.cameraButtonInner}>
              <MaterialCommunityIcons name="camera" size={28} color="white" />
            </View>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => setActiveTab('Appointments')}
        >
          <Text style={[styles.navIcon, activeTab === 'Appointments' && styles.activeNavIcon]}>🚨</Text>
          <Text style={[styles.navLabel, activeTab === 'Appointments' && styles.activeNavLabel]}>Emergency</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
  style={styles.navItem}
  onPress={() => {
    setActiveTab('Doctors');
    navigation.navigate('DoctorConsultation');
  }}
>
  <Text style={[styles.navIcon, activeTab === 'Doctors' && styles.activeNavIcon]}>👨‍⚕️</Text>
  <Text style={[styles.navLabel, activeTab === 'Doctors' && styles.activeNavLabel]}>Doctors</Text>
</TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  videoSection: {
    height: VIDEO_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
    marginTop: Platform.OS === 'android' ? -StatusBar.currentHeight : 0, // This will pull it up on Android
  },
  videoBackground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  videoBottomCurve: {
    position: 'absolute',
    bottom: -25,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    zIndex: 2,
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 40, // Adjust paddingTop based on platform
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileButton: {
    marginLeft: 15,
    padding: 5,
  },
  welcomeSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
    borderRadius: 20,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 20,
    color: '#333',
    fontWeight: '300',
    fontStyle: 'italic',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2089dc',
    marginTop: 5,
  },
  servicesSection: {
    backgroundColor: '#FAFAFA',
    padding: 20,
    marginBottom: 10,
    borderRadius: 20,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  featureCard: {
    width: '48%',
    height: FEATURE_CARD_HEIGHT,
    borderRadius: 15,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  featureIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#ffffff',
  },
  featureIcon: {
    fontSize: 30,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 75,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 11,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 5,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
  },
  navIcon: {
    fontSize: 24,
    color: '#8e8e93',
  },
  activeNavIcon: {
    color: '#2089dc',
  },
  navLabel: {
    fontSize: 11,
    marginTop: 4,
    color: '#8e8e93',
    fontWeight: '500',
  },
  activeNavLabel: {
    color: '#2089dc',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 50,
    left: '50%',
    marginLeft: -22,
    width: 65,
    height: 65,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  cameraButtonOuter: {
    width: 65,
    height: 65,
    borderRadius: 35,
    backgroundColor: '#2089dc',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cameraButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2089dc',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 15,
  },
  modalUserName: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 15,
    color: '#333',
  },
  modalUserEmail: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  guestIcon: {
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 25,
  },
  profileMenu: {
    width: '100%',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuText: {
    fontSize: 16,
    marginLeft: 15,
    color: '#555',
  },
  modalButton: {
    width: '100%',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },
  loginButton: {
    backgroundColor: '#4285F4',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
  secondaryButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  disabledButton: {
    opacity: 0.7,
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  comingSoon: {
    fontSize: 16,
    color: '#666',
  },
  emergencyContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  emergencyButton: {
    backgroundColor: '#FF4444',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  emergencyButtonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 5,
  },
  numbersContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  numbersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  numbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  numberCard: {
    width: '48%',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
    borderWidth: 1,
    alignItems: 'center',
  },
  numberIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  numberName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    textAlign: 'center',
  },
  number: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollContent: {
    flex: 1,
  },
});

export default HomeScreen;