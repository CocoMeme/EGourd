import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
  Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { scanService } from '../../services';
import { RecentScanCard } from '../../components';

export const HistoryScreen = ({ navigation, route }) => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'male', 'female'

  // If filter is passed via route params (from Home screen stats)
  useEffect(() => {
    if (route?.params?.filter) {
      // Map 'total', 'ready', 'pending' to appropriate filters if needed
      // For now, let's just stick to basic filtering or ignore if complex
      // setFilter(route.params.filter);
    }
  }, [route?.params]);

  const fetchHistory = async () => {
    try {
      const history = await scanService.getScanHistory();
      setScans(history);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch on mount and when focused
  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const handleScanPress = (scan) => {
    // Navigate to details or results screen
    if (navigation) {
      try {
        // Build tmPrediction from saved data
        const tmPrediction = scan.aiPrediction?.tflite ? {
          variety: scan.aiPrediction.tflite.variety,
          gender: scan.aiPrediction.tflite.gender,
          confidence: scan.aiPrediction.tflite.confidence,
          modelType: scan.aiPrediction.tflite.modelType || 'Teachable Machine',
          processingTime: scan.aiPrediction.tflite.processingTime || 0,
        } : null;

        // Build geminiPrediction from saved data
        const geminiPrediction = scan.aiPrediction?.gemini ? {
          variety: scan.aiPrediction.gemini.variety,
          gender: scan.aiPrediction.gemini.gender,
          confidence: scan.aiPrediction.gemini.confidence,
          geminiData: {
            reasoning: scan.aiPrediction.gemini.reasoning,
            keyFeatures: scan.aiPrediction.gemini.keyFeatures || [],
            // Note: These are not stored in DB currently, so they'll be undefined
            flowerQuality: scan.aiPrediction.gemini.flowerQuality,
            harvestPrediction: scan.aiPrediction.gemini.harvestPrediction || scan.aiPrediction.harvestPrediction,
            qualityMetrics: scan.aiPrediction.gemini.qualityMetrics,
            observations: scan.aiPrediction.gemini.observations,
          },
          modelType: scan.aiPrediction.gemini.modelVersion || 'Gemini AI',
        } : null;

        // Build the main prediction object
        const prediction = {
          gender: scan.prediction,
          variety: scan.variety,
          confidence: scan.confidence,
          isNotFlower: scan.prediction === 'unknown' || scan.prediction === 'not_flower',
          timestamp: scan.date,
          source: scan.aiPrediction?.finalSource || 'tflite',
        };

        // Navigate to the Results screen which is nested inside the Camera tab
        navigation.navigate('Camera', {
          screen: 'Results',
          params: {
            scanId: scan._id,
            imageUri: scan.imageUrl,
            isLoading: false, // Don't re-analyze, just display
            // Pass all prediction data
            prediction,
            tmPrediction,
            geminiPrediction,
            // Pass comparison if available - map MongoDB field names to expected format
            comparisonResult: scan.aiPrediction?.comparison ? {
              agree: scan.aiPrediction.comparison.modelsAgree,
              varietyMatch: scan.aiPrediction.comparison.varietyMatch,
              genderMatch: scan.aiPrediction.comparison.genderMatch,
              confidenceGap: scan.aiPrediction.comparison.confidenceGap,
              recommendedSource: scan.aiPrediction.comparison.recommendation,
            } : null,
          }
        });
      } catch (error) {
        console.error('Navigation error:', error);
        // Fallback or alert if navigation fails
        Alert.alert('Error', 'Could not open scan details.');
      }
    } else {
      console.warn('Navigation prop is missing in HistoryScreen');
    }
  };

  const filteredScans = scans.filter(scan => {
    if (filter === 'all') return true;
    return scan.prediction.toLowerCase() === filter.toLowerCase();
  });

  const renderItem = ({ item }) => (
    <RecentScanCard
      imageUri={item.imageUrl}
      result={`${item.prediction} Flower`}
      date={item.date}
      confidence={item.confidence}
      onPress={() => handleScanPress(item)}
      style={styles.card}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="images-outline" size={64} color={theme.colors.text.secondary} />
      <Text style={styles.emptyText}>No scans yet</Text>
      <Text style={styles.emptySubtext}>
        Your scan history will appear here.
        Start by scanning a flower!
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredScans}
        renderItem={renderItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 24,
  },
});