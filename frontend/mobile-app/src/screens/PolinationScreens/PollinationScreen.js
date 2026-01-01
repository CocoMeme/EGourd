import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  RefreshControl,
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../styles';
import { pollinationService } from '../../services';
import { PlantCard, PlantFilter } from '../../components';
import { CustomHeader } from '../../components/CustomComponents/CustomHeader';

export const PollinationScreen = ({ navigation }) => {
  const [plants, setPlants] = useState([]);
  const [filteredPlants, setFilteredPlants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    name: '',
    sort: 'newest'
  });
  const [showFilter, setShowFilter] = useState(false);

  // Fetch plants data
  const fetchPlants = async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);
      const response = await pollinationService.getPollinations(filters);
      setPlants(response.data);
      setFilteredPlants(response.data);
    } catch (error) {
      console.error('Error fetching plants:', error);
      
      // Provide specific error messages
      let errorMessage = 'Failed to fetch plants. Please try again.';
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        errorMessage = 'Session expired. Please log in again.';
      } else if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load and refresh on focus
  useFocusEffect(
    useCallback(() => {
      fetchPlants();
    }, [filters])
  );

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPlants(false);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // Handle plant actions
  const handlePlantPress = (plant) => {
    navigation.navigate('PlantDetail', { plantId: plant._id, plant });
  };

  const handleEditPlant = (plant) => {
    navigation.navigate('PlantForm', { 
      plant, 
      mode: 'edit',
      title: 'Edit Plant' 
    });
  };

  const handleDeletePlant = async (plant) => {
    Alert.alert(
      'Delete Plant',
      `Are you sure you want to delete this ${pollinationService.formatPlantName(plant.name)}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await pollinationService.deletePollination(plant._id);
              setPlants(prev => prev.filter(p => p._id !== plant._id));
              setFilteredPlants(prev => prev.filter(p => p._id !== plant._id));
              Alert.alert('Success', 'Plant deleted successfully.');
            } catch (error) {
              console.error('Error deleting plant:', error);
              Alert.alert('Error', 'Failed to delete plant. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleAddPlant = () => {
    console.log('🌱 Add Plant button pressed');
    console.log('📱 Navigation object:', navigation);
    console.log('🎯 Attempting to navigate to PlantForm');
    
    try {
      navigation.navigate('PlantForm', { 
        mode: 'create',
        title: 'Add New Plant' 
      });
      console.log('✅ Navigation call completed');
    } catch (error) {
      console.error('❌ Navigation error:', error);
      Alert.alert('Error', 'Failed to open plant form. Please try again.');
    }
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="leaf-outline" size={64} color={theme.colors.text.secondary} />
      <Text style={styles.emptyStateTitle}>No Plants Yet</Text>
      <Text style={styles.emptyStateText}>
        Start your pollination journey by adding your first plant!
      </Text>
      <TouchableOpacity style={styles.emptyStateButton} onPress={handleAddPlant}>
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.emptyStateButtonText}>Add First Plant</Text>
      </TouchableOpacity>
    </View>
  );

  // Render plant item
  const renderPlantItem = ({ item }) => (
    <PlantCard
      plant={item}
      onPress={() => handlePlantPress(item)}
      onEdit={() => handleEditPlant(item)}
      onDelete={() => handleDeletePlant(item)}
    />
  );

  // Header right component
  const headerRight = () => (
    <View style={styles.headerRight}>
      <TouchableOpacity 
        style={styles.headerButton}
        onPress={() => navigation.navigate('PredictYield', {})}
      >
        <Ionicons name="pulse-outline" size={22} color="#FFFFFF" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.headerButton}
        onPress={() => navigation.navigate('PredictFlowers', {})}
      >
        <Ionicons name="analytics-outline" size={22} color="#FFFFFF" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.headerButton}
        onPress={() => setShowFilter(!showFilter)}
      >
        <Ionicons 
          name={showFilter ? 'funnel' : 'funnel-outline'} 
          size={22} 
          color="#FFFFFF"
        />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.headerButton}
        onPress={handleAddPlant}
      >
        <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading your plants...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader
        title="Pollination Management"
        rightComponent={headerRight}
      />

      {showFilter && (
        <PlantFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          isLoading={isRefreshing}
          onRefresh={handleRefresh}
        />
      )}

      {filteredPlants.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredPlants}
          keyExtractor={(item) => item._id}
          renderItem={renderPlantItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            plants.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={styles.resultCount}>
                  Showing {filteredPlants.length} of {plants.length} plants
                </Text>
                {(filters.status || filters.name || filters.sort !== 'newest') && (
                  <TouchableOpacity 
                    onPress={() => setFilters({ status: '', name: '', sort: 'newest' })}
                    style={styles.clearFilters}
                  >
                    <Text style={styles.clearFiltersText}>Clear all filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={handleAddPlant}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
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
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 100, // Space for FAB
  },
  listHeader: {
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultCount: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  clearFilters: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.small,
  },
  clearFiltersText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontSize: 11,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyStateTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  emptyStateText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
  },
  emptyStateButtonText: {
    ...theme.typography.button,
    color: '#FFFFFF',
    marginLeft: theme.spacing.sm,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});