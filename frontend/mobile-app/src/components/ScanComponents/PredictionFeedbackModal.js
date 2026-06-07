import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';

const FLOWER_VARIETIES = [
  'Bitter Gourd', 'Sponge Gourd', 'Bottle Gourd', 'Cucumber', 'Squash'
];

const LEAF_VARIETIES = [
  'Bitter Gourd', 'Sponge Gourd', 'Bottle Gourd', 'Cucumber', 'Squash'
];

export const PredictionFeedbackModal = ({
  visible,
  scanType,
  originalVariety,
  originalGender,
  onSubmit,
}) => {
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
              <Text style={styles.title}>Was this prediction correct?</Text>
              <Text style={styles.description}>
                Help us improve the AI by confirming if the prediction was accurate.
              </Text>
              
              <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.button, styles.btnNo]} onPress={handleIncorrect}>
                  <Ionicons name="close" size={20} color={theme.colors.error} />
                  <Text style={[styles.btnText, { color: theme.colors.error }]}>No, fix it</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.btnYes]} onPress={handleCorrect}>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={[styles.btnText, { color: '#fff' }]}>Yes, correct</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>Correct the Prediction</Text>
              
              <Text style={styles.label}>Select correct variety:</Text>
              <View style={styles.chipContainer}>
                {varieties.map(v => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.chip, selectedVariety === v && styles.chipActive]}
                    onPress={() => setSelectedVariety(v)}
                  >
                    <Text style={[styles.chipText, selectedVariety === v && styles.chipTextActive]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {scanType === 'flower' && (
                <>
                  <Text style={styles.label}>Select correct gender:</Text>
                  <View style={styles.chipContainer}>
                    {['male', 'female'].map(g => (
                      <TouchableOpacity
                        key={g}
                        style={[styles.chip, selectedGender === g && styles.chipActive]}
                        onPress={() => setSelectedGender(g)}
                      >
                        <Text style={[styles.chipText, selectedGender === g && styles.chipTextActive]}>
                          {g.charAt(0).toUpperCase() + g.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <TouchableOpacity style={[styles.button, styles.btnSubmit]} onPress={handleFixSubmit}>
                <Text style={[styles.btnText, { color: '#fff' }]}>Submit Correction</Text>
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