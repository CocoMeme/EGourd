import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput,
  Alert
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { useTranslation } from 'react-i18next';

export const SimpleDatePicker = ({ 
  value, 
  onDateChange, 
  maximumDate = new Date(),
  minimumDate,
  style 
}) => {
  const { t } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(value);

  // Get current date info
  const currentDate = tempDate || new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentDay = currentDate.getDate();

  // Generate year options (current year back to 2000)
  const years = [];
  const maxYear = maximumDate.getFullYear();
  const minYear = minimumDate ? minimumDate.getFullYear() : maxYear - 25;
  
  for (let year = maxYear; year >= minYear; year--) {
    years.push(year);
  }

  // Month names
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Get days in month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedDay, setSelectedDay] = useState(currentDay);

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleDateConfirm = () => {
    const newDate = new Date(selectedYear, selectedMonth, selectedDay);
    
    // Validate date is not in the future
    if (newDate > maximumDate) {
      Alert.alert(t('common.invalidDate'), t('common.dateInFuture'));
      return;
    }

    setTempDate(newDate);
    onDateChange(newDate);
    setShowPicker(false);
  };

  const handleDateCancel = () => {
    // Reset to current values
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
    setSelectedDay(currentDay);
    setShowPicker(false);
  };

  const formatDate = (date) => {
    if (!date) return t('common.selectDate');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        style={styles.dateButton}
        onPress={() => setShowPicker(true)}
      >
        <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
        <Text style={styles.dateText}>
          {formatDate(value)}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.text.secondary} />
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={handleDateCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('common.selectDate')}</Text>
              <TouchableOpacity onPress={handleDateCancel}>
                <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>{t('common.month')}</Text>
                <Picker
                  selectedValue={selectedMonth}
                  onValueChange={(value) => setSelectedMonth(value)}
                  style={styles.picker}
                >
                  {months.map((month, index) => (
                    <Picker.Item key={index} label={month} value={index} />
                  ))}
                </Picker>
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>{t('common.day')}</Text>
                <Picker
                  selectedValue={selectedDay}
                  onValueChange={(value) => setSelectedDay(value)}
                  style={styles.picker}
                >
                  {days.map((day) => (
                    <Picker.Item key={day} label={day.toString()} value={day} />
                  ))}
                </Picker>
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>{t('common.year')}</Text>
                <Picker
                  selectedValue={selectedYear}
                  onValueChange={(value) => setSelectedYear(value)}
                  style={styles.picker}
                >
                  {years.map((year) => (
                    <Picker.Item key={year} label={year.toString()} value={year} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleDateCancel}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleDateConfirm}
              >
                <Text style={styles.confirmButtonText}>{t('common.confirm')}</Text>
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
    marginBottom: theme.spacing.sm,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
  },
  dateText: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.large,
    width: '90%',
    maxWidth: 400,
    padding: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
  },
  pickerLabel: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
    fontWeight: '600',
  },
  picker: {
    height: 150,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.small,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 0.45,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.background.secondary,
  },
  confirmButton: {
    backgroundColor: theme.colors.primary,
  },
  cancelButtonText: {
    ...theme.typography.button,
    color: theme.colors.text.secondary,
  },
  confirmButtonText: {
    ...theme.typography.button,
    color: '#FFFFFF',
  },
});