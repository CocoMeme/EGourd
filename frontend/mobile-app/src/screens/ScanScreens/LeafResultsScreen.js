/**
 * LeafResultsScreen - View saved leaf scan results
 * Shows leaf identification data with leaf-specific UI
 * Features: Leaf variety display, health assessment (when available), no flower components
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
    Modal,
    TextInput,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { CustomHeader } from '../../components/CustomComponents/CustomHeader';
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
 * Final Verdict Card — side-by-side TM vs Gemini with agree/disagree badge
 */
const FinalVerdictCard = ({ tmPrediction, geminiPrediction }) => {
    const agree = geminiPrediction && tmPrediction &&
        geminiPrediction.variety === tmPrediction.variety;
    const badgeColor = agree ? '#4CAF50' : '#FF9800';
    const badgeIcon = agree ? 'checkmark-circle' : 'alert-circle';
    const badgeLabel = agree ? 'AGREE' : 'DISAGREE';

    return (
        <View style={{ flex: 1, paddingLeft: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 10, color: '#888', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' }}>TM Model</Text>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#4CAF50' }}>{tmPrediction?.confidence?.toFixed(0)}%</Text>
                </View>

                <View style={{ alignItems: 'center', paddingHorizontal: 4 }}>
                    {geminiPrediction ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: badgeColor + '18', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: badgeColor }}>
                            <Ionicons name={badgeIcon} size={12} color={badgeColor} />
                            <Text style={{ fontSize: 9, fontWeight: '700', color: badgeColor }}>{badgeLabel}</Text>
                        </View>
                    ) : (
                        <Text style={{ fontSize: 11, color: '#CCC', fontWeight: '600' }}>VS</Text>
                    )}
                </View>

                <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 10, color: '#888', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' }}>Gemini AI</Text>
                    {geminiPrediction ? (
                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#9C27B0' }}>{geminiPrediction.confidence?.toFixed(0)}%</Text>
                    ) : (
                        <Text style={{ fontSize: 13, color: '#CCC' }}>--</Text>
                    )}
                </View>
            </View>
        </View>
    );
};

/**
 * Collapsible Health Section wrapping LeafHealthCard + LeafQualityMetrics
 */
const CollapsibleHealthSection = ({ geminiPrediction }) => {
    const [expanded, setExpanded] = useState(false);
    if (!geminiPrediction?.leaf) return null;

    return (
        <View style={{ marginBottom: 8 }}>
            <TouchableOpacity
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderRadius: 12, marginHorizontal: 16, borderWidth: 1, borderColor: '#E0E0E0' }}
                onPress={() => setExpanded(!expanded)}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="medkit-outline" size={18} color={theme.colors.primary} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }}>Health Details</Text>
                </View>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
            </TouchableOpacity>
            {expanded && (
                <>
                    <LeafHealthCard healthData={geminiPrediction.leaf} />
                    <LeafQualityMetrics
                        healthData={geminiPrediction.leaf}
                        confidence={geminiPrediction.confidence}
                    />
                </>
            )}
        </View>
    );
};

// Internal components removed - using dedicated ones from ScanComponents

/**
 * Main Leaf Results Screen Component
 */
export const LeafResultsScreen = ({ route, navigation }) => {
    const { scan } = route.params;

    // Local state
    const [currentScan, setCurrentScan] = useState(scan || null);
    const [tmPrediction, setTmPrediction] = useState(null);
    const [geminiPrediction, setGeminiPrediction] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [leafHealthData, setLeafHealthData] = useState(null);

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [optionsVisible, setOptionsVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [newName, setNewName] = useState(scan?.name || '');
    const [isRenaming, setIsRenaming] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [imageLoading, setImageLoading] = useState(true);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Initialize from scan
    useEffect(() => {
        if (currentScan) {
            // TFLite data
            if (currentScan.aiPrediction?.tflite) {
                setTmPrediction({
                    ...currentScan.aiPrediction.tflite,
                    source: 'tflite',
                });
            }

            // Gemini data (future)
            if (currentScan.aiPrediction?.gemini) {
                const gData = currentScan.aiPrediction.gemini;
                setGeminiPrediction(gData);
                if (gData.leaf) {
                    setLeafHealthData(gData.leaf);
                }
            }

            // Main prediction
            setPrediction({
                variety: currentScan.variety,
                confidence: currentScan.confidence,
                isNotLeaf: currentScan.variety === null,
            });

            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start();
        }
    }, [currentScan]);

    const handleBack = () => {
        navigation.goBack();
    };

    const confirmDelete = async () => {
        try {
            setIsDeleting(true);
            await scanService.deleteScan(currentScan._id);
            setIsDeleting(false);
            setDeleteModalVisible(false);
            navigation.goBack();
        } catch (error) {
            setIsDeleting(false);
            Alert.alert("Error", "Failed to delete scan");
        }
    };

    const handleDelete = () => {
        setDeleteModalVisible(true);
    };

    const handleRename = async () => {
        if (!newName.trim()) return;
        setIsRenaming(true);
        try {
            await scanService.updateScan(currentScan._id, { name: newName });
            setCurrentScan(prev => ({ ...prev, name: newName }));
            setModalVisible(false);
        } catch (error) {
            Alert.alert("Error", "Failed to update name");
        } finally {
            setIsRenaming(false);
        }
    };

    const handleOptionsPress = () => {
        setOptionsVisible(true);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    };

    // Computed values
    const varietyColor = LEAF_VARIETY_COLORS[prediction?.variety] || theme.colors.primary;
    const displayVariety = prediction?.variety || 'Unknown';
    const isNotLeaf = prediction?.isNotLeaf;

    return (
        <View style={styles.container}>
            <CustomHeader
                variant="results"
                title={currentScan?.name || "Leaf Scan"}
                onBackPress={handleBack}
                rightComponent={() => (
                    <TouchableOpacity onPress={handleOptionsPress} style={{ padding: 4 }}>
                        <Ionicons name="ellipsis-vertical" size={24} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                )}
            />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Image Preview */}
                <View style={styles.imageContainer}>
                    {imageLoading && (
                        <ActivityIndicator size="large" color="#FFF" style={styles.imageLoader} />
                    )}
                    <Image
                        source={{ uri: currentScan?.imageUrl }}
                        style={styles.image}
                        onLoadEnd={() => setImageLoading(false)}
                    />
                </View>

                {/* Results Content */}
                {prediction && (
                    <Animated.View style={{ opacity: fadeAnim }}>
                        {/* Main Result Card */}
                        <View style={styles.mainResultCard}>
                            {isNotLeaf ? (
                                <View style={styles.notLeafResult}>
                                    <Ionicons name="close-circle" size={64} color="#F44336" />
                                    <Text style={styles.notLeafText}>Not a Gourd Leaf</Text>
                                    <Text style={styles.notLeafSubtext}>
                                        The image wasn't identified as a gourd leaf.
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

                                    <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: '#eee' }}>
                                        <FinalVerdictCard
                                            tmPrediction={tmPrediction}
                                            geminiPrediction={geminiPrediction}
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
                                    <Text style={styles.reasoningText}>{geminiPrediction.reasoning}</Text>

                                    {geminiPrediction.keyFeatures?.length > 0 && (
                                        <View style={styles.featuresList}>
                                            {geminiPrediction.keyFeatures.map((feature, i) => (
                                                <View key={i} style={styles.featureBadge}>
                                                    <Text style={styles.featureText}>{feature}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>

                                {geminiPrediction.leaf && (
                                    <CollapsibleHealthSection geminiPrediction={geminiPrediction} />
                                )}
                            </>
                        )}

                        {/* TM Only Notice */}
                        {!geminiPrediction && !isNotLeaf && (
                            <View style={styles.tmOnlyNotice}>
                                <Ionicons name="information-circle" size={24} color="#4CAF50" />
                                <Text style={styles.tmOnlyText}>
                                    Identified using TM model. AI health analysis was not available.
                                </Text>
                            </View>
                        )}
                    </Animated.View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Options Menu Modal */}
            <Modal
                transparent={true}
                visible={optionsVisible}
                animationType="fade"
                onRequestClose={() => setOptionsVisible(false)}
            >
                <TouchableOpacity
                    style={styles.optionsOverlay}
                    activeOpacity={1}
                    onPress={() => setOptionsVisible(false)}
                >
                    <View style={styles.optionsMenu}>
                        <View style={styles.optionDateContainer}>
                            <Ionicons name="calendar-outline" size={16} color="#666" />
                            <Text style={styles.optionDateText}>
                                {formatDate(currentScan?.date || currentScan?.createdAt)}
                            </Text>
                        </View>
                        <View style={styles.optionDivider} />
                        <TouchableOpacity
                            style={styles.optionItem}
                            onPress={() => {
                                setOptionsVisible(false);
                                setModalVisible(true);
                            }}
                        >
                            <Ionicons name="pencil-outline" size={20} color="#333" />
                            <Text style={styles.optionText}>Rename</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.optionItem}
                            onPress={() => {
                                setOptionsVisible(false);
                                handleDelete();
                            }}
                        >
                            <Ionicons name="trash-outline" size={20} color="#F44336" />
                            <Text style={[styles.optionText, { color: '#F44336' }]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Rename Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Rename Scan</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={newName}
                                    onChangeText={setNewName}
                                    placeholder="Enter name"
                                    autoFocus
                                    selectTextOnFocus
                                />
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.cancelButton]}
                                        onPress={() => setModalVisible(false)}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.renameSaveButton, isRenaming && styles.buttonDisabled]}
                                        onPress={handleRename}
                                        disabled={isRenaming}
                                    >
                                        <Text style={styles.saveButtonText}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Delete Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={deleteModalVisible}
                onRequestClose={() => setDeleteModalVisible(false)}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDeleteModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Delete Scan</Text>
                        <Text style={styles.modalText}>
                            Are you sure you want to delete this scan? This action cannot be undone.
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setDeleteModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.deleteConfirmButton, isDeleting && styles.buttonDisabled]}
                                onPress={confirmDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Delete</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
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
    notLeafResult: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    notLeafText: {
        color: '#F44336',
        fontSize: 24,
        fontWeight: '700',
        marginTop: 16,
    },
    notLeafSubtext: {
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
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#FFF',
        borderRadius: 6,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text.primary,
        marginBottom: 16,
    },
    modalText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 24,
        lineHeight: 20,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 24,
        color: '#333',
        backgroundColor: '#F9F9F9',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    cancelButton: {
        backgroundColor: '#F5F5F5',
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: '600',
    },
    renameSaveButton: {
        backgroundColor: theme.colors.primary,
    },
    deleteConfirmButton: {
        backgroundColor: '#F44336',
    },
    saveButtonText: {
        color: '#FFF',
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    optionsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    optionsMenu: {
        position: 'absolute',
        top: 60,
        right: 16,
        backgroundColor: '#FFF',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
        minWidth: 200,
        padding: 8,
    },
    optionDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    optionDateText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    optionDivider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 4,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    optionText: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
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

export default LeafResultsScreen;
