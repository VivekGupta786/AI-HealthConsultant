import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  ActivityIndicator, 
  TouchableOpacity, 
  Dimensions, 
  Text,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Input } from '@rneui/themed';
import { analyzeDrugInteraction } from '../utils/geminiApi';
import * as Animatable from 'react-native-animatable';
import Modal from 'react-native-modal';
import I18n, { supportedLanguages, translateText, translateDrugInfo } from '../utils/translation';

const { width } = Dimensions.get('window');

const DrugAnalysisScreen = ({ navigation }) => {
  const [drugName, setDrugName] = useState('');
  const [drugInfo, setDrugInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [translatedUI, setTranslatedUI] = useState(I18n.translations.en);

  const cleanText = (text) => {
    if (!text || typeof text !== 'string') return null;
    
    let cleaned = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/`/g, '')
      .replace(/#+\s*/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/\n{2,}/g, '\n')
      .replace(/\s{2,}/g, ' ')
      .trim();

    cleaned = cleaned
      .split('\n')
      .filter(line => line.trim().length > 0 && !line.match(/^[-*]\s*$/))
      .join('\n');

    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      if (!/[.!?]$/.test(cleaned)) {
        cleaned += '.';
      }
      return cleaned;
    }
    
    return null;
  };

  const translateUIElements = async (lang) => {
    if (lang === 'en') {
      setTranslatedUI(I18n.translations.en);
      return;
    }

    try {
      setIsTranslating(true);
      
      const translations = await Promise.all([
        translateText('Drug Analysis', lang).catch(() => 'Drug Analysis'),
        translateText('Enter drug name (e.g., Ibuprofen)', lang).catch(() => 'Enter drug name (e.g., Ibuprofen)'),
        translateText('Analyze', lang).catch(() => 'Analyze'),
        translateText('Primary Uses', lang).catch(() => 'Primary Uses'),
        translateText('Active Ingredients', lang).catch(() => 'Active Ingredients'),
        translateText('Side Effects', lang).catch(() => 'Side Effects'),
        translateText('Precautions', lang).catch(() => 'Precautions'),
        translateText('Key Recommendations', lang).catch(() => 'Key Recommendations'),
        translateText('Important Disclaimer', lang).catch(() => 'Important Disclaimer'),
        translateText(I18n.t('disclaimerText'), lang).catch(() => I18n.t('disclaimerText')),
        translateText('No description available', lang).catch(() => 'No description available'),
        translateText('Select Language', lang).catch(() => 'Select Language'),
        translateText('Close', lang).catch(() => 'Close'),
      ]);

      setTranslatedUI({
        drugAnalysis: translations[0],
        enterDrugName: translations[1],
        analyze: translations[2],
        primaryUses: translations[3],
        activeIngredients: translations[4],
        sideEffects: translations[5],
        precautions: translations[6],
        keyRecommendations: translations[7],
        importantDisclaimer: translations[8],
        disclaimerText: translations[9],
        noDescription: translations[10],
        selectLanguage: translations[11],
        close: translations[12],
      });
    } catch (error) {
      Alert.alert('Translation Error', error.message || 'Failed to translate UI elements');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleLanguageChange = async (langCode) => {
    setCurrentLanguage(langCode);
    setShowLanguageModal(false);
    
    try {
      setIsTranslating(true);
      await translateUIElements(langCode);
      
      if (drugInfo) {
        const translatedDrugInfo = await translateDrugInfo(drugInfo, langCode);
        setDrugInfo(translatedDrugInfo);
      }
    } catch (error) {
      Alert.alert('Translation Error', error.message || 'Failed to translate content');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDrugSearch = async () => {
    if (!drugName) {
      Alert.alert('Required Field', 'Please enter a drug name');
      return;
    }
  
    setIsLoading(true);
    try {
      const drugDetails = await analyzeDrugInteraction([drugName]);
      
      const processArray = (arr) => {
        if (!Array.isArray(arr)) return [];
        return arr
          .map(cleanText)
          .filter(item => item !== null && item.trim().length > 0)
          .filter(item => !item.toLowerCase().includes('disclaimer') && !item.toLowerCase().includes('note:'));
      };
  
      const info = {
        name: cleanText(drugName) || drugName,
        description: cleanText(drugDetails.description) || translatedUI.noDescription,
        ingredients: processArray(drugDetails.ingredients),
        uses: processArray(drugDetails.uses),
        sideEffects: processArray(drugDetails.sideEffects),
        precautions: processArray(drugDetails.precautions),
        recommendations: processArray(drugDetails.recommendations),
        _original: {
          description: cleanText(drugDetails.description) || translatedUI.noDescription,
          ingredients: processArray(drugDetails.ingredients),
          uses: processArray(drugDetails.uses),
          sideEffects: processArray(drugDetails.sideEffects),
          precautions: processArray(drugDetails.precautions),
          recommendations: processArray(drugDetails.recommendations),
        }
      };
      
      setDrugInfo(info);
    } catch (error) {
      console.error('Error analyzing drug:', error);
      Alert.alert('Error', 'Failed to analyze drug. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const InfoCard = ({ title, items, iconName, iconColor, backgroundColor }) => {
    if (!items || items.length === 0) return null;
    
    return (
      <Animatable.View 
        animation="fadeInUp"
        duration={600}
        style={[styles.infoCard, { backgroundColor }]}
      >
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name={iconName} size={24} color={iconColor} />
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        <View style={styles.cardContent}>
          {items.map((item, index) => (
            <View key={index} style={styles.bulletItem}>
              <View style={[styles.bullet, { backgroundColor: iconColor }]} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>
      </Animatable.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
    {Platform.OS === 'android' && <StatusBar translucent backgroundColor="transparent" />}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{translatedUI.drugAnalysis}</Text>
        <View style={styles.headerIcons}>
          {isTranslating ? (
            <ActivityIndicator size="small" color="#4E7AC7" style={styles.translateButton} />
          ) : (
            <TouchableOpacity 
              style={styles.translateButton}
              onPress={() => setShowLanguageModal(true)}
            >
              <MaterialIcons name="translate" size={24} color="#4E7AC7" />
            </TouchableOpacity>
          )}
          <MaterialCommunityIcons name="pill" size={28} color="#4E7AC7" />
        </View>
      </View>

      <Animatable.View 
        animation="fadeInUp"
        duration={500}
        style={styles.searchContainer}
      >
        <Input
          placeholder={translatedUI.enterDrugName}
          leftIcon={<MaterialCommunityIcons name="pill" size={24} color="#4E7AC7" />}
          value={drugName}
          onChangeText={setDrugName}
          inputStyle={styles.input}
          inputContainerStyle={styles.inputField}
        />
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={handleDrugSearch}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <MaterialIcons name="search" size={20} color="white" />
              <Text style={styles.searchButtonText}>{translatedUI.analyze}</Text>
            </>
          )}
        </TouchableOpacity>
      </Animatable.View>

      {drugInfo && (
        <ScrollView style={styles.resultsContainer}>
          <Animatable.View 
            animation="fadeIn"
            duration={600}
            style={styles.drugHeader}
          >
            <MaterialCommunityIcons name="pill" size={40} color="#4E7AC7" />
            <Text style={styles.drugName}>{drugInfo.name}</Text>
            <Text style={styles.drugDescription}>{drugInfo.description}</Text>
          </Animatable.View>

          <View style={styles.infoGrid}>
            <InfoCard
              title={translatedUI.primaryUses}
              items={drugInfo.uses}
              iconName="medical-bag"
              iconColor="#4CAF50"
              backgroundColor="#F0F9F0"
            />

            <InfoCard
              title={translatedUI.activeIngredients}
              items={drugInfo.ingredients}
              iconName="flask"
              iconColor="#2196F3"
              backgroundColor="#F0F7FF"
            />

            <InfoCard
              title={translatedUI.sideEffects}
              items={drugInfo.sideEffects}
              iconName="alert-circle"
              iconColor="#FF9800"
              backgroundColor="#FFF8E6"
            />

            <InfoCard
              title={translatedUI.precautions}
              items={drugInfo.precautions}
              iconName="shield-alert"
              iconColor="#F44336"
              backgroundColor="#FFEBEE"
            />
          </View>

          {drugInfo.recommendations && drugInfo.recommendations.length > 0 && (
            <Animatable.View 
              animation="fadeInUp"
              duration={600}
              delay={300}
              style={styles.recommendationsCard}
            >
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="lightbulb-on" size={24} color="#9C27B0" />
                <Text style={styles.cardTitle}>{translatedUI.keyRecommendations}</Text>
              </View>
              <View style={styles.cardContent}>
                {drugInfo.recommendations
                  .filter(item => !item.toLowerCase().includes('disclaimer') && !item.toLowerCase().includes('note:'))
                  .map((item, index) => (
                    <View key={index} style={styles.numberedItem}>
                      <View style={[styles.number, { backgroundColor: '#9C27B0' }]}>
                        <Text style={styles.numberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.numberedText}>{item}</Text>
                    </View>
                  ))}
              </View>
            </Animatable.View>
          )}

          <Animatable.View 
            animation="fadeInUp"
            duration={600}
            delay={400}
            style={styles.disclaimerCard}
          >
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="alert-circle" size={24} color="#D32F2F" />
              <Text style={[styles.cardTitle, { color: '#D32F2F' }]}>{translatedUI.importantDisclaimer}</Text>
            </View>
            <Text style={styles.disclaimerText}>{translatedUI.disclaimerText}</Text>
          </Animatable.View>
        </ScrollView>
      )}

      <Modal
        isVisible={showLanguageModal}
        onBackdropPress={() => setShowLanguageModal(false)}
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{translatedUI.selectLanguage}</Text>
          <ScrollView style={styles.languageList}>
            {supportedLanguages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageItem,
                  currentLanguage === lang.code && styles.selectedLanguageItem
                ]}
                onPress={() => handleLanguageChange(lang.code)}
              >
                <Text style={styles.languageText}>{lang.name}</Text>
                {currentLanguage === lang.code && (
                  <MaterialIcons name="check" size={24} color="#4E7AC7" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowLanguageModal(false)}
          >
            <Text style={styles.modalCloseText}>{translatedUI.close}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    zIndex: 2,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  translateButton: {
    marginRight: 15,
  },
  searchContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    fontSize: 16,
    color: '#1F2937',
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4E7AC7',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  drugHeader: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  drugName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  drugDescription: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    textAlign: 'center',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoCard: {
    width: width > 500 ? '48%' : '100%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  cardContent: {
    paddingLeft: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 10,
  },
  bulletText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
    lineHeight: 20,
  },
  recommendationsCard: {
    backgroundColor: '#F9F5FF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  numberedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  number: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  numberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  numberedText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
    lineHeight: 20,
  },
  disclaimerCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  disclaimerText: {
    fontSize: 14,
    color: '#D32F2F',
    fontWeight: '600',
    lineHeight: 20,
  },
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#1F2937',
  },
  languageList: {
    marginBottom: 15,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectedLanguageItem: {
    backgroundColor: '#F0F7FF',
  },
  languageText: {
    fontSize: 16,
    color: '#1F2937',
  },
  modalCloseButton: {
    backgroundColor: '#4E7AC7',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DrugAnalysisScreen;