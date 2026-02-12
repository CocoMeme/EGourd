/**
 * GuestStorageService - Local storage for guest mode
 * Manages scan history and plant data in AsyncStorage for unauthenticated users.
 * Data persists across sessions and can be migrated on sign-up/login.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_FLAG_KEY = 'isGuest';
const GUEST_SCANS_KEY = 'guest_scans';
const GUEST_PLANTS_KEY = 'guest_plants';
const MAX_LOCAL_SCANS = 100;
const MAX_LOCAL_PLANTS = 50;

/**
 * Generate a unique local ID (prefixed to distinguish from MongoDB ObjectIds)
 */
const generateLocalId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `local_${timestamp}_${random}`;
};

class GuestStorageService {
  // ─── Guest Flag ─────────────────────────────────────────────

  async setGuestMode(value) {
    if (value) {
      await AsyncStorage.setItem(GUEST_FLAG_KEY, 'true');
    } else {
      await AsyncStorage.removeItem(GUEST_FLAG_KEY);
    }
  }

  async isGuestMode() {
    const flag = await AsyncStorage.getItem(GUEST_FLAG_KEY);
    return flag === 'true';
  }

  async clearGuestFlag() {
    await AsyncStorage.removeItem(GUEST_FLAG_KEY);
  }

  // ─── Scans ──────────────────────────────────────────────────

  async _getScans() {
    const raw = await AsyncStorage.getItem(GUEST_SCANS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  async _setScans(scans) {
    await AsyncStorage.setItem(GUEST_SCANS_KEY, JSON.stringify(scans));
  }

  /**
   * Save a scan locally. Mirrors the shape returned by the backend.
   * @param {Object} scanData - Scan payload (prediction, confidence, variety, etc.)
   * @param {string} [imageUri] - Local file URI for the scanned image
   * @returns {Object} The saved scan object with a local _id
   */
  async saveLocalScan(scanData, imageUri) {
    const scans = await this._getScans();

    if (scans.length >= MAX_LOCAL_SCANS) {
      throw new Error(`Local storage limit reached (${MAX_LOCAL_SCANS} scans). Delete some scans to save new ones.`);
    }

    const scan = {
      _id: generateLocalId(),
      imageUrl: imageUri || null,
      prediction: scanData.prediction || 'unknown',
      confidence: scanData.confidence || 0,
      scanType: scanData.scanType || 'flower',
      variety: scanData.variety || null,
      name: scanData.name || this._generateScanName(scanData),
      validationStatus: scanData.validationStatus || 'tflite_only',
      aiPrediction: scanData.aiPrediction || {},
      diseaseInfo: scanData.diseaseInfo || {},
      notes: scanData.notes || '',
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isLocalGuest: true, // Flag for migration
    };

    scans.unshift(scan); // Most recent first
    await this._setScans(scans);
    return scan;
  }

  /**
   * Get all locally saved scans
   */
  async getLocalScans() {
    return this._getScans();
  }

  /**
   * Get a single scan by ID
   */
  async getLocalScanById(id) {
    const scans = await this._getScans();
    return scans.find(s => s._id === id) || null;
  }

  /**
   * Update a scan by ID
   */
  async updateLocalScan(id, updates) {
    const scans = await this._getScans();
    const index = scans.findIndex(s => s._id === id);
    if (index === -1) throw new Error('Scan not found');

    scans[index] = { ...scans[index], ...updates, updatedAt: new Date().toISOString() };
    await this._setScans(scans);
    return scans[index];
  }

  /**
   * Delete a scan by ID
   */
  async deleteLocalScan(id) {
    const scans = await this._getScans();
    const filtered = scans.filter(s => s._id !== id);
    await this._setScans(filtered);
    return true;
  }

  async clearLocalScans() {
    await AsyncStorage.removeItem(GUEST_SCANS_KEY);
  }

  _generateScanName(scanData) {
    const variety = scanData.variety || 'Unknown';
    const gender = scanData.prediction || '';
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (scanData.scanType === 'leaf') {
      return `${variety} Leaf ${date}`;
    }
    return `${variety} ${gender} ${date}`;
  }

  // ─── Plants ─────────────────────────────────────────────────

  async _getPlants() {
    const raw = await AsyncStorage.getItem(GUEST_PLANTS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  async _setPlants(plants) {
    await AsyncStorage.setItem(GUEST_PLANTS_KEY, JSON.stringify(plants));
  }

  /**
   * Save a new plant locally
   */
  async saveLocalPlant(plantData) {
    const plants = await this._getPlants();

    if (plants.length >= MAX_LOCAL_PLANTS) {
      throw new Error(`Local storage limit reached (${MAX_LOCAL_PLANTS} plants). Delete some plants to add new ones.`);
    }

    const now = new Date().toISOString();
    const plant = {
      _id: generateLocalId(),
      gourdType: plantData.gourdType,
      variety: plantData.variety || this._getDefaultVariety(plantData.gourdType),
      plantName: plantData.plantName,
      datePlanted: plantData.datePlanted || now,
      notes: plantData.notes || '',
      status: plantData.status || 'planted',
      image: plantData.image || null,
      environment: plantData.environment || {},
      care: plantData.care || {},
      plantHealth: plantData.plantHealth || 4,
      vineLength: plantData.vineLength || 0,
      leafCount: plantData.leafCount || 0,
      flowering: plantData.flowering || {
        maleFlowerCount: 0,
        femaleFlowerCount: 0,
        hasStartedFlowering: false,
      },
      pollinations: [],
      fruits: [],
      timeline: [{ event: 'planted', date: now, description: 'Plant registered' }],
      createdAt: now,
      updatedAt: now,
      isLocalGuest: true,
    };

    plants.unshift(plant);
    await this._setPlants(plants);
    return { success: true, data: plant };
  }

  /**
   * Get all local plants, optionally filtered
   */
  async getLocalPlants(filters = {}) {
    let plants = await this._getPlants();

    if (filters.status) {
      plants = plants.filter(p => p.status === filters.status);
    }
    if (filters.gourdType) {
      plants = plants.filter(p => p.gourdType === filters.gourdType);
    }
    if (filters.name) {
      const term = filters.name.toLowerCase();
      plants = plants.filter(p => p.plantName?.toLowerCase().includes(term));
    }

    // Sort
    if (filters.sort === 'oldest') {
      plants.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else {
      plants.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return { success: true, data: plants };
  }

  /**
   * Get a single plant by ID
   */
  async getLocalPlant(id) {
    const plants = await this._getPlants();
    const plant = plants.find(p => p._id === id);
    if (!plant) throw new Error('Plant not found');
    return { success: true, data: plant };
  }

  /**
   * Update a plant by ID
   */
  async updateLocalPlant(id, updates) {
    const plants = await this._getPlants();
    const index = plants.findIndex(p => p._id === id);
    if (index === -1) throw new Error('Plant not found');

    // Merge updates but preserve nested arrays/objects carefully
    const existing = plants[index];
    plants[index] = {
      ...existing,
      ...updates,
      pollinations: updates.pollinations || existing.pollinations,
      fruits: updates.fruits || existing.fruits,
      timeline: updates.timeline || existing.timeline,
      updatedAt: new Date().toISOString(),
    };
    await this._setPlants(plants);
    return { success: true, data: plants[index] };
  }

  /**
   * Delete a plant by ID
   */
  async deleteLocalPlant(id) {
    const plants = await this._getPlants();
    const filtered = plants.filter(p => p._id !== id);
    await this._setPlants(filtered);
    return { success: true };
  }

  /**
   * Store a local image URI for a plant
   */
  async setLocalPlantImage(plantId, imageUri, caption = '') {
    const plants = await this._getPlants();
    const index = plants.findIndex(p => p._id === plantId);
    if (index === -1) throw new Error('Plant not found');

    plants[index].image = {
      url: imageUri,
      caption,
      uploadDate: new Date().toISOString(),
    };
    plants[index].updatedAt = new Date().toISOString();
    await this._setPlants(plants);
    return { success: true, data: plants[index] };
  }

  // ─── Pollinations (nested in plants) ────────────────────────

  /**
   * Add a pollination entry to a local plant
   */
  async addLocalPollination(plantId, femaleFlowersPollinated = 1, isHandPollinated = true, notes = '') {
    const plants = await this._getPlants();
    const index = plants.findIndex(p => p._id === plantId);
    if (index === -1) throw new Error('Plant not found');

    const plant = plants[index];
    const entryNumber = (plant.pollinations?.length || 0) + 1;
    const gourdDays = this._getGourdDaysToResult(plant.gourdType);
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + gourdDays);

    const pollination = {
      _id: generateLocalId(),
      entryNumber,
      label: `Pollinated ${entryNumber}`,
      date: new Date().toISOString(),
      femaleFlowersPollinated,
      isHandPollinated,
      expectedResultDate: expectedDate.toISOString(),
      daysUntilResult: gourdDays,
      notificationScheduled: false,
      notificationId: null,
      status: 'pending',
      notes,
      isLocalGuest: true,
    };

    plant.pollinations = plant.pollinations || [];
    plant.pollinations.push(pollination);
    plant.timeline = plant.timeline || [];
    plant.timeline.push({
      event: 'pollination',
      date: pollination.date,
      description: `${pollination.label}: ${femaleFlowersPollinated} flower(s) pollinated`,
    });
    plant.updatedAt = new Date().toISOString();

    await this._setPlants(plants);
    return { success: true, data: { pollination, plant } };
  }

  /**
   * Update a pollination entry
   */
  async updateLocalPollination(plantId, pollinationId, updateData) {
    const plants = await this._getPlants();
    const plantIndex = plants.findIndex(p => p._id === plantId);
    if (plantIndex === -1) throw new Error('Plant not found');

    const plant = plants[plantIndex];
    const polIndex = plant.pollinations.findIndex(p => p._id === pollinationId);
    if (polIndex === -1) throw new Error('Pollination not found');

    plant.pollinations[polIndex] = {
      ...plant.pollinations[polIndex],
      ...updateData,
    };
    plant.updatedAt = new Date().toISOString();

    await this._setPlants(plants);
    return { success: true, data: plant.pollinations[polIndex] };
  }

  /**
   * Delete a pollination entry
   */
  async deleteLocalPollination(plantId, pollinationId) {
    const plants = await this._getPlants();
    const plantIndex = plants.findIndex(p => p._id === plantId);
    if (plantIndex === -1) throw new Error('Plant not found');

    plants[plantIndex].pollinations = plants[plantIndex].pollinations.filter(
      p => p._id !== pollinationId
    );
    plants[plantIndex].updatedAt = new Date().toISOString();

    await this._setPlants(plants);
    return { success: true };
  }

  // ─── Migration Helpers ──────────────────────────────────────

  /**
   * Get all local guest data for migration
   */
  async getGuestDataForMigration() {
    const scans = await this._getScans();
    const plants = await this._getPlants();
    return { scans, plants };
  }

  /**
   * Check if there is any local guest data pending migration
   */
  async hasGuestData() {
    const scans = await this._getScans();
    const plants = await this._getPlants();
    return scans.length > 0 || plants.length > 0;
  }

  /**
   * Clear all guest data (call after successful migration)
   */
  async clearAllGuestData() {
    await AsyncStorage.multiRemove([GUEST_FLAG_KEY, GUEST_SCANS_KEY, GUEST_PLANTS_KEY]);
  }

  // ─── Local Analytics (for AnalysisTab in guest mode) ────────

  /**
   * Compute basic analytics from local scans
   * @param {number|null} daysBack - Number of days to look back (null = all time)
   * @param {string|null} scanType - Filter by scan type ('flower' or 'leaf', null = all)
   */
  async getLocalAnalytics(daysBack = null, scanType = null) {
    let scans = await this._getScans();

    // Filter by date range
    if (daysBack) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysBack);
      scans = scans.filter(s => new Date(s.date || s.createdAt) >= cutoff);
    }

    // Filter by scan type
    if (scanType) {
      scans = scans.filter(s => s.scanType === scanType);
    }

    if (scans.length === 0) {
      return {
        summary: { totalScans: 0, avgConfidence: 0 },
        distributions: { variety: {}, gender: { male: 0, female: 0 }, confidence: { high: 0, medium: 0, low: 0 } },
        timeSeries: [],
      };
    }

    const totalScans = scans.length;
    const avgConfidence = Math.round(scans.reduce((sum, s) => sum + (s.confidence || 0), 0) / totalScans);

    // Gender distribution
    const gender = { male: 0, female: 0 };
    scans.forEach(s => {
      if (s.prediction === 'male') gender.male++;
      else if (s.prediction === 'female') gender.female++;
    });

    // Variety distribution
    const variety = {};
    scans.forEach(s => {
      const v = s.variety || 'Unknown';
      variety[v] = (variety[v] || 0) + 1;
    });

    // Confidence distribution
    const confidence = { high: 0, medium: 0, low: 0 };
    scans.forEach(s => {
      if (s.confidence >= 80) confidence.high++;
      else if (s.confidence >= 50) confidence.medium++;
      else confidence.low++;
    });

    // Time series (last 7 days)
    const timeSeries = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = scans.filter(s => s.date?.startsWith(dateStr)).length;
      timeSeries.push({ date: dateStr, count });
    }

    return {
      summary: { totalScans, avgConfidence },
      distributions: { variety, gender, confidence },
      timeSeries,
    };
  }

  // ─── Utility ────────────────────────────────────────────────

  _getDefaultVariety(gourdType) {
    const map = {
      bitter_gourd: 'Ampalaya Bilog',
      bottle_gourd: 'Upo (Smooth)',
      sponge_gourd: 'Patola',
      cucumber: 'Cucumber',
    };
    return map[gourdType] || gourdType;
  }

  _getGourdDaysToResult(gourdType) {
    const map = {
      bitter_gourd: 6,
      bottle_gourd: 8,
      sponge_gourd: 5,
      cucumber: 4,
    };
    return map[gourdType] || 7;
  }
}

export const guestStorageService = new GuestStorageService();
export default guestStorageService;
