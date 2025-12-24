import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../styles';

export const ProfileSection = ({ title, children, style }) => {
    return (
        <View style={[styles.sectionCard, style]}>
            {title && <Text style={styles.sectionTitle}>{title}</Text>}
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    sectionCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.profile.card.borderRadius,
        marginHorizontal: theme.profile.card.margin,
        marginTop: theme.profile.card.margin,
        padding: theme.profile.card.padding,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.profile.card.shadowOpacity,
        shadowRadius: theme.profile.card.shadowRadius,
        elevation: theme.profile.card.elevation,
    },
    sectionTitle: {
        fontSize: theme.typography.profileTitle.fontSize,
        fontFamily: theme.typography.profileTitle.fontFamily,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.md,
    },
});
