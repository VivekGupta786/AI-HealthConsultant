import { GoogleGenerativeAI } from '@google/generative-ai';

import { config } from '../config/env';

// Initialize the Gemini API with the API key from environment configuration
const genAI = new GoogleGenerativeAI(config.geminiApiKey, { apiVersion: 'v1' });

// Common function to process image data
const prepareImageData = (imageBase64) => ({
  inlineData: {
    data: imageBase64,
    mimeType: 'image/jpeg'
  }
});

// Function to extract medicine name from image
const extractMedicineName = async (model, imageData) => {
  const prompt = `You are a medical expert. Please analyze this medicine package image and extract ONLY the medicine name/brand name. Return just the name, nothing else.`;
  const result = await model.generateContent([prompt, imageData]);
  const response = await result.response;
  const medicineName = response.text().trim();
  console.log('Extracted medicine name:', medicineName);
  return medicineName;
};

// Function to get detailed medicine information
const getMedicineDetails = async (model, medicineName) => {
  const prompt = `As a medical expert, analyze and provide detailed information about the medicine "${medicineName}".

Provide the information in this EXACT format (include the numbers and maintain exact section titles):
1. Active ingredients: [List the main active ingredients]
2. Primary uses: [List the main medical conditions or symptoms this medicine treats]
3. Recommended dosage: [Provide standard dosing information]
4. Side effects: [List common and serious side effects]
5. Warnings and precautions: [List important warnings and safety information]

Be specific and detailed in your response while maintaining this exact structure.`;

  try {
    console.log("Sending request to Gemini...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    if (!response) {
      throw new Error("Invalid response from Gemini API");
    }

    const details = response.text();
    console.log("Received from Gemini:", details);

    if (!details || typeof details !== 'string') {
      throw new Error("Invalid response format from Gemini API");
    }

    // Improved section extraction with better error handling
    const extractSection = (label, text) => {
      try {
        const sectionRegex = new RegExp(`${label}:\s*([^\n]*(?:\n(?!\d+\.).*)*)`,'s');
        const match = text.match(sectionRegex);
        if (!match || !match[1]) {
          console.warn(`Section ${label} not found or empty`);
          return 'Information not available';
        }
        return match[1].trim().split('\n').map(line => line.trim()).filter(Boolean).join('\n');
      } catch (error) {
        console.error(`Error extracting section ${label}:`, error);
        return 'Information not available';
      }
    };

    const medicineInfo = {
      name: medicineName,
      ingredients: extractSection('1. Active ingredients', details),
      uses: extractSection('2. Primary uses', details),
      dosage: extractSection('3. Recommended dosage', details),
      sideEffects: extractSection('4. Side effects', details),
      warnings: extractSection('5. Warnings and precautions', details)
    };

    // Validate extracted information
    Object.entries(medicineInfo).forEach(([key, value]) => {
      if (!value || value === 'Information not available') {
        console.warn(`Warning: ${key} information is missing or invalid`);
      }
    });

    return medicineInfo;

  } catch (error) {
    console.error('Error fetching medicine details:', error.message);
    return {
      name: medicineName,
      ingredients: `Error fetching data: ${error.message}`,
      uses: `Error fetching data: ${error.message}`,
      dosage: `Error fetching data: ${error.message}`,
      sideEffects: `Error fetching data: ${error.message}`,
      warnings: `Error fetching data: ${error.message}`
    };
  }
};


// Helper function to extract sections from the response
const extractSection = (text, sectionName) => {
  const sections = text.split(/\d+\./g);
  const sectionIndex = sections.findIndex(s => s.trim().toLowerCase().startsWith(sectionName.toLowerCase()));
  if (sectionIndex === -1) return "Information not available";
  const nextSection = sections[sectionIndex + 1];
  const content = sections[sectionIndex].replace(sectionName, "").trim();
  return content;
};

// Function to analyze medicine image and get information
export const analyzeMedicineImage = async (imageBase64) => {
  try {
    // Get the generative model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Validate image data
    if (!imageBase64 || imageBase64.length === 0) {
      throw new Error('Invalid image data provided');
    }
    
    if (imageBase64.length > 4 * 1024 * 1024) { // 4MB limit
      throw new Error('Image size too large. Please use a smaller image or reduce image quality');
    }

    // Prepare image data
    const imageData = prepareImageData(imageBase64);

    // First, extract medicine name from the image
    const medicineName = await extractMedicineName(model, imageData);
    
    // Then, get detailed information about the medicine
    const medicineDetails = await getMedicineDetails(model, medicineName);
    
    return medicineDetails;
  } catch (error) {
    console.error('Error analyzing medicine image:', error);
    throw error;
  }
};

// Helper function to parse the AI response into structured data
const parseMedicineInfo = (text) => {
  const info = {
    name: '',
    ingredients: '',
    uses: '',
    dosage: '',
    sideEffects: '',
    warnings: ''
  };

  try {
    const sections = text.split(/\d+\.\s+/).filter(Boolean);
    const sectionMap = {
      'Active ingredients': 'ingredients',
      'Primary uses': 'uses',
      'Recommended dosage': 'dosage',
      'Side effects': 'sideEffects',
      'Warnings and precautions': 'warnings'
    };

    sections.forEach(section => {
      const lines = section.trim().split('\n');
      const firstLine = lines[0].toLowerCase();
      
      for (const [key, value] of Object.entries(sectionMap)) {
        if (firstLine.includes(key.toLowerCase())) {
          info[value] = lines.slice(1).join('\n').trim() || firstLine.split(':')[1]?.trim() || 'Information not available';
          break;
        }
      }
    });

    return info;
  } catch (error) {
    console.error('Error parsing medicine information:', error);
    return info;
  }
};

// Function to analyze disease symptoms and provide diagnosis
export const analyzeDisease = async (symptoms) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `Analyze the following symptoms and provide a detailed medical analysis and give answers briefly:
${symptoms}

Please include:
1. Possible conditions (in brief)
2. Severity level
3. Recommended actions
4. When to seek immediate medical attention`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error analyzing disease symptoms:', error);
    throw error;
  }
};

// Function to analyze drug interactions and provide safety information
export const analyzeDrugInteraction = async (drugs) => {
  try {
    console.log('Starting drug interaction analysis for:', drugs);
    if (!Array.isArray(drugs) || drugs.length === 0) {
      console.error('Invalid input: drugs array is empty or not an array');
      throw new Error('Invalid input: drugs must be a non-empty array');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `As a medical expert, analyze the following drug(s) and provide detailed information:
${drugs.join('\n')}

Provide a detailed analysis in this EXACT format. For each section, provide specific, detailed information:

1. Drug Overview: Provide a clear, detailed description of the drug's primary purpose and classification
2. Active Ingredients: List each main active ingredient with its purpose
3. Common Uses: List each specific medical condition or symptom this drug treats
4. Side Effects: List both common and serious side effects, clearly labeled
5. Precautions: List specific warnings, contraindications, and safety information
6. Interactions: For each interaction, provide:
   - Drug/Substance: Name of interacting substance
   - Severity: Specify as "High", "Moderate", or "Low"
   - Description: Brief explanation of the interaction
   - Recommendation: Specific guidance for managing the interaction
7. Recommendations: Provide specific usage guidelines, dosing information, and best practices

Be thorough and specific in your response while maintaining this exact structure. For each section after Drug Overview, provide the information as a bulleted list using dashes (-). For interactions, ensure each entry includes all four components (Drug/Substance, Severity, Description, Recommendation).`;

    console.log('Sending prompt to Gemini API:', prompt);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log('Received raw response from Gemini API:', text);

    // Parse the response into sections
    const sections = text.split(/\d+\.\s+/).filter(Boolean);
    const info = {
      description: 'No description available',
      ingredients: [],
      uses: [],
      sideEffects: [],
      precautions: [],
      interactions: [],
      recommendations: []
    };

    const sectionMap = {
      'Drug Overview': 'description',
      'Active Ingredients': 'ingredients',
      'Common Uses': 'uses',
      'Side Effects': 'sideEffects',
      'Precautions': 'precautions',
      'Interactions': 'interactions',
      'Recommendations': 'recommendations'
    };

    sections.forEach(section => {
      const sectionText = section.trim();
      for (const [key, value] of Object.entries(sectionMap)) {
        if (sectionText.startsWith(key)) {
          const content = sectionText.substring(key.length).replace(':', '').trim();
          if (content) {
            if (value === 'description') {
              info[value] = content;
            } else {
              let items = [];
              if (value === 'interactions') {
                // Parse interactions with severity levels
                items = content.split(/\n(?=-)/).filter(Boolean).map(block => {
                  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
                  const interaction = {
                    drug: 'Not specified',
                    severity: 'Medium', // Default severity level
                    description: 'Not specified',
                    recommendation: 'Not specified'
                  };
                  
                  lines.forEach(line => {
                    line = line.replace(/^[-•\s]+/, '').trim();
                    if (line.startsWith('Drug/Substance:')) {
                      interaction.drug = line.replace('Drug/Substance:', '').trim();
                    } else if (line.startsWith('Severity:')) {
                      const severityText = line.replace('Severity:', '').trim().toLowerCase();
                      // Normalize severity levels
                      if (severityText.includes('high')) {
                        interaction.severity = 'High';
                      } else if (severityText.includes('low')) {
                        interaction.severity = 'Low';
                      } else {
                        interaction.severity = 'Medium';
                      }
                    } else if (line.startsWith('Description:')) {
                      interaction.description = line.replace('Description:', '').trim();
                    } else if (line.startsWith('Recommendation:')) {
                      interaction.recommendation = line.replace('Recommendation:', '').trim();
                    }
                  });
                  
                  return interaction;
                });
              } else {
                items = content
                  .split(/\n|(?=-)/) // Split by newlines or before dashes
                  .map(item => item.trim())
                  .filter(item => item && !item.match(/^\s*$/))
                  .map(item => item.replace(/^[-•\s]+/, '').trim()) // Remove leading dashes and spaces
                  .filter(Boolean);
              }
              info[value] = items;
            }
          }
          break;
        }
      }
    });

    // Ensure we have at least some basic information
    if (!info.description || info.description === 'No description available') {
      const drugName = drugs[0];
      info.description = `Analysis results for ${drugName}. Please consult a healthcare professional for complete information.`;
    }

    // Ensure all arrays have at least one item
    Object.keys(info).forEach(key => {
      if (Array.isArray(info[key]) && info[key].length === 0) {
        info[key] = ['Information not available'];
      }
    });

    console.log('Processed drug information:', info);
    return info;

  } catch (error) {
    console.error('Error analyzing drug:', error);
    console.error('Error details:', error.message);
    throw error;
  }
};

