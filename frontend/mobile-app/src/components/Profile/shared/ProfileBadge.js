import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../styles';

export const ProfileBadge = ({ text, color, style }) => {
    return (
        <View style={[styles.badge, { backgroundColor: color || theme.colors.primary }, style]}>
            <Text style={styles.badgeText}>{text}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: theme.profile.badge.paddingHorizontal,
        paddingVertical: theme.profile.badge.paddingVertical,
        borderRadius: theme.profile.badge.borderRadius,
        marginLeft: theme.spacing.xs,
    },
    badgeText: {
        fontSize: theme.profile.badge.fontSize,
        color: '#FFFFFF',
        fontWeight: '700',
    },
});
