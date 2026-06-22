import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles';

const VARIETY_MAP = {
  'Bitter Gourd': 'plantService.varieties.bitter_gourd',
  'Sponge Gourd': 'plantService.varieties.sponge_gourd',
  'Bottle Gourd': 'plantService.varieties.bottle_gourd',
  'Cucumber': 'plantService.varieties.cucumber',
  'Squash': 'plantService.varieties.kalabasa',
};

const FLOWER_VARIETIES = Object.keys(VARIETY_MAP);
const LEAF_VARIETIES = Object.keys(VARIETY_MAP);

export const PredictionFeedbackModal = ({
  visible,
  scanType,
  originalVariety,
  originalGender,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1); // 1 = ask correct, 2 = pick correct
  const [selectedVariety, setSelectedVariety] = useState(originalVariety);
  const [selectedGender, setSelectedGender] = useState(originalGender);

  const reset = () => {
    setStep(1);
    setSelectedVariety(originalVariety);
    setSelectedGender(originalGender);
  };

  const handleCorrect = () => {
    onSubmit({
      isCorrect: true,
      correctVariety: originalVariety,
      correctGender: originalGender,
    });
    reset();
  };

  const handleIncorrect = () => {
    setStep(2);
  };

  const handleFixSubmit = () => {
    onSubmit({
      isCorrect: false,
      correctVariety: selectedVariety,
      correctGender: scanType === 'flower' ? selectedGender : null,
    });
    reset();
  };

  const varieties = scanType === 'flower' ? FLOWER_VARIETIES : LEAF_VARIETIES;

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          {step === 1 ? (
            <>
              <Text style={styles.title}>{t('scanResults.wasPredictionCorrect')}</Text>
              <Text style={styles.description}>
                {t('scanResults.feedbackDescription')}
              </Text>
              
              <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.button, styles.btnNo]} onPress={handleIncorrect}>
                  <Ionicons name="close" size={20} color={theme.colors.error} />
                  <Text style={[styles.btnText, { color: theme.colors.error }]}>{t('scanResults.noFixIt')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.btnYes]} onPress={handleCorrect}>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={[styles.btnText, { color: '#fff' }]}>{t('scanResults.yesCorrect')}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>{t('scanResults.correctPrediction')}</Text>
              
              <Text style={styles.label}>{t('scanResults.selectCorrectVariety')}:</Text>
              <View style={styles.chipContainer}>
                {varieties.map(v => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.chip, selectedVariety === v && styles.chipActive]}
                    onPress={() => setSelectedVariety(v)}
                  >
                    <Text style={[styles.chipText, selectedVariety === v && styles.chipTextActive]}>{t(VARIETY_MAP[v])}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {scanType === 'flower' && (
                <>
                  <Text style={styles.label}>{t('scanResults.selectCorrectGender')}:</Text>
                  <View style={styles.chipContainer}>
                    {['male', 'female'].map(g => (
                      <TouchableOpacity
                        key={g}
                        style={[styles.chip, selectedGender === g && styles.chipActive]}
                        onPress={() => setSelectedGender(g)}
                      >
                        <Text style={[styles.chipText, selectedGender === g && styles.chipTextActive]}>
                          {g === 'male' ? t('common.male') : t('common.female')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <TouchableOpacity style={[styles.button, styles.btnSubmit]} onPress={handleFixSubmit}>
                <Text style={[styles.btnText, { color: '#fff' }]}>{t('scanResults.submitCorrection')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#fff',
    width: '85%',
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  btnYes: {
    backgroundColor: theme.colors.primary,
  },
  btnNo: {
    backgroundColor: 'rgba(244,67,54,0.1)',
  },
  btnSubmit: {
    backgroundColor: theme.colors.primary,
    marginTop: 20,
  },
  btnText: {
    fontSize: 15,
    fontFamily: theme.fonts.bold,
  },
  label: {
    fontSize: 14,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
    marginBottom: 8,
    marginTop: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.background.secondary,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    fontFamily: theme.fonts.medium,
  },
  chipTextActive: {
    color: '#fff',
  },
});