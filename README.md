# EGourd (Thesis Project)

EGourd is an AI-driven ecosystem designed to revolutionize gourd farming and research. It provides tools for species identification, harvest prediction, and data-driven community management.

## Overview

The project consists of a mobile application for on-the-go field use and a web-based administrative dashboard for data analysis and system management.

## Key Features

| Feature | Description |
|:---|:---|
| **Instant Identification** | Accurately identify gourd species and flower gender (male/female) using on-device AI. |
| **Harvest Prediction** | AI-powered analysis of fruit growth to estimate optimal harvest timing. |
| **Pollination Tracking** | Monitor pollination events and track growth progress of individual gourds. |
| **Community Forum** | Share insights and discuss findings with other researchers and farmers. |
| **News & Updates** | Stay informed with the latest agricultural news and project updates. |
| **Admin Dashboard** | Comprehensive web interface for user management, data analytics, and content moderation. |

## Tech Stack

### Mobile Application
- **Framework:** React Native (Expo)
- **AI Engine:** TensorFlow Lite (On-device)
- **UI:** React Native Paper
- **State Management:** Zustand & Async Storage

### Backend Services
- **Runtime:** Node.js (Express.js)
- **Database:** MongoDB & SQL
- **AI Integration:** Google Gemini API
- **Authentication:** JWT & Google OAuth
- **Media Storage:** Cloudinary

### Web Dashboard
- **Framework:** React (Vite)
- **Analytics:** Recharts
- **Icons:** Lucide-React

## Quick Start

### Backend
1. Navigate to `backend`
2. Run `npm install`
3. Configure `.env` file
4. Run `npm run dev`

### Mobile App
1. Navigate to `frontend/mobile-app`
2. Run `npm install`
3. Configure `.env` with your computer's IP address
4. Run `npx expo run:android`

## Developer Documentation

For detailed setup instructions, prerequisites, and troubleshooting, please refer to the [Developer Guide (README_DEV.md)](./README_DEV.md).