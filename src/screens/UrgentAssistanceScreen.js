import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  Linking, 
  ActivityIndicator, 
  TouchableOpacity, 
  Modal,
  Text,
  Animated,
  Easing,
  TextInput,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, CheckBox } from '@rneui/themed';
import { FontAwesome, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { analyzeDisease } from '../utils/geminiApi';

const EMERGENCY_NUMBER = '112';

const UrgentAssistanceScreen = ({ navigation }) => {
  const [symptoms, setSymptoms] = useState('');
  const [situation, setSituation] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherEmergency, setOtherEmergency] = useState('');
  const [checklist, setChecklist] = useState({
    breathing: false,
    conscious: false,
    bleeding: false,
    pain: false,
    other: false
  });
  const [pulseAnim] = useState(new Animated.Value(1));

  const handleEmergencyCall = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 100,
        easing: Easing.ease,
        useNativeDriver: true
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 100,
        easing: Easing.ease,
        useNativeDriver: true
      })
    ]).start();

    Alert.alert(
      'Emergency Call',
      `Are you sure you want to call ${EMERGENCY_NUMBER}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => Linking.openURL(`tel:${EMERGENCY_NUMBER}`) },
      ],
      { cancelable: true }
    );
  };

  const handleQuickAssessment = async () => {
    if (!symptoms || !situation) {
      Alert.alert('Required Fields', 'Please describe your symptoms and situation');
      return;
    }
  
    setIsLoading(true);
    try {
      const situationDescription = `Symptoms: ${symptoms}\n\nEmergency Situation: ${situation}\n\nEmergency Checklist:
        - Difficulty breathing: ${checklist.breathing ? 'Yes' : 'No'}
        - Loss of consciousness: ${checklist.conscious ? 'Yes' : 'No'}
        - Severe bleeding: ${checklist.bleeding ? 'Yes' : 'No'}
        - Severe pain: ${checklist.pain ? 'Yes' : 'No'}
        ${checklist.other ? `- Other: ${otherEmergency}` : ''}`;
  
      const aiAnalysis = await analyzeDisease(situationDescription);
      // Remove markdown formatting (** and *)
      const cleanResponse = aiAnalysis.replace(/\*\*/g, '').replace(/^\*\s*/gm, '');
      setAiResponse(cleanResponse);
      setShowResults(true);
    } catch (error) {
      console.error('Error getting AI analysis:', error);
      Alert.alert('Error', 'Unable to get AI analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleChecklistItem = (key) => {
    if (key === 'other') {
      setShowOtherInput(!checklist.other);
      if (checklist.other) {
        setOtherEmergency('');
      }
    }
    setChecklist({ ...checklist, [key]: !checklist[key] });
  };

  const getSeverityRecommendation = () => {
    const severityScore = Object.entries(checklist)
      .filter(([key, value]) => value && key !== 'other').length;
      
    if (severityScore >= 3) {
      return {
        text: 'Immediate Emergency Care Needed',
        color: '#ff4444',
        icon: 'alert-octagon',
      };
    } else if (severityScore >= 1) {
      return {
        text: 'Urgent Medical Attention Recommended',
        color: '#ff9800',
        icon: 'alert',
      };
    } else {
      return {
        text: 'Monitor Symptoms',
        color: '#4caf50',
        icon: 'information',
      };
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
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
      <Text style={styles.headerTitle}>Urgent Assistance</Text>
      <View style={styles.headerIcon}>
      <MaterialCommunityIcons name="alert-circle" size={28} color="#ff4444" />
      </View>
    </View>

      {/* Animated Background Element */}
      <View style={styles.animatedBackground}>
        <MaterialCommunityIcons 
          name="alert-octagon" 
          size={150} 
          color="rgba(255, 68, 68, 0.1)" 
          style={styles.backgroundIcon}
        />
      </View>

      <ScrollView 
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
        {/* Emergency Button Section */}
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

        {/* Quick Assessment Section */}
        <Animatable.View 
          animation="fadeInUp" 
          duration={800}
          style={styles.assessmentContainer}
        >
          <Text style={styles.sectionTitle}>Quick Assessment</Text>
          <Text style={styles.sectionSubtitle}>Get AI-powered emergency guidance</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Describe your symptoms</Text>
            <Input
              placeholder="e.g., chest pain, dizziness, nausea"
              leftIcon={<MaterialCommunityIcons name="emoticon-sick" size={24} color="#ff4444" />}
              multiline
              value={symptoms}
              onChangeText={setSymptoms}
              inputStyle={styles.input}
              inputContainerStyle={styles.inputField}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Emergency situation</Text>
            <Input
              placeholder="Describe what happened in detail"
              leftIcon={<MaterialCommunityIcons name="text-box" size={24} color="#ff4444" />}
              multiline
              numberOfLines={4}
              value={situation}
              onChangeText={setSituation}
              inputStyle={styles.input}
              inputContainerStyle={[styles.inputField, { height: 100 }]}
            />
          </View>

          <Text style={styles.checklistTitle}>Emergency Checklist</Text>
          
          {Object.entries(checklist).map(([key, value]) => (
            <View key={key}>
              <CheckBox
                title={key === 'other' ? 'Other (specify)' : 
                  key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                checked={value}
                onPress={() => toggleChecklistItem(key)}
                containerStyle={styles.checkbox}
                textStyle={styles.checkboxText}
                checkedIcon={<MaterialCommunityIcons name="checkbox-marked" size={24} color="#ff4444" />}
                uncheckedIcon={<MaterialCommunityIcons name="checkbox-blank-outline" size={24} color="#aaa" />}
                Component={TouchableOpacity}
              />
              {key === 'other' && checklist.other && (
                <View style={styles.otherInputContainer}>
                  <TextInput
                    style={styles.otherInput}
                    placeholder="Describe your emergency"
                    value={otherEmergency}
                    onChangeText={setOtherEmergency}
                    multiline
                  />
                </View>
              )}
            </View>
          ))}

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ff4444" />
              <Text style={styles.loadingText}>Analyzing your situation...</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.assessButton}
              onPress={handleQuickAssessment}
            >
              <MaterialCommunityIcons name="robot" size={24} color="white" />
              <Text style={styles.assessButtonText}>Get AI-Powered Assessment</Text>
            </TouchableOpacity>
          )}
        </Animatable.View>
      </ScrollView>

      {/* AI Results Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showResults}
        onRequestClose={() => setShowResults(false)}
      >
        <View style={styles.modalContainer}>
          <Animatable.View 
            animation="fadeInUp"
            duration={600}
            style={styles.modalContent}
          >
            <View style={styles.severityContainer}>
              <MaterialCommunityIcons 
                name={getSeverityRecommendation().icon} 
                size={40} 
                color={getSeverityRecommendation().color} 
              />
              <Text style={[styles.severityText, { color: getSeverityRecommendation().color }]}>
                {getSeverityRecommendation().text}
              </Text>
            </View>

            <ScrollView style={styles.responseContainer}>
              <Text style={styles.responseTitle}>AI Analysis:</Text>
              <Text style={styles.responseText}>{aiResponse}</Text>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: '#2089dc' }]}
              onPress={() => setShowResults(false)}
            >
              <Text style={styles.buttonText}>Understood</Text>
            </TouchableOpacity>

            {getSeverityRecommendation().color === '#ff4444' && (
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: '#ff4444', marginTop: 10 }]}
                onPress={handleEmergencyCall}
              >
                <MaterialCommunityIcons name="phone" size={24} color="white" />
                <Text style={styles.buttonText}>Call Emergency Services</Text>
              </TouchableOpacity>
            )}
          </Animatable.View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  animatedBackground: {
    position: 'absolute',
    top: 100,
    right: -50,
    opacity: 0.1,
    zIndex: -1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emergencyContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  emergencyButton: {
    backgroundColor: '#ff4444',
    width: '100%',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  emergencyButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
  },
  emergencyButtonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  assessmentContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    fontSize: 16,
    color: '#333',
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  checklistTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    marginBottom: 12,
  },
  checkbox: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 8,
  },
  checkboxText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#333',
  },
  otherInputContainer: {
    marginLeft: 32,
    marginRight: 16,
    marginBottom: 8,
  },
  otherInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 14,
    minHeight: 50,
  },
  assessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff4444',
    padding: 16,
    borderRadius: 10,
    marginTop: 16,
  },
  assessButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
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
    borderRadius: 16,
    padding: 24,
    maxHeight: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  severityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  severityText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  responseContainer: {
    marginBottom: 20,
    maxHeight: 320,
  },
  responseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  responseText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default UrgentAssistanceScreen;