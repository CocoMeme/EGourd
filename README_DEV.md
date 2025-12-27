# Developer Setup Guide

This guide provides instructions for setting up the development environment for the EGourd project.

## Prerequisites

Before starting, ensure you have the following installed:
- Node.js (v18 or higher recommended)
- npm or yarn
- Android Studio (for Android SDK and platform tools)
- Java Development Kit (JDK)
- adb (Android Debug Bridge)

## Environment Preparation

### Mobile Device Setup
1. Enable Developer Options: Go to Settings > About Phone and tap "Build Number" 7 times.
2. Enable USB Debugging: Go to Settings > Developer Options and turn on "USB Debugging".
3. Connect your Android device to your computer via USB.
4. Verify connection:
   ```bash
   adb devices
   ```
   Your device should be listed.

### Network Requirements
- Both your computer and Android device must be on the same WiFi network.
- You must use your computer's local IP address for the backend connection, not `localhost`.

## Installation

### 1. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` folder based on `.env.example`.

### 2. Mobile App Setup
Navigate to the mobile app directory and install dependencies:
```bash
cd frontend/mobile-app
npm install
```

## Configuration

### Backend URL Configuration
You must update the backend URL to match your computer's IP address.

1. Find your IPv4 address:
   ```bash
   ipconfig
   ```
   (Example: 192.168.1.66)

2. Update `frontend/mobile-app/.env`:
   ```env
   EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:5000/api
   ```
   Replace `YOUR_IP_ADDRESS` with your actual IP.

## Running the Application

### Step 1: Start Backend Server
```bash
cd backend
npm run dev
```
The server will run on port 5000.

### Step 2: Build and Run Mobile App
```bash
cd frontend/mobile-app
npx expo run:android
```
Note: The first build may take 5-10 minutes.

### Development Workflow
After the initial build, you can use the faster development workflow:
1. Start the backend: `npm run dev` in the `backend` directory.
2. Start the Metro bundler: `npx expo start --dev-client` in the `frontend/mobile-app` directory.

## Troubleshooting

### Network Connection Issues
- Ensure both devices are on the same WiFi network.
- Verify the IP address in `frontend/mobile-app/.env` matches your computer's current IP.
- Check that the backend server is running and accessible.

### Build Failures
If the build fails, try cleaning the node modules:
```bash
cd frontend/mobile-app
rm -rf node_modules
npm install
npx expo run:android
```

### Device Not Detected
- Check the USB cable and connection.
- Ensure USB debugging is enabled and authorized on the device.
