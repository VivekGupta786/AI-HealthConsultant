import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import { Alert } from 'react-native';

// Create a new I18n instance
const i18n = new I18n();

// Supported languages with their display names
export const supportedLanguages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
];

// UI translations
i18n.translations = {
  en: {
    drugAnalysis: 'Drug Analysis',
    enterDrugName: 'Enter drug name (e.g., Ibuprofen)',
    analyze: 'Analyze',
    primaryUses: 'Primary Uses',
    activeIngredients: 'Active Ingredients',
    sideEffects: 'Side Effects',
    precautions: 'Precautions',
    keyRecommendations: 'Key Recommendations',
    importantDisclaimer: 'Important Disclaimer',
    disclaimerText: 'This information is for general knowledge and does not constitute medical advice. Always consult a healthcare professional for any health concerns or before starting, stopping, or altering any treatment, including medication. The specific dosage and usage instructions may vary depending on individual needs and medical conditions. This information is not exhaustive and may not cover all possible side effects, interactions, or precautions.',
    noDescription: 'No description available',
    translationFailed: 'Translation failed. Showing original text.',
    noConnection: 'No internet connection. Translation unavailable.',
    selectLanguage: 'Select Language',
    close: 'Close',
    longTextWarning: 'Long Text Notice',
    onlyFirst500Chars: 'Only the first 500 characters will be translated due to API limitations.',
    chunkedTranslationFailed: 'Partial translation may be incomplete.',
  },
};

// Set default locale
i18n.locale = Localization.locale;
i18n.fallbacks = true;

// Check network connection
const checkConnection = async () => {
  try {
    const response = await fetch('https://www.google.com', { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Helper function to split text into chunks
const chunkText = (text, maxLength = 500) => {
  if (text.length <= maxLength) return [text];
  
  const chunks = [];
  let currentChunk = '';
  
  // First try to split by sentences
  const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      // If single sentence is too long, split by words
      if (sentence.length > maxLength) {
        const words = sentence.split(' ');
        let wordChunk = '';
        for (const word of words) {
          if ((wordChunk + word).length <= maxLength) {
            wordChunk += word + ' ';
          } else {
            if (wordChunk) chunks.push(wordChunk.trim());
            wordChunk = word + ' ';
          }
        }
        if (wordChunk) chunks.push(wordChunk.trim());
      } else {
        currentChunk = sentence;
      }
    }
  }
  
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
};

// Function to translate text using MyMemory API with chunking
export const translateText = async (text, targetLang) => {
  if (!text || targetLang === 'en') return text;
  
  const isConnected = await checkConnection();
  if (!isConnected) {
    throw new Error(i18n.t('noConnection'));
  }

  try {
    const chunks = chunkText(text);
    
    // If we only have one chunk (original text was short)
    if (chunks.length === 1) {
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunks[0])}&langpair=en|${targetLang}`
      );
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.responseStatus !== 200) {
        throw new Error(data.responseDetails || 'Translation failed');
      }

      return data.responseData.translatedText || text;
    }
    
    // For multiple chunks
    const translatedChunks = await Promise.all(
      chunks.map(async (chunk, index) => {
        try {
          const response = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|${targetLang}`
          );
          
          if (!response.ok) {
            console.warn(`Failed to translate chunk ${index}`);
            return chunk; // Return original if fails
          }

          const data = await response.json();
          
          if (data.responseStatus !== 200) {
            console.warn(`Translation failed for chunk ${index}`);
            return chunk;
          }

          return data.responseData.translatedText || chunk;
        } catch (error) {
          console.error(`Error translating chunk ${index}:`, error);
          return chunk;
        }
      })
    );
    
    // Join all chunks and clean up any odd spacing
    const fullTranslation = translatedChunks.join(' ').replace(/\s+/g, ' ').trim();
    
    // Verify if any chunks failed to translate
    const failedChunks = translatedChunks.filter((t, i) => t === chunks[i]).length;
    if (failedChunks > 0) {
      console.warn(`${failedChunks} chunks failed to translate`);
      Alert.alert(
        i18n.t('translationFailed'),
        i18n.t('chunkedTranslationFailed')
      );
    }
    
    return fullTranslation;
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
};

// Function to translate an entire drug info object
export const translateDrugInfo = async (drugInfo, targetLang) => {
  if (!drugInfo || targetLang === 'en') return drugInfo;
  
  try {
    const translatedInfo = { ...drugInfo };
    
    // Translate description with chunking support
    if (translatedInfo.description) {
      try {
        translatedInfo.description = await translateText(translatedInfo.description, targetLang);
      } catch (error) {
        console.error('Error translating description:', error);
        Alert.alert(i18n.t('translationFailed'), error.message);
      }
    }
    
    // Translate all arrays
    const fieldsToTranslate = ['ingredients', 'uses', 'sideEffects', 'precautions', 'recommendations'];
    for (const field of fieldsToTranslate) {
      if (translatedInfo[field] && Array.isArray(translatedInfo[field])) {
        translatedInfo[field] = await Promise.all(
          translatedInfo[field].map(async (item) => {
            try {
              return await translateText(item, targetLang);
            } catch (error) {
              console.error(`Error translating ${field} item:`, error);
              return item; // Return original if translation fails
            }
          })
        );
      }
    }
    
    return translatedInfo;
  } catch (error) {
    console.error('Error translating drug info:', error);
    throw error;
  }
};

export default i18n;