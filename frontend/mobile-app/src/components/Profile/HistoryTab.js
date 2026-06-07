import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Alert,
    TextInput,
    TouchableOpacity,
    ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { scanService, guestStorageService } from '../../services';
import { RecentScanCard, GuestBanner } from '../../components';

export const HistoryTab = ({ navigation, route, isGuest }) => {
    const [scans, setScans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedVariety, setSelectedVariety] = useState('all');
    const [selectedGender, setSelectedGender] = useState('all');

    const varieties = [
        { id: 'all', label: 'All' },
        { id: 'Bitter Gourd', label: 'Bitter Gourd' },
        { id: 'Sponge Gourd', label: 'Sponge Gourd' },
        { id: 'Bottle Gourd', label: 'Bottle Gourd' },
        { id: 'Cucumber', label: 'Cucumber' },
        { id: 'Squash', label: 'Squash' },
    ];

    const genders = [
        { id: 'all', label: 'All' },
        { id: 'male', label: 'Male' },
        { id: 'female', label: 'Female' },
    ];

    // If filter is passed via route params (from Home screen stats)
    useEffect(() => {
        if (route?.params?.filter) {
            // Logic to handle filter if needed
        }
    }, [route?.params]);

    const fetchHistory = async () => {
        try {
            if (isGuest) {
                const localScans = await guestStorageService.getLocalScans();
                setScans(localScans);
            } else {
                const history = await scanService.getScanHistory();
                setScans(history);
            }
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
        if (navigation) {
            try {
                // Navigate to appropriate Results screen based on scan type
                const screenName = scan.scanType === 'leaf' ? 'LeafResults' : 'FlowerResults';
                navigation.navigate(screenName, {
                    scan: scan,
                    returnTo: 'ProfileMain',
                });
            } catch (error) {
                console.error('Navigation error:', error);
                Alert.alert('Error', 'Could not open scan details.');
            }
        } else {
            console.warn('Navigation prop is missing in HistoryTab');
        }
    };

    const filteredScans = scans.filter(scan => {
        // Apply search filter
        const matchesSearch = searchQuery === '' || 
            scan.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            scan.variety?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            scan.prediction?.toLowerCase().includes(searchQuery.toLowerCase());

        // Apply variety filter (backward-compatible with legacy names)
        const legacyVarietyMap = {
            'Bitter Gourd': ['Ampalaya', 'Ampalaya Bilog', 'Ampalaya Elipse'],
            'Sponge Gourd': ['Patola', 'Patola Bilog', 'Patola Elipse'],
            'Bottle Gourd': ['Upo', 'Upo Bilog', 'Upo Elipse'],
            'Cucumber': ['Pipino', 'Pipino Bilog', 'Pipino Elipse'],
            'Squash': ['Kalabasa', 'Kalabasa Bilog', 'Kalabasa Elipse'],
        };
        const matchesVariety = selectedVariety === 'all' || 
            scan.variety === selectedVariety || 
            (legacyVarietyMap[selectedVariety] || []).includes(scan.variety);

        // Apply gender filter
        const matchesGender = selectedGender === 'all' || scan.prediction?.toLowerCase() === selectedGender;

        return matchesSearch && matchesVariety && matchesGender;
    });

    const renderItem = ({ item }) => (
        <RecentScanCard
            imageUri={item.imageUrl}
            result={`${item.prediction} Flower`}
            date={item.date}
            confidence={item.confidence}
            name={item.name}
            gender={item.prediction}
            onPress={() => handleScanPress(item)}
            onDelete={() => handleDelete(item._id || item.id)}
            style={styles.card}
        />
    );

    const handleDelete = async (scanId) => {
        Alert.alert(
            'Delete Scan',
            'Are you sure you want to delete this scan?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (isGuest) {
                                await guestStorageService.deleteLocalScan(scanId);
                            } else {
                                await scanService.deleteScan(scanId);
                            }
                            // Remove from local state
                            setScans(prev => prev.filter(scan => (scan._id || scan.id) !== scanId));
                        } catch (error) {
                            console.error('Error deleting scan:', error);
                            Alert.alert('Error', 'Failed to delete scan. Please try again.');
                        }
                    }
                }
            ]
        );
    };

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
            {isGuest && (
                <GuestBanner
                    message="Your scan history is stored locally on this device. Sign in to sync across devices."
                    icon="phone-portrait-outline"
                    style={{ marginHorizontal: theme.spacing.md, marginTop: theme.spacing.md }}
                />
            )}
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={theme.colors.text.secondary} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name, variety..."
                    placeholderTextColor={theme.colors.text.secondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery !== '' && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                        <Ionicons name="close-circle" size={20} color={theme.colors.text.secondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter Chips */}
            <View style={styles.filtersSection}>
                {/* Variety Filters */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterRow}
                >
                    <Text style={styles.filterLabel}>Variety:</Text>
                    {varieties.map(variety => (
                        <TouchableOpacity
                            key={variety.id}
                            style={[
                                styles.filterChip,
                                selectedVariety === variety.id && styles.filterChipActive
                            ]}
                            onPress={() => setSelectedVariety(variety.id)}
                        >
                            <Text style={[
                                styles.filterChipText,
                                selectedVariety === variety.id && styles.filterChipTextActive
                            ]}>
                                {variety.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Gender Filters */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterRow}
                >
                    <Text style={styles.filterLabel}>Gender:</Text>
                    {genders.map(gender => (
                        <TouchableOpacity
                            key={gender.id}
                            style={[
                                styles.filterChip,
                                selectedGender === gender.id && styles.filterChipActive
                            ]}
                            onPress={() => setSelectedGender(gender.id)}
                        >
                            <Text style={[
                                styles.filterChipText,
                                selectedGender === gender.id && styles.filterChipTextActive
                            ]}>
                                {gender.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Results Count */}
            {(searchQuery !== '' || selectedVariety !== 'all' || selectedGender !== 'all') && (
                <View style={styles.resultsCount}>
                    <Text style={styles.resultsCountText}>
                        {filteredScans.length} result{filteredScans.length !== 1 ? 's' : ''}
                    </Text>
                    {(selectedVariety !== 'all' || selectedGender !== 'all' || searchQuery !== '') && (
                        <TouchableOpacity 
                            onPress={() => {
                                setSearchQuery('');
                                setSelectedVariety('all');
                                setSelectedGender('all');
                            }}
                            style={styles.clearAllButton}
                        >
                            <Text style={styles.clearAllText}>Clear all</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <FlatList
                data={filteredScans}
                renderItem={renderItem}
                keyExtractor={item => item._id || item.id}
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
        backgroundColor: theme.colors.background.secondary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background.secondary,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        marginHorizontal: theme.spacing.md,
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: theme.colors.background.secondary,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: theme.fonts.regular,
        color: theme.colors.text.primary,
    },
    clearButton: {
        padding: 4,
    },
    filtersSection: {
        marginBottom: theme.spacing.xs,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 4,
        gap: 6,
    },
    filterLabel: {
        fontSize: 12,
        fontFamily: theme.fonts.semiBold,
        color: theme.colors.text.secondary,
        marginRight: 2,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 14,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.background.secondary,
    },
    filterChipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    filterChipText: {
        fontSize: 12,
        fontFamily: theme.fonts.medium,
        color: theme.colors.text.primary,
    },
    filterChipTextActive: {
        color: '#fff',
    },
    resultsCount: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 8,
    },
    resultsCountText: {
        fontSize: 13,
        fontFamily: theme.fonts.medium,
        color: theme.colors.text.secondary,
    },
    clearAllButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    clearAllText: {
        fontSize: 13,
        fontFamily: theme.fonts.semiBold,
        color: theme.colors.primary,
    },
    listContent: {
        padding: theme.spacing.md,
        paddingTop: 0,
        paddingBottom: theme.spacing.xl,
    },
    card: {
        marginBottom: 10,
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
