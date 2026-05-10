import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';

// ---------------------------------------------------------------------------
// Tako AI Chat Panel
// ---------------------------------------------------------------------------
const TakoChat = ({ visible, onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm Tako 🪴 Your learning guide for the Gourd Ripeness Scanner. Ask me anything about using the app!",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 400, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    if (messages.length > 1) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  // Local knowledge base for Tako chatbot
  const knowledgeBase = [
    {
      keywords: ['photo', 'picture', 'scan', 'best', 'capture', 'image'],
      answer: 'Here\'s how to take the best photo for scanning:\n\n1. **Clean the gourd** - Remove any leaves or debris\n2. **Good lighting** - Use natural daylight or diffuse white light\n3. **Position camera** - Hold steady, 20-30cm away, 90° angle\n4. **Center the gourd** - Fit entire gourd in frame with margins\n5. **Keep steady** - Use both hands for stability\n\nBest times: Early morning (6-9 AM) or late afternoon (4-6 PM) for natural light.',
    },
    {
      keywords: ['ripeness', 'scale', 'percentage', 'levels', 'meaning'],
      answer: 'Ripeness is measured from 0-100%:\n\n🟡 **Unripe (0-25%)** - Too early, keep monitoring\n🟠 **Semi-ripe (25-50%)** - Developing, start daily scans\n🟢 **Fully ripe (50-75%)** - Ideal harvest window!\n🔴 **Over-ripe (75%+)** - Harvest within 1-2 days\n\nConfidence level > 85% is highly reliable.',
    },
    {
      keywords: ['lighting', 'light', 'dark', 'shadow', 'brightness'],
      answer: 'Best lighting practices:\n\n✓ **Natural daylight** works best - Early morning or late afternoon\n✓ **Avoid harsh sunlight** - Causes shadows and glare\n✓ **Indoor lighting** - Use 3-4 diffuse bulbs at 45° angles\n✓ **No shadows** - Position lights to eliminate dark areas\n✓ **Clean lens** - Dust/fingerprints affect photos\n\nIf the app says "Poor lighting detected", move to natural light.',
    },
    {
      keywords: ['camera', 'position', 'angle', 'distance', 'how far'],
      answer: 'Camera positioning tips:\n\n📱 **Distance** - Keep phone 20-30cm (8-12 inches) away\n📱 **Angle** - Always 90° perpendicular to gourd surface\n📱 **Stability** - Use both hands to keep steady\n📱 **Framing** - Entire gourd should fit with small margins\n📱 **Focus** - Make sure image is clear before tapping scan\n\nToo close = blur, too far = lost detail.',
    },
    {
      keywords: ['history', 'track', 'progress', 'compare', 'previous'],
      answer: 'How to use History tab:\n\n📊 **View scans** - All your previous scans are saved\n📊 **Compare** - Select two scans to view side-by-side\n📊 **Trends** - Graph view shows ripeness progression over time\n📊 **Look for** - Ripeness % increase of 5-10% per day\n📊 **Export** - Go to Profile > Settings > Export Data\n\nThis helps you predict harvest time accurately!',
    },
    {
      keywords: ['pollination', 'manage', 'log', 'event', 'record'],
      answer: 'How to log pollination events:\n\n🌸 **Go to** - Pollination tab\n🌸 **Select** - The plant you want to record\n🌸 **Add Event** - Tap "Add Event"\n🌸 **Record** - Date, time, and method (hand/insect)\n🌸 **Tag gourds** - Link to relevant gourds\n🌸 **Predict** - This helps predict ripeness timelines\n\nBetter tracking = better harvest planning!',
    },
    {
      keywords: ['confidence', 'score', 'reliable', 'accuracy', 'trust'],
      answer: 'Understanding Confidence Level:\n\n✅ **90%+** - Very reliable, high accuracy\n✅ **70-89%** - Reliable but rescan recommended\n❌ **<70%** - Poor lighting/positioning, try again\n\nThe confidence shows how certain the AI is about the ripeness reading. Always aim for 85%+!',
    },
    {
      keywords: ['different', 'vary', 'reading', 'same', 'why'],
      answer: 'Why do readings vary for the same gourd?\n\nMain factors affecting readings:\n\n💡 **Lighting changes** - Shadows and light angles vary\n💡 **Camera angle** - Different positions show different features\n💡 **Surface cleanliness** - Dust or moisture affects appearance\n💡 **Time of day** - Lighting conditions change\n\n**Tip**: Always scan in consistent lighting. Minor variations (±5%) are normal.',
    },
    {
      keywords: ['harvest', 'when', 'action', 'time', 'ready'],
      answer: 'When should I harvest based on ripeness?\n\n🔄 **0-25%** - Not ready, continue monitoring\n🔄 **25-50%** - Start daily scans\n✅ **50-75%** - Ready to harvest soon! Watch closely.\n🔴 **75%+** - Harvest within 1-2 days or quality declines\n\nUse the History tab to see the ripeness trend before harvesting.',
    },
    {
      keywords: ['features', 'app', 'tabs', 'tools', 'menu'],
      answer: 'Main app features:\n\n📷 **Camera** - Scan gourds for ripeness analysis\n📊 **History** - Track and compare previous scans\n🌸 **Pollination** - Manage pollination records\n📰 **News** - Latest tips and cultivation guides\n👤 **Profile** - Account settings and statistics\n🪴 **Tako** - AI learning assistant (that\'s me!)\n\nEach feature helps you become a gourd-growing expert!',
    },
    {
      keywords: ['pro', 'tip', 'best', 'practice', 'advice'],
      answer: 'Pro tips for best results:\n\n✓ Clean camera lens before scanning\n✓ Scan every 2-3 days for accurate tracking\n✓ Use History tab to monitor trends\n✓ Avoid scanning wet gourds\n✓ Scan during daytime with natural lighting\n✓ Keep phone steady using both hands\n✓ Ensure gourd surface is clean and dry\n\nConsistency is key to accurate readings!',
    },
  ];

  const findAnswer = (userQuestion) => {
    const lowerQuestion = userQuestion.toLowerCase();
    
    for (let item of knowledgeBase) {
      const matchedKeywords = item.keywords.filter(keyword => 
        lowerQuestion.includes(keyword)
      );
      if (matchedKeywords.length > 0) {
        return item.answer;
      }
    }
    
    // Default answer if no match found
    return 'I\'m not sure about that specific question, but I can help with:\n\n• How to take photos for scanning\n• Understanding ripeness levels\n• Best lighting and positioning\n• Using History to track progress\n• Logging pollination events\n• Camera tips and best practices\n\nTry asking about any of these topics!';
  };

  const suggestedQuestions = [
    'How do I take the best photo?',
    'What do ripeness levels mean?',
    'How should I position my camera?',
    'What about lighting conditions?',
    'How do I use the History tab?',
    'How do I log pollination events?',
  ];

  const handleSuggestedQuestion = (question) => {
    setInput(question);
    setTimeout(() => {
      sendMessage();
    }, 100);
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text || loading) return;
    Keyboard.dismiss();

    const userMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    // Simulate slight delay for natural feel
    setTimeout(() => {
      const reply = findAnswer(text);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      setLoading(false);
    }, 500);
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.takoPanel, { transform: [{ translateY: slideAnim }], opacity: fadeAnim }]}>
      {/* Header */}
      <LinearGradient colors={['#2563eb', '#60a5fa']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.takoHeader}>
        <View style={styles.takoHeaderLeft}>
          <View style={styles.takoAvatar}>
            <Text style={styles.takoAvatarEmoji}>🪴</Text>
          </View>
          <View>
            <Text style={styles.takoName}>Tako</Text>
            <Text style={styles.takoSubtitle}>Gourd AI Assistant</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.takoCloseBtn}>
          <Ionicons name="chevron-down" size={22} color="rgba(255, 255, 255, 0.8)" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.takoMessages}
        contentContainerStyle={styles.takoMessagesContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.messageBubble,
              msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            {msg.role === 'assistant' && (
              <View style={styles.assistantIcon}>
                <Text style={{ fontSize: 12 }}>🪴</Text>
              </View>
            )}
            <View style={[
              styles.bubbleContent,
              msg.role === 'user' ? styles.userBubbleContent : styles.assistantBubbleContent,
            ]}>
              <Text style={[
                styles.bubbleText,
                msg.role === 'user' ? styles.userBubbleText : styles.assistantBubbleText,
              ]}>
                {msg.content}
              </Text>
            </View>
          </View>
        ))}

        {/* Suggested Questions - Always visible */}
        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>Try asking about:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.suggestedQuestionsScroll}
            contentContainerStyle={styles.suggestedQuestionsContainer}
          >
            {suggestedQuestions.map((question, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestedQuestionChip}
                onPress={() => handleSuggestedQuestion(question)}
              >
                <Text style={styles.suggestedQuestionText}>{question}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading && (
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <View style={styles.assistantIcon}>
              <Text style={{ fontSize: 12 }}>🪴</Text>
            </View>
            <View style={styles.assistantBubbleContent}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.takoInputRow}>
          <TextInput
            style={styles.takoInput}
            placeholder="Ask Tako anything..."
            placeholderTextColor={theme.colors.text.secondary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.takoSendBtn, (!input.trim() || loading) && styles.takoSendBtnDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
};

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
const HowToUseScreen = ({ navigation }) => {
  const [takoVisible, setTakoVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('guide'); // 'guide', 'faqs', 'checkpoints'
  const [bookmarks, setBookmarks] = useState([]);
  const [completedCheckpoints, setCompletedCheckpoints] = useState([]);
  const fabAnim = useRef(new Animated.Value(1)).current;

  const toggleTako = () => {
    Animated.sequence([
      Animated.timing(fabAnim, { toValue: 0.85, duration: 100, useNativeDriver: true }),
      Animated.spring(fabAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
    setTakoVisible((v) => !v);
  };

  const toggleBookmark = (id) => {
    setBookmarks((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const toggleCheckpoint = (id) => {
    setCompletedCheckpoints((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const steps = [
    {
      id: '1',
      icon: 'hand-left-outline',
      title: 'Prepare the Gourd',
      desc: 'Place the gourd on a clean, flat surface. Remove any leaves, stems, or objects that might obstruct the view. Ensure the gourd is dry and clean for better image quality.',
      details: 'Clean the surface thoroughly but gently. Avoid scratching the gourd. Pat dry with a soft cloth if any moisture is present.',
    },
    {
      id: '2',
      icon: 'sunny-outline',
      title: 'Good Lighting',
      desc: 'Natural daylight works best. Avoid direct harsh sunlight or dark shadows. If indoors, use diffuse white light from multiple angles to eliminate shadows on the gourd surface.',
      details: 'Best times: early morning (6-9 AM) or late afternoon (4-6 PM). Use 3-4 light sources at 45-degree angles for optimal illumination.',
    },
    {
      id: '3',
      icon: 'crop-outline',
      title: 'Position the Camera',
      desc: 'Hold your phone steady and align the gourd within the on-screen guide frame. Keep the camera at a 90-degree angle to the gourd surface, approximately 20-30cm away for optimal focus.',
      details: 'Use both hands. Position the phone directly above the gourd center. The entire gourd should fit in the frame with slight margins.',
    },
    {
      id: '4',
      icon: 'camera-outline',
      title: 'Capture & Analyze',
      desc: "Tap the \"Scan\" button to capture the image. The app will automatically process the image using AI to determine the gourd's ripeness level. Wait a few seconds for analysis to complete.",
      details: 'Keep the phone still while capturing. The AI processes in 2-5 seconds. Ensure good focus before tapping scan.',
    },
    {
      id: '5',
      icon: 'checkbox-outline',
      title: 'Review Results',
      desc: 'Check the detailed results including ripeness percentage, recommended actions, and confidence level. Save the scan to your history to track ripeness progression over time.',
      details: 'Confidence > 85% is highly reliable. Compare with previous scans. Save scan to track daily progression.',
    },
  ];

  const features = [
    {
      id: 'f1',
      icon: 'time-outline',
      title: 'History Tracking',
      desc: 'Access all your previous scans in the History tab. Compare results over time to monitor gourd development.',
    },
    {
      id: 'f2',
      icon: 'leaf-outline',
      title: 'Pollination Management',
      desc: 'Track your gourd plants, manage pollination records, and monitor growth stages in the Pollination tab.',
    },
    {
      id: 'f3',
      icon: 'newspaper-outline',
      title: 'Stay Updated',
      desc: 'Read the latest news, tips, and best practices for gourd cultivation in the News section.',
    },
    {
      id: 'f4',
      icon: 'person-outline',
      title: 'Profile & Settings',
      desc: 'Manage your account, view statistics, and customize app settings in your Profile.',
    },
  ];

  // Comprehensive FAQs for learning
  const faqs = [
    {
      id: 'faq-1',
      category: 'Scanning Basics',
      q: '❓ What exactly does "ripeness" mean in this app?',
      a: 'Ripeness is measured on a scale from Unripe (0-25%) to Over-ripe (75-100%). Semi-ripe (25-50%) means the gourd is developing flavor. Fully ripe (50-75%) is the ideal harvest window. The app calculates this based on color, texture, and other visual indicators.',
    },
    {
      id: 'faq-2',
      category: 'Scanning Basics',
      q: '❓ Why do I get different ripeness readings for the same gourd?',
      a: 'Lighting conditions are the primary factor. Changes in shadows, camera angle, or surface cleanliness affect readings. Always scan in consistent lighting. Minor variations (±5%) are normal.',
    },
    {
      id: 'faq-3',
      category: 'Camera & Positioning',
      q: '❓ How close should the camera be to the gourd?',
      a: 'Keep the camera 20-30cm (8-12 inches) away. Too close causes focus blur; too far reduces detail. The entire gourd should fit in the frame with slight margins on all sides.',
    },
    {
      id: 'faq-4',
      category: 'Camera & Positioning',
      q: '❓ Does camera angle affect the scan results?',
      a: 'Yes! Always keep the camera perpendicular (90 degrees) to the gourd surface. Angled shots miss ripeness indicators on different parts of the gourd. Scan multiple angles if needed.',
    },
    {
      id: 'faq-5',
      category: 'History & Tracking',
      q: '❓ How do I compare scans over time?',
      a: 'Go to History tab. Select two scans to view side-by-side comparison. Look for ripeness % increase (typically 5-10% per day). Graph view shows trends over weeks/months.',
    },
    {
      id: 'faq-6',
      category: 'History & Tracking',
      q: '❓ Can I export my scan history?',
      a: 'Yes! In Profile > Settings > Export Data. Choose date range. Data exports as CSV (for spreadsheets) or PDF (for reports). Useful for record-keeping.',
    },
    {
      id: 'faq-7',
      category: 'Pollination',
      q: '❓ How do I log pollination events?',
      a: 'Go to Pollination tab > Select plant > Add Event. Record date, time, pollination method (hand, insect, etc.). Tag relevant gourds. This helps predict ripeness timelines.',
    },
    {
      id: 'faq-8',
      category: 'Results & Interpretation',
      q: '❓ What does "Confidence Level" mean?',
      a: 'Confidence shows AI certainty (0-100%). 90%+ = very reliable. 70-89% = reliable but rescan recommended. <70% = poor lighting/positioning, try again.',
    },
    {
      id: 'faq-9',
      category: 'Results & Interpretation',
      q: '❓ What action should I take based on ripeness %?',
      a: 'Unripe (0-25%): Continue monitoring. Semi-ripe (25-50%): Start daily scans. Fully ripe (50-75%): Ready to harvest soon. Over-ripe (75%+): Harvest within 1-2 days or quality declines.',
    },
    {
      id: 'faq-10',
      category: 'Troubleshooting',
      q: '❓ Scan keeps saying "Poor lighting detected"?',
      a: 'Move to natural light or add more light sources. Avoid direct sunlight (causes harsh shadows). If indoors, use 3+ bulbs at 45-degree angles. Clean your camera lens!',
    },
  ];

  // Learning checkpoints
  const checkpoints = [
    {
      id: 'cp-1',
      title: '🎯 Scanning 101',
      desc: 'Learn the 5-step scanning process',
      tips: [
        'Understand the importance of lighting',
        'Master camera positioning (90° angle)',
        'Learn to read confidence levels',
      ],
    },
    {
      id: 'cp-2',
      title: '📊 Reading Results',
      desc: 'Interpret ripeness percentages and recommendations',
      tips: [
        'What each ripeness level means',
        'How to use confidence scores',
        'When to harvest vs. wait',
      ],
    },
    {
      id: 'cp-3',
      title: '📈 Tracking Progress',
      desc: 'Use History tab to monitor gourd development',
      tips: [
        'How to compare scans over time',
        'Understanding ripeness trends',
        'Export and share scan data',
      ],
    },
    {
      id: 'cp-4',
      title: '🌸 Pollination Management',
      desc: 'Master the Pollination tab for yield predictions',
      tips: [
        'How to log pollination events',
        'Linking gourds to plants',
        'Predicting harvest dates',
      ],
    },
    {
      id: 'cp-5',
      title: '⚙️ Pro Features',
      desc: 'Advanced features in Settings and Profile',
      tips: [
        'Export scan history',
        'Customize notifications',
        'Manage multiple accounts',
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Learn How to Use</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={theme.colors.text.secondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tips, FAQs, features..."
          placeholderTextColor={theme.colors.text.secondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'guide' && styles.tabActive]}
          onPress={() => setSelectedTab('guide')}
        >
          <Ionicons
            name="book"
            size={18}
            color={selectedTab === 'guide' ? theme.colors.primary : theme.colors.text.secondary}
          />
          <Text style={[styles.tabLabel, selectedTab === 'guide' && styles.tabLabelActive]}>
            Guide
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'faqs' && styles.tabActive]}
          onPress={() => setSelectedTab('faqs')}
        >
          <Ionicons
            name="help-circle"
            size={18}
            color={selectedTab === 'faqs' ? theme.colors.primary : theme.colors.text.secondary}
          />
          <Text style={[styles.tabLabel, selectedTab === 'faqs' && styles.tabLabelActive]}>
            FAQs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'checkpoints' && styles.tabActive]}
          onPress={() => setSelectedTab('checkpoints')}
        >
          <Ionicons
            name="trophy"
            size={18}
            color={selectedTab === 'checkpoints' ? theme.colors.primary : theme.colors.text.secondary}
          />
          <Text style={[styles.tabLabel, selectedTab === 'checkpoints' && styles.tabLabelActive]}>
            Lessons
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* GUIDE TAB */}
        {selectedTab === 'guide' && (
          <>
            <View style={styles.welcomeCard}>
              <Ionicons name="information-circle" size={48} color={theme.colors.primary} />
              <Text style={styles.welcomeTitle}>Master Gourd Scanning</Text>
              <Text style={styles.welcomeText}>
                Follow this 5-step process to get accurate ripeness readings every time.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Step-by-Step Scanning Guide</Text>
            {steps
              .filter(
                (s) =>
                  s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  s.desc.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((s) => (
                <View key={s.id} style={styles.stepCard}>
                  <View style={styles.stepHeader}>
                    <View style={styles.stepIndex}>
                      <Text style={styles.stepIndexText}>{s.id}</Text>
                    </View>
                    <Ionicons name={s.icon} size={24} color={theme.colors.primary} />
                    <TouchableOpacity
                      style={styles.bookmarkBtn}
                      onPress={() => toggleBookmark(`step-${s.id}`)}
                    >
                      <Ionicons
                        name={bookmarks.includes(`step-${s.id}`) ? 'bookmark' : 'bookmark-outline'}
                        size={20}
                        color={bookmarks.includes(`step-${s.id}`) ? theme.colors.warning : theme.colors.text.secondary}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>{s.title}</Text>
                    <Text style={styles.stepDesc}>{s.desc}</Text>
                    {s.details && <Text style={styles.stepDetails}>💡 {s.details}</Text>}
                  </View>
                </View>
              ))}

            <Text style={styles.sectionTitle}>Key Features</Text>
            {features
              .filter(
                (f) =>
                  f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  f.desc.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((feature) => (
                <View key={feature.id} style={styles.featureCard}>
                  <View style={styles.featureIconWrap}>
                    <Ionicons name={feature.icon} size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDesc}>{feature.desc}</Text>
                  </View>
                </View>
              ))}

            <View style={styles.tipsSection}>
              <View style={styles.tipsSectionHeader}>
                <Ionicons name="bulb" size={24} color={theme.colors.warning} />
                <Text style={styles.tipsTitle}>Pro Tips</Text>
              </View>
              {[
                'Clean your camera lens before scanning.',
                'Scan every 2-3 days to track ripeness accurately.',
                'Use History tab to compare past scans.',
                'Avoid scanning wet gourds.',
                'Scan during daytime with natural lighting.',
                'Keep the camera steady using both hands.',
              ]
                .filter((tip) => tip.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((tip, i) => (
                  <View key={i} style={styles.tipItem}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
            </View>
          </>
        )}

        {/* FAQS TAB */}
        {selectedTab === 'faqs' && (
          <>
            <View style={styles.welcomeCard}>
              <Ionicons name="help-circle" size={48} color={theme.colors.primary} />
              <Text style={styles.welcomeTitle}>Frequently Asked Questions</Text>
              <Text style={styles.welcomeText}>
                Find answers to common questions about the app.
              </Text>
            </View>

            {faqs
              .filter(
                (faq) =>
                  faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  faq.a.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((faq) => (
                <View key={faq.id} style={styles.faqItem}>
                  <View style={styles.faqCategory}>
                    <Text style={styles.faqCategoryText}>{faq.category}</Text>
                  </View>
                  <Text style={styles.faqQuestion}>{faq.q}</Text>
                  <Text style={styles.faqAnswer}>{faq.a}</Text>
                </View>
              ))}
          </>
        )}

        {/* CHECKPOINTS TAB */}
        {selectedTab === 'checkpoints' && (
          <>
            <View style={styles.welcomeCard}>
              <Ionicons name="trophy" size={48} color={theme.colors.primary} />
              <Text style={styles.welcomeTitle}>Learning Checkpoints</Text>
              <Text style={styles.welcomeText}>
                Master these key topics to become an expert.
              </Text>
            </View>

            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(completedCheckpoints.length / checkpoints.length) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {completedCheckpoints.length} of {checkpoints.length} completed
            </Text>

            {checkpoints
              .filter(
                (cp) =>
                  cp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  cp.desc.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((checkpoint) => (
                <View
                  key={checkpoint.id}
                  style={[
                    styles.checkpointCard,
                    completedCheckpoints.includes(checkpoint.id) && styles.checkpointCompleted,
                  ]}
                >
                  <View style={styles.checkpointHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.checkpointTitle}>{checkpoint.title}</Text>
                      <Text style={styles.checkpointDesc}>{checkpoint.desc}</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.checkpointButton,
                        completedCheckpoints.includes(checkpoint.id) && styles.checkpointButtonActive,
                      ]}
                      onPress={() => toggleCheckpoint(checkpoint.id)}
                    >
                      <Ionicons
                        name={
                          completedCheckpoints.includes(checkpoint.id)
                            ? 'checkmark-circle'
                            : 'radio-button-off'
                        }
                        size={24}
                        color={
                          completedCheckpoints.includes(checkpoint.id)
                            ? theme.colors.success
                            : theme.colors.primary
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.checkpointTipsContainer}>
                    <Text style={styles.checkpointTipsTitle}>Key Topics:</Text>
                    {checkpoint.tips.map((tip, i) => (
                      <View key={i} style={styles.checkpointTip}>
                        <Text style={styles.checkpointTipBullet}>•</Text>
                        <Text style={styles.checkpointTipText}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
          </>
        )}

        {/* Tako Promo Banner */}
        <TouchableOpacity style={styles.takoPromo} onPress={toggleTako} activeOpacity={0.85}>
          <View style={styles.takoPromoLeft}>
            <Text style={styles.takoPromoEmoji}>🪴</Text>
          </View>
          <View style={styles.takoPromoText}>
            <Text style={styles.takoPromoTitle}>Have questions? Ask Tako!</Text>
            <Text style={styles.takoPromoSub}>Your AI learning assistant is ready to help</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
        </TouchableOpacity>

        <View style={styles.getStartedContainer}>
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={() => navigation.navigate('Camera')}
          >
            <Ionicons name="camera" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.getStartedText}>Ready? Start Scanning Now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Tako FAB */}
      <Animated.View style={[styles.takoFab, { transform: [{ scale: fabAnim }] }]}>
        <TouchableOpacity onPress={toggleTako} style={styles.takoFabInner} activeOpacity={0.9}>
          {takoVisible ? (
            <Ionicons name="close" size={24} color="#fff" />
          ) : (
            <Text style={styles.takoFabEmoji}>🪴</Text>
          )}
        </TouchableOpacity>
        {!takoVisible && (
          <View style={styles.takoFabBadge}>
            <Text style={styles.takoFabBadgeText}>AI</Text>
          </View>
        )}
      </Animated.View>

      {/* Tako Chat Panel */}
      <TakoChat visible={takoVisible} onClose={() => setTakoVisible(false)} />
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background.secondary,
    backgroundColor: theme.colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
  },
  
  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.medium,
    height: 40,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.primary,
  },

  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background.secondary,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.secondary,
  },
  tabLabelActive: {
    color: theme.colors.primary,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },

  // Welcome card
  welcomeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
  },
  welcomeTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },

  // Steps
  stepCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  stepIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  stepIndexText: {
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    color: '#fff',
  },
  stepIconstyle: { marginLeft: 'auto' },
  stepContent: { flex: 1, paddingLeft: theme.spacing.xs },
  stepTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  stepDesc: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },
  stepDetails: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.primary,
    lineHeight: 16,
    marginTop: theme.spacing.xs,
  },
  bookmarkBtn: {
    marginLeft: 'auto',
    padding: theme.spacing.sm,
  },

  // Features
  featureCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  featureContent: { flex: 1 },
  featureTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  featureDesc: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    lineHeight: 16,
  },

  // Tips
  tipsSection: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  tipsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  tipsTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.sm,
    lineHeight: 18,
  },

  // Tako Promo Banner
  takoPromo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  takoPromoLeft: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  takoPromoEmoji: { fontSize: 24 },
  takoPromoText: { flex: 1 },
  takoPromoTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
  },
  takoPromoSub: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Troubleshoot
  troubleshootSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
  },
  troubleshootTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  troubleshootItem: { marginBottom: theme.spacing.md },
  troubleshootQuestion: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  troubleshootAnswer: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    lineHeight: 18,
    paddingLeft: theme.spacing.md,
  },

  // FAQs
  faqItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
  },
  faqCategory: {
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  faqCategoryText: {
    fontSize: 11,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.primary,
  },
  faqQuestion: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  faqAnswer: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },

  // Progress Bar
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.success,
  },
  progressText: {
    fontSize: 12,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },

  // Checkpoints
  checkpointCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
  },
  checkpointCompleted: {
    backgroundColor: theme.colors.background.secondary,
    opacity: 0.7,
  },
  checkpointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  checkpointButton: {
    marginLeft: theme.spacing.md,
  },
  checkpointButtonActive: {
    backgroundColor: 'transparent',
  },
  checkpointTitle: {
    fontSize: 15,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  checkpointDesc: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
  },
  checkpointTipsContainer: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.small,
  },
  checkpointTipsTitle: {
    fontSize: 12,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  checkpointTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  checkpointTipBullet: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  checkpointTipText: {
    flex: 1,
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    lineHeight: 16,
  },

  // Get Started
  getStartedContainer: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },

  // Get Started button
  getStartedButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  buttonIcon: { marginRight: theme.spacing.sm },
  getStartedText: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: '#fff',
  },

  // -------------------------------------------------------------------------
  // Tako FAB
  // -------------------------------------------------------------------------
  takoFab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  takoFabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  takoFabEmoji: { fontSize: 26 },
  takoFabBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.warning || '#F59E0B',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  takoFabBadgeText: {
    fontSize: 9,
    fontFamily: theme.fonts.bold,
    color: '#fff',
  },

  // -------------------------------------------------------------------------
  // Tako Chat Panel
  // -------------------------------------------------------------------------
  takoPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  takoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  takoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  takoAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  takoAvatarEmoji: { fontSize: 20 },
  takoName: {
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    color: '#fff',
  },
  takoSubtitle: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  takoCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },

  // Messages
  takoMessages: { flex: 1 },
  takoMessagesContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  messageBubble: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: theme.spacing.sm,
  },
  userBubble: { justifyContent: 'flex-end' },
  assistantBubble: { justifyContent: 'flex-start' },
  assistantIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginBottom: 2,
  },
  bubbleContent: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  userBubbleContent: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubbleContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20, fontFamily: theme.fonts.regular },
  userBubbleText: { color: '#fff' },
  assistantBubbleText: { color: theme.colors.text.primary },

  // Input row
  takoInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    gap: theme.spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  takoInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.primary,
  },
  takoSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  takoSendBtnDisabled: { opacity: 0.4 },

  // Preview Section
  previewSection: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'flex-start',
  },
  previewTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: 'rgba(0, 0, 0, 0.6)',
    marginBottom: theme.spacing.md,
  },
  suggestedQuestionsScroll: {
    flex: 1,
  },
  suggestedQuestionsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  suggestedQuestionChip: {
    backgroundColor: 'transparent',
    borderRadius: 50,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderWidth: 2,
    borderColor: '#10b981',
    minWidth: 140,
    whiteSpace: 'nowrap',
  },
  suggestedQuestionText: {
    fontSize: 13,
    fontFamily: theme.fonts.semiBold,
    color: '#10b981',
    textAlign: 'center',
  },
});

HowToUseScreen.routeName = 'HowToUse';
export default HowToUseScreen;