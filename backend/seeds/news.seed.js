/**
 * News Seed Data
 * Used to initialize the database with news articles
 * Can be run via: node backend/seeds/news.seed.js
 */

const newsData = [
  {
    title: "Teachable Machine + Gemini AI Integration - v2.0.0",
    description: "Introducing our groundbreaking integration of Teachable Machine real-time scanning with Gemini 2.5 Flash AI, enabling dual-model analysis for unprecedented flower classification accuracy.",
    body: `# Dual-Model AI Integration: Teachable Machine + Gemini 🚀

## Version 2.0.0 Release

We're thrilled to announce a major milestone: the seamless integration of **Teachable Machine** real-time scanning with **Google's Gemini 2.5 Flash AI**. This revolutionary approach combines the speed of on-device machine learning with the intelligence of cloud-based AI for the most accurate flower classification yet.

## What's New in v2.0.0

### Dual-Model Architecture

**Teachable Machine Model:**
- Real-time flower classification on your device
- 7 gourd flower classes (Ampalaya Bilog Male/Female, Patola Male/Female, Upo Smooth Male/Female, Not Flower)
- Lightning-fast predictions (200ms interval)
- Privacy-focused: all processing happens locally

**Gemini 2.5 Flash AI:**
- Advanced visual intelligence for verification
- Detailed flower analysis (gender, maturity, health)
- Harvest prediction and quality metrics
- Reasoning and explanation for predictions

## Key Features

### 🎯 Smart Frame Selection
✅ **Stability Detection** - Captures the most confident, stable predictions
✅ **Best Frame Algorithm** - Selects frames where predictions are consistent (3+ consecutive same label)
✅ **Confidence Threshold** - Only uses frames above 50% confidence
✅ **Intelligent Fallback** - Uses last frame if no stable prediction found

### 🤖 Dual AI Analysis
✅ **Teachable Machine** - Fast, on-device classification
✅ **Gemini 2.5 Flash** - Advanced verification and detailed analysis
✅ **Consensus Logic** - Compares results and recommends best prediction
✅ **Quality Metrics** - Health score, pollination potential, harvest timeline

### 📊 Rich Analysis Results
✅ **Flower Classification** - Species and gender identification
✅ **Growth Stage** - Current maturity level (seedling, bloom, peak, mature)
✅ **Health Assessment** - Overall plant health (0-100 score)
✅ **Harvest Prediction** - Days to harvest and readiness status
✅ **Quality Indicators** - Petal condition, pollination readiness
✅ **Key Features** - Visual characteristics identified by AI

### ⚡ Performance Improvements
✅ **Instant Capture** - Uses cached frames from real-time scanning
✅ **Fast Analysis** - Results in 15-20 seconds
✅ **Optimized Models** - Gemini 2.5 Flash for speed and accuracy
✅ **Responsive UI** - Loading states and smooth animations

## How It Works

### 1. Real-Time Scanning Phase
\`\`\`
Camera Feed → Teachable Machine → Prediction (200ms intervals)
                                   ↓
                           Track Last 5 Predictions
                                   ↓
                    Identify Stable Predictions (3+ same label)
                                   ↓
                    Save Best Stable Frame (highest confidence)
\`\`\`

### 2. Capture Phase
\`\`\`
User Taps Capture → Select Best Stable Frame
                    (or fallback to last frame)
                          ↓
                Navigate to Results Screen
\`\`\`

### 3. Analysis Phase
\`\`\`
TM Prediction → Gemini AI Analysis → Results Screen
     ↓                ↓
 TM Data      Gemini Data (detailed analysis)
     ↓                ↓
  Comparison → Consensus Recommendation
                     ↓
            Display Rich Visualizations
\`\`\`

## Technical Specifications

### Teachable Machine Model
- **Framework**: TensorFlow Lite (float32)
- **Classes**: 7 gourd flower types
- **Inference**: ~40ms per frame
- **Deployment**: On-device (no internet required)
- **Accuracy**: 85%+ on test dataset

### Gemini Integration
- **Model**: gemini-2.5-flash (latest free tier)
- **Temperature**: 0.3 (consistent, factual responses)
- **Max Tokens**: 2048
- **Response Format**: Structured JSON
- **Processing Time**: 15-20 seconds

### Frame Selection Strategy
- **Interval**: 200ms (5 predictions per second)
- **Recent History**: Last 5 predictions tracked
- **Stability Window**: 3 consecutive same predictions
- **Confidence Threshold**: ≥50% for best frame usage
- **Fallback**: Uses last frame if no stable prediction

## Real-World Testing Results

### Test 1: Ampalaya Bilog Female
- **TM Prediction**: Ampalaya Bilog Female (85.3%)
- **Gemini Prediction**: Ampalaya Bilog Female (98%)
- **Result**: ✅ Correct - Perfect agreement!
- **Quality Score**: 90/100
- **Harvest Timeline**: 18 days to harvest

### Test 2: Patola Male
- **TM Prediction**: Patola Male (best frame ~90%)
- **Gemini Prediction**: Patola Male (90%)
- **Result**: ✅ Correct - Both models agree!
- **Quality Score**: 90/100
- **Harvest Timeline**: 0 days (peak bloom)

### Test 3: Non-Flower Object
- **TM Prediction**: Not Flower (100%)
- **Gemini Prediction**: Not Flower (100%)
- **Result**: ✅ Correct - Perfect rejection!
- **Reasoning**: "Electronic device detected, no plant material"

## User Experience Improvements

### Visual Feedback
- 🟢 **Green Glow** on capture button when prediction is stable
- 📊 **Real-time bars** showing top 3 predictions
- 📱 **Loading overlay** during analysis with progress indicator
- ✨ **Fade-in animations** for smooth transitions

### Guidance
- **Default**: "Hold steady for best results"
- **Stable**: "✓ Stable detection - Tap to capture!"
- **Model Loading**: "Loading model..."
- **Waiting**: "Waiting for predictions..."

## Benefits

### For Farmers & Gardeners
- 🌱 **Accurate Identification** - Know exactly what you're growing
- 🏥 **Health Monitoring** - Catch issues early with quality assessment
- 📅 **Harvest Planning** - Know when your flowers are ready
- 📸 **Quick Scanning** - Get results in seconds

### For Researchers
- 📊 **Detailed Metrics** - Rich analysis data for each scan
- 🔍 **Transparency** - AI reasoning explained
- 📈 **Performance Data** - Confidence scores and metrics
- 🤖 **Hybrid AI** - See how local and cloud models compare

### For Developers
- ⚡ **Optimized Pipeline** - Fast frame selection and analysis
- 🎯 **Smart Algorithms** - Stability detection for better results
- 🔌 **Easy Integration** - Seamless TM + Gemini workflow
- 📚 **Well-Documented** - Clear logging and error handling

## What's Next?

- 🎓 Training on more gourd varieties
- 📱 Offline Gemini alternative for low-connectivity areas
- 📊 Analytics dashboard for tracking scans
- 🎯 Ensemble voting from multiple frames
- 🌍 Multi-language support for analysis
- 🎨 Custom report generation

## System Requirements

- **App Version**: 1.0.0+
- **Android**: 8.0 or higher
- **iOS**: 13.0 or higher
- **Storage**: ~100MB for Teachable Machine model
- **Internet**: Required for Gemini AI analysis (TM works offline)
- **Camera**: Device must have a camera

## Credits & Acknowledgments

This release combines:
- 🎓 **Google Teachable Machine** - On-device ML training
- 🤖 **Google Gemini 2.5 Flash** - Advanced AI analysis
- 🌾 **Community Feedback** - Your testing and suggestions
- 👥 **Team Effort** - Development and optimization

## Get Started

1. **Update** your app to v2.0.0
2. **Grant** camera permissions
3. **Open** Camera Scanner
4. **Hold steady** until you see the green glow
5. **Tap** capture when prediction is stable
6. **View** detailed analysis with AI insights

## Feedback & Support

We'd love to hear from you! Report issues, suggest improvements, or share your scanning results. Your feedback drives our development!

**Happy Scanning with Dual AI! 🌟**`,
    category: "feature",
    version: {
      modelVersion: "v2.0.0",
      appVersion: "1.0.0",
      versionNumber: "2.0.0"
    },
    metadata: {
      datasetSize: "Teachable Machine trained model + Gemini 2.5 Flash API",
      datasetInfo: "7 gourd flower classes with dual-model architecture",
      improvements: [
        "Teachable Machine + Gemini dual-model integration",
        "Smart frame selection with stability detection",
        "Real-time scanning with best frame caching",
        "Advanced AI analysis with quality metrics",
        "Harvest prediction and health assessment",
        "Consensus-based recommendation logic",
        "Rich visualization of results",
        "Visual feedback with stable detection indicator",
        "Instant capture using cached frames",
        "Detailed logging for debugging"
      ],
      technicalDetails: "Teachable Machine TFLite model (on-device) + Gemini 2.5 Flash API (cloud). Frame stability detection tracks 5 recent predictions, identifies 3+ consecutive same labels, and selects highest confidence frame.",
      affectedPlatforms: ["iOS", "Android"]
    },
    media: {
      images: []
    },
    releaseDate: new Date("2025-12-10"),
    display: {
      isPinned: true,
      isHighlighted: true,
      showAsPopup: true,
      priority: 9
    },
    engagement: {
      views: 0,
      likes: 0,
      readBy: []
    },
    tags: [
      "feature-update",
      "teachable-machine",
      "gemini-ai",
      "dual-model",
      "flower-classification",
      "ai-integration",
      "v2.0.0",
      "camera-scanner"
    ],
    status: "published",
    isPublic: true,
    seo: {
      metaTitle: "Teachable Machine + Gemini AI Integration - v2.0.0",
      metaDescription: "Revolutionary dual-model flower classification: Teachable Machine real-time scanning + Gemini 2.5 Flash advanced analysis for unprecedented accuracy.",
      keywords: [
        "Teachable Machine",
        "Gemini AI",
        "Flower Classification",
        "Dual Model",
        "Machine Learning",
        "Computer Vision",
        "Plant Detection",
        "Gourd Flowers"
      ]
    }
  },
  {
    title: "First ML Model Release - Ampalaya Bilog v1.10.30",
    description: "We are excited to announce the release of our first machine learning model version 1.10.30, trained specifically for Ampalaya Bilog (Round Bitter Gourd) detection and classification.",
    body: `# First ML Model Release 🎉

We are thrilled to announce the release of our first machine learning model, **version 1.10.30**!

## Model Details

This initial release focuses on **Ampalaya Bilog** (Round Bitter Gourd) detection and classification. Our team has trained this model using a comprehensive dataset to ensure accurate recognition and analysis.

### Dataset Information
- **Size**: 2.6GB of high-quality images
- **Focus**: Ampalaya Bilog (Round Bitter Gourd)
- **Training Duration**: Extensive training to achieve optimal accuracy
- **Image Variety**: Multiple growth stages, lighting conditions, and angles

## Key Features

✅ **Gourd Detection**: Accurately identify Ampalaya Bilog in images
✅ **Growth Stage Recognition**: Determine the maturity level of the gourd
✅ **Health Assessment**: Detect potential issues or diseases
✅ **Real-time Analysis**: Fast processing on mobile devices

## What This Means for You

With this first model release, you can now:
- Scan your Ampalaya Bilog plants
- Get instant feedback on plant health
- Track growth progress over time
- Receive cultivation recommendations

## Performance

Our model has been rigorously tested and shows excellent performance in real-world conditions. We will continue to improve and expand our model capabilities based on your feedback.

## What's Next?

This is just the beginning! We're already working on:
- Additional gourd varieties
- Enhanced detection accuracy
- More detailed health analysis
- Expanded disease recognition

Thank you for being part of our journey. Your feedback helps us improve!

**Happy Scanning! 🌱**`,
    category: "model_update",
    version: {
      modelVersion: "v1.10.30",
      appVersion: "1.0.0",
      versionNumber: "1.10.30"
    },
    metadata: {
      datasetSize: "2.6GB",
      datasetInfo: "Ampalaya Bilog (Round Bitter Gourd)",
      improvements: [
        "Initial model release",
        "Accurate Ampalaya Bilog detection",
        "Growth stage classification",
        "Basic health assessment",
        "Optimized for mobile devices"
      ],
      technicalDetails: "YOLOv8 architecture with custom training on 2.6GB Ampalaya Bilog dataset",
      affectedPlatforms: ["iOS", "Android"]
    },
    media: {
      images: []
    },
    releaseDate: new Date("2024-10-30"),
    display: {
      isPinned: true,
      isHighlighted: true,
      showAsPopup: true,
      priority: 10
    },
    engagement: {
      views: 0,
      likes: 0,
      readBy: []
    },
    tags: [
      "model-update",
      "ampalaya",
      "bitter-gourd",
      "first-release",
      "ml-model",
      "v1.10.30"
    ],
    status: "published",
    isPublic: true,
    seo: {
      metaTitle: "First ML Model Release - Ampalaya Bilog v1.10.30",
      metaDescription: "Introducing our first machine learning model for Ampalaya Bilog detection and classification, trained on 2.6GB of high-quality data.",
      keywords: [
        "ML model",
        "Ampalaya",
        "Bitter Gourd",
        "Plant Detection",
        "Machine Learning"
      ]
    }
  }
];

module.exports = newsData;
