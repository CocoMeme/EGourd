/**
 * GuestBanner - Informational banner for guest mode
 * Shows a subtle sign-in prompt on gated tab/screen content.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';

export const GuestBanner = ({ 
  message = 'Sign in to sync your data across devices.',
  actionLabel = 'Sign In',
  onAction,
  icon = 'information-circle-outline',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <Ionicons name={icon} size={20} color={theme.colors.primary} style={styles.icon} />
        <Text style={styles.message}>{message}</Text>
      </View>
      {onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Ionicons name="arrow-forward" size={14} color={theme.colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(85, 156, 73, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(85, 156, 73, 0.2)',
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: theme.spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: theme.spacing.sm,
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.primary,
  },
});

export default GuestBanner;
