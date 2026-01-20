import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '../../styles';

/**
 * LeafQualityMetrics - Animated bar display for leaf health/quality
 */
export const LeafQualityMetrics = ({ healthData, confidence }) => {
    if (!healthData) return null;

    const metrics = [
        { label: 'Overall Health', value: healthData.healthScore || 0, color: '#4CAF50' },
        { label: 'Variety Confidence', value: confidence || 0, color: '#2196F3' },
        { label: 'Vibrancy', value: (healthData.chlorophyllLevel === 'healthy' ? 95 : healthData.chlorophyllLevel === 'yellowing' ? 60 : 30), color: '#8BC34A' },
        { label: 'Structural Integrity', value: (100 - (healthData.visibleIssues?.length || 0) * 15), color: '#9C27B0' }
    ];

    return (
        <View style={styles.card}>
            <Text style={styles.sectionTitle}>Quality Metrics</Text>
            {metrics.map((metric, index) => (
                <MetricBar key={index} label={metric.label} value={metric.value} color={metric.color} />
            ))}
        </View>
    );
};

const MetricBar = ({ label, value, color }) => {
    const animatedWidth = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animatedWidth, {
            toValue: value,
            duration: 1000,
            delay: 200,
            useNativeDriver: false,
        }).start();
    }, [value]);

    return (
        <View style={styles.metricContainer}>
            <View style={styles.labelRow}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{Math.round(value)}%</Text>
            </View>
            <View style={styles.barBackground}>
                <Animated.View
                    style={[
                        styles.barFill,
                        {
                            width: animatedWidth.interpolate({
                                inputRange: [0, 100],
                                outputRange: ['0%', '100%']
                            }),
                            backgroundColor: color
                        }
                    ]}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
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
    metricContainer: {
        marginBottom: 16,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    label: {
        fontSize: 12,
        color: '#666',
        fontFamily: 'Poppins_500Medium',
    },
    value: {
        fontSize: 12,
        fontWeight: '700',
        color: '#333',
        fontFamily: 'Poppins_700Bold',
    },
    barBackground: {
        height: 8,
        backgroundColor: '#F0F0F0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 4,
    },
});
