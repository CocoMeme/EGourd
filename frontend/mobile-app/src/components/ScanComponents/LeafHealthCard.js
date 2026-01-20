import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';

/**
 * LeafHealthCard - Component to display leaf health analysis
 * @param {Object} healthData - Health data object from Gemini
 */
export const LeafHealthCard = ({ healthData }) => {
    if (!healthData) return null;

    const getHealthColor = (score) => {
        if (score >= 80) return '#4CAF50';
        if (score >= 60) return '#8BC34A';
        if (score >= 40) return '#FFEB3B';
        if (score >= 20) return '#FF9800';
        return '#F44336';
    };

    const score = healthData.healthScore || 0;
    const color = getHealthColor(score);

    return (
        <View style={styles.card}>
            <Text style={styles.sectionTitle}>Leaf Health</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Score Circle */}
                <View style={styles.scoreCircle}>
                    <Text style={[styles.scoreText, { color }]}>{score}</Text>
                    <Text style={styles.scoreLabel}>Health</Text>
                </View>

                {/* Details */}
                <View style={{ flex: 1, marginLeft: 20 }}>
                    {healthData.chlorophyllLevel && (
                        <View style={styles.healthRow}>
                            <Ionicons name="leaf" size={16} color="#4CAF50" />
                            <Text style={styles.healthText}>
                                Chlorophyll: <Text style={styles.healthValue}>{healthData.chlorophyllLevel}</Text>
                            </Text>
                        </View>
                    )}

                    {healthData.maturityStage && (
                        <View style={styles.healthRow}>
                            <Ionicons name="time-outline" size={16} color="#2196F3" />
                            <Text style={styles.healthText}>
                                Maturity: <Text style={styles.healthValue}>{healthData.maturityStage}</Text>
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Visible Issues */}
            {healthData.visibleIssues?.length > 0 && (
                <View style={styles.issuesContainer}>
                    <Text style={styles.issuesTitle}>
                        <Ionicons name="warning" size={14} color="#FF9800" /> Issues Detected:
                    </Text>
                    {healthData.visibleIssues.map((issue, i) => (
                        <Text key={i} style={styles.issueItem}>• {issue}</Text>
                    ))}
                </View>
            )}

            {/* Nutrient Deficiencies */}
            {healthData.nutrientDeficiencies?.length > 0 && (
                <View style={styles.issuesContainer}>
                    <Text style={[styles.issuesTitle, { color: '#F44336' }]}>
                        <Ionicons name="alert-circle" size={14} color="#F44336" /> Nutrient Deficiencies:
                    </Text>
                    {healthData.nutrientDeficiencies.map((def, i) => (
                        <Text key={i} style={[styles.issueItem, { color: '#D32F2F' }]}>• {def}</Text>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12, // More rounded for premium feel
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    sectionTitle: {
        color: '#333333',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
        fontFamily: 'Poppins_600SemiBold',
    },
    scoreCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F9F9F9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EEE',
    },
    scoreText: {
        fontSize: 24,
        fontWeight: '700',
        fontFamily: 'Poppins_700Bold',
    },
    scoreLabel: {
        fontSize: 10,
        color: '#888',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    healthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    healthText: {
        fontSize: 14,
        color: '#555',
        fontFamily: 'Poppins_400Regular',
    },
    healthValue: {
        fontWeight: '600',
        color: '#333',
        fontFamily: 'Poppins_600SemiBold',
        textTransform: 'capitalize',
    },
    issuesContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F5F5F5',
    },
    issuesTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FF9800',
        marginBottom: 8,
        fontFamily: 'Poppins_600SemiBold',
    },
    issueItem: {
        fontSize: 13,
        color: '#666',
        marginLeft: 8,
        marginBottom: 4,
        fontFamily: 'Poppins_400Regular',
    },
});
