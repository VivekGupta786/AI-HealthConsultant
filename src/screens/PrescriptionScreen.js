import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator, Image, Text, Dimensions, Modal, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { useAuth } from '../contexts/AuthContext';
import { storage, db } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import * as ImageManipulator from 'expo-image-manipulator';

const { width, height } = Dimensions.get('window');

const PrescriptionScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigation.navigate('Home', { showLogin: true, returnScreen: 'Prescription' });
      return;
    }
    loadPrescriptions();
  }, [currentUser, navigation]);

  useEffect(() => {
    if (currentUser) {
      loadPrescriptions();
    }
  }, [currentUser]);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      if (!currentUser) return;

      // Get prescriptions from both main collection and user's subcollection
      const mainPrescriptionsRef = collection(db, 'prescriptions');
      const userPrescriptionsRef = collection(db, `users/${currentUser.uid}/prescriptions`);
      
      // Query both collections
      const mainQuery = query(mainPrescriptionsRef, where('userId', '==', currentUser.uid));
      const userQuery = query(userPrescriptionsRef);
      
      const [mainSnapshot, userSnapshot] = await Promise.all([
        getDocs(mainQuery),
        getDocs(userQuery)
      ]);

      // Combine and deduplicate prescriptions
      const prescriptionMap = new Map();

      const processPrescription = async (doc) => {
        const data = doc.data();
        try {
          const imageUrl = await getDownloadURL(ref(storage, data.filename));
          prescriptionMap.set(data.filename, {
            id: doc.id,
            ...data,
            imageUrl
          });
        } catch (error) {
          console.warn(`Failed to get download URL for ${data.filename}:`, error);
          prescriptionMap.set(data.filename, {
            id: doc.id,
            ...data,
            imageUrl: null
          });
        }
      };

      // Process all prescriptions
      await Promise.all([
        ...mainSnapshot.docs.map(processPrescription),
        ...userSnapshot.docs.map(processPrescription)
      ]);

      // Convert map to array and sort by date
      const prescriptionsList = Array.from(prescriptionMap.values());
      const sortedPrescriptions = prescriptionsList.sort((a, b) => 
        new Date(b.uploadedAt) - new Date(a.uploadedAt)
      );

      setPrescriptions(sortedPrescriptions);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };
  
  const pickImage = async () => {
    try {
      console.log('Upload button clicked!');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload prescriptions');
        return;
      }
    
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 1,
        aspect: [4, 3], // Add aspect ratio for consistent image dimensions
      });
    
      if (!result.canceled && result.assets[0]) {
        // Compress Image before uploading
        const compressedImage = await compressImage(result.assets[0].uri);
        await uploadPrescription(compressedImage);
        // Refresh the prescriptions list after successful upload
        await loadPrescriptions();
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };
  const compressImage = async (uri) => {
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }], // Resize to 800px width while maintaining aspect ratio
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG } // Reduce quality to 50%
      );
      return compressed.uri;
    } catch (error) {
      console.error('Image compression error:', error);
      return uri; // If compression fails, return the original image
    }
  };
  const uploadPrescription = async (uri) => {
    let blobResponse = null;
    let blob = null;
    try {
      setLoading(true);
  
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      if (!uri) {
        throw new Error('No image selected');
      }
  
      // Create blob from URI
      try {
        blobResponse = await fetch(uri);
        if (!blobResponse.ok) {
          throw new Error('Failed to fetch image');
        }
        blob = await blobResponse.blob();
      } catch (fetchError) {
        throw new Error(`Failed to process image: ${fetchError.message}`);
      }
  
      // Generate unique filename and create storage reference
      const timestamp = Date.now();
      const filename = `prescriptions/${currentUser.uid}/${timestamp}.jpg`;
      const storageRef = ref(storage, filename);
  
      // Upload to Firebase Storage
      const metadata = {
        contentType: 'image/jpeg',
        customMetadata: {
          uploadedBy: currentUser.uid,
          originalName: `prescription_${timestamp}.jpg`
        }
      };
  
      let uploadResult;
      try {
        uploadResult = await uploadBytes(storageRef, blob, metadata);
        if (!uploadResult) {
          throw new Error('Failed to upload to storage');
        }
      } catch (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }
  
      // Get download URL
      let downloadURL;
      try {
        downloadURL = await getDownloadURL(uploadResult.ref);
        if (!downloadURL) {
          throw new Error('Failed to get download URL');
        }
      } catch (urlError) {
        throw new Error(`Failed to get download URL: ${urlError.message}`);
      }
  
      // Store prescription in Firestore under user's prescriptions collection
      const mainDocRef = await addDoc(collection(db, `prescriptions`), {
        userId: currentUser.uid,
        imageUrl: downloadURL,
        uploadedAt: new Date(timestamp).toISOString(),
        filename: filename,
        status: 'active',
        fileSize: blob.size,
        contentType: blob.type || 'image/jpeg'
      });

      // Update local state with the new prescription
      const newPrescription = {
        id: mainDocRef.id,
        userId: currentUser.uid,
        imageUrl: downloadURL,
        uploadedAt: new Date(timestamp).toISOString(),
        filename: filename,
        status: 'active',
        fileSize: blob.size,
        contentType: blob.type || 'image/jpeg'
      };
      setPrescriptions(prevPrescriptions => [newPrescription, ...prevPrescriptions]);
      // Update user's prescriptions subcollection
      const userPrescriptionRef = collection(db, `users/${currentUser.uid}/prescriptions`);
      await addDoc(userPrescriptionRef, {
        imageUrl: downloadURL,
        uploadedAt: new Date(timestamp).toISOString(),
        filename: filename,
        status: 'active',
        fileSize: blob.size,
        contentType: blob.type || 'image/jpeg'
      });
      Alert.alert('Success', 'Prescription uploaded successfully');
    } catch (error) {
      return;
    } finally {
      if (blob) {
        blob = null;
      }
      if (blobResponse) {
        blobResponse = null;
      }
      setLoading(false);
    }
  };

  const viewPrescriptionImage = (imageUrl) => {
    setSelectedImage(imageUrl);
    setModalVisible(true);
  };

  const showPrescriptionDetails = (prescription) => {
    Alert.alert(
      'Prescription Details',
      `Uploaded on ${format(new Date(prescription.uploadedAt), 'MMMM dd, yyyy \\at hh:mm a')}\nFile size: ${Math.round(prescription.fileSize / 1024)} KB`,
      [{ text: 'Close' }]
    );
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedImage(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {Platform.OS === 'android' && <StatusBar translucent backgroundColor="transparent" />}
      {/* Modern Header - Fixed to not go under status bar */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Prescriptions</Text>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="pill" size={24} color="#fff" />
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Upload Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upload Prescription</Text>
          <Text style={styles.cardSubtitle}>Add a new prescription to your records</Text>
          
          <TouchableOpacity 
            style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
            onPress={pickImage}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#3A86FF" />
            ) : (
              <>
                <MaterialCommunityIcons 
                  name="file-image-plus" 
                  size={32} 
                  color="#3A86FF" 
                />
                <Text style={styles.uploadButtonText}>Select Prescription Image</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Prescriptions List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3A86FF" />
          </View>
        ) : prescriptions.length === 0 ? (
          <Animatable.View 
            animation="fadeIn"
            duration={600}
            style={[styles.card, styles.emptyStateCard]}
          >
            <MaterialCommunityIcons 
              name="file-document-outline" 
              size={48} 
              color="#ccc" 
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>No Prescriptions Found</Text>
            <Text style={styles.emptyText}>
              Upload your first prescription to get started
            </Text>
          </Animatable.View>
        ) : (
          <Animatable.View 
            animation="fadeInUp"
            duration={600}
            style={[styles.card, styles.prescriptionsCard]}
          >
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Your Prescriptions</Text>
              <View style={styles.resultsBadge}>
                <Text style={styles.resultsBadgeText}>{prescriptions.length} items</Text>
              </View>
            </View>

            <View style={styles.prescriptionsGrid}>
              {prescriptions.map((prescription) => (
                <View key={prescription.id} style={styles.prescriptionItem}>
                  <TouchableOpacity
                    onPress={() => viewPrescriptionImage(prescription.imageUrl)}
                  >
                    <Image
                      source={{ uri: prescription.imageUrl }}
                      style={styles.prescriptionImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                  <View style={styles.prescriptionInfo}>
                    <Text style={styles.prescriptionDate}>
                      {format(new Date(prescription.uploadedAt), 'MMM dd, yyyy')}
                    </Text>
                    <TouchableOpacity
                      onPress={() => showPrescriptionDetails(prescription)}
                    >
                      <MaterialIcons name="info-outline" size={18} color="#3A86FF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </Animatable.View>
        )}
      </ScrollView>

      {/* Image Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={closeModal}
          >
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.downloadButton}
              onPress={() => {
                Alert.alert('Download', 'Image download functionality would go here');
              }}
            >
              <MaterialIcons name="file-download" size={24} color="#fff" />
              <Text style={styles.downloadButtonText}>Save to Device</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    padding: 16,
    paddingTop: 8,
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#06D6A0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#3A86FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3A86FF',
    borderStyle: 'dashed',
    marginTop: 12,
  },
  uploadButtonDisabled: {
    borderColor: '#ccc',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3A86FF',
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  prescriptionsCard: {
    marginBottom: 32,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  resultsBadge: {
    backgroundColor: '#e9f5ff',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  resultsBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3A86FF',
  },
  prescriptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  prescriptionItem: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  prescriptionImage: {
    width: '100%',
    height: 150,
  },
  prescriptionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
  },
  prescriptionDate: {
    fontSize: 14,
    color: '#555',
  },
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    maxWidth: '80%',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
  },
  imageContainer: {
    width: width * 0.95,
    height: height * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  modalFooter: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A86FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default PrescriptionScreen;