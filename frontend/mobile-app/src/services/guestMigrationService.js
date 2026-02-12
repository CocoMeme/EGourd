/**
 * GuestMigrationService - Migrate local guest data to backend on login/signup
 * Uploads locally-stored scans and plants to the user's account.
 */
import { scanService } from './scanService';
import { plantService } from './plantService';
import { guestStorageService } from './guestStorageService';

class GuestMigrationService {
  /**
   * Migrate all local guest data to the backend.
   * Called automatically after a guest signs in or creates an account.
   * @returns {{ scans: number, plants: number, errors: string[] }}
   */
  async migrateGuestData() {
    const { scans, plants } = await guestStorageService.getGuestDataForMigration();
    const result = { scans: 0, plants: 0, pollinations: 0, errors: [] };

    if (scans.length === 0 && plants.length === 0) {
      return result;
    }

    console.log(`📦 Starting guest data migration: ${scans.length} scans, ${plants.length} plants`);

    // Migrate scans
    for (const scan of scans) {
      try {
        const scanPayload = {
          prediction: scan.prediction,
          confidence: scan.confidence,
          scanType: scan.scanType,
          variety: scan.variety,
          validationStatus: scan.validationStatus,
          aiPrediction: scan.aiPrediction,
          notes: scan.notes,
        };

        // Use local image URI if available
        const imageUri = scan.imageUrl;
        await scanService.saveScan(scanPayload, imageUri);
        result.scans++;
      } catch (error) {
        console.warn(`⚠️ Failed to migrate scan: ${scan.name}`, error.message);
        result.errors.push(`Scan "${scan.name}": ${error.message}`);
      }
    }

    // Migrate plants and their pollinations
    for (const plant of plants) {
      try {
        const plantPayload = {
          gourdType: plant.gourdType,
          plantName: plant.plantName,
          datePlanted: plant.datePlanted,
          notes: plant.notes,
          environment: plant.environment,
          care: plant.care,
        };

        const response = await plantService.createPlant(plantPayload);
        const newPlant = response.data;
        result.plants++;

        // Upload image if available
        if (plant.image?.url && newPlant?._id) {
          try {
            await plantService.uploadImage(newPlant._id, plant.image.url, plant.image.caption || 'Plant photo');
          } catch (imgError) {
            console.warn(`⚠️ Failed to upload plant image: ${plant.plantName}`, imgError.message);
          }
        }

        // Migrate pollinations for this plant
        if (plant.pollinations?.length > 0 && newPlant?._id) {
          for (const pol of plant.pollinations) {
            try {
              await plantService.addPollination(
                newPlant._id,
                pol.femaleFlowersPollinated || 1,
                pol.isHandPollinated !== false,
                pol.notes || ''
              );
              result.pollinations++;
            } catch (polError) {
              console.warn(`⚠️ Failed to migrate pollination: ${pol.label}`, polError.message);
              result.errors.push(`Pollination "${pol.label}": ${polError.message}`);
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to migrate plant: ${plant.plantName}`, error.message);
        result.errors.push(`Plant "${plant.plantName}": ${error.message}`);
      }
    }

    // Clear local data after migration
    if (result.errors.length === 0) {
      await guestStorageService.clearAllGuestData();
      console.log('✅ Guest data migration complete — local data cleared');
    } else {
      // Partial success: still clear migrated data, keep errors logged
      await guestStorageService.clearAllGuestData();
      console.log(`⚠️ Guest data migration partial: ${result.errors.length} errors`);
    }

    return result;
  }
}

export const guestMigrationService = new GuestMigrationService();
export default guestMigrationService;
