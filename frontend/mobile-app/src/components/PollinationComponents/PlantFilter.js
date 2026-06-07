import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';

export const PlantFilter = ({ 
  filters, 
  onFilterChange, 
  plantTypes = [], 
  isLoading = false,
  onRefresh 
}) => {
  const statusOptions = [
    { value: '', label: 'All Status', icon: 'apps' },
    { value: 'planted', label: 'Planted', icon: 'leaf' },
    { value: 'flowering', label: 'Flowering', icon: 'flower' },
    { value: 'pollinated', label: 'Pollinated', icon: 'heart' },
    { value: 'fruiting', label: 'Fruiting', icon: 'nutrition' },
    { value: 'harvested', label: 'Harvested', icon: 'checkmark-circle' },
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'name', label: 'Plant Type' },
    { value: 'status', label: 'Status' },
    { value: 'pollination', label: 'Pollination Window' },
  ];

  const handleStatusFilter = (status) => {
    onFilterChange({ ...filters, status: status === filters.status ? '' : status });
  };

  const handlePlantTypeFilter = (plantType) => {
    onFilterChange({ ...filters, name: plantType === filters.name ? '' : plantType });
  };

  const handleSortChange = (sort) => {
    onFilterChange({ ...filters, sort });
  };

  const formatPlantName = (name) => {
    if (!name) return 'All Plants';
    return name;
  };

  return (
    <View style={styles.container}>
      {/* Header with refresh */}
      <View style={styles.header}>
        <Text style={styles.title}>Filter & Sort</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={isLoading}
        >
          <Ionicons 
            name="refresh" 
            size={20} 
            color={isLoading ? theme.colors.text.secondary : theme.colors.primary} 
          />
        </TouchableOpacity>
      </View>

      {/* Status Filter */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <FlatList
          data={statusOptions}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.value || 'all'}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                (filters.status === item.value || (!filters.status && item.value === '')) && styles.filterChipActive
              ]}
              onPress={() => handleStatusFilter(item.value)}
            >
              <Ionicons 
                name={item.icon} 
                size={16} 
                color={
                  (filters.status === item.value || (!filters.status && item.value === ''))
                    ? '#FFFFFF' 
                    : theme.colors.text.secondary
                } 
                style={styles.chipIcon}
              />
              <Text style={[
                styles.filterChipText,
                (filters.status === item.value || (!filters.status && item.value === '')) && styles.filterChipTextActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Plant Type Filter */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Plant Type</Text>
        <FlatList
          data={[
            { value: '', label: 'All Plants' },
            { value: 'Bitter Gourd', label: 'Bitter Gourd' },
            { value: 'Sponge Gourd', label: 'Sponge Gourd' },
            { value: 'Bottle Gourd', label: 'Bottle Gourd' },
            { value: 'Squash', label: 'Squash' },
            { value: 'Cucumber', label: 'Cucumber' },
          ]}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.value || 'all-plants'}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                (filters.name === item.value || (!filters.name && item.value === '')) && styles.filterChipActive
              ]}
              onPress={() => handlePlantTypeFilter(item.value)}
            >
              <Text style={[
                styles.filterChipText,
                (filters.name === item.value || (!filters.name && item.value === '')) && styles.filterChipTextActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Sort Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sort By</Text>
        <FlatList
          data={sortOptions}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                filters.sort === item.value && styles.filterChipActive
              ]}
              onPress={() => handleSortChange(item.value)}
            >
              <Text style={[
                styles.filterChipText,
                filters.sort === item.value && styles.filterChipTextActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Active Filters Summary */}
      {(filters.status || filters.name || filters.sort !== 'newest') && (
        <View style={styles.activeFilters}>
          <Text style={styles.activeFiltersTitle}>Active Filters:</Text>
          <View style={styles.activeFiltersList}>
            {filters.status && (
              <View style={styles.activeFilterItem}>
                <Text style={styles.activeFilterText}>
                  Status: {statusOptions.find(s => s.value === filters.status)?.label}
                </Text>
                <TouchableOpacity onPress={() => handleStatusFilter(filters.status)}>
                  <Ionicons name="close" size={14} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              </View>
            )}
            {filters.name && (
              <View style={styles.activeFilterItem}>
                <Text style={styles.activeFilterText}>
                  Plant: {formatPlantName(filters.name)}
                </Text>
                <TouchableOpacity onPress={() => handlePlantTypeFilter(filters.name)}>
                  <Ionicons name="close" size={14} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              </View>
            )}
            {filters.sort !== 'newest' && (
              <View style={styles.activeFilterItem}>
                <Text style={styles.activeFilterText}>
                  Sort: {sortOptions.find(s => s.value === filters.sort)?.label}
                </Text>
                <TouchableOpacity onPress={() => handleSortChange('newest')}>
                  <Ionicons name="close" size={14} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.clearAllButton}
              onPress={() => onFilterChange({ status: '', name: '', sort: 'newest' })}
            >
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
  },
  refreshButton: {
    padding: theme.spacing.xs,
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  filterList: {
    paddingRight: theme.spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.medium,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipIcon: {
    marginRight: 4,
  },
  filterChipText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  activeFilters: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.background.secondary,
    paddingTop: theme.spacing.md,
  },
  activeFiltersTitle: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
    fontWeight: '600',
  },
  activeFiltersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  activeFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.small,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  activeFilterText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginRight: 4,
    fontSize: 11,
  },
  clearAllButton: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.small,
    marginBottom: theme.spacing.xs,
  },
  clearAllText: {
    ...theme.typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 11,
  },
});