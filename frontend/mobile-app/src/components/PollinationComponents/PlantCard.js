import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { plantService } from '../../services';

export const PlantCard = ({ plant, onPress, onEdit, onDelete, onTrackPollinations }) => {
  const getStatusColor = (status) => {
    const colors = {
      planted: '#4CAF50',
      germinating: '#8BC34A',
      vegetative: '#CDDC39',
      flowering: '#FF9800',
      pollinated: '#FF5722',
      fruiting: '#E91E63',
      harvested: '#9C27B0',
      completed: '#607D8B'
    };
    return colors[status] || '#9E9E9E';
  };

  const getGourdEmoji = (gourdType) => {
    const emojis = {
      bitter_gourd: '🥒',
      bottle_gourd: '🫛',
      sponge_gourd: '🌿',
      cucumber: '🥒',
      kalabasa: '🎃'
    };
    return emojis[gourdType] || '🌱';
  };

  // Gourd type display names with Tagalog
  const getGourdDisplayName = (gourdType) => {
    const names = {
      bitter_gourd: 'Bitter Gourd / Ampalaya',
      bottle_gourd: 'Bottle Gourd / Upo',
      sponge_gourd: 'Sponge Gourd / Patola',
      cucumber: 'Cucumber / Pipino',
      kalabasa: 'Squash / Kalabasa'
    };
    return names[gourdType] || formatLabel(gourdType);
  };
  
  const formatLabel = (str) => {
    if (!str) return '';
    return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateAge = () => {
    if (!plant.datePlanted) return 0;
    const today = new Date();
    const plantedDate = new Date(plant.datePlanted);
    const diffTime = today - plantedDate;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const plantAge = calculateAge();
  const displayName = plant.plantName || formatLabel(plant.variety) || formatLabel(plant.gourdType);

  // Calculate flowering prediction info
  const getFloweringInfo = () => {
    if (!plant.flowering) return null;
    
    const { predictedDaysToFlower, predictedFloweringDate, hasStarted, startDate } = plant.flowering;
    
    if (hasStarted && startDate) {
      return {
        text: `Flowering since ${formatDate(startDate)}`,
        color: '#4CAF50',
        icon: 'flower'
      };
    }
    
    if (predictedDaysToFlower) {
      const daysLeft = Math.max(0, predictedDaysToFlower - plantAge);
      if (daysLeft <= 0) {
        return {
          text: 'Should be flowering now!',
          color: '#FF9800',
          icon: 'flower-outline'
        };
      }
      return {
        text: `~${daysLeft} days until flowering`,
        color: '#2196F3',
        icon: 'time-outline'
      };
    }
    
    return null;
  };

  const floweringInfo = getFloweringInfo();

  // Get pollination count
  const getPollinationInfo = () => {
    if (!plant.pollinations || plant.pollinations.length === 0) return null;
    
    const total = plant.pollinations.length;
    const successful = plant.pollinations.filter(p => p.outcome === 'success').length;
    const pending = plant.pollinations.filter(p => p.outcome === 'pending').length;
    
    return { total, successful, pending };
  };

  const pollinationInfo = getPollinationInfo();

  // Get fruit info
  const getFruitInfo = () => {
    if (!plant.fruits || plant.fruits.length === 0) return null;
    
    const total = plant.fruits.length;
    const harvested = plant.fruits.filter(f => f.isHarvested).length;
    const totalYield = plant.fruits.reduce((sum, f) => sum + (f.harvestWeight || 0), 0);
    
    return { total, harvested, totalYield };
  };

  const fruitInfo = getFruitInfo();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.plantInfo}>
          <Text style={styles.plantName}>
            {getGourdEmoji(plant.gourdType)} {displayName}
          </Text>
          <Text style={styles.plantType}>
            {getGourdDisplayName(plant.gourdType)}
          </Text>
          <View style={styles.ageContainer}>
            <Text style={styles.ageText}>{plantAge} days old</Text>
          </View>
        </View>
        
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(plant.status) }]}>
            <Text style={styles.statusText}>{formatLabel(plant.status)}</Text>
          </View>
        </View>
      </View>

      {/* Plant Image */}
      {plant.image && plant.image.url && (
        <Image 
          source={{ uri: plant.image.url }} 
          style={styles.plantImage}
          resizeMode="cover"
        />
      )}

      {/* Plant Details */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.text.secondary} />
          <Text style={styles.detailText}>Planted: {formatDate(plant.datePlanted)}</Text>
        </View>

        {/* Flowering Prediction */}
        {floweringInfo && (
          <View style={styles.predictionSection}>
            <View style={styles.detailRow}>
              <Ionicons name={floweringInfo.icon} size={16} color={floweringInfo.color} />
              <Text style={[styles.detailText, { color: floweringInfo.color, fontWeight: '600' }]}>
                {floweringInfo.text}
              </Text>
            </View>
          </View>
        )}

        {/* Flower Counts */}
        {plant.flowering?.hasStarted && (
          <View style={styles.flowerCounts}>
            <View style={styles.flowerCount}>
              <Ionicons name="male" size={14} color="#4A90E2" />
              <Text style={styles.flowerCountText}>{plant.flowering.maleFlowerCount || 0} male</Text>
            </View>
            <View style={styles.flowerCount}>
              <Ionicons name="female" size={14} color="#E94B8A" />
              <Text style={styles.flowerCountText}>{plant.flowering.femaleFlowerCount || 0} female</Text>
            </View>
          </View>
        )}

        {/* Pollination Info */}
        {pollinationInfo && (
          <View style={styles.statsSection}>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={14} color="#FF5722" />
              <Text style={styles.statText}>
                {pollinationInfo.successful}/{pollinationInfo.total} pollinations
                {pollinationInfo.pending > 0 ? ` (${pollinationInfo.pending} pending)` : ''}
              </Text>
            </View>
          </View>
        )}

        {/* Fruit Info */}
        {fruitInfo && (
          <View style={styles.statsSection}>
            <View style={styles.statItem}>
              <Ionicons name="nutrition" size={14} color="#9C27B0" />
              <Text style={styles.statText}>
                {fruitInfo.total} fruits ({fruitInfo.harvested} harvested)
                {fruitInfo.totalYield > 0 ? ` - ${fruitInfo.totalYield.toFixed(1)}kg` : ''}
              </Text>
            </View>
          </View>
        )}

        {/* Environment Hint */}
        {plant.environment && (
          <View style={styles.envHint}>
            <Text style={styles.envHintText}>
              🌡️ {plant.environment.avgTemperature}°C  💧 {plant.environment.avgHumidity}%  ☀️ {plant.environment.sunlightHours}h
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {/* Track Pollinations button - show when flowering or pollinating */}
        {(plant.status === 'flowering' || plant.status === 'pollinating' || plant.flowering?.hasStartedFlowering || plant.flowering?.hasStarted) && onTrackPollinations && (
          <TouchableOpacity style={[styles.actionButton, styles.pollinateButton]} onPress={onTrackPollinations}>
            <Ionicons name="heart" size={20} color="#FF5722" />
            <Text style={[styles.actionText, { color: '#FF5722' }]}>Pollinate</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
          <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={onDelete}>
          <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  plantInfo: {
    flex: 1,
  },
  plantName: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  plantType: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
    marginBottom: theme.spacing.xs,
  },
  ageContainer: {
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.small,
    alignSelf: 'flex-start',
  },
  ageText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    fontSize: 11,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.small,
    marginBottom: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  plantImage: {
    width: '100%',
    height: 150,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.md,
  },
  detailsContainer: {
    marginBottom: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  detailText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.xs,
    flex: 1,
  },
  predictionSection: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.small,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  flowerCounts: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  flowerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flowerCountText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  statsSection: {
    marginTop: theme.spacing.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  envHint: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.background.secondary,
  },
  envHintText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.background.secondary,
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.small,
    justifyContent: 'center',
    flex: 1,
    minWidth: 80,
  },
  pollinateButton: {
    backgroundColor: 'rgba(255, 87, 34, 0.1)',
    borderWidth: 1,
    borderColor: '#FF5722',
  },
  actionText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    marginLeft: 4,
    fontWeight: '600',
  },
  deleteButton: {
    // Additional styles for delete button if needed
  },
  deleteText: {
    color: theme.colors.error,
  },
});