import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { theme } from '../../styles';
import { plantService } from '../../services';
import { Button, ImageCapture } from '../../components';
import { CustomHeader } from '../../components/CustomComponents/CustomHeader';

export const PlantDetailScreen = ({ navigation, route }) => {
  const { plantId, plant: initialPlant } = route.params;
  const [plant, setPlant] = useState(initialPlant);
  const [isLoading, setIsLoading] = useState(!initialPlant);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showImageCapture, setShowImageCapture] = useState(false);
  
  // Modal states
  const [showFloweringModal, setShowFloweringModal] = useState(false);
  const [showPollinationModal, setShowPollinationModal] = useState(false);
  const [showHarvestModal, setShowHarvestModal] = useState(false);
  
  // Form states
  const [maleFlowerCount, setMaleFlowerCount] = useState('0');
  const [femaleFlowerCount, setFemaleFlowerCount] = useState('0');
  const [pollinationCount, setPollinationCount] = useState('1');
  const [isHandPollinated, setIsHandPollinated] = useState(true);
  const [pollinationNotes, setPollinationNotes] = useState('');
  const [harvestWeight, setHarvestWeight] = useState('');
  const [selectedFruitId, setSelectedFruitId] = useState(null);

  useEffect(() => {
    if (!initialPlant) {
      fetchPlantDetails();
    }
    setupNotificationChannel();
  }, [plantId]);

  const setupNotificationChannel = async () => {
    try {
      await Notifications.setNotificationChannelAsync('pollination', {
        name: 'Pollination Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
        sound: 'default',
      });
    } catch (error) {
      console.error('Error setting up notification channel:', error);
    }
  };

  const fetchPlantDetails = async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);
      const response = await plantService.getPlant(plantId);
      setPlant(response.data);
    } catch (error) {
      console.error('Error fetching plant details:', error);
      Alert.alert('Error', 'Failed to load plant details.');
      navigation.goBack();
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPlantDetails(false);
  };

  const handleEdit = () => {
    navigation.navigate('PlantForm', {
      plant,
      mode: 'edit',
      title: 'Edit Plant'
    });
  };

  // Helper functions
  const formatLabel = (str) => {
    if (!str) return '';
    return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateAge = () => {
    if (!plant?.datePlanted) return 0;
    const today = new Date();
    const plantedDate = new Date(plant.datePlanted);
    const diffTime = today - plantedDate;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status) => {
    const colors = {
      planted: '#4CAF50',
      germinating: '#8BC34A',
      vegetative: '#CDDC39',
      flowering: '#FF9800',
      pollinated: '#FF5722',
      fruiting: '#E91E63',
      harvested: '#9C27B0',
      completed: '#607D8B'
    };
    return colors[status] || '#9E9E9E';
  };

  const getGourdEmoji = (gourdType) => {
    const emojis = {
      bitter_gourd: '🥒',
      bottle_gourd: '🫛',
      sponge_gourd: '🌿',
      cucumber: '🥒'
    };
    return emojis[gourdType] || '🌱';
  };

  // Prediction handlers
  const handleGetFloweringPrediction = async () => {
    try {
      const response = await plantService.predictFlowering(plantId);
      const prediction = response.data;
      
      Alert.alert(
        '🌸 Flowering Prediction',
        `Expected in ~${prediction.predicted_days_to_flower} days\n\n` +
        `📅 Expected Date: ${formatDate(prediction.expected_date)}\n` +
        `📊 Confidence: ${(prediction.confidence * 100).toFixed(0)}%\n\n` +
        (prediction.recommendations?.length > 0 ? `💡 ${prediction.recommendations[0]}` : ''),
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error getting flowering prediction:', error);
      Alert.alert('Error', 'Failed to get flowering prediction.');
    }
  };

  const handleGetPollinationPrediction = async () => {
    try {
      const response = await plantService.predictPollinationSuccess(plantId);
      const prediction = response.data;
      
      Alert.alert(
        '🌿 Pollination Success Prediction',
        `Success Rate: ${prediction.success_rate_percentage?.toFixed(1) || (prediction.success_rate * 100).toFixed(1)}%\n\n` +
        `🌸 Female Flowers: ${prediction.female_flowers || plant.flowering?.femaleFlowerCount || 0}\n` +
        `✅ Expected Successful: ${prediction.expected_successful_pollinations || 0}\n` +
        `⏰ Result Visible In: ${prediction.days_until_result_visible || 5} days\n\n` +
        (prediction.recommendations?.length > 0 ? `💡 ${prediction.recommendations[0]}` : ''),
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error getting pollination prediction:', error);
      Alert.alert('Error', 'Failed to get pollination prediction.');
    }
  };

  const handleGetMaturityPrediction = async () => {
    try {
      const response = await plantService.predictFruitMaturity(plantId);
      const prediction = response.data;
      
      Alert.alert(
        '🍈 Fruit Maturity Prediction',
        `Days to Maturity: ~${prediction.days_to_maturity} days\n\n` +
        `📅 Expected Harvest: ${formatDate(prediction.expected_harvest_date)}\n` +
        `🍇 Expected Fruits: ${prediction.expected_fruits || 0}\n` +
        `⚖️ Expected Yield: ${prediction.expected_yield_kg?.toFixed(2) || 0} kg\n\n` +
        (prediction.recommendations?.length > 0 ? `💡 ${prediction.recommendations[0]}` : ''),
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error getting maturity prediction:', error);
      Alert.alert('Error', 'Failed to get maturity prediction.');
    }
  };

  // Record Flowering
  const handleRecordFlowering = async () => {
    try {
      const male = parseInt(maleFlowerCount) || 0;
      const female = parseInt(femaleFlowerCount) || 0;
      
      await plantService.recordFlowering(plantId, male, female);
      
      Alert.alert(
        'Success',
        `Flowering recorded!\n\n` +
        `🌼 Male flowers: ${male}\n` +
        `🌸 Female flowers: ${female}`,
        [{ text: 'OK', onPress: () => {
          setShowFloweringModal(false);
          fetchPlantDetails(false);
        }}]
      );
    } catch (error) {
      console.error('Error recording flowering:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to record flowering.');
    }
  };

  // Update Flower Counts
  const handleUpdateFlowerCounts = async () => {
    try {
      const male = parseInt(maleFlowerCount) || 0;
      const female = parseInt(femaleFlowerCount) || 0;
      
      await plantService.updateFlowerCounts(plantId, male, female);
      
      Alert.alert('Success', 'Flower counts updated!');
      setShowFloweringModal(false);
      fetchPlantDetails(false);
    } catch (error) {
      console.error('Error updating flower counts:', error);
      Alert.alert('Error', 'Failed to update flower counts.');
    }
  };

  // Add Pollination
  const handleAddPollination = async () => {
    try {
      const count = parseInt(pollinationCount) || 1;
      
      const response = await plantService.addPollination(
        plantId,
        count,
        isHandPollinated,
        pollinationNotes
      );
      
      const prediction = response.data?.prediction;
      let successMessage = `Pollination recorded! (${count} female flowers)`;
      
      if (prediction) {
        successMessage += `\n\n📊 Predicted Success Rate: ${(prediction.successRate * 100).toFixed(1)}%`;
        successMessage += `\n✅ Expected Successful: ${prediction.expectedSuccessfulPollinations}`;
      }
      
      Alert.alert('Success', successMessage, [{ 
        text: 'OK', 
        onPress: () => {
          setShowPollinationModal(false);
          setPollinationCount('1');
          setPollinationNotes('');
          fetchPlantDetails(false);
        }
      }]);
    } catch (error) {
      console.error('Error adding pollination:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to record pollination.');
    }
  };

  // Record Pollination Result
  const handlePollinationResult = async (pollinationId, successCount) => {
    try {
      await plantService.recordPollinationResult(plantId, pollinationId, successCount);
      
      Alert.alert(
        'Success',
        `Pollination result recorded!\n\n` +
        `✅ Successful: ${successCount} fruit(s) developing`,
        [{ text: 'OK', onPress: () => fetchPlantDetails(false) }]
      );
    } catch (error) {
      console.error('Error recording pollination result:', error);
      Alert.alert('Error', 'Failed to record pollination result.');
    }
  };

  // Record Harvest
  const handleRecordHarvest = async () => {
    try {
      if (!selectedFruitId || !harvestWeight) {
        Alert.alert('Missing Information', 'Please select a fruit and enter the weight.');
        return;
      }
      
      const weight = parseFloat(harvestWeight) || 0;
      
      await plantService.recordHarvest(plantId, selectedFruitId, weight);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 Harvest Complete!',
          body: `Harvested ${weight} kg from your ${formatLabel(plant.gourdType)}!`,
          sound: 'default',
        },
        trigger: { seconds: 1 }
      });
      
      Alert.alert('Success', `Fruit harvested! Weight: ${weight} kg`, [{ 
        text: 'OK', 
        onPress: () => {
          setShowHarvestModal(false);
          setHarvestWeight('');
          setSelectedFruitId(null);
          fetchPlantDetails(false);
        }
      }]);
    } catch (error) {
      console.error('Error recording harvest:', error);
      Alert.alert('Error', 'Failed to record harvest.');
    }
  };

  // Image handling
  const handleImageCaptured = async (imageData) => {
    try {
      // imageData might be an object with uri property or just a uri string
      const imageUri = imageData?.uri || imageData;
      await plantService.uploadImage(plantId, imageUri, 'Plant photo');
      Alert.alert('Success', 'Image uploaded successfully!');
      setShowImageCapture(false);
      fetchPlantDetails(false);
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image.');
    }
  };

  // Render functions
  const renderFloweringInfo = () => {
    if (!plant.flowering) return null;
    
    const { hasStarted, startDate, predictedDaysToFlower, predictedFloweringDate, maleFlowerCount: male, femaleFlowerCount: female, confidence } = plant.flowering;
    const plantAge = calculateAge();
    
    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🌸 Flowering Status</Text>
          {hasStarted ? (
            <View style={[styles.badge, { backgroundColor: '#4CAF50' }]}>
              <Text style={styles.badgeText}>FLOWERING</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={handleGetFloweringPrediction} style={styles.predictButton}>
              <Text style={styles.predictButtonText}>Get Prediction</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {hasStarted ? (
          <>
            <Text style={styles.infoText}>Started: {formatDate(startDate)}</Text>
            <View style={styles.flowerCountsRow}>
              <View style={styles.flowerCount}>
                <Ionicons name="male" size={20} color="#4A90E2" />
                <Text style={styles.flowerCountNumber}>{male || 0}</Text>
                <Text style={styles.flowerCountLabel}>Male</Text>
              </View>
              <View style={styles.flowerCount}>
                <Ionicons name="female" size={20} color="#E94B8A" />
                <Text style={styles.flowerCountNumber}>{female || 0}</Text>
                <Text style={styles.flowerCountLabel}>Female</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.updateButton}
              onPress={() => {
                setMaleFlowerCount(String(male || 0));
                setFemaleFlowerCount(String(female || 0));
                setShowFloweringModal(true);
              }}
            >
              <Text style={styles.updateButtonText}>Update Flower Counts</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {predictedDaysToFlower && (
              <View style={styles.predictionInfo}>
                <Text style={styles.predictionLabel}>Predicted flowering in:</Text>
                <Text style={styles.predictionValue}>
                  ~{Math.max(0, predictedDaysToFlower - plantAge)} days
                </Text>
                {predictedFloweringDate && (
                  <Text style={styles.predictionDate}>
                    Expected: {formatDate(predictedFloweringDate)}
                  </Text>
                )}
                {confidence && (
                  <Text style={styles.confidenceText}>
                    Confidence: {(confidence * 100).toFixed(0)}%
                  </Text>
                )}
              </View>
            )}
            <TouchableOpacity 
              style={styles.actionButtonPrimary}
              onPress={() => setShowFloweringModal(true)}
            >
              <Ionicons name="flower" size={20} color="#fff" />
              <Text style={styles.actionButtonPrimaryText}>Record Flowering Started</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  const renderPollinationInfo = () => {
    if (!plant.pollinations || plant.pollinations.length === 0) {
      if (!plant.flowering?.hasStarted) return null;
      
      return (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🌿 Pollination</Text>
          </View>
          <Text style={styles.infoText}>No pollinations recorded yet.</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={handleGetPollinationPrediction} style={styles.predictButton}>
              <Text style={styles.predictButtonText}>Predict Success</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButtonPrimary}
              onPress={() => setShowPollinationModal(true)}
            >
              <Ionicons name="heart" size={18} color="#fff" />
              <Text style={styles.actionButtonPrimaryText}>Add Pollination</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    
    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🌿 Pollination History</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowPollinationModal(true)}
          >
            <Ionicons name="add" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        
        {plant.pollinations.map((p, index) => (
          <View key={p._id || index} style={styles.pollinationItem}>
            <View style={styles.pollinationHeader}>
              <Text style={styles.pollinationDate}>{formatDate(p.date)}</Text>
              <View style={[
                styles.outcomeBadge, 
                { backgroundColor: p.outcome === 'success' ? '#4CAF50' : p.outcome === 'failed' ? '#F44336' : '#FF9800' }
              ]}>
                <Text style={styles.outcomeBadgeText}>{p.outcome?.toUpperCase() || 'PENDING'}</Text>
              </View>
            </View>
            <Text style={styles.pollinationDetails}>
              {p.femaleFlowerCount} female flower(s) • {p.isHandPollinated ? 'Hand' : 'Natural'} pollinated
            </Text>
            {p.prediction?.successRate && (
              <Text style={styles.pollinationPrediction}>
                Predicted: {(p.prediction.successRate * 100).toFixed(1)}% success
              </Text>
            )}
            {p.outcome === 'pending' && (
              <View style={styles.resultButtons}>
                <Text style={styles.resultPrompt}>Record result:</Text>
                {[0, 1, 2, 3].filter(n => n <= p.femaleFlowerCount).map(n => (
                  <TouchableOpacity
                    key={n}
                    style={styles.resultButton}
                    onPress={() => handlePollinationResult(p._id, n)}
                  >
                    <Text style={styles.resultButtonText}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {p.successfulCount !== undefined && p.outcome === 'success' && (
              <Text style={styles.successText}>
                ✅ {p.successfulCount} successful → {p.successfulCount} fruit(s) developing
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderFruitInfo = () => {
    if (!plant.fruits || plant.fruits.length === 0) return null;
    
    const unharvested = plant.fruits.filter(f => !f.isHarvested);
    const harvested = plant.fruits.filter(f => f.isHarvested);
    const totalYield = harvested.reduce((sum, f) => sum + (f.harvestWeight || 0), 0);
    
    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🍈 Fruits</Text>
          <TouchableOpacity onPress={handleGetMaturityPrediction} style={styles.predictButton}>
            <Text style={styles.predictButtonText}>Predict Maturity</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.fruitStats}>
          <View style={styles.fruitStat}>
            <Text style={styles.fruitStatNumber}>{plant.fruits.length}</Text>
            <Text style={styles.fruitStatLabel}>Total</Text>
          </View>
          <View style={styles.fruitStat}>
            <Text style={styles.fruitStatNumber}>{unharvested.length}</Text>
            <Text style={styles.fruitStatLabel}>Growing</Text>
          </View>
          <View style={styles.fruitStat}>
            <Text style={styles.fruitStatNumber}>{harvested.length}</Text>
            <Text style={styles.fruitStatLabel}>Harvested</Text>
          </View>
          <View style={styles.fruitStat}>
            <Text style={styles.fruitStatNumber}>{totalYield.toFixed(1)}</Text>
            <Text style={styles.fruitStatLabel}>kg Yield</Text>
          </View>
        </View>
        
        {unharvested.length > 0 && (
          <>
            <Text style={styles.subTitle}>Growing Fruits:</Text>
            {unharvested.map((fruit, index) => (
              <View key={fruit._id || index} style={styles.fruitItem}>
                <Text style={styles.fruitItemText}>
                  Fruit #{index + 1} - Started {formatDate(fruit.startDate)}
                </Text>
                <TouchableOpacity
                  style={styles.harvestButton}
                  onPress={() => {
                    setSelectedFruitId(fruit._id);
                    setShowHarvestModal(true);
                  }}
                >
                  <Text style={styles.harvestButtonText}>Harvest</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </View>
    );
  };

  const renderEnvironmentInfo = () => {
    if (!plant.environment) return null;
    
    const { avgTemperature, avgHumidity, sunlightHours, soilType, season, regionClimate } = plant.environment;
    
    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🌡️ Environment</Text>
        <View style={styles.envGrid}>
          <View style={styles.envItem}>
            <Text style={styles.envValue}>{avgTemperature}°C</Text>
            <Text style={styles.envLabel}>Temperature</Text>
          </View>
          <View style={styles.envItem}>
            <Text style={styles.envValue}>{avgHumidity}%</Text>
            <Text style={styles.envLabel}>Humidity</Text>
          </View>
          <View style={styles.envItem}>
            <Text style={styles.envValue}>{sunlightHours}h</Text>
            <Text style={styles.envLabel}>Sunlight</Text>
          </View>
          <View style={styles.envItem}>
            <Text style={styles.envValue}>{formatLabel(soilType)}</Text>
            <Text style={styles.envLabel}>Soil</Text>
          </View>
        </View>
        <Text style={styles.envExtraInfo}>
          {formatLabel(season)} Season • {formatLabel(regionClimate)}
        </Text>
      </View>
    );
  };

  const renderPlantImage = () => {
    return (
      <View style={styles.imageSection}>
        {plant.image?.url ? (
          <Image source={{ uri: plant.image.url }} style={styles.plantImage} />
        ) : (
          <View style={styles.noImage}>
            <Ionicons name="image-outline" size={48} color={theme.colors.text.secondary} />
            <Text style={styles.noImageText}>No photo</Text>
          </View>
        )}
        <TouchableOpacity 
          style={styles.cameraButton}
          onPress={() => setShowImageCapture(true)}
        >
          <Ionicons name="camera" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  // Loading and error states
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading plant details...</Text>
      </View>
    );
  }

  if (!plant) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>Plant not found</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const plantAge = calculateAge();
  const displayName = plant.plantName || formatLabel(plant.variety) || formatLabel(plant.gourdType);

  return (
    <View style={styles.container}>
      <CustomHeader
        title={`${getGourdEmoji(plant.gourdType)} ${displayName}`}
        subtitle={formatLabel(plant.gourdType)}
        onBack={() => navigation.goBack()}
        rightComponent={() => (
          <TouchableOpacity onPress={handleEdit}>
            <Ionicons name="create-outline" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      />

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Plant Image */}
        {renderPlantImage()}

        {/* Status Overview */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(plant.status) }]}>
              <Text style={styles.statusText}>{formatLabel(plant.status)}</Text>
            </View>
            <View style={styles.ageInfo}>
              <Text style={styles.ageNumber}>{plantAge}</Text>
              <Text style={styles.ageLabel}>days old</Text>
            </View>
          </View>
          <View style={styles.datesRow}>
            <Text style={styles.dateText}>📅 Planted: {formatDate(plant.datePlanted)}</Text>
          </View>
          {plant.notes && (
            <Text style={styles.notesText}>📝 {plant.notes}</Text>
          )}
        </View>

        {/* Environment Info */}
        {renderEnvironmentInfo()}

        {/* Flowering Section */}
        {renderFloweringInfo()}

        {/* Pollination Section */}
        {renderPollinationInfo()}

        {/* Fruits Section */}
        {renderFruitInfo()}

        {/* Full Lifecycle Prediction Button */}
        <TouchableOpacity
          style={styles.lifecycleButton}
          onPress={async () => {
            try {
              const response = await plantService.getLifecyclePrediction(plantId);
              const { predictions } = response.data;
              
              Alert.alert(
                '🌱 Full Lifecycle Prediction',
                `📊 Summary:\n\n` +
                `🌸 Days to Flowering: ${predictions.summary?.plantingToFlowering || 'N/A'}\n` +
                `💚 Pollination Success: ${predictions.summary?.expectedPollinationSuccess?.toFixed(1) || 'N/A'}%\n` +
                `🍈 Days Flowering to Harvest: ${predictions.summary?.floweringToHarvest || 'N/A'}\n` +
                `📆 Total Days to Harvest: ${predictions.summary?.totalDaysToHarvest || 'N/A'}\n` +
                `⚖️ Expected Yield: ${predictions.summary?.expectedYieldKg?.toFixed(2) || 'N/A'} kg`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Error getting lifecycle prediction:', error);
              Alert.alert('Error', 'Failed to get lifecycle prediction.');
            }
          }}
        >
          <Ionicons name="analytics" size={20} color="#fff" />
          <Text style={styles.lifecycleButtonText}>Get Full Lifecycle Prediction</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Flowering Modal */}
      <Modal
        visible={showFloweringModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFloweringModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {plant.flowering?.hasStarted ? 'Update Flower Counts' : 'Record Flowering'}
              </Text>
              <TouchableOpacity onPress={() => setShowFloweringModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Male Flowers 🌼</Text>
              <TextInput
                style={styles.input}
                value={maleFlowerCount}
                onChangeText={setMaleFlowerCount}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Female Flowers 🌸</Text>
              <TextInput
                style={styles.input}
                value={femaleFlowerCount}
                onChangeText={setFemaleFlowerCount}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            
            <TouchableOpacity
              style={styles.modalButton}
              onPress={plant.flowering?.hasStarted ? handleUpdateFlowerCounts : handleRecordFlowering}
            >
              <Text style={styles.modalButtonText}>
                {plant.flowering?.hasStarted ? 'Update' : 'Record Flowering'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Pollination Modal */}
      <Modal
        visible={showPollinationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPollinationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Pollination</Text>
              <TouchableOpacity onPress={() => setShowPollinationModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Female Flowers Pollinated</Text>
              <TextInput
                style={styles.input}
                value={pollinationCount}
                onChangeText={setPollinationCount}
                keyboardType="numeric"
                placeholder="1"
              />
            </View>
            
            <View style={styles.toggleRow}>
              <Text style={styles.inputLabel}>Hand Pollinated?</Text>
              <TouchableOpacity
                style={[styles.toggleButton, isHandPollinated && styles.toggleButtonActive]}
                onPress={() => setIsHandPollinated(!isHandPollinated)}
              >
                <Text style={[styles.toggleButtonText, isHandPollinated && styles.toggleButtonTextActive]}>
                  {isHandPollinated ? 'Yes' : 'No'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={pollinationNotes}
                onChangeText={setPollinationNotes}
                placeholder="Any observations..."
                multiline
              />
            </View>
            
            <TouchableOpacity style={styles.modalButton} onPress={handleAddPollination}>
              <Text style={styles.modalButtonText}>Add Pollination</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Harvest Modal */}
      <Modal
        visible={showHarvestModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHarvestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎉 Record Harvest</Text>
              <TouchableOpacity onPress={() => setShowHarvestModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Harvest Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={harvestWeight}
                onChangeText={setHarvestWeight}
                keyboardType="decimal-pad"
                placeholder="0.5"
              />
            </View>
            
            <TouchableOpacity style={styles.modalButton} onPress={handleRecordHarvest}>
              <Text style={styles.modalButtonText}>Record Harvest</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Image Capture Modal */}
      <ImageCapture
        visible={showImageCapture}
        onClose={() => setShowImageCapture(false)}
        onImageCaptured={handleImageCaptured}
        title="Add Plant Photo"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    ...theme.typography.h3,
    color: theme.colors.error,
    marginVertical: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  imageSection: {
    height: 200,
    backgroundColor: theme.colors.background.secondary,
    position: 'relative',
  },
  plantImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  noImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: theme.colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  statusCard: {
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.small,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  ageInfo: {
    alignItems: 'center',
  },
  ageNumber: {
    ...theme.typography.h2,
    color: theme.colors.primary,
  },
  ageLabel: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  datesRow: {
    marginTop: theme.spacing.sm,
  },
  dateText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  notesText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    fontStyle: 'italic',
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
  },
  subTitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.small,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  predictButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.small,
    backgroundColor: theme.colors.background.secondary,
  },
  predictButtonText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  addButton: {
    padding: 4,
  },
  infoText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
  },
  flowerCountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: theme.spacing.md,
  },
  flowerCount: {
    alignItems: 'center',
  },
  flowerCountNumber: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
  },
  flowerCountLabel: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  updateButton: {
    alignItems: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.small,
  },
  updateButtonText: {
    ...theme.typography.button,
    color: theme.colors.primary,
  },
  predictionInfo: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.small,
    marginBottom: theme.spacing.md,
  },
  predictionLabel: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  predictionValue: {
    ...theme.typography.h3,
    color: theme.colors.primary,
    marginVertical: theme.spacing.xs,
  },
  predictionDate: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
  },
  confidenceText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  actionButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    gap: theme.spacing.sm,
  },
  actionButtonPrimaryText: {
    ...theme.typography.button,
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  pollinationItem: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background.secondary,
    paddingVertical: theme.spacing.sm,
  },
  pollinationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pollinationDate: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text.primary,
  },
  outcomeBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.small,
  },
  outcomeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pollinationDetails: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  pollinationPrediction: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    marginTop: 2,
  },
  resultButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  resultPrompt: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.xs,
  },
  resultButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  successText: {
    ...theme.typography.caption,
    color: '#4CAF50',
    marginTop: 4,
  },
  fruitStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.md,
  },
  fruitStat: {
    alignItems: 'center',
  },
  fruitStatNumber: {
    ...theme.typography.h3,
    color: theme.colors.primary,
  },
  fruitStatLabel: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  fruitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background.secondary,
  },
  fruitItemText: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    flex: 1,
  },
  harvestButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    backgroundColor: '#9C27B0',
    borderRadius: theme.borderRadius.small,
  },
  harvestButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  envGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
  },
  envItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  envValue: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  envLabel: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    fontSize: 10,
  },
  envExtraInfo: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  lifecycleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    marginHorizontal: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    gap: theme.spacing.sm,
  },
  lifecycleButtonText: {
    ...theme.typography.button,
    color: '#fff',
  },
  // Modal styles
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
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    ...theme.typography.body,
    color: theme.colors.text.primary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  toggleButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.background.secondary,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleButtonText: {
    ...theme.typography.button,
    color: theme.colors.text.secondary,
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  modalButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  modalButtonText: {
    ...theme.typography.button,
    color: '#fff',
  },
});
