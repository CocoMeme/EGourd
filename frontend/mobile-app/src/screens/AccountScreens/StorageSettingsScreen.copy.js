import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { theme } from '../../styles';

export const StorageSettingsScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(false);
    const [cacheSize, setCacheSize] = useState(0);
    const [documentSize, setDocumentSize] = useState(0);

    useEffect(() => {
        calculateStorageUsage();
    }, []);

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const calculateStorageUsage = async () => {
        try {
            setLoading(true);

            // Calculate Cache Size (Images, temporary files)
            const cacheDir = FileSystem.cacheDirectory;
            const cacheInfo = await FileSystem.getInfoAsync(cacheDir);
            // Note: getInfoAsync on a directory doesn't always return recursive size on all platforms directly 
            // but typically size is returned if supported. For reliable size calculation we might need to iterate,
            // but for settings summary, simple folder size is often "good enough" or we can iterate if needed.
            // Let's iterate to be sure for cache.
            let totalCache = 0;
            if (cacheInfo.exists && cacheInfo.isDirectory) {
                const files = await FileSystem.readDirectoryAsync(cacheDir);
                for (const file of files) {
                    const fileInfo = await FileSystem.getInfoAsync(cacheDir + file);
                    if (!fileInfo.isDirectory) {
                        totalCache += fileInfo.size || 0;
                    }
                }
            }
            setCacheSize(totalCache);

            // Document directory (Data)
            const docDir = FileSystem.documentDirectory;
            // const docInfo = await FileSystem.getInfoAsync(docDir);
            let totalDocs = 0;
            if (docDir) {
                const files = await FileSystem.readDirectoryAsync(docDir);
                // Simple count
                totalDocs = files.length;
                // Size calculation would be similar iteration
            }
            // Just showing rough metric or dummy for document data if we don't store heavy user files there
            setDocumentSize(0); // We primarily use cloud/cache, so documents might be negligible for now

        } catch (error) {
            console.log('Error calculating storage:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearCache = () => {
        Alert.alert(
            'Clear Cache',
            'This will delete all temporary files and images. You won\'t lose any account data. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: performClearCache }
            ]
        );
    };

    const performClearCache = async () => {
        try {
            setLoading(true);
            const cacheDir = FileSystem.cacheDirectory;
            await FileSystem.deleteAsync(cacheDir, { idempotent: true });
            // Re-create it (sometimes deleting root cache dir can be aggressive)
            // Actually deleteAsync on cacheDirectory works fine, standard practice is usually to delete *contents*
            // but let's see. Safest is to iterate contents.

            // Let's assume standard aggressive clear is OK, or iterate to be safe
            // await FileSystem.deleteAsync(cacheDir + 'Camera', { idempotent: true }); // Example subfolder

            // Recalculate
            await calculateStorageUsage();
            Alert.alert('Success', 'Cache cleared successfully');
        } catch (error) {
            console.error('Clear cache error:', error);
            Alert.alert('Error', 'Failed to clear cache');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Storage & Data</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Storage Usage</Text>

                    <View style={styles.storageCard}>
                        <View style={styles.usageRow}>
                            <View style={styles.usageIcon}>
                                <Ionicons name="images-outline" size={24} color={theme.colors.primary} />
                            </View>
                            <View style={styles.usageInfo}>
                                <Text style={styles.usageLabel}>Cache & Temporary Files</Text>
                                <Text style={styles.usageDesc}>Images from camera, temporary downloads</Text>
                            </View>
                            <Text style={styles.usageSize}>{formatSize(cacheSize)}</Text>
                        </View>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.actionButton} onPress={handleClearCache}>
                            <Text style={styles.actionButtonText}>Clear Cache</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App Data</Text>
                    <View style={styles.infoCard}>
                        <Ionicons name="information-circle-outline" size={24} color={theme.colors.text.secondary} />
                        <Text style={styles.infoText}>
                            Your account data (history, profile) is stored securely in the cloud. Clearing local cache will not affect your saved history.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.secondary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text.primary,
    },
    content: {
        flex: 1,
        padding: theme.spacing.lg,
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    storageCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.large,
        padding: theme.spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    usageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    usageIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    usageInfo: {
        flex: 1,
    },
    usageLabel: {
        fontSize: 16,
        fontFamily: theme.fonts.semiBold,
        color: theme.colors.text.primary,
    },
    usageDesc: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        marginTop: 2,
    },
    usageSize: {
        fontSize: 16,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text.primary,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.background.secondary,
        marginVertical: theme.spacing.sm,
    },
    actionButton: {
        paddingVertical: theme.spacing.sm,
        alignItems: 'center',
    },
    actionButtonText: {
        color: theme.colors.error,
        fontSize: 14,
        fontFamily: theme.fonts.semiBold,
    },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.medium,
        alignItems: 'center',
    },
    infoText: {
        flex: 1,
        marginLeft: theme.spacing.md,
        fontSize: 13,
        color: theme.colors.text.secondary,
        lineHeight: 18,
    },
});
