import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../styles';

export const StandardHeader = ({ title, onBack }) => {
    return (
        <View style={styles.header}>
            {onBack ? (
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
            ) : (
                <View style={{ width: 24 }} />
            )}
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={{ width: 24 }} />
        </View>
    );
};

const styles = StyleSheet.create({
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
    backButton: {
        paddingVertical: theme.spacing.xs,
        paddingRight: theme.spacing.xs,
    },
});
