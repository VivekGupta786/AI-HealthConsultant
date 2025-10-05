import React, { useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { AuthProvider } from './src/contexts/AuthContext';
import HomeScreen from './src/screens/HomeScreen';
import MedicineScannerScreen from './src/screens/MedicineScannerScreen';
import UrgentAssistanceScreen from './src/screens/UrgentAssistanceScreen';
import DoctorConsultationScreen from './src/screens/DoctorConsultationScreen';
import DrugAnalysisScreen from './src/screens/DrugAnalysisScreen';
import DiseaseDetectionScreen from './src/screens/DiseaseDetectionScreen';
import PrescriptionScreen from './src/screens/PrescriptionScreen';

export default function App() {
  const [navigationStack, setNavigationStack] = useState(['Home']);
  const [screenProps, setScreenProps] = useState({});

  const navigate = (screen, props = {}) => {
    setScreenProps(props);
    setNavigationStack([...navigationStack, screen]);
  };

  const goBack = () => {
    if (navigationStack.length > 1) {
      const newStack = [...navigationStack];
      newStack.pop();
      setNavigationStack(newStack);
      setScreenProps({});
    }
  };

  const currentScreen = navigationStack[navigationStack.length - 1];

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Home':
        return <HomeScreen navigation={{ navigate, goBack }} />;
      case 'MedicineScanner':
        return <MedicineScannerScreen navigation={{ goBack }} {...screenProps} />;
      case 'UrgentAssistance':
        return <UrgentAssistanceScreen navigation={{ goBack }} {...screenProps} />;
      case 'DoctorConsultation':
        return <DoctorConsultationScreen navigation={{ goBack }} {...screenProps} />;
      case 'DrugAnalysis':
        return <DrugAnalysisScreen navigation={{ goBack }} {...screenProps} />;
      case 'DiseaseDetection':
        return <DiseaseDetectionScreen navigation={{ goBack }} {...screenProps} />;
      case 'Prescription':
        return <PrescriptionScreen navigation={{ goBack }} {...screenProps} />;
      default:
        return <HomeScreen navigation={{ navigate, goBack }} />;
    }
  };

  return (
    <AuthProvider>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2089dc" />
        {renderScreen()}
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: StatusBar.currentHeight || 0
  }
});