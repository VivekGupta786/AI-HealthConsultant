# AI Health Consultant

<p align="center">
  <img src="./assets/icon.png" alt="AI Health Consultant Logo" width="200"/>
</p>

## Overview

AI Health Consultant is a comprehensive mobile application designed to provide users with AI-powered health services. The application leverages artificial intelligence to offer features such as medicine scanning, disease detection, drug analysis, and more, making healthcare information more accessible to users.

## Features

### Medicine Scanner
- Scan medicine packages using your device camera
- Get detailed information about medicines including ingredients, uses, dosage, and side effects
- Save scanned medicines to your personal medicine cabinet

### Disease Detection
- Input symptoms through an intuitive interface
- Receive AI-powered disease detection and analysis
- Get recommendations based on symptom assessment

### Doctor Consultation
- Find doctors near your location using Google Maps integration
- View doctor information and availability
- Get directions or call doctors directly from the app

### Drug Analysis
- Analyze drugs for detailed information
- Check for potential drug interactions
- View precautions and recommendations

### Urgent Assistance
- Request urgent medical help
- Get emergency assessment for critical situations
- Access emergency contact numbers

### Prescription Management
- Securely upload and store prescriptions digitally using Firebase Storage
- Manage and view prescription history
- Doctors can issue digital prescriptions

## Technology Stack

- **Frontend**: React Native with Expo
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **AI Services**: Google Gemini API for medicine analysis and disease detection
- **Maps Integration**: Google Maps API for location-based doctor search
- **Localization**: i18n-js for multi-language support

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- Firebase account
- Google Gemini API key
- Google Maps API key

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/AI_HealthConsultant.git
   cd AI_HealthConsultant
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your API keys (see `.env.example` for reference):
   ```
   FIREBASE_API_KEY=your_firebase_api_key
   FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   FIREBASE_APP_ID=your_firebase_app_id
   FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Use the Expo Go app on your mobile device to scan the QR code, or run on an emulator.

## Usage

### Authentication

The app uses Firebase Authentication for secure user management:

- Register with email and password
- Login with existing credentials
- Reset password functionality
- Profile management

### Scanning Medicines

1. Navigate to the Medicine Scanner screen
2. Allow camera permissions when prompted
3. Point your camera at the medicine package
4. View the detailed analysis of the medicine

### Finding Doctors

1. Navigate to the Doctor Consultation screen
2. Allow location permissions when prompted
3. View doctors near your location on the map
4. Tap on a marker to view doctor details
5. Call or get directions with a single tap

### Managing Prescriptions

1. Navigate to the Prescription screen
2. Login to access your prescriptions
3. Upload new prescriptions using your camera or gallery
4. View your prescription history

## Project Structure

```
AI_HealthConsultant/
├── assets/                 # Images, icons, and other static assets
├── src/
│   ├── components/         # Reusable UI components
│   ├── config/             # Configuration files (Firebase, API keys)
│   ├── contexts/           # React contexts (Auth)
│   ├── navigation/         # Navigation configuration
│   ├── screens/            # Application screens
│   └── utils/              # Utility functions and API services
├── App.js                  # Main application component
├── index.js               # Entry point
└── package.json           # Dependencies and scripts
```

## Firebase Configuration

The application uses Firebase for authentication, database, and storage. The configuration is set up in `src/config/firebase.js`.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Firebase](https://firebase.google.com/) for authentication and data storage
- [Google Gemini API](https://ai.google.dev/) for AI-powered analysis
- [Google Maps Platform](https://developers.google.com/maps) for location services
- [Expo](https://expo.dev/) for React Native development
- [React Native Elements](https://reactnativeelements.com/) for UI components
