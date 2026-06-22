/**
 * PollinationTrackerScreen
 * ========================
 * 
 * Screen to track individual pollination entries:
 * - View list of pollinations (Pollinated 1, Pollinated 2, etc.)
 * - Add new pollination entries
 * - Edit existing entries
 * - Mark as successful/failed
 * - Shows expected result date based on gourd type
 * - Schedules notifications for checking results
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../styles';
import { plantService } from '../../services';
import { guestStorageService } from '../../services/guestStorageService';
import { useAuth } from '../../contexts/AuthContext';
import { CustomHeader } from '../../components/CustomComponents/CustomHeader';
import { pollinationNotificationHelper } from '../../utils/pollinationNotificationHelper';
import { useTranslation } from 'react-i18next';

export const PollinationTrackerScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const DAYS_TO_RESULT = {
    bitter_gourd: {
      min: 5,
      max: 7,
      average: 6,
      name: t('pollinationTracker.gourdTypes.bitter_gourd'),
    },
    bottle_gourd: {
      min: 7,
      max: 10,
      average: 8,
      name: t('pollinationTracker.gourdTypes.bottle_gourd'),
    },
    sponge_gourd: {
      min: 4,
      max: 6,
      average: 5,
      name: t('pollinationTracker.gourdTypes.sponge_gourd'),
    },
    cucumber: {
      min: 3,
      max: 5,
      average: 4,
      name: t('pollinationTracker.gourdTypes.cucumber'),
    },
    kalabasa: {
      min: 8,
      max: 12,
      average: 10,
      name: t('pollinationTracker.gourdTypes.kalabasa'),
    },
  };
  const { isGuest } = useAuth();
  const { plantId, plant: initialPlant } = route.params;
  
  const [plant, setPlant] = useState(initialPlant);
  const [pollinations, setPollinations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedPollination, setSelectedPollination] = useState(null);
  
  // Form states
  const [femaleFlowerCount, setFemaleFlowerCount] = useState('1');
  const [isHandPollinated, setIsHandPollinated] = useState(true);
  const [notes, setNotes] = useState('');
  const [resultStatus, setResultStatus] = useState('pending');
  const [successCount, setSuccessCount] = useState('0');
  const [resultSuccessCount, setResultSuccessCount] = useState('0');

  // Fetch pollinations
  const fetchPollinations = async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);
      
      if (isGuest) {
        const response = await guestStorageService.getLocalPlant(plantId);
        setPlant(response.data);
        setPollinations(response.data.pollinations || []);
      } else {
        // Fetch plant to get updated pollinations
        const response = await plantService.getPlant(plantId);
        setPlant(response.data);
        setPollinations(response.data.pollinations || []);
      }
    } catch (error) {
      console.error('Error fetching pollinations:', error);
      Alert.alert(t('common.error'), t('pollinationTracker.pollinationFailed'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPollinations();
    }, [plantId])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPollinations(false);
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return t('common.notSet');
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format time
  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Calculate days until result
  const getDaysUntilResult = (expectedDate) => {
    if (!expectedDate) return null;
    const today = new Date();
    const expected = new Date(expectedDate);
    const diff = Math.ceil((expected - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Schedule notification using the helper
  const scheduleResultNotification = async (pollination) => {
    try {
      if (!pollination.expectedResultDate || pollination.notificationScheduled) {
        return null;
      }

      // Use the notification helper
      const notificationId = await pollinationNotificationHelper.schedulePollinationResultNotification(
        pollination,
        plant
      );

      if (notificationId) {
        // Update pollination with notification ID
        await plantService.updatePollination(plantId, pollination._id, {
          notificationScheduled: true,
          notificationId
        });
      }

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  };

  // Add new pollination
  const handleAddPollination = async () => {
    try {
      setIsSaving(true);
      
      const count = parseInt(femaleFlowerCount) || 1;

      if (isGuest) {
        const response = await guestStorageService.addLocalPollination(
          plantId,
          count,
          isHandPollinated,
          notes
        );
        if (response.success && response.data?.pollination) {
          Alert.alert(
            t('pollinationTracker.successNotification'),
            `${response.data.pollination.label} ${t('pollinationTracker.successLocalMessage')}\n\n` +
            `${t('pollinationTracker.checkResultsMessage')} ${formatDate(response.data.pollination.expectedResultDate)}`,
            [{ text: t('common.ok') }]
          );
        }
        setShowAddModal(false);
        resetForm();
        fetchPollinations(false);
        return;
      }

      const response = await plantService.addPollination(
        plantId,
        count,
        isHandPollinated,
        notes
      );

      if (response.success && response.data?.pollination) {
        // Schedule notification for the new pollination
        await scheduleResultNotification(response.data.pollination);
        
        Alert.alert(
          t('pollinationTracker.successNotification'),
          `${response.data.pollination.label} ${t('pollinationTracker.notificationBody')}\n\n` +
          `${t('pollinationTracker.checkResultsMessage')} ${formatDate(response.data.pollination.expectedResultDate)}\n` +
          `${t('pollinationTracker.notificationSetMessage')}`,
          [{ text: t('common.ok') }]
        );
      }

      setShowAddModal(false);
      resetForm();
      fetchPollinations(false);
    } catch (error) {
      console.error('Error adding pollination:', error);
      Alert.alert(t('common.error'), t('pollinationTracker.pollinationFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  // Update pollination
  const handleUpdatePollination = async () => {
    try {
      if (!selectedPollination) return;
      
      setIsSaving(true);
      
      const previousStatus = selectedPollination.status;
      const updateData = {
        femaleFlowersPollinated: parseInt(femaleFlowerCount) || 1,
        isHandPollinated,
        notes,
        status: resultStatus
      };

      if (resultStatus === 'success' || resultStatus === 'failed' || resultStatus === 'partial') {
        updateData.actualSuccessfulCount = parseInt(successCount) || 0;
        updateData.resultRecordedDate = new Date();
      }

      if (isGuest) {
        await guestStorageService.updateLocalPollination(plantId, selectedPollination._id, updateData);
        Alert.alert(t('common.success'), `${selectedPollination.label} ${t('pollinationTracker.pollinationUpdated')}`);
        setShowEditModal(false);
        resetForm();
        fetchPollinations(false);
        return;
      }

      // Non-guest: cancel notification if marking result
      if (resultStatus === 'success' || resultStatus === 'failed' || resultStatus === 'partial') {
        if (selectedPollination.notificationId) {
          await pollinationNotificationHelper.cancelPollinationResultNotification(selectedPollination.notificationId);
          updateData.notificationScheduled = false;
        }
        
        // Show instant notification if status changed from pending to a result status
        if (previousStatus === 'pending') {
          await pollinationNotificationHelper.showPollinationResultNotification(
            selectedPollination,
            plant,
            resultStatus,
            parseInt(successCount) || 0
          );
        }
      }

      await plantService.updatePollination(plantId, selectedPollination._id, updateData);

      Alert.alert(t('common.success'), `${selectedPollination.label} ${t('pollinationTracker.pollinationUpdated')}`);
      setShowEditModal(false);
      resetForm();
      fetchPollinations(false);
    } catch (error) {
      console.error('Error updating pollination:', error);
      Alert.alert(t('common.error'), t('pollinationTracker.pollinationFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  // Delete pollination
  const handleDeletePollination = (pollination) => {
    Alert.alert(
      t('pollinationTracker.deleteTitle'),
      t('pollinationTracker.deleteConfirm', { label: pollination.label }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('pollinationTracker.deleteTitle'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (isGuest) {
                await guestStorageService.deleteLocalPollination(plantId, pollination._id);
                fetchPollinations(false);
                return;
              }

              // Cancel notification if scheduled using the helper
              if (pollination.notificationId) {
                await pollinationNotificationHelper.cancelPollinationResultNotification(pollination.notificationId);
              }
              
              await plantService.deletePollination(plantId, pollination._id);
              fetchPollinations(false);
            } catch (error) {
              console.error('Error deleting pollination:', error);
              Alert.alert(t('common.error'), t('pollinationTracker.deleteFailed'));
            }
          }
        }
      ]
    );
  };

  // Open result modal
  const openResultModal = (pollination) => {
    setSelectedPollination(pollination);
    setResultSuccessCount(String(pollination.femaleFlowersPollinated || 1));
    setShowResultModal(true);
  };

  // Record result with specific count
  const handleRecordResult = async () => {
    if (!selectedPollination) return;
    
    try {
      const totalPollinated = selectedPollination.femaleFlowersPollinated || 1;
      const successfulCount = Math.min(Math.max(0, parseInt(resultSuccessCount) || 0), totalPollinated);
      
      // Determine status based on success count
      let status = 'pending';
      if (successfulCount === 0) {
        status = 'failed';
      } else if (successfulCount === totalPollinated) {
        status = 'success';
      } else {
        status = 'partial';
      }
      
      // Cancel scheduled notification if exists
      if (selectedPollination.notificationId) {
        await pollinationNotificationHelper.cancelPollinationResultNotification(selectedPollination.notificationId);
      }
      
      // Record the result
      await plantService.updatePollination(plantId, selectedPollination._id, {
        status: status,
        actualSuccessfulCount: successfulCount,
        resultRecordedDate: new Date(),
        notificationScheduled: false
      });
      
      // Show instant notification to confirm the action
      await pollinationNotificationHelper.showPollinationResultNotification(
        selectedPollination,
        plant,
        status,
        successfulCount
      );
      
      // Show confirmation
      let message = '';
      if (status === 'success') {
        message = t('pollinationTracker.greatAllDeveloping', { count: successfulCount });
      } else if (status === 'partial') {
        message = t('pollinationTracker.partialResult', { count: successfulCount, total: totalPollinated });
      } else {
        message = t('pollinationTracker.noWorriesResult');
      }
      
      Alert.alert(
        status === 'failed' ? t('pollinationTracker.resultFailed') : t('pollinationTracker.resultRecorded'),
        message,
        [{ text: t('common.ok') }]
      );
      
      setShowResultModal(false);
      setSelectedPollination(null);
      setResultSuccessCount('0');
      fetchPollinations(false);
    } catch (error) {
      console.error('Error recording result:', error);
      Alert.alert(t('common.error'), t('pollinationTracker.pollinationFailed'));
    }
  };

  // Record result quickly (legacy - for single flower pollinations)
  const handleQuickResult = async (pollination, status) => {
    // For multiple flowers, open result modal to input specific count
    if ((pollination.femaleFlowersPollinated || 1) > 1) {
      openResultModal(pollination);
      return;
    }
    
    try {
      const successfulCount = status === 'success' ? pollination.femaleFlowersPollinated : 0;
      
      // Cancel scheduled notification if exists (no need to remind if result is already recorded)
      if (pollination.notificationId) {
        await pollinationNotificationHelper.cancelPollinationResultNotification(pollination.notificationId);
      }
      
      // Record the result and update notification status
      await plantService.updatePollination(plantId, pollination._id, {
        status: status,
        actualSuccessfulCount: successfulCount,
        resultRecordedDate: new Date(),
        notificationScheduled: false // Mark as no longer needing notification
      });
      
      // Show instant notification to confirm the action
      await pollinationNotificationHelper.showPollinationResultNotification(
        pollination,
        plant,
        status,
        successfulCount
      );
      
      Alert.alert(
        status === 'success' ? t('pollinationTracker.successNotificationTitle') : t('pollinationTracker.resultFailed'),
        status === 'success' 
          ? t('pollinationTracker.greatAllDeveloping', { count: successfulCount })
          : t('pollinationTracker.noWorriesResult'),
        [{ text: t('common.ok') }]
      );
      
      fetchPollinations(false);
    } catch (error) {
      console.error('Error recording result:', error);
      Alert.alert(t('common.error'), t('pollinationTracker.pollinationFailed'));
    }
  };

  // Open edit modal
  const openEditModal = (pollination) => {
    setSelectedPollination(pollination);
    setFemaleFlowerCount(String(pollination.femaleFlowersPollinated || 1));
    setIsHandPollinated(pollination.isHandPollinated !== false);
    setNotes(pollination.notes || '');
    setResultStatus(pollination.status || 'pending');
    setSuccessCount(String(pollination.actualSuccessfulCount || 0));
    setShowEditModal(true);
  };

  // Reset form
  const resetForm = () => {
    setFemaleFlowerCount('1');
    setIsHandPollinated(true);
    setNotes('');
    setResultStatus('pending');
    setSuccessCount('0');
    setSelectedPollination(null);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#4CAF50';
      case 'failed': return '#F44336';
      case 'partial': return '#FF9800';
      default: return '#2196F3';
    }
  };

  // Get gourd info
  const gourdInfo = DAYS_TO_RESULT[plant?.gourdType] || { average: 7, name: 'Gourd' };

  // Render pollination item
  const renderPollinationItem = (pollination, index) => {
    const daysUntil = getDaysUntilResult(pollination.expectedResultDate);
    const isPending = pollination.status === 'pending';
    const isCheckTime = daysUntil !== null && daysUntil <= 0 && isPending;

    return (
      <View key={pollination._id || index} style={styles.pollinationCard}>
        <View style={styles.cardHeader}>
          <View style={styles.labelContainer}>
            <Text style={styles.entryLabel}>{pollination.label || `Pollinated ${index + 1}`}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(pollination.status) }]}>
              <Text style={styles.statusText}>{pollination.status?.toUpperCase() || 'PENDING'}</Text>
            </View>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => openEditModal(pollination)}
            >
              <Ionicons name="pencil" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => handleDeletePollination(pollination)}
            >
              <Ionicons name="trash-outline" size={18} color="#F44336" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.text.secondary} />
            <Text style={styles.infoText}>
              Pollinated: {formatDate(pollination.date)}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="flower-outline" size={16} color={theme.colors.text.secondary} />
            <Text style={styles.infoText}>
              {pollination.femaleFlowersPollinated || 1} female flower(s) • {pollination.isHandPollinated ? 'Hand' : 'Natural'}
            </Text>
          </View>

          {isPending && (
            <View style={[styles.infoRow, styles.expectedResultRow]}>
              <Ionicons name="time-outline" size={16} color={isCheckTime ? '#FF9800' : theme.colors.primary} />
              <Text style={[styles.infoText, isCheckTime && styles.checkTimeText]}>
                  {isCheckTime 
                    ? t('pollinationTracker.timeToCheck')
                    : `${t('pollinationTracker.checkOn')} ${formatDate(pollination.expectedResultDate)} (${daysUntil} ${t('common.days')})`
                }
              </Text>
            </View>
          )}

          {pollination.status === 'success' && (
            <View style={styles.successInfo}>
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
              <Text style={styles.successText}>
                {pollination.actualSuccessfulCount || pollination.femaleFlowersPollinated} fruit(s) developing!
              </Text>
            </View>
          )}

          {pollination.status === 'partial' && (
            <View style={styles.partialInfo}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#FF9800" />
              <Text style={styles.partialText}>
                {pollination.actualSuccessfulCount} of {pollination.femaleFlowersPollinated} fruit(s) developing
              </Text>
            </View>
          )}

          {pollination.notes && (
            <Text style={styles.notesText}>📝 {pollination.notes}</Text>
          )}
        </View>

        {/* Quick result button for ALL pending pollinations - opens modal */}
        {isPending && (
          <View style={styles.quickResultContainer}>
            <TouchableOpacity 
              style={[styles.recordResultButton, isCheckTime && styles.recordResultButtonAlert]}
              onPress={() => openResultModal(pollination)}
            >
              <Ionicons 
                name={isCheckTime ? "alert-circle" : "create-outline"} 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.recordResultButtonText}>
                {isCheckTime ? t('pollinationTracker.timeToRecord') : t('pollinationTracker.recordResultModal')}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Render Add/Edit Modal
  const renderModal = (isEdit = false) => (
    <Modal
      visible={isEdit ? showEditModal : showAddModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        isEdit ? setShowEditModal(false) : setShowAddModal(false);
        resetForm();
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEdit ? `${t('pollinationTracker.editPollinationTitle')} ${selectedPollination?.label}` : t('pollinationTracker.addPollinationTitle')}
            </Text>
            <TouchableOpacity 
              onPress={() => {
                isEdit ? setShowEditModal(false) : setShowAddModal(false);
                resetForm();
              }}
            >
              <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('pollinationTracker.femaleFlowersPollinated')}</Text>
              <TextInput
                style={styles.input}
                value={femaleFlowerCount}
                onChangeText={setFemaleFlowerCount}
                keyboardType="numeric"
                placeholder="1"
              />
            </View>

            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.formLabel}>{t('pollinationTracker.handPollinated')}</Text>
                <Switch
                  value={isHandPollinated}
                  onValueChange={setIsHandPollinated}
                  trackColor={{ false: '#ddd', true: theme.colors.primary + '50' }}
                  thumbColor={isHandPollinated ? theme.colors.primary : '#f4f3f4'}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('pollinationTracker.notesOptional')}</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('pollinationTracker.notesPlaceholder')}
                multiline
                numberOfLines={3}
              />
            </View>

            {isEdit && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('pollinationTracker.resultStatus')}</Text>
                <View style={styles.statusButtons}>
                  {['pending', 'success', 'partial', 'failed'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        resultStatus === status && { backgroundColor: getStatusColor(status) }
                      ]}
                      onPress={() => setResultStatus(status)}
                    >
                      <Text style={[
                        styles.statusOptionText,
                        resultStatus === status && { color: '#fff' }
                      ]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {isEdit && (resultStatus === 'success' || resultStatus === 'partial') && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('pollinationTracker.successfulCount')}</Text>
                <TextInput
                  style={styles.input}
                  value={successCount}
                  onChangeText={setSuccessCount}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
            )}

            {!isEdit && (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
                <Text style={styles.infoBoxText}>
                  {t('pollinationTracker.infoDaysText', { name: gourdInfo.name, min: gourdInfo.min, max: gourdInfo.max })}
                   {'\n\n'}{t('pollinationTracker.notificationSetMessage')}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                isEdit ? setShowEditModal(false) : setShowAddModal(false);
                resetForm();
              }}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, isSaving && styles.disabledButton]}
              onPress={isEdit ? handleUpdatePollination : handleAddPollination}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name={isEdit ? "checkmark" : "add"} size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>{isEdit ? t('common.save') : t('common.add')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>{t('pollinationTracker.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader 
        title={t('pollinationTracker.title')}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Plant Info */}
        <View style={styles.plantInfo}>
          <Text style={styles.plantName}>{plant?.plantName || 'Plant'}</Text>
          <Text style={styles.plantType}>
            {plant?.displayName?.english || plant?.gourdType?.replace(/_/g, ' ')}
          </Text>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Ionicons name="heart" size={22} color="#FF9800" />
            <Text style={styles.summaryNumber}>{pollinations.length}</Text>
            <Text style={styles.summaryLabel}>{t('pollinationTracker.summary.total')}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Ionicons name="time" size={22} color="#2196F3" />
            <Text style={styles.summaryNumber}>
              {pollinations.filter(p => p.status === 'pending').length}
            </Text>
            <Text style={styles.summaryLabel}>{t('pollinationTracker.summary.pending')}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
            <Text style={styles.summaryNumber}>
              {pollinations.filter(p => p.status === 'success' || p.status === 'partial').length}
            </Text>
            <Text style={styles.summaryLabel}>{t('pollinationTracker.summary.success')}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Ionicons name="close-circle" size={22} color="#F44336" />
            <Text style={styles.summaryNumber}>
              {pollinations.filter(p => p.status === 'failed').length}
            </Text>
            <Text style={styles.summaryLabel}>{t('pollinationTracker.summary.failed')}</Text>
          </View>
        </View>

        {/* Info about days to result */}
        <View style={styles.daysInfoCard}>
          <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
          <Text style={styles.daysInfoText}>
            {t('pollinationTracker.infoDaysText', { name: gourdInfo.name, min: gourdInfo.min, max: gourdInfo.max })}
          </Text>
        </View>

        {/* TEST BUTTON - Uncomment to re-enable for testing
        <TouchableOpacity
          style={{
            backgroundColor: '#FF5722',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 14,
            borderRadius: 12,
            marginHorizontal: 16,
            marginBottom: 12,
            gap: 8,
          }}
          onPress={async () => {
            try {
              const result = await pollinationNotificationHelper.scheduleTestNotification6amPHT();
              Alert.alert(
                '🧪 Test Notification Scheduled!',
                `A test notification has been scheduled for tomorrow at 6:00 AM Philippines Time.\n\nScheduled for (UTC): ${result.scheduledFor}\n\nIf you receive it at exactly 6:00 AM PHT tomorrow, the fix is working! ✅`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert('Error', `Failed to schedule test: ${error.message}`);
            }
          }}
        >
          <Ionicons name="notifications" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
            🧪 TEST: Schedule 6AM PHT Notification (Tomorrow)
          </Text>
        </TouchableOpacity>
        */}

        {/* Pollination List */}
        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>{t('pollinationTracker.pollinationHistory')}</Text>
          
          {pollinations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flower-outline" size={48} color={theme.colors.text.secondary} />
              <Text style={styles.emptyText}>{t('pollinationTracker.noPollinations')}</Text>
              <Text style={styles.emptySubtext}>{t('pollinationTracker.tapPlusButton')}</Text>
            </View>
          ) : (
            pollinations
              .sort((a, b) => (b.entryNumber || 0) - (a.entryNumber || 0))
              .map((p, index) => renderPollinationItem(p, index))
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modals */}
      {renderModal(false)}
      {renderModal(true)}
      
      {/* Result Modal */}
      <Modal
        visible={showResultModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowResultModal(false);
          setSelectedPollination(null);
          setResultSuccessCount('0');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 400 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('pollinationTracker.recordResultModal')}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowResultModal(false);
                  setSelectedPollination(null);
                  setResultSuccessCount('0');
                }}
              >
                <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.resultModalInfo}>
                {selectedPollination?.label || 'Pollination'}
              </Text>
              <Text style={styles.resultModalSubInfo}>
                {selectedPollination?.femaleFlowersPollinated || 1} female flower(s) pollinated
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('pollinationTracker.howManyFruits')}</Text>
                <View style={styles.resultCountContainer}>
                  <TouchableOpacity 
                    style={styles.countButton}
                    onPress={() => setResultSuccessCount(String(Math.max(0, (parseInt(resultSuccessCount) || 0) - 1)))}
                  >
                    <Ionicons name="remove" size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.resultCountInput}
                    value={resultSuccessCount}
                    onChangeText={setResultSuccessCount}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                  <TouchableOpacity 
                    style={styles.countButton}
                    onPress={() => setResultSuccessCount(String(Math.min(selectedPollination?.femaleFlowersPollinated || 1, (parseInt(resultSuccessCount) || 0) + 1)))}
                  >
                    <Ionicons name="add" size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.countHint}>
                  {t('pollinationTracker.enterZeroIfFailed')}
                </Text>
              </View>

              <View style={styles.quickSetButtons}>
                <TouchableOpacity 
                  style={[styles.quickSetButton, styles.failedButton]}
                  onPress={() => setResultSuccessCount('0')}
                >
                  <Text style={styles.quickSetButtonText}>{t('pollinationTracker.allFailedButton')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.quickSetButton, styles.successButton]}
                  onPress={() => setResultSuccessCount(String(selectedPollination?.femaleFlowersPollinated || 1))}
                >
                  <Text style={styles.quickSetButtonText}>{t('pollinationTracker.allSuccessButton', { count: selectedPollination?.femaleFlowersPollinated || 1 })}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowResultModal(false);
                  setSelectedPollination(null);
                  setResultSuccessCount('0');
                }}
              >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleRecordResult}
              >
                <Text style={styles.saveButtonText}>{t('pollinationTracker.recordResultModal')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  loadingText: {
    marginTop: 12,
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  plantInfo: {
    backgroundColor: theme.colors.background.primary,
    padding: 16,
    marginBottom: 12,
  },
  plantName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  plantType: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.primary,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 8,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  daysInfoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  daysInfoText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginLeft: 8,
    lineHeight: 18,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  pollinationCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 6,
  },
  cardContent: {
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  expectedResultRow: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  checkTimeText: {
    color: '#FF9800',
    fontWeight: '600',
  },
  successInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  successText: {
    color: '#4CAF50',
    fontWeight: '500',
    fontSize: 13,
  },
  notesText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  quickResultContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: 12,
    backgroundColor: 'rgba(255, 152, 0, 0.05)',
  },
  recordResultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  recordResultButtonAlert: {
    backgroundColor: '#FF9800',
  },
  recordResultButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    flex: 1,
    textAlign: 'center',
  },
  quickResultLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  quickResultButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  quickResultButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  successButton: {
    backgroundColor: '#4CAF50',
  },
  failedButton: {
    backgroundColor: '#F44336',
  },
  quickResultButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  bottomPadding: {
    height: 80,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  modalBody: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusOptionText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginLeft: 8,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '600',
    color: theme.colors.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    padding: 14,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Additional styles for result modal
  recordButton: {
    backgroundColor: theme.colors.primary,
  },
  partialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    padding: 8,
    borderRadius: 6,
  },
  partialText: {
    color: '#FF9800',
    fontWeight: '500',
  },
  resultModalInfo: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  resultModalSubInfo: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  resultCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  countButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultCountInput: {
    width: 80,
    textAlign: 'center',
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
    padding: 8,
  },
  countHint: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
  },
  quickSetButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  quickSetButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickSetButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});

export default PollinationTrackerScreen;
