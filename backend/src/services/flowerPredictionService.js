/**
 * Flower Production Prediction Service
 *
 * This service provides rule-based predictions for male and female flower production
 * in cucurbit plants (gourds, melons, squashes) based on environmental factors,
 * plant care, and growth metrics.
 *
 * The predictions are based on:
 * - Horticultural research on cucurbit flowering patterns
 * - Environmental stress factors affecting flower sex ratio
 * - Plant health and nutrition impact on flowering
 */

class FlowerPredictionService {
  /**
   * Base flower production data for each plant type
   * Based on typical production under optimal conditions
   */
  static baseFlowerData = {
    ampalaya_bilog: {
      // Bitter gourd (round variety) - monoecious, produces both male and female
      maleFlowers: { min: 15, max: 30, optimal: 22 },
      femaleFlowers: { min: 8, max: 15, optimal: 11 },
      optimalAge: { min: 40, max: 60 }, // Days from planting
      maleToFemaleRatio: 2.0, // Typically 2:1 male to female
    },
    upo_smooth: {
      // Bottle gourd (smooth variety) - monoecious
      maleFlowers: { min: 20, max: 40, optimal: 30 },
      femaleFlowers: { min: 10, max: 20, optimal: 15 },
      optimalAge: { min: 50, max: 70 },
      maleToFemaleRatio: 2.0,
    },
    patola: {
      // Sponge gourd - monoecious
      maleFlowers: { min: 12, max: 25, optimal: 18 },
      femaleFlowers: { min: 6, max: 12, optimal: 9 },
      optimalAge: { min: 45, max: 65 },
      maleToFemaleRatio: 2.0,
    },
    cucumber: {
      // Cucumber - monoecious
      maleFlowers: { min: 18, max: 35, optimal: 25 },
      femaleFlowers: { min: 10, max: 18, optimal: 14 },
      optimalAge: { min: 35, max: 55 },
      maleToFemaleRatio: 1.8, // Slightly lower male to female ratio
    },
  };

  /**
   * Calculate flower production prediction
   * @param {Object} inputData - All input factors for prediction
   * @returns {Object} Prediction results with confidence and recommendations
   */
  static predictFlowerProduction(inputData) {
    const { plantType, plantAge, environmental, care, growth } = inputData;

    // Get base data for plant type
    const baseData = this.baseFlowerData[plantType];
    if (!baseData) {
      throw new Error(`Unknown plant type: ${plantType}`);
    }

    // Calculate adjustment factors
    const ageAdjustment = this.calculateAgeAdjustment(plantAge, baseData.optimalAge);
    const environmentalAdjustment = this.calculateEnvironmentalAdjustment(environmental, plantType);
    const careAdjustment = this.calculateCareAdjustment(care);
    const healthAdjustment = this.calculateHealthAdjustment(growth.healthRating);

    // Combined adjustment factor (0.4 to 1.5 range)
    const totalAdjustment =
      ageAdjustment.factor * 0.25 +
      environmentalAdjustment.factor * 0.35 +
      careAdjustment.factor * 0.25 +
      healthAdjustment.factor * 0.15;

    // Apply stress-based sex ratio modification
    // Environmental stress tends to increase male flowers
    const sexRatioModifier = this.calculateSexRatioModifier(environmental, care);

    // Calculate predicted flower counts
    const maleFlowers = this.calculateFlowerRange(
      baseData.maleFlowers,
      totalAdjustment * sexRatioModifier.maleMultiplier
    );

    const femaleFlowers = this.calculateFlowerRange(
      baseData.femaleFlowers,
      totalAdjustment * sexRatioModifier.femaleMultiplier
    );

    // Calculate confidence based on how many factors are optimal
    const confidence = this.calculateConfidence([
      ageAdjustment,
      environmentalAdjustment,
      careAdjustment,
      healthAdjustment,
    ]);

    // Gather influencing factors
    const influencingFactors = [
      ...ageAdjustment.factors,
      ...environmentalAdjustment.factors,
      ...careAdjustment.factors,
      ...healthAdjustment.factors,
      ...sexRatioModifier.factors,
    ];

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      ageAdjustment,
      environmentalAdjustment,
      careAdjustment,
      healthAdjustment,
      plantType
    );

    return {
      maleFlowers,
      femaleFlowers,
      confidence: Math.round(confidence),
      influencingFactors,
      recommendations,
    };
  }

  /**
   * Calculate age-based adjustment factor
   */
  static calculateAgeAdjustment(plantAge, optimalAge) {
    const factors = [];
    let factor = 1.0;

    if (plantAge < optimalAge.min) {
      // Too young - significantly reduced flowering
      const daysUnder = optimalAge.min - plantAge;
      factor = Math.max(0.3, 1 - (daysUnder / optimalAge.min) * 0.7);
      factors.push({
        factor: 'Plant Age',
        impact: 'negative',
        description: `Plant is ${daysUnder} days younger than optimal flowering age`,
      });
    } else if (plantAge >= optimalAge.min && plantAge <= optimalAge.max) {
      // Optimal age - full production
      factor = 1.0;
      factors.push({
        factor: 'Plant Age',
        impact: 'positive',
        description: 'Plant is at optimal age for flowering',
      });
    } else {
      // Older plant - slightly reduced but still producing
      const daysOver = plantAge - optimalAge.max;
      factor = Math.max(0.7, 1 - (daysOver / 30) * 0.3); // Gradual decline
      if (daysOver > 30) {
        factors.push({
          factor: 'Plant Age',
          impact: 'negative',
          description: 'Plant is past optimal flowering age, production may decline',
        });
      } else {
        factors.push({
          factor: 'Plant Age',
          impact: 'positive',
          description: 'Plant is mature and still producing well',
        });
      }
    }

    return { factor, factors };
  }

  /**
   * Calculate environmental factors adjustment
   */
  static calculateEnvironmentalAdjustment(environmental, _plantType) {
    const factors = [];
    let factor = 1.0;

    // Temperature impact (optimal range: 25-30°C for most cucurbits)
    const temp = environmental.temperature;
    if (temp < 20 || temp > 35) {
      factor *= 0.7;
      factors.push({
        factor: 'Temperature',
        impact: 'negative',
        description: `Temperature (${temp}°C) is outside optimal range (25-30°C)`,
      });
    } else if (temp >= 25 && temp <= 30) {
      factor *= 1.1;
      factors.push({
        factor: 'Temperature',
        impact: 'positive',
        description: 'Temperature is in optimal range for flowering',
      });
    }

    // Humidity impact (optimal: 60-80%)
    const humidity = environmental.humidity;
    if (humidity < 50 || humidity > 90) {
      factor *= 0.8;
      factors.push({
        factor: 'Humidity',
        impact: 'negative',
        description: `Humidity (${humidity}%) is outside optimal range (60-80%)`,
      });
    } else if (humidity >= 60 && humidity <= 80) {
      factor *= 1.05;
      factors.push({
        factor: 'Humidity',
        impact: 'positive',
        description: 'Humidity level is optimal for flowering',
      });
    }

    // Sunlight impact (optimal: 6-8 hours for most)
    const sunlight = environmental.sunlightHours;
    if (sunlight < 4) {
      factor *= 0.6;
      factors.push({
        factor: 'Sunlight',
        impact: 'negative',
        description: `Low sunlight (${sunlight}hrs) significantly reduces flowering`,
      });
    } else if (sunlight >= 6 && sunlight <= 8) {
      factor *= 1.1;
      factors.push({
        factor: 'Sunlight',
        impact: 'positive',
        description: 'Sunlight exposure is optimal',
      });
    } else if (sunlight > 10) {
      factor *= 0.9;
      factors.push({
        factor: 'Sunlight',
        impact: 'neutral',
        description: 'Very high sunlight may stress plant during hot periods',
      });
    }

    // Soil pH impact (optimal: 6.0-6.8)
    if (environmental.soilPH) {
      const pH = environmental.soilPH;
      if (pH < 5.5 || pH > 7.5) {
        factor *= 0.75;
        factors.push({
          factor: 'Soil pH',
          impact: 'negative',
          description: `Soil pH (${pH}) is outside optimal range (6.0-6.8)`,
        });
      } else if (pH >= 6.0 && pH <= 6.8) {
        factor *= 1.05;
        factors.push({
          factor: 'Soil pH',
          impact: 'positive',
          description: 'Soil pH is in optimal range',
        });
      }
    }

    return { factor, factors };
  }

  /**
   * Calculate plant care adjustment factor
   */
  static calculateCareAdjustment(care) {
    const factors = [];
    let factor = 1.0;

    // Watering frequency (optimal: 3-5 times per week depending on weather)
    const watering = care.wateringFrequency;
    if (watering < 2) {
      factor *= 0.6;
      factors.push({
        factor: 'Watering',
        impact: 'negative',
        description: 'Insufficient watering reduces flowering significantly',
      });
    } else if (watering >= 3 && watering <= 5) {
      factor *= 1.1;
      factors.push({
        factor: 'Watering',
        impact: 'positive',
        description: 'Watering frequency is optimal',
      });
    } else if (watering > 7) {
      factor *= 0.85;
      factors.push({
        factor: 'Watering',
        impact: 'negative',
        description: 'Overwatering may stress plant and reduce flowering',
      });
    }

    // Fertilizer impact
    if (care.fertilizerType === 'none') {
      factor *= 0.7;
      factors.push({
        factor: 'Fertilization',
        impact: 'negative',
        description: 'No fertilizer use limits nutrient availability for flowering',
      });
    } else if (care.fertilizerType === 'organic' || care.fertilizerType === 'mixed') {
      factor *= 1.15;
      factors.push({
        factor: 'Fertilization',
        impact: 'positive',
        description: 'Good fertilization promotes healthy flowering',
      });
    } else if (care.fertilizerType === 'chemical') {
      factor *= 1.05;
      factors.push({
        factor: 'Fertilization',
        impact: 'positive',
        description: 'Chemical fertilizer provides nutrients for flowering',
      });
    }

    // Pest control
    if (care.pestControl === 'none') {
      factor *= 0.85;
      factors.push({
        factor: 'Pest Control',
        impact: 'negative',
        description: 'Lack of pest control may affect plant health and flowering',
      });
    } else if (care.pestControl === 'regular') {
      factor *= 1.05;
      factors.push({
        factor: 'Pest Control',
        impact: 'positive',
        description: 'Regular pest control maintains plant health',
      });
    }

    return { factor, factors };
  }

  /**
   * Calculate health-based adjustment
   */
  static calculateHealthAdjustment(healthRating) {
    const factors = [];

    // Health rating: 1-5 scale
    const healthMultipliers = {
      1: { factor: 0.4, desc: 'Poor plant health severely limits flowering' },
      2: { factor: 0.65, desc: 'Below average health reduces flowering capacity' },
      3: { factor: 0.9, desc: 'Average plant health supports moderate flowering' },
      4: { factor: 1.1, desc: 'Good plant health promotes strong flowering' },
      5: { factor: 1.2, desc: 'Excellent plant health maximizes flowering potential' },
    };

    const healthData = healthMultipliers[healthRating] || healthMultipliers[3];

    factors.push({
      factor: 'Plant Health',
      impact: healthRating >= 4 ? 'positive' : healthRating === 3 ? 'neutral' : 'negative',
      description: healthData.desc,
    });

    return { factor: healthData.factor, factors };
  }

  /**
   * Calculate sex ratio modifier based on stress factors
   * Environmental stress typically increases male flower production relative to female
   */
  static calculateSexRatioModifier(environmental, care) {
    const factors = [];
    let stressLevel = 0; // 0 = no stress, 1 = high stress

    // Temperature stress
    if (environmental.temperature < 20 || environmental.temperature > 32) {
      stressLevel += 0.3;
    }

    // Water stress
    if (care.wateringFrequency < 3) {
      stressLevel += 0.3;
    } else if (care.wateringFrequency > 7) {
      stressLevel += 0.2;
    }

    // Nutrient stress
    if (care.fertilizerType === 'none') {
      stressLevel += 0.2;
    }

    stressLevel = Math.min(1.0, stressLevel); // Cap at 1.0

    // Higher stress = more male flowers, fewer female flowers
    const maleMultiplier = 1.0 + stressLevel * 0.3; // Up to 30% more males
    const femaleMultiplier = 1.0 - stressLevel * 0.25; // Up to 25% fewer females

    if (stressLevel > 0.5) {
      factors.push({
        factor: 'Environmental Stress',
        impact: 'neutral',
        description: 'Stress conditions favor male flower production over female flowers',
      });
    } else if (stressLevel < 0.2) {
      factors.push({
        factor: 'Growing Conditions',
        impact: 'positive',
        description: 'Optimal conditions support balanced flower production',
      });
    }

    return { maleMultiplier, femaleMultiplier, factors };
  }

  /**
   * Calculate flower count range based on base data and adjustment factor
   */
  static calculateFlowerRange(baseRange, adjustmentFactor) {
    // Apply adjustment factor with some randomness
    const min = Math.max(1, Math.round(baseRange.min * adjustmentFactor * 0.85));
    const max = Math.round(baseRange.max * adjustmentFactor * 1.15);
    const average = Math.round((min + max) / 2);

    return { min, max, average };
  }

  /**
   * Calculate confidence score (0-100) based on how optimal conditions are
   */
  static calculateConfidence(adjustments) {
    let totalScore = 0;
    let count = 0;

    adjustments.forEach((adj) => {
      // Convert factor to confidence contribution (0.4-1.5 -> 40-100)
      const normalizedScore = Math.min(100, Math.max(40, adj.factor * 70));
      totalScore += normalizedScore;
      count++;
    });

    return totalScore / count;
  }

  /**
   * Generate recommendations based on identified issues
   */
  static generateRecommendations(ageAdj, envAdj, careAdj, healthAdj, plantType) {
    const recommendations = [];

    // Check each adjustment factor for issues
    if (ageAdj.factor < 0.8) {
      recommendations.push({
        category: 'general',
        suggestion:
          'Wait for plant to reach optimal flowering age before expecting full production',
        priority: 'medium',
      });
    }

    // Environmental recommendations
    envAdj.factors.forEach((factor) => {
      if (factor.impact === 'negative') {
        if (factor.factor === 'Temperature') {
          recommendations.push({
            category: 'temperature',
            suggestion:
              'Consider shade cloth during hot periods or row covers during cool weather to maintain optimal temperature',
            priority: 'high',
          });
        } else if (factor.factor === 'Humidity') {
          recommendations.push({
            category: 'general',
            suggestion: 'Adjust watering schedule and mulching to manage humidity levels',
            priority: 'medium',
          });
        } else if (factor.factor === 'Sunlight') {
          recommendations.push({
            category: 'sunlight',
            suggestion:
              'Relocate plant to area with 6-8 hours of sunlight daily, or prune competing vegetation',
            priority: 'high',
          });
        } else if (factor.factor === 'Soil pH') {
          recommendations.push({
            category: 'soil',
            suggestion: 'Amend soil pH to 6.0-6.8 range using lime (to raise) or sulfur (to lower)',
            priority: 'high',
          });
        }
      }
    });

    // Care recommendations
    careAdj.factors.forEach((factor) => {
      if (factor.impact === 'negative') {
        if (factor.factor === 'Watering') {
          recommendations.push({
            category: 'watering',
            suggestion:
              'Adjust to water 3-5 times per week, ensuring soil stays consistently moist but not waterlogged',
            priority: 'high',
          });
        } else if (factor.factor === 'Fertilization') {
          recommendations.push({
            category: 'fertilizer',
            suggestion:
              'Apply balanced fertilizer (NPK 10-10-10) or compost monthly to support flowering',
            priority: 'high',
          });
        } else if (factor.factor === 'Pest Control') {
          recommendations.push({
            category: 'pest-control',
            suggestion:
              'Implement regular pest monitoring and organic control methods to protect plant health',
            priority: 'medium',
          });
        }
      }
    });

    // Health recommendations
    if (healthAdj.factor < 0.8) {
      recommendations.push({
        category: 'general',
        suggestion:
          'Focus on improving overall plant health through proper nutrition, watering, and pest management',
        priority: 'high',
      });
    }

    // General flowering tips
    recommendations.push({
      category: 'general',
      suggestion: `For ${plantType}, ensure consistent moisture during flowering period to maximize both male and female flower production`,
      priority: 'medium',
    });

    return recommendations;
  }
}

module.exports = FlowerPredictionService;
