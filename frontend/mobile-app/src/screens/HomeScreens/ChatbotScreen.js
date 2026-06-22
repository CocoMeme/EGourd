import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles';
import chatbotService from '../../services/chatbotService';
import { useTranslation } from 'react-i18next';

export const ChatbotScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadSuggestions();
    addWelcomeMessage();
  }, []);

  const loadSuggestions = async () => {
    const result = await chatbotService.getSuggestions();
    if (result.success) {
      setSuggestions(result.suggestions);
    }
  };

  const addWelcomeMessage = () => {
    setMessages([
      {
        id: '1',
        text: t('chatbot.welcomeMessage'),
        role: 'assistant',
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleSend = async (messageText) => {
    const text = messageText || inputText.trim();
    if (!text) return;

    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      text,
      role: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setShowSuggestions(false);
    setLoading(true);

    // Build conversation history
    const history = messages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      text: msg.text,
    }));

    // Send to API
    const result = await chatbotService.sendMessage(text, history);
    setLoading(false);

    // Add AI response
    const aiMessage = {
      id: (Date.now() + 1).toString(),
      text: result.success ? result.reply : result.message || t('chatbot.errorMessage'),
      role: 'assistant',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, aiMessage]);

    // Auto scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSuggestionPress = (suggestion) => {
    handleSend(suggestion);
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.aiMessageContainer]}>
        {!isUser && (
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#4CAF50', '#45a049']}
              style={styles.avatar}
            >
              <Ionicons name="leaf" size={20} color="#fff" />
            </LinearGradient>
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
            {item.text}
          </Text>
        </View>
        {isUser && (
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#2196F3', '#1976D2']}
              style={styles.avatar}
            >
              <Ionicons name="person" size={20} color="#fff" />
            </LinearGradient>
          </View>
        )}
      </View>
    );
  };

  const renderSuggestionChip = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionChip}
      onPress={() => handleSuggestionPress(item)}
    >
      <Text style={styles.suggestionText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{t('chatbot.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('chatbot.subtitle')}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && messages.length <= 1 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>{t('chatbot.quickSuggestions')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}
          >
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => handleSuggestionPress(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('chatbot.thinking')}</Text>
        </View>
      )}

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t('chatbot.placeholder')}
            placeholderTextColor={theme.colors.text.secondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || loading}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background.secondary,
    backgroundColor: theme.colors.surface,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  messagesList: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginHorizontal: theme.spacing.xs,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '70%',
    padding: theme.spacing.md,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
    fontFamily: theme.fonts.regular,
  },
  aiText: {
    color: theme.colors.text.primary,
    fontFamily: theme.fonts.regular,
  },
  suggestionsContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.background.secondary,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  suggestionsScroll: {
    paddingRight: theme.spacing.md,
  },
  suggestionChip: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    marginRight: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  suggestionText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.secondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.background.secondary,
    backgroundColor: theme.colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.primary,
    maxHeight: 100,
    marginRight: theme.spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
