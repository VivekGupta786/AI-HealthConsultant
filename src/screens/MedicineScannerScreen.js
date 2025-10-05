import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Image, 
  ScrollView, 
  Alert, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { analyzeMedicineImage } from '../utils/geminiApi';
import { cleanMarkdown } from '../utils/cleanMarkdown';

const MedicineScannerScreen = ({ navigation }) => {
  const [image, setImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImage(result.assets[0].uri);
        setResults(null);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePicture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permission to use this feature.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImage(result.assets[0].uri);
        setResults(null);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture');
    }
  };

  const scanMedicine = async () => {
    if (!image) {
      Alert.alert('No image', 'Please select or take a picture first');
      return;
    }
  
    setScanning(true);
    try {
      const manipulateResult = await ImageManipulator.manipulateAsync(
        image,
        [{ resize: { width: 800 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      
      const base64Image = manipulateResult.base64;
      const medicineInfo = await analyzeMedicineImage(base64Image);
      
      // Clean markdown from all result fields
      setResults({
        name: cleanMarkdown(medicineInfo.name) || 'Unknown Medicine',
        ingredients: cleanMarkdown(medicineInfo.ingredients) || 'Not available',
        uses: cleanMarkdown(medicineInfo.uses) || 'Not specified',
        dosage: cleanMarkdown(medicineInfo.dosage) || 'Consult your doctor',
        sideEffects: cleanMarkdown(medicineInfo.sideEffects) || 'None reported',
        warnings: cleanMarkdown(medicineInfo.warnings) || 'No specific warnings'
      });
    } catch (error) {
      console.error('Error scanning medicine:', error);
      Alert.alert('Error', error.message || 'Failed to scan medicine');
    } finally {
      setScanning(false);
    }
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
            <Text style={styles.headerTitle}>Medical Scanner</Text>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons name="pill" size={24} color="#fff" />
            </View>
          </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Instruction Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Identify Medicine</Text>
          <Text style={styles.cardSubtitle}>
            Take a photo or upload an image of your medicine to get detailed information
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={takePicture}>
            <MaterialCommunityIcons name="camera" size={24} color="#fff" />
            <Text style={styles.buttonText}>Take Picture</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.galleryButton]} onPress={pickImage}>
            <MaterialCommunityIcons name="image" size={24} color="#fff" />
            <Text style={styles.buttonText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>

        {/* Image Preview */}
        {image && (
          <View style={styles.card}>
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: image }} 
                style={styles.image}
                resizeMode="contain"
              />
            </View>
            
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={scanMedicine}
              disabled={scanning}
            >
              {scanning ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Analyze Medicine</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Results Section */}
        {results && (
          <View style={[styles.card, styles.resultsCard]}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Medicine Analysis</Text>
              <View style={styles.resultsBadge}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#fff" />
                <Text style={styles.resultsBadgeText}>Analysis Complete</Text>
              </View>
            </View>

            <View style={styles.resultSection}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="information" size={20} color="#3A86FF" />
                <Text style={styles.sectionTitle}>Basic Information</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Medicine Name:</Text>
                <Text style={styles.resultValue}>{results.name}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Active Ingredients:</Text>
                <Text style={styles.resultValue}>{results.ingredients}</Text>
              </View>
            </View>

            <View style={styles.resultSection}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="medical-bag" size={20} color="#3A86FF" />
                <Text style={styles.sectionTitle}>Usage Information</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Primary Uses:</Text>
                <Text style={styles.resultValue}>{results.uses}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Recommended Dosage:</Text>
                <Text style={styles.resultValue}>{results.dosage}</Text>
              </View>
            </View>

            <View style={styles.resultSection}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="alert" size={20} color="#3A86FF" />
                <Text style={styles.sectionTitle}>Safety Information</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Side Effects:</Text>
                <Text style={styles.resultValue}>{results.sideEffects}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Warnings:</Text>
                <Text style={styles.resultValue}>{results.warnings}</Text>
              </View>
            </View>

            <View style={styles.disclaimerContainer}>
              <Text style={styles.disclaimerText}>
                <Text style={{ fontWeight: 'bold' }}>Disclaimer: </Text>
                This analysis is for informational purposes only. Always consult a healthcare professional before taking any medication.
              </Text>
            </View>
          </View>
        )}
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
    padding: 16,
    paddingTop: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A86FF',
    padding: 16,
    borderRadius: 12,
    width: '48%',
  },
  galleryButton: {
    backgroundColor: '#06D6A0',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
    minHeight: 250,
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: 250,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    padding: 16,
    borderRadius: 12,
  },
  resultsCard: {
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
    fontWeight: '600',
    color: '#333',
  },
  resultsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A86FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  resultsBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  resultSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3A86FF',
    marginLeft: 8,
  },
  resultItem: {
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  disclaimerContainer: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    flexDirection: 'row',
  },
  disclaimerText: {
    fontSize: 13,
    color: '#d32f2f',
    lineHeight: 18,
    flex: 1,
    marginLeft: 8,
  },
});

export default MedicineScannerScreen;