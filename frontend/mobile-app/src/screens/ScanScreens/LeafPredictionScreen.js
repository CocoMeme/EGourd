/**
 * LeafPredictionScreen - Leaf analysis prediction screen
 * Shows leaf identification results from TM model + Gemini AI analysis
 * Features: Leaf variety identification, health analysis, no gender/harvest components
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    Animated,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { CustomHeader } from '../../components/CustomComponents/CustomHeader';
import { modelService, SCAN_MODES } from '../../services/modelService';
import { geminiService } from '../../services/geminiService';
import { mergeGeminiLeafResult } from '../../services/leafPredictionMerge';
import { scanService } from '../../services/scanService';
import { guestStorageService } from '../../services/guestStorageService';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { PredictionFeedbackModal } from '../../components/ScanComponents/PredictionFeedbackModal';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
import { LeafHealthCard } from '../../components/ScanComponents/LeafHealthCard';
import { LeafQualityMetrics } from '../../components/ScanComponents/LeafQualityMetrics';

// Leaf Variety colors
const LEAF_VARIETY_COLORS = {
    'Bitter Gourd': '#27AE60',
    'Sponge Gourd': '#F39C12',
    'Bottle Gourd': '#3498DB',
    'Squash': '#E67E22',
    'Cucumber': '#8BC34A',
};

// Scientific names for leaf varieties
const LEAF_SCIENTIFIC_NAMES = {
    'Bitter Gourd': 'Momordica charantia',
    'Sponge Gourd': 'Luffa acutangula',
    'Bottle Gourd': 'Lagenaria siceraria',
    'Squash': 'Cucurbita moschata',
    'Cucumber': 'Cucumis sativus',
};

/**
 * Skeleton Loader Component for loading states
 */
const SkeletonLoader = ({ width: skWidth = '100%', height = 20, style = {} }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const opacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[{
                width: skWidth,
                height,
                backgroundColor: '#E0E0E0',
                borderRadius: 4,
                opacity,
            }, style]}
        />
    );
};

/**
 * Skeleton Card Component
 */
const SkeletonCard = ({ title, lines = 3 }) => (
    <View style={styles.card}>
        <View style={styles.skeletonHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
        <View style={{ gap: 12 }}>
            {Array.from({ length: lines }).map((_, i) => (
                <SkeletonLoader
                    key={i}
                    width={i === lines - 1 ? '60%' : '100%'}
                    height={12}
                />
            ))}
        </View>
    </View>
);

// Internal components removed - using dedicated ones from ScanComponents

/**
 * Final Verdict Card — side-by-side TM vs Gemini confidence with agree/disagree badge
 */
/**
 * Circular Progress Ring — pure RN, no SVG dependency
 */
const CircularProgress = ({ value, color, size = 60, backgroundColor = '#FFF', children }) => {
    const clamped = Math.max(0, Math.min(100, value || 0));
    const animatedProgress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animatedProgress, {
            toValue: clamped,
            duration: 1000,
            delay: 300,
            useNativeDriver: false,
        }).start();
    }, [clamped]);

    const bw = Math.max(5, Math.round(size * 0.09));
    const innerSize = size - bw * 2;

    const rightRotate = animatedProgress.interpolate({
        inputRange: [0, 50, 100],
        outputRange: ['-180deg', '0deg', '0deg'],
    });
    const leftRotate = animatedProgress.interpolate({
        inputRange: [0, 50, 100],
        outputRange: ['-180deg', '-180deg', '0deg'],
    });

    return (
        <View style={{ width: size, height: size, borderRadius: size / 2, justifyContent: 'center', alignItems: 'center' }}>
            {/* Track */}
            <View style={{ position: 'absolute', width: size, height: size, borderWidth: bw, borderColor: '#E8E8E8', borderRadius: size / 2 }} />
            {/* Right half */}
            <View style={{ position: 'absolute', width: size / 2, height: size, right: 0, overflow: 'hidden' }}>
                <Animated.View style={{
                    width: size, height: size, borderRadius: size / 2, borderWidth: bw, borderColor: color,
                    position: 'absolute', right: 0,
                    transform: [{ rotate: rightRotate }],
                }} />
            </View>
            {/* Left half */}
            <View style={{ position: 'absolute', width: size / 2, height: size, left: 0, overflow: 'hidden' }}>
                <Animated.View style={{
                    width: size, height: size, borderRadius: size / 2, borderWidth: bw, borderColor: color,
                    position: 'absolute', left: 0,
                    transform: [{ rotate: leftRotate }],
                }} />
            </View>
            {/* Inner circle */}
            <View style={{ width: innerSize, height: innerSize, borderRadius: innerSize / 2, backgroundColor, justifyContent: 'center', alignItems: 'center' }}>
                {children}
            </View>
        </View>
    );
};

const FinalVerdictCard = ({ geminiPrediction, isGeminiLoading }) => {
    const geminiConfidence = Math.round(geminiPrediction?.confidence || 0);

    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 }}>
            <Text style={{ fontSize: 10, color: '#888', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' }}>{t('scanResults.leaf.geminiAI')}</Text>
            {geminiPrediction ? (
                <CircularProgress value={geminiConfidence} color="#9C27B0" size={70}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#9C27B0' }}>{geminiConfidence}%</Text>
                </CircularProgress>
            ) : isGeminiLoading ? (
                <SkeletonLoader width={70} height={70} style={{ borderRadius: 35 }} />
            ) : (
                <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', borderWidth: 5, borderColor: '#E8E8E8' }}>
                    <Text style={{ fontSize: 14, color: '#CCC' }}>--</Text>
                </View>
            )}
        </View>
    );
};

/**
 * Collapsible wrapper for LeafHealthCard + LeafQualityMetrics (collapsed by default)
 */
const CollapsibleHealthSection = ({ healthData, confidence }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <View style={styles.card}>
            <TouchableOpacity
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: expanded ? 16 : 0 }}
                onPress={() => setExpanded(!expanded)}
            >
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t('scanResults.leaf.healthDetails')}</Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
            </TouchableOpacity>
            {expanded && (
                <>
                    <LeafHealthCard healthData={healthData} />
                    <LeafQualityMetrics healthData={healthData} confidence={confidence} />
                </>
            )}
        </View>
    );
};

/**
 * Main Leaf Prediction Screen Component
 */
export const LeafPredictionScreen = ({ route, navigation }) => {
    const { t } = useTranslation();
    const { isGuest } = useAuth();
    const { imageUri, isLoading: initialLoading, width: imgWidth, height: imgHeight } = route.params ?? {};
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Loading and analysis state
    const [isAnalyzing, setIsAnalyzing] = useState(initialLoading || false);
    const [isTmComplete, setIsTmComplete] = useState(false);
    const [isGeminiLoading, setIsGeminiLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState(t('scanResults.leaf.analyzing'));
    const [analysisError, setAnalysisError] = useState(null);

    // Results state
    const [tmPrediction, setTmPrediction] = useState(null);
    const [geminiPrediction, setGeminiPrediction] = useState(null);
    const [geminiError, setGeminiError] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [savedScanId, setSavedScanId] = useState(null);

    const [imageLoading, setImageLoading] = useState(true);

    // Animation
    const spinAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const handleBack = () => {
        if (route.params?.returnTo) {
            navigation.navigate(route.params.returnTo);
        } else {
            navigation.goBack();
        }
    };

    const handleScanAgain = () => {
        navigation.goBack();
    };

    // Helper: Get variety from TM label
    const getVarietyFromLabel = (label) => {
        if (!label) return null;
        if (label.includes('Ampalaya')) return 'Bitter Gourd';
        if (label.includes('Patola')) return 'Sponge Gourd';
        if (label.includes('Upo')) return 'Bottle Gourd';
        if (label.includes('Kalabasa')) return 'Squash';
        if (label.includes('Pipino')) return 'Cucumber';
        if (label === 'Not Leaf') return null;
        return label.replace(' Leaves', '');
    };

    // Sync state when route params change
    useEffect(() => {
        // Check if we received pre-computed prediction from Developer Mode (old approach)
        if (route.params.tmPrediction) {
            console.log('🔬 [DEV MODE] Using pre-computed prediction from CameraScreen.test');
            const preComputed = route.params.tmPrediction;

            const tmPred = {
                variety: getVarietyFromLabel(preComputed.topPrediction.label),
                confidence: preComputed.topPrediction.percentage,
                rawScore: preComputed.topPrediction.probability,
                label: preComputed.topPrediction.label,
                isNotLeaf: false,
                allPredictions: preComputed.predictions,
                source: 'tflite',
                modelType: `Teachable Machine (Leaf) - ${preComputed.runs} runs averaged`,
                processingTime: preComputed.processingTime,
            };

            setTmPrediction(tmPred);
            setPrediction(tmPred);
            setIsTmComplete(true);
            setIsAnalyzing(false);

            // Fade in results
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            // Still run Gemini analysis if available
            if (geminiService.isAvailable()) {
                runGeminiAnalysis(tmPred);
            }
            return;
        }

        // Original logic - no dev mode check needed anymore
        setIsAnalyzing(route.params.isLoading || false);
        setIsTmComplete(false);
        setIsGeminiLoading(false);
        setAnalysisError(null);
        fadeAnim.setValue(0);

        if (route.params.isLoading && route.params.imageUri) {
            runAnalysis();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [route.params.imageUri]);

    // Spin animation
    useEffect(() => {
        if (isAnalyzing || isGeminiLoading) {
            Animated.loop(
                Animated.timing(spinAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            spinAnim.setValue(0);
        }
    }, [isAnalyzing, isGeminiLoading]);

    /**
     * Run TM and Gemini AI analysis
     */
    const runAnalysis = async () => {
        let tmPred = null;

        try {
            setIsAnalyzing(true);
            setIsTmComplete(false);
            setAnalysisError(null);
            setGeminiError(null);

            // Step 1: TM Model Prediction
            setLoadingStage(t('scanResults.leaf.analyzing'));
            console.log('🌿 Running TM leaf prediction...');

            const tmResult = await modelService.quickPredict(imageUri, imgWidth, imgHeight);
            if (!isMounted.current) return;
            const topTmPrediction = tmResult.topPrediction;

            console.log('🟢 TM Leaf Prediction:', topTmPrediction.label, `(${topTmPrediction.percentage.toFixed(1)}%)`);

            tmPred = {
                variety: getVarietyFromLabel(topTmPrediction.label),
                confidence: topTmPrediction.percentage,
                rawScore: topTmPrediction.probability,
                label: topTmPrediction.label,
                // Don't seed isNotLeaf from TFLite — Gemini is the authority on
                // "Not a Gourd Leaf". The flag will be set when Gemini resolves
                // (or stay false if Gemini confirms it IS a gourd leaf).
                isNotLeaf: false,
                allPredictions: tmResult.predictions,
                source: 'tflite',
                modelType: 'Teachable Machine (Leaf)',
                processingTime: tmResult.processingTime,
            };

            // Show TM results immediately
            setTmPrediction(tmPred);
            setPrediction(tmPred);
            setIsTmComplete(true);
            setIsAnalyzing(false);

            // Fade in TM results
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            // Step 2: Gemini AI Analysis
            if (geminiService.isAvailable() && tmPred) {
                setIsGeminiLoading(true);
                setLoadingStage(t('scanResults.leaf.aiInsights'));
                console.log('🤖 Running Gemini leaf analysis...');

                try {
                    const geminiResult = await geminiService.analyzeLeaf(imageUri, tmPred);
                    if (!isMounted.current) return;
                    console.log('✅ Gemini Leaf Analysis complete');

                    setGeminiPrediction(geminiResult);

                    // Update final prediction with Gemini data.
                    // When Gemini succeeds, its variety is the source of truth (more accurate than TFLite).
                    setPrediction(prev => mergeGeminiLeafResult(prev, geminiResult));
                } catch (geminiError) {
                    console.error('❌ Gemini leaf analysis failed:', geminiError);
                    if (isMounted.current) setGeminiError(geminiError.message || t('scanResults.leaf.analysisFailed'));
                } finally {
                    if (isMounted.current) setIsGeminiLoading(false);
                }
            }

            setLoadingStage(t('scanResults.leaf.analyzing'));

        } catch (error) {
            console.error('❌ Leaf analysis failed:', error);
            setAnalysisError(error.message);
            setIsAnalyzing(false);
            setIsGeminiLoading(false);
        }
    };

    /**
     * Run Gemini analysis separately (for Dev Mode where TM is pre-computed)
     */
    const runGeminiAnalysis = async (tmPred) => {
        setIsGeminiLoading(true);
        setGeminiError(null);
        setLoadingStage(t('scanResults.leaf.aiInsights'));
        console.log('🤖 Running Gemini leaf analysis...');

        try {
            const geminiResult = await geminiService.analyzeLeaf(imageUri, tmPred);
            if (!isMounted.current) return;
            console.log('✅ Gemini Leaf Analysis complete');

            setGeminiPrediction(geminiResult);

            // Update final prediction with Gemini data.
            // When Gemini succeeds, its variety is the source of truth (more accurate than TFLite).
            setPrediction(prev => mergeGeminiLeafResult(prev, geminiResult));
        } catch (geminiError) {
            console.error('❌ Gemini leaf analysis failed:', geminiError);
            if (isMounted.current) setGeminiError(geminiError.message || t('scanResults.leaf.analysisFailed'));
        } finally {
            if (isMounted.current) setIsGeminiLoading(false);
        }
    };

    // Handler: Save scan to backend
    const handleSave = async () => {
        if (!prediction) return;
        setIsSaving(true);
        try {
            const scanData = {
                prediction: 'n/a', // Leaves don't have gender
                confidence: prediction.confidence || 0,
                variety: prediction.variety || null,
                scanType: 'leaf',
                validationStatus: prediction.validationStatus || 'tflite_only',
                aiPrediction: {
                    finalSource: geminiPrediction ? 'gemini' : 'tflite',
                    tflite: {
                        variety: tmPrediction?.variety,
                        confidence: tmPrediction?.confidence,
                        modelType: tmPrediction?.modelType,
                        processingTime: tmPrediction?.processingTime,
                    },
                    gemini: geminiPrediction ? {
                        variety: geminiPrediction.variety,
                        confidence: geminiPrediction.confidence,
                        reasoning: geminiPrediction.geminiData?.reasoning,
                        keyFeatures: geminiPrediction.geminiData?.keyFeatures,
                        leaf: geminiPrediction.geminiData?.leaf,
                        observations: geminiPrediction.geminiData?.observations,
                        processingTime: geminiPrediction.processingTime,
                    } : null
                }
            };

            if (isGuest) {
                await guestStorageService.saveLocalScan(scanData, imageUri);
                if (!isMounted.current) return;
                Alert.alert(
                    t('scanResults.leaf.savedLocallyTitle'),
                    t('scanResults.leaf.savedLocallyMessage'),
                    [{ text: t('common.ok'), onPress: () => handleBack() }]
                );
            } else {
                const savedScan = await scanService.saveScan(scanData, imageUri);
                if (!isMounted.current) return;
                const user = await authService.getCurrentUser();

                if (user?.preferences?.geminiEmbeddingEnabled) {
                    setSavedScanId(savedScan?.scan?._id || savedScan?._id);
                    setShowFeedbackModal(true);
                } else {
                    Alert.alert(
                        t('scanResults.leaf.successTitle'),
                        t('scanResults.leaf.successMessage'),
                        [{ text: t('common.ok'), onPress: () => handleBack() }]
                    );
                }
            }
        } catch (error) {
            console.error('Save error:', error);
            Alert.alert(t('scanResults.leaf.saveFailed'), t('scanResults.leaf.saveFailedMessage'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleFeedbackSubmit = async (feedbackData) => {
        try {
            await authService.authenticatedRequest(`/scans/${savedScanId}/feedback`, {
                method: 'POST',
                body: JSON.stringify(feedbackData)
            });
            setShowFeedbackModal(false);
            Alert.alert(t('scanResults.leaf.feedbackSaved'), t('scanResults.leaf.successMessage'), [{ text: t('common.ok'), onPress: () => handleBack() }]);
        } catch (e) {
            console.error('Failed to save feedback:', e);
            setShowFeedbackModal(false);
            Alert.alert(t('scanResults.leaf.feedbackFailed'), t('scanResults.leaf.feedbackFailed'), [{ text: t('common.ok'), onPress: () => handleBack() }]);
        }
    };

    // Computed values
    const varietyColor = LEAF_VARIETY_COLORS[prediction?.variety] || theme.colors.primary;
    const displayVariety = prediction?.variety || 'Unknown';
    const isNotLeaf = prediction?.isNotLeaf;

    // Spin interpolation
    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={styles.container}>
            {/* Header */}
            <CustomHeader
                variant="results"
                title={t('scanResults.leaf.title')}
                onBackPress={handleBack}
                rightComponent={() => (
                    <View style={styles.leafBadge}>
                        <Ionicons name="leaf" size={14} color="#4CAF50" />
                        <Text style={styles.leafBadgeText}>{t('scanResults.leaf.badge')}</Text>
                    </View>
                )}
            />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Image Preview */}
                <View style={styles.imageContainer}>
                    {imageLoading && (
                        <ActivityIndicator size="large" color="#FFF" style={styles.imageLoader} />
                    )}
                    <Image
                        source={{ uri: imageUri }}
                        style={styles.image}
                        onLoadEnd={() => setImageLoading(false)}
                    />

                    {/* Loading Overlay */}
                    {isAnalyzing && (
                        <View style={styles.loadingOverlay}>
                            <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                <Ionicons name="sync" size={48} color="#4CAF50" />
                            </Animated.View>
                            <Text style={styles.loadingText}>{loadingStage}</Text>
                        </View>
                    )}
                </View>

                {/* Error State */}
                {analysisError && !isAnalyzing && (
                    <View style={styles.errorCard}>
                        <Ionicons name="alert-circle" size={48} color="#F44336" />
                        <Text style={styles.errorTitle}>{t('scanResults.leaf.analysisFailed')}</Text>
                        <Text style={styles.errorText}>{analysisError}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={runAnalysis}>
                            <Ionicons name="refresh" size={20} color="#FFF" />
                            <Text style={styles.retryText}>{t('scanResults.leaf.tryAgain')}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Loading State */}
                {isAnalyzing && (
                    <View style={styles.loadingContainer}>
                        <View style={[styles.mainResultCard, styles.loadingCard]}>
                            <View style={styles.loadingContent}>
                                <ActivityIndicator size="large" color={theme.colors.primary} />
                                <Text style={styles.loadingStageText}>{loadingStage}</Text>
                                <Text style={styles.loadingSubtext}>{t('scanResults.leaf.analyzing')}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Results Content */}
                {isTmComplete && !analysisError && prediction && (
                    <Animated.View style={{ opacity: fadeAnim }}>
                        {/* Main Result Card */}
                        <View style={styles.mainResultCard}>
                            {isNotLeaf ? (
                                <View style={styles.notFlowerResult}>
                                    <Ionicons name="close-circle" size={64} color="#F44336" />
                                    <Text style={styles.notFlowerText}>{t('scanResults.leaf.notAGourdLeaf')}</Text>
                                    <Text style={styles.notFlowerSubtext}>
                                        {t('scanResults.leaf.notAGourdLeafMessage')}
                                    </Text>
                                </View>
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ width: 100, alignItems: 'center', paddingRight: 8 }}>
                                        {isGeminiLoading ? (
                                            <>
                                                <SkeletonLoader width={48} height={48} style={{ borderRadius: 24, marginBottom: 8 }} />
                                                <SkeletonLoader width={80} height={14} style={{ borderRadius: 4, marginBottom: 4 }} />
                                                <SkeletonLoader width={60} height={10} style={{ borderRadius: 4 }} />
                                            </>
                                        ) : (
                                            <>
                                                <View style={[styles.leafIcon, { backgroundColor: varietyColor + '20' }]}>
                                                    <Ionicons name="leaf" size={40} color={varietyColor} />
                                                </View>
                                                <Text style={[styles.varietyText, { textAlign: 'center', fontSize: 14 }]}>
                                                    {displayVariety?.toUpperCase()}
                                                </Text>
                                                {displayVariety && LEAF_SCIENTIFIC_NAMES[displayVariety] && (
                                                    <Text style={{ fontSize: 10, color: '#888', fontStyle: 'italic', textAlign: 'center', marginTop: 2 }}>
                                                        {LEAF_SCIENTIFIC_NAMES[displayVariety]}
                                                    </Text>
                                                )}
                                            </>
                                        )}
                                    </View>

                                    {/* Final Verdict */}
                                    <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: '#eee' }}>
                                        <FinalVerdictCard
                                            geminiPrediction={geminiPrediction}
                                            isGeminiLoading={isGeminiLoading}
                                        />
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Gemini Analysis Results */}
                        {geminiPrediction && !isNotLeaf && (
                            <>
                                <View style={styles.card}>
                                    <Text style={styles.sectionTitle}>{t('scanResults.leaf.aiObservations')}</Text>
                                    <Text style={styles.reasoningText}>{geminiPrediction.geminiData?.reasoning}</Text>

                                    {geminiPrediction.geminiData?.keyFeatures?.length > 0 && (
                                        <View style={styles.featuresList}>
                                            {geminiPrediction.geminiData.keyFeatures.map((feature, i) => (
                                                <View key={i} style={styles.featureBadge}>
                                                    <Text style={styles.featureText}>{feature}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>

                                {geminiPrediction.geminiData?.leaf && (
                                    <CollapsibleHealthSection
                                        healthData={geminiPrediction.geminiData.leaf}
                                        confidence={geminiPrediction.confidence}
                                    />
                                )}
                            </>
                        )}

                        {/* Skeleton — only on the AI Insights card while loading */}
                        {isGeminiLoading && !isNotLeaf && (
                            <SkeletonCard title={t('scanResults.leaf.aiInsights')} lines={4} />
                        )}

                        {/* Gemini Error Notice */}
                        {geminiError && !isGeminiLoading && (
                            <View style={styles.geminiErrorNotice}>
                                <View style={styles.geminiErrorContent}>
                                    <Ionicons name="warning" size={20} color="#E65100" />
                                    <Text style={styles.geminiErrorText}>
                                        {t('scanResults.leaf.analysisFailed')}: {geminiError}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* TM Only Notice (no error, just no Gemini result) */}
                        {!geminiPrediction && !geminiError && !isGeminiLoading && !isNotLeaf && (
                            <View style={styles.tmOnlyNotice}>
                                <Ionicons name="information-circle" size={20} color="#4CAF50" />
                                <Text style={styles.tmOnlyText}>
                                    {t('scanResults.leaf.identifiedTMMessage')}
                                </Text>
                            </View>
                        )}
                    </Animated.View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.scanAgainButton]}
                        onPress={handleScanAgain}
                        disabled={isSaving}
                    >
                        <Ionicons name="camera" size={20} color="#FFF" />
                        <Text style={styles.actionButtonText}>{t('scanResults.leaf.scanAgain')}</Text>
                    </TouchableOpacity>

                      <TouchableOpacity
                          style={[styles.actionButton, styles.saveButton, (!isTmComplete || isAnalyzing || isGeminiLoading || isSaving) && styles.buttonDisabled]}
                          onPress={handleSave}
                          disabled={!isTmComplete || isAnalyzing || isGeminiLoading || isSaving}
                      >
                        {isSaving ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <>
                                <Ionicons name="save-outline" size={20} color="#FFF" />
                                <Text style={styles.actionButtonText}>{t('scanResults.leaf.saveResult')}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            <PredictionFeedbackModal
                visible={showFeedbackModal}
                scanType="leaf"
                originalVariety={prediction?.variety || tmPrediction?.variety}
                originalGender={null}
                onSubmit={handleFeedbackSubmit}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    leafBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 16,
        gap: 4,
        borderWidth: 1,
        borderColor: '#A5D6A7',
    },
    leafBadgeText: {
        color: '#2E7D32',
        fontSize: 11,
        fontWeight: '700',
    },
    scrollView: {
        flex: 1,
    },
    imageContainer: {
        width: width,
        height: width * 0.75,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    imageLoader: {
        position: 'absolute',
        zIndex: 1,
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    loadingText: {
        color: '#4CAF50',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
    },
    loadingContainer: {
        padding: 16,
    },
    loadingCard: {
        minHeight: 200,
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    loadingContent: {
        alignItems: 'center',
        padding: 20,
    },
    loadingStageText: {
        color: '#333333',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 20,
    },
    loadingSubtext: {
        color: '#666666',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    errorCard: {
        backgroundColor: '#FFFFFF',
        margin: 16,
        borderRadius: 6,
        padding: 30,
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: '#F44336',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    errorTitle: {
        color: '#F44336',
        fontSize: 20,
        fontWeight: '700',
        marginTop: 16,
    },
    errorText: {
        color: '#666',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 20,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 20,
        gap: 8,
    },
    retryText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    mainResultCard: {
        backgroundColor: '#FFFFFF',
        margin: 16,
        borderRadius: 6,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    leafIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    varietyText: {
        color: '#333',
        fontSize: 24,
        fontWeight: '700',
    },
    notFlowerResult: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    notFlowerText: {
        color: '#F44336',
        fontSize: 24,
        fontWeight: '700',
        marginTop: 16,
    },
    notFlowerSubtext: {
        color: '#666',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    card: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 6,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F5F5F5',
    },
    sectionTitle: {
        color: '#333333',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    skeletonHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    scoreCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scoreText: {
        fontSize: 24,
        fontWeight: '700',
    },
    scoreLabel: {
        fontSize: 10,
        color: '#888',
    },
    healthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    healthText: {
        fontSize: 14,
        color: '#555',
    },
    healthValue: {
        fontWeight: '600',
        color: '#333',
    },
    issuesContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    issuesTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FF9800',
        marginBottom: 8,
    },
    issueItem: {
        fontSize: 13,
        color: '#666',
        marginLeft: 8,
        marginBottom: 4,
    },
    tmOnlyNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        margin: 16,
        marginTop: 0,
        padding: 16,
        borderRadius: 6,
        gap: 12,
    },
    tmOnlyText: {
        flex: 1,
        color: '#2E7D32',
        fontSize: 13,
        lineHeight: 20,
    },
    geminiErrorNotice: {
        flexDirection: 'column',
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        margin: 16,
        marginTop: 0,
        padding: 16,
        borderRadius: 6,
        gap: 12,
    },
    geminiErrorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    geminiErrorText: {
        flex: 1,
        color: '#E65100',
        fontSize: 13,
        lineHeight: 20,
    },
    actionButtons: {
        padding: 16,
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
        borderRadius: 8,
    },
    scanAgainButton: {
        backgroundColor: '#333333',
    },
    saveButton: {
        backgroundColor: '#4CAF50',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    actionButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // AI Results Styles
    reasoningText: {
        fontSize: 14,
        color: '#444',
        lineHeight: 20,
        marginBottom: 16,
        fontFamily: 'Poppins_400Regular',
    },
    featuresList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    featureBadge: {
        backgroundColor: '#F0F7FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D0E7FF',
    },
    featureText: {
        fontSize: 11,
        color: '#0066CC',
        fontWeight: '600',
        fontFamily: 'Poppins_600SemiBold',
    },
});

export default LeafPredictionScreen;
