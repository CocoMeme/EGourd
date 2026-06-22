import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  RefreshControl,
  ActivityIndicator,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../styles';
import { plantService } from '../../services';
import { guestStorageService } from '../../services/guestStorageService';
import { useAuth } from '../../contexts/AuthContext';
import { PlantCard, PlantFilter } from '../../components';
import { CustomHeader } from '../../components/CustomComponents/CustomHeader';
import { useTranslation } from 'react-i18next';

export const PollinationScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { isGuest } = useAuth();
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
  const [menuOpen, setMenuOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(200)).current; // Start off-screen to the right

  // Fetch plants data
  const fetchPlants = async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);

      if (isGuest) {
        const response = await guestStorageService.getLocalPlants(filters);
        setPlants(response.data);
        setFilteredPlants(response.data);
      } else {
        const response = await plantService.getPlants(filters);
        setPlants(response.data);
        setFilteredPlants(response.data);
      }
    } catch (error) {
      console.error('Error fetching plants:', error);
      
      // Provide specific error messages
      let errorMessage = t('errors.fetchPlantsFailed');
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        errorMessage = t('errors.sessionExpired');
      } else if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
        errorMessage = t('errors.fetchPlantsFailed');
      } else if (error.response?.status >= 500) {
        errorMessage = t('errors.fetchPlantsFailed');
      }
      
      Alert.alert(t('common.error'), errorMessage);
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

  // Format plant display name
  const formatPlantName = (plant) => {
    return plant.plantName || plant.variety?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || plant.gourdType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || t('pollination.unknownPlant');
  };

  // Handle plant actions
  const handlePlantPress = (plant) => {
    navigation.navigate('PlantDetail', { plantId: plant._id, plant });
  };

  const handleEditPlant = (plant) => {
    navigation.navigate('PlantForm', { 
      plant, 
      mode: 'edit',
      title: t('pollination.editPlant') 
    });
  };

  const handleDeletePlant = async (plant) => {
    Alert.alert(
      t('pollination.deletePlant'),
      t('pollination.deletePlantConfirm', { name: formatPlantName(plant) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('pollination.deletePlant'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (isGuest) {
                await guestStorageService.deleteLocalPlant(plant._id);
              } else {
                await plantService.deletePlant(plant._id);
              }
              setPlants(prev => prev.filter(p => p._id !== plant._id));
              setFilteredPlants(prev => prev.filter(p => p._id !== plant._id));
              Alert.alert(t('common.success'), t('pollination.plantDeleted'));
            } catch (error) {
              console.error('Error deleting plant:', error);
              Alert.alert(t('common.error'), t('pollination.deletePlantFailed'));
            }
          }
        }
      ]
    );
  };

  const toggleMenu = () => {
    const toValue = menuOpen ? 200 : 0;
    setMenuOpen(!menuOpen);
    Animated.spring(slideAnim, {
      toValue,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  };

  const handleAddPlant = () => {
    console.log('🌱 Add Plant button pressed');
    console.log('📱 Navigation object:', navigation);
    console.log('🎯 Attempting to navigate to PlantForm');
    
    try {
      navigation.navigate('PlantForm', { 
        mode: 'create',
        title: t('pollination.addNewPlant') 
      });
      console.log('✅ Navigation call completed');
    } catch (error) {
      console.error('❌ Navigation error:', error);
      Alert.alert(t('common.error'), t('errors.genericError'));
    }
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="leaf-outline" size={64} color={theme.colors.text.secondary} />
      <Text style={styles.emptyStateTitle}>{t('pollination.noPlantsYet')}</Text>
      <Text style={styles.emptyStateText}>
        {t('pollination.noPlantsMessage')}
      </Text>
      <TouchableOpacity style={styles.emptyStateButton} onPress={handleAddPlant}>
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.emptyStateButtonText}>{t('pollination.addFirstPlant')}</Text>
      </TouchableOpacity>
    </View>
  );

  // Handle pollination tracking
  const handleTrackPollinations = (plant) => {
    navigation.navigate('PollinationTracker', { plantId: plant._id, plant });
  };

  // Render plant item
  const renderPlantItem = ({ item }) => (
    <PlantCard
      plant={item}
      onPress={() => handlePlantPress(item)}
      onEdit={() => handleEditPlant(item)}
      onDelete={() => handleDeletePlant(item)}
      onTrackPollinations={() => handleTrackPollinations(item)}
    />
  );

  // Header right component
  const headerRight = () => (
    <View style={styles.headerRight}>
      {/* Sliding Menu */}
      <Animated.View style={[styles.slidingMenu, { transform: [{ translateX: slideAnim }] }]}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => {
            toggleMenu();
            navigation.navigate('PredictYield', {});
          }}
        >
          <Ionicons name="pulse-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => {
            toggleMenu();
            navigation.navigate('PredictFlowers', {});
          }}
        >
          <Ionicons name="analytics-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => {
            toggleMenu();
            setShowFilter(!showFilter);
          }}
        >
          <Ionicons 
            name={showFilter ? 'funnel' : 'funnel-outline'} 
            size={20} 
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Menu Toggle Button */}
      <TouchableOpacity 
        style={styles.menuToggle}
        onPress={toggleMenu}
      >
        <Ionicons 
          name={menuOpen ? 'close' : 'ellipsis-horizontal'} 
          size={24} 
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>{t('pollination.loadingPlants')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader
        variant="management"
        title={t('pollination.title')}
        subtitle={`${filteredPlants.length} ${filteredPlants.length === 1 ? t('common.plant') : t('common.plants')}`}
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
                  {t('pollination.showingResults', { count: filteredPlants.length, total: plants.length })}
                </Text>
                {(filters.status || filters.name || filters.sort !== 'newest') && (
                  <TouchableOpacity 
                    onPress={() => setFilters({ status: '', name: '', sort: 'newest' })}
                    style={styles.clearFilters}
                  >
                    <Text style={styles.clearFiltersText}>{t('pollination.clearAllFilters')}</Text>
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
    position: 'relative',
    height: 36,
    overflow: 'visible',
  },
  slidingMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'absolute',
    right: 48,
  },
  menuButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  menuToggle: {
    width: 40,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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