import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../styles';
import { ProfileBadge } from './ProfileBadge';

export const ProfileItem = ({ 
    icon, 
    title, 
    value, 
    onPress, 
    badge, 
    badgeColor, 
    isLast = false, 
    description, 
    toggleValue, 
    onToggle, 
    valueStyle 
}) => {
    return (
        <TouchableOpacity
            style={[styles.profileItem, isLast && styles.profileItemLast]}
            onPress={onPress}
            disabled={!onPress || toggleValue !== undefined}
            activeOpacity={onPress ? 0.8 : 1}
        >
            <View style={styles.profileItemLeft}>
                <View style={styles.profileIconWrap}>
                    <Ionicons name={icon} size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.profileItemTextGroup}>
                    <View style={styles.titleRow}>
                        <Text style={styles.profileItemTitle}>{title}</Text>
                        {badge && (
                            <ProfileBadge text={badge} color={badgeColor} />
                        )}
                    </View>
                    {description && <Text style={styles.profileItemDescription}>{description}</Text>}
                </View>
            </View>
            <View style={styles.profileItemRight}>
                {toggleValue !== undefined ? (
                    <Switch
                        value={toggleValue}
                        onValueChange={onToggle}
                        trackColor={{ false: '#767577', true: '#FF9800' }}
                        thumbColor={toggleValue ? '#FFFFFF' : '#f4f3f4'}
                        ios_backgroundColor="#767577"
                    />
                ) : (
                    <>
                        {!!value && (
                            <Text style={[styles.profileItemValue, valueStyle]} numberOfLines={1}>
                                {value}
                            </Text>
                        )}
                        {onPress && (
                            <Ionicons name="chevron-forward" size={18} color={theme.colors.text.secondary} />
                        )}
                    </>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    profileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.profile.item.paddingVertical,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.background.secondary,
    },
    profileItemLast: { borderBottomWidth: 0 },
    profileItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    profileIconWrap: {
        width: theme.profile.icon.size,
        height: theme.profile.icon.size,
        borderRadius: theme.profile.icon.borderRadius,
        backgroundColor: theme.profile.icon.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileItemTextGroup: { marginLeft: theme.spacing.md, flex: 1 },
    profileItemTitle: {
        fontSize: theme.typography.profileItemTitle.fontSize,
        fontFamily: theme.typography.profileItemTitle.fontFamily,
        color: theme.colors.text.primary,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileItemDescription: {
        fontSize: theme.typography.profileItemDescription.fontSize,
        fontFamily: theme.typography.profileItemDescription.fontFamily,
        color: theme.colors.text.secondary,
        marginTop: 2,
    },
    profileItemRight: { flexDirection: 'row', alignItems: 'center' },
    profileItemValue: {
        fontSize: theme.profile.item.valueSize,
        color: theme.colors.text.secondary,
        marginRight: theme.spacing.xs,
    },
});
