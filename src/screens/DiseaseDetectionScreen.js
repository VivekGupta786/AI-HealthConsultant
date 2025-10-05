import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Animated, Easing, Text, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@rneui/themed';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { analyzeDisease } from '../utils/geminiApi';

const SAMPLE_SYMPTOMS = [
  { name: 'Fever', icon: 'thermometer', color: '#FF6B6B' },
  { name: 'Cough', icon: 'lungs', color: '#4ECDC4' },
  { name: 'Headache', icon: 'head-lightbulb', color: '#FFBE0B' },
  { name: 'Fatigue', icon: 'sleep', color: '#8338EC' },
  { name: 'Nausea', icon: 'emoticon-sick', color: '#3A86FF' },
  { name: 'Shortness of breath', icon: 'air-filter', color: '#FF006E' },
  { name: 'Muscle pain', icon: 'arm-flex', color: '#FB5607' },
  { name: 'Sore throat', icon: 'microphone', color: '#06D6A0' },
];

const DiseaseDetectionScreen = ({ navigation }) => {
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [duration, setDuration] = useState('');
  const [severity, setSeverity] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  const toggleSymptom = (symptom) => {
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

    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleAssessment = async () => {
    if (selectedSymptoms.length === 0) {
      Alert.alert('Required Field', 'Please select at least one symptom');
      return;
    }
  
    try {
      setLoading(true);
      setResults(null);
  
      const symptomsDescription = `
        Symptoms: ${selectedSymptoms.join(', ')}
        Duration: ${duration}
        Severity: ${severity}
        Additional Notes: ${additionalNotes}
      `;
  
      const analysisResult = await analyzeDisease(symptomsDescription);
      if (!analysisResult) {
        throw new Error('No analysis result received');
      }
      
      // Parse the analysis result and remove markdown formatting and disclaimers
      const sections = analysisResult.split('\n');
      const conditions = [];
      let currentSection = '';
      let currentCondition = null;
      let currentRecommendations = [];
      let currentUrgentCare = [];
      let overallSeverity = 'Medium';
      
      sections.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;
  
        // Skip disclaimer-like lines
        if (trimmedLine.toLowerCase().includes('disclaimer') || 
            trimmedLine.toLowerCase().includes('note:') ||
            trimmedLine.toLowerCase().includes('important:')) {
          return;
        }
  
        if (trimmedLine.toLowerCase().includes('1.')) {
          currentSection = 'conditions';
        } else if (trimmedLine.toLowerCase().includes('2.')) {
          currentSection = 'severity';
        } else if (trimmedLine.toLowerCase().includes('3.')) {
          currentSection = 'recommendations';
        } else if (trimmedLine.toLowerCase().includes('4.')) {
          currentSection = 'urgent';
        } else {
          switch (currentSection) {
            case 'conditions':
              if (trimmedLine.length > 1) {
                currentCondition = {
                  name: trimmedLine.replace(/\*\*/g, '').replace(/^\*\s*/, ''),
                  probability: 'Medium',
                  description: 'Based on AI analysis',
                  recommendations: [],
                  icon: 'virus'
                };
                conditions.push(currentCondition);
              }
              break;
            case 'severity':
              if (trimmedLine.length > 1) {
                overallSeverity = trimmedLine.toLowerCase().includes('high') ? 'High' : 
                                 trimmedLine.toLowerCase().includes('medium') ? 'Medium' : 'Low';
                conditions.forEach(condition => {
                  condition.probability = overallSeverity;
                });
              }
              break;
            case 'recommendations':
            case 'urgent':
              if (trimmedLine.length > 1) {
                const cleanLine = trimmedLine.replace(/\*\*/g, '').replace(/^\*\s*/, '');
                // Skip disclaimer-like recommendations
                if (!cleanLine.toLowerCase().includes('disclaimer') && 
                    !cleanLine.toLowerCase().includes('note:')) {
                  if (currentSection === 'recommendations') {
                    currentRecommendations.push(cleanLine);
                  } else {
                    currentUrgentCare.push(cleanLine);
                  }
                }
              }
              break;
          }
        }
      });
  
      conditions.forEach(condition => {
        condition.recommendations = [...currentRecommendations, ...currentUrgentCare];
      });
  
      if (conditions && conditions.length > 0) {
        setResults(conditions);
      } else {
        Alert.alert(
          'No Results',
          'Unable to determine possible conditions from the symptoms. Please provide more details or consult a doctor.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error analyzing symptoms:', error);
      Alert.alert(
        'Analysis Error',
        'Unable to analyze symptoms. Please check your inputs and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const getProbabilityColor = (probability) => {
    switch (probability.toLowerCase()) {
      case 'high': return '#ff4444';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#2089dc';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'alert-circle';
      case 'medium': return 'alert';
      case 'low': return 'check-circle';
      default: return 'information';
    }
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
      <Text style={styles.headerTitle}>Health Assessment</Text>
      <View style={styles.headerIcon}>
        <MaterialCommunityIcons name="stethoscope" size={24} color="#fff" />
      </View>
    </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Symptoms Selection Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Describe Your Symptoms</Text>
            <Text style={styles.cardSubtitle}>Select all that apply</Text>
          </View>
          
          <View style={styles.symptomsGrid}>
            {SAMPLE_SYMPTOMS.map((symptom) => (
              <TouchableOpacity
                key={symptom.name}
                style={[
                  styles.symptomPill,
                  selectedSymptoms.includes(symptom.name) && {
                    backgroundColor: symptom.color,
                    transform: [{ scale: pulseAnim }]
                  }
                ]}
                onPress={() => toggleSymptom(symptom.name)}
              >
                <MaterialCommunityIcons 
                  name={symptom.icon} 
                  size={20} 
                  color={selectedSymptoms.includes(symptom.name) ? '#fff' : symptom.color} 
                />
                <Text style={[
                  styles.symptomText,
                  selectedSymptoms.includes(symptom.name) && styles.selectedSymptomText
                ]}>
                  {symptom.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

                {/* Additional Information Card */}
                <View style={styles.card}>
          <Text style={styles.cardTitle}>Additional Details</Text>
          
          <View style={styles.inputContainer}>
            <MaterialIcons name="access-time" size={20} color="#666" />
            <Input
              placeholder="Duration (e.g., 3 days)"
              value={duration}
              onChangeText={setDuration}
              inputStyle={styles.input}
              inputContainerStyle={[styles.inputField, styles.outlinedInput]}
              containerStyle={styles.inputWrapper}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <MaterialIcons name="warning" size={20} color="#666" />
            <Input
              placeholder="Severity (Mild/Moderate/Severe)"
              value={severity}
              onChangeText={setSeverity}
              inputStyle={styles.input}
              inputContainerStyle={[styles.inputField, styles.outlinedInput]}
              containerStyle={styles.inputWrapper}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <MaterialIcons name="notes" size={20} color="#666" />
            <Input
              placeholder="Additional notes..."
              value={additionalNotes}
              onChangeText={setAdditionalNotes}
              multiline
              inputStyle={[styles.input, { height: 80 }]}
              inputContainerStyle={[styles.inputField, styles.outlinedInput, { height: 90 }]}
              containerStyle={styles.inputWrapper}
            />
          </View>
        </View>

        {/* Assessment Button */}
        <TouchableOpacity 
          style={styles.assessButton}
          onPress={handleAssessment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="doctor" size={20} color="white" />
              <Text style={styles.assessButtonText}>Analyze Symptoms</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Results Section */}
        {results && (
          <Animatable.View 
          animation="fadeInUp"
          duration={600}
          style={[styles.card, styles.resultsCard]}
        >
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Assessment Results</Text>
              <View style={styles.resultsBadge}>
                <Text style={styles.resultsBadgeText}>{results.length} conditions found</Text>
              </View>
            </View>
            
            {results.map((condition, index) => (
              <View 
                key={index}
                style={styles.conditionContainer}
              >
                <View style={styles.conditionHeader}>
                  <View style={[
                    styles.severityIndicator,
                    { backgroundColor: getProbabilityColor(condition.probability) }
                  ]}>
                    <MaterialCommunityIcons 
                      name={getSeverityIcon(condition.probability)} 
                      size={16} 
                      color="#fff" 
                    />
                  </View>
                  <Text style={styles.conditionName}>{condition.name}</Text>
                </View>
                
                <Text style={styles.conditionDescription}>{condition.description}</Text>
                
                <View style={styles.recommendationsContainer}>
                  <Text style={styles.recommendationsTitle}>Recommended Actions</Text>
                  <View style={styles.recommendationsList}>
                    {condition.recommendations.map((recommendation, idx) => (
                      <View key={idx} style={styles.recommendationItem}>
                        <View style={styles.bulletPoint} />
                        <Text style={styles.recommendationText}>{recommendation}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={styles.disclaimerContainer}>
      <Text style={styles.disclaimerText}>
        <Text style={{ fontWeight: 'bold' }}>Disclaimer: </Text>
        This assessment is for informational purposes only and is not a substitute for professional medical advice. Always consult a healthcare provider for proper diagnosis and treatment.
      </Text>
    </View>
              </View>
            ))}

            <TouchableOpacity 
              style={styles.consultButton}
              onPress={() => navigation.navigate('DoctorConsultation')}
            >
              <MaterialCommunityIcons name="account-tie" size={20} color="white" />
              <Text style={styles.consultButtonText}>Consult a Specialist</Text>
            </TouchableOpacity>
          </Animatable.View>
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
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20, // Adjust paddingTop based on platform
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginHorizontal: -4,
  },
  symptomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  symptomText: {
    fontSize: 14,
    marginLeft: 8,
    color: '#333',
    fontWeight: '500',
  },
  selectedSymptomText: {
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputWrapper: {
    flex: 1,
    paddingHorizontal: 0,
    marginLeft: 8,
  },
  input: {
    fontSize: 15,
    color: '#333',
    paddingVertical: 8,
  },
  inputField: {
    borderBottomWidth: 0,
    paddingHorizontal: 0,
  },
  assessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A86FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#3A86FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  assessButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
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
  conditionContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  conditionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  severityIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  conditionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  conditionDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
    lineHeight: 20,
  },
  recommendationsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  recommendationsList: {
    marginLeft: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3A86FF',
    marginTop: 7,
    marginRight: 12,
  },
  recommendationText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
    lineHeight: 20,
  },
  consultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06D6A0',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  consultButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  inputField: {
    borderBottomWidth: 0,
    paddingHorizontal: 0,
  },
  outlinedInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  disclaimerContainer: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
    padding: 12,
    marginBottom: 16,
    borderRadius: 4,
  },
  disclaimerText: {
    fontSize: 13,
    color: '#d32f2f',
    lineHeight: 18,
  },
  disclaimerText: {
    fontSize: 13,
    color: '#d32f2f',
    fontWeight: 'bold',
    lineHeight: 18,
  },

});

export default DiseaseDetectionScreen;