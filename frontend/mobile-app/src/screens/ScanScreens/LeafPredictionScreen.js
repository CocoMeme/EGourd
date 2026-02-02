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
import { scanService } from '../../services/scanService';

// Dedicated Leaf Components
import { LeafHealthCard } from '../../components/ScanComponents/LeafHealthCard';
import { LeafQualityMetrics } from '../../components/ScanComponents/LeafQualityMetrics';

const { width } = Dimensions.get('window');

// Leaf Variety colors
const LEAF_VARIETY_COLORS = {
    'Ampalaya': '#27AE60',
    'Patola': '#F39C12',
    'Upo': '#3498DB',
    'Kalabasa': '#E67E22',
    'Pipino': '#8BC34A',
};

// Scientific names for leaf varieties
const LEAF_SCIENTIFIC_NAMES = {
    'Ampalaya': 'Momordica charantia',
    'Patola': 'Luffa acutangula',
    'Upo': 'Lagenaria siceraria',
    'Kalabasa': 'Cucurbita moschata',
    'Pipino': 'Cucumis sativus',
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
 * Confidence Display Component
 */
const ConfidenceDisplay = ({ tmPrediction, geminiPrediction, isGeminiLoading }) => {
    return (
        <View style={{ flex: 1, paddingLeft: 16, justifyContent: 'center' }}>
            <Text style={{ fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' }}>Confidence</Text>

            <View style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                    <Text style={{ fontSize: 10, color: '#666' }}>TM Model</Text>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#333' }}>{tmPrediction?.confidence?.toFixed(0)}%</Text>
                </View>
                <View style={{ height: 10, backgroundColor: '#E0E0E0', borderRadius: 5, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${tmPrediction?.confidence || 0}%`, backgroundColor: '#4CAF50' }} />
                </View>
            </View>

            {geminiPrediction && (
                <View style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                        <Text style={{ fontSize: 10, color: '#666' }}>AI</Text>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#333' }}>{geminiPrediction.confidence?.toFixed(0)}%</Text>
                    </View>
                    <View style={{ height: 10, backgroundColor: '#E0E0E0', borderRadius: 5, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${geminiPrediction.confidence || 0}%`, backgroundColor: '#9C27B0' }} />
                    </View>
                </View>
            )}

            {isGeminiLoading && (
                <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                        <Text style={{ fontSize: 10, color: '#666' }}>AI</Text>
                        <ActivityIndicator size={10} color="#9C27B0" />
                    </View>
                    <SkeletonLoader width="100%" height={10} style={{ borderRadius: 5 }} />
                </View>
            )}
        </View>
    );
};

/**
 * Main Leaf Prediction Screen Component
 */
export const LeafPredictionScreen = ({ route, navigation }) => {
    const { imageUri, isLoading: initialLoading, width: imgWidth, height: imgHeight } = route.params;

    // Loading and analysis state
    const [isAnalyzing, setIsAnalyzing] = useState(initialLoading || false);
    const [isTmComplete, setIsTmComplete] = useState(false);
    const [isGeminiLoading, setIsGeminiLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState('Initializing...');
    const [analysisError, setAnalysisError] = useState(null);

    // Results state
    const [tmPrediction, setTmPrediction] = useState(null);
    const [geminiPrediction, setGeminiPrediction] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

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
        if (label.includes('Ampalaya')) return 'Ampalaya';
        if (label.includes('Patola')) return 'Patola';
        if (label.includes('Upo')) return 'Upo';
        if (label.includes('Kalabasa')) return 'Kalabasa';
        if (label.includes('Pipino')) return 'Pipino';
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
                isNotLeaf: preComputed.topPrediction.label === 'Not Leaf',
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
            if (geminiService.isAvailable() && !tmPred.isNotLeaf) {
                runGeminiAnalysis(tmPred);
            }
            return;
        }
        
        // DEV MODE: Run multi-run prediction here with loading animation
        if (route.params.devMode && route.params.isLoading && route.params.imageUri) {
            console.log('🔬 [DEV MODE] Running multi-run prediction in LeafPredictionScreen');
            runDevModeAnalysis();
            return;
        }
        
        // Original logic for non-dev mode
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
     * DEV MODE: Run multi-run prediction with averaged results
     */
    const runDevModeAnalysis = async () => {
        const runs = route.params.multiRunCount || 5;
        
        try {
            setIsAnalyzing(true);
            setIsTmComplete(false);
            setAnalysisError(null);

            setLoadingStage(`Running ${runs} predictions for accuracy...`);
            console.log(`🔬 [DEV MODE] Running ${runs} predictions...`);

            const startTime = Date.now();
            
            // Collect all prediction runs
            const allRuns = [];
            for (let i = 0; i < runs; i++) {
                const result = await modelService.quickPredict(imageUri, imgWidth, imgHeight);
                allRuns.push(result);
                console.log(`  Run ${i + 1}/${runs}: ${result.topPrediction.label} (${result.topPrediction.percentage.toFixed(1)}%)`);
                setLoadingStage(`Analyzing... (${i + 1}/${runs})`);
            }

            // Get labels from first run
            const labels = allRuns[0].predictions.map(p => p.label);
            
            // Average the percentages for each label
            const averagedPredictions = labels.map(label => {
                const percentages = allRuns.map(run => {
                    const pred = run.predictions.find(p => p.label === label);
                    return pred ? pred.percentage : 0;
                });
                const avgPercentage = percentages.reduce((a, b) => a + b, 0) / runs;
                
                return {
                    label,
                    percentage: Math.round(avgPercentage * 10) / 10,
                    probability: avgPercentage / 100,
                };
            });

            // Sort by percentage (highest first)
            averagedPredictions.sort((a, b) => b.percentage - a.percentage);

            const topPrediction = averagedPredictions[0];
            const totalTime = Date.now() - startTime;

            console.log(`✅ Multi-run complete in ${totalTime}ms`);
            console.log(`📊 AVERAGED RESULT: ${topPrediction.label} (${topPrediction.percentage.toFixed(1)}%)`);

            const tmPred = {
                variety: getVarietyFromLabel(topPrediction.label),
                confidence: topPrediction.percentage,
                rawScore: topPrediction.probability,
                label: topPrediction.label,
                isNotLeaf: topPrediction.label === 'Not Leaf',
                allPredictions: averagedPredictions,
                source: 'tflite',
                modelType: `Teachable Machine (Leaf) - ${runs} runs averaged`,
                processingTime: totalTime,
            };

            // Show results
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

            // Run Gemini analysis if available
            if (geminiService.isAvailable() && !tmPred.isNotLeaf) {
                runGeminiAnalysis(tmPred);
            }

        } catch (error) {
            console.error('❌ Dev mode analysis failed:', error);
            setAnalysisError(error.message);
            setIsAnalyzing(false);
        }
    };

    /**
     * Run TM analysis (Gemini leaf analysis will be added later)
     */
    const runAnalysis = async () => {
        let tmPred = null;

        try {
            setIsAnalyzing(true);
            setIsTmComplete(false);
            setAnalysisError(null);

            // Step 1: TM Model Prediction
            setLoadingStage('Analyzing leaf with TM model...');
            console.log('🌿 Running TM leaf prediction...');

            const tmResult = await modelService.quickPredict(imageUri, imgWidth, imgHeight);
            const topTmPrediction = tmResult.topPrediction;

            console.log('🟢 TM Leaf Prediction:', topTmPrediction.label, `(${topTmPrediction.percentage.toFixed(1)}%)`);

            tmPred = {
                variety: getVarietyFromLabel(topTmPrediction.label),
                confidence: topTmPrediction.percentage,
                rawScore: topTmPrediction.probability,
                label: topTmPrediction.label,
                isNotLeaf: topTmPrediction.label === 'Not Leaf',
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
            if (geminiService.isAvailable() && tmPred && !tmPred.isNotLeaf) {
                setIsGeminiLoading(true);
                setLoadingStage('Analyzing leaf health with AI...');
                console.log('🤖 Running Gemini leaf analysis...');

                try {
                    const geminiResult = await geminiService.analyzeLeaf(imageUri, tmPred);
                    console.log('✅ Gemini Leaf Analysis complete');

                    setGeminiPrediction(geminiResult);

                    // Update final prediction with Gemini data
                    setPrediction(prev => ({
                        ...prev,
                        geminiData: geminiResult.geminiData,
                        confidence: (prev.confidence + geminiResult.confidence) / 2, // Combine confidences
                        validationStatus: 'validated',
                    }));
                } catch (geminiError) {
                    console.error('❌ Gemini leaf analysis failed:', geminiError);
                    // We don't fail the whole process if Gemini fails, just show TM
                } finally {
                    setIsGeminiLoading(false);
                }
            }

            setLoadingStage('Complete!');

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
        setLoadingStage('Analyzing leaf health with AI...');
        console.log('🤖 Running Gemini leaf analysis...');

        try {
            const geminiResult = await geminiService.analyzeLeaf(imageUri, tmPred);
            console.log('✅ Gemini Leaf Analysis complete');

            setGeminiPrediction(geminiResult);

            // Update final prediction with Gemini data
            setPrediction(prev => ({
                ...prev,
                geminiData: geminiResult.geminiData,
                confidence: (prev.confidence + geminiResult.confidence) / 2,
                validationStatus: 'validated',
            }));
        } catch (geminiError) {
            console.error('❌ Gemini leaf analysis failed:', geminiError);
        } finally {
            setIsGeminiLoading(false);
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

            await scanService.saveScan(scanData, imageUri);

            Alert.alert(
                'Success! 🎉',
                'Leaf scan saved to your history!',
                [{ text: 'OK', onPress: () => handleBack() }]
            );
        } catch (error) {
            console.error('Save error:', error);
            Alert.alert('Save Failed', 'Failed to save scan. Please try again.');
        } finally {
            setIsSaving(false);
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
                title="Leaf Analysis"
                onBackPress={handleBack}
                rightComponent={() => (
                    <View style={styles.leafBadge}>
                        <Ionicons name="leaf" size={14} color="#4CAF50" />
                        <Text style={styles.leafBadgeText}>LEAF</Text>
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
                        <Text style={styles.errorTitle}>Analysis Failed</Text>
                        <Text style={styles.errorText}>{analysisError}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={runAnalysis}>
                            <Ionicons name="refresh" size={20} color="#FFF" />
                            <Text style={styles.retryText}>Try Again</Text>
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
                                <Text style={styles.loadingSubtext}>Analyzing your leaf...</Text>
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
                                    <Text style={styles.notFlowerText}>Not a Gourd Leaf</Text>
                                    <Text style={styles.notFlowerSubtext}>
                                        The image doesn't appear to be a gourd leaf. Try capturing a clearer image of the leaf.
                                    </Text>
                                </View>
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ width: 100, alignItems: 'center', paddingRight: 8 }}>
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
                                    </View>

                                    {/* Confidence */}
                                    <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: '#eee' }}>
                                        <ConfidenceDisplay
                                            tmPrediction={tmPrediction}
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
                                    <Text style={styles.sectionTitle}>AI Observations</Text>
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
                                    <>
                                        <LeafHealthCard healthData={geminiPrediction.geminiData.leaf} />
                                        <LeafQualityMetrics
                                            healthData={geminiPrediction.geminiData.leaf}
                                            confidence={geminiPrediction.confidence}
                                        />
                                    </>
                                )}
                            </>
                        )}

                        {/* Skeleton for future Gemini health data */}
                        {isGeminiLoading && !isNotLeaf && (
                            <>
                                <SkeletonCard title="Leaf Health" lines={4} />
                                <SkeletonCard title="AI Observations" lines={3} />
                            </>
                        )}

                        {/* TM Only Notice */}
                        {!geminiPrediction && !isGeminiLoading && !isNotLeaf && (
                            <View style={styles.tmOnlyNotice}>
                                <Ionicons name="information-circle" size={24} color="#4CAF50" />
                                <Text style={styles.tmOnlyText}>
                                    Leaf identified using TM model. AI health analysis coming soon!
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
                        <Text style={styles.actionButtonText}>Scan Again</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.saveButton, (!isTmComplete || isSaving) && styles.buttonDisabled]}
                        onPress={handleSave}
                        disabled={!isTmComplete || isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <>
                                <Ionicons name="save-outline" size={20} color="#FFF" />
                                <Text style={styles.actionButtonText}>Save Result</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
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
