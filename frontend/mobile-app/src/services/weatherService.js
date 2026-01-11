/**
 * Weather Service
 * ================
 * 
 * Provides weather data for pollination management predictions.
 * 
 * Features:
 * - Past dates: Use actual historical weather data (2020-2025)
 * - Future dates: Use day-of-year averages from 6 years of data for FORECASTING
 * - Auto-calculate season from date
 * 
 * This allows accurate predictions of future weather conditions based on
 * historical patterns for the same day of the year.
 */

import weatherData from '../../assets/weather-history.json';

// Default values for Philippines (fallback only)
const DEFAULT_WEATHER = {
  temperature: 28,
  humidity: 70,
  rainfall: 5,
  sunlightHours: 6,
  season: 'wet'
};

// Default soil type (based on interviews - always silty in Philippines)
export const DEFAULT_SOIL_TYPE = 'silty';

/**
 * Get season from date
 * Philippine seasons:
 * - Wet season: June to November
 * - Dry season: December to May
 * 
 * @param {Date|string} date - Date to check
 * @returns {string} 'wet' or 'dry'
 */
export function getSeasonFromDate(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const month = d.getMonth() + 1; // getMonth() is 0-indexed
  return (month >= 6 && month <= 11) ? 'wet' : 'dry';
}

/**
 * Format date to YYYY-MM-DD string
 * 
 * @param {Date} date - Date object
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function formatDateKey(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get day-of-year key (MM-DD) for forecast lookup
 * 
 * @param {Date|string} date - Date to get key for
 * @returns {string} Day-of-year key in MM-DD format
 */
export function getDayOfYearKey(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

/**
 * Get weather data for a specific date
 * 
 * For PAST dates: Returns actual historical weather data
 * For FUTURE dates: Returns FORECAST based on 6-year averages for that day-of-year
 * 
 * @param {Date|string} date - Date to get weather for
 * @returns {Object} Weather data { temperature, humidity, rainfall, sunlightHours, season, source }
 */
export function getWeatherForDate(date) {
  const dateKey = formatDateKey(date);
  const dayOfYearKey = getDayOfYearKey(date);
  
  // First, try to get actual historical data for this exact date
  if (weatherData?.data?.[dateKey]) {
    return {
      ...weatherData.data[dateKey],
      date: dateKey,
      source: 'historical'
    };
  }
  
  // For future dates or missing data, use day-of-year forecast averages
  // This gives the average weather for this day based on 6 years of history
  if (weatherData?.forecast?.[dayOfYearKey]) {
    const forecast = weatherData.forecast[dayOfYearKey];
    return {
      temperature: forecast.temperature,
      humidity: forecast.humidity,
      rainfall: forecast.rainfall,
      sunlightHours: forecast.sunlightHours,
      season: forecast.season,
      date: dateKey,
      source: 'forecast',
      yearsAveraged: forecast.yearsAveraged
    };
  }
  
  // Fallback to seasonal defaults (should rarely happen)
  const season = getSeasonFromDate(date);
  const seasonalDefaults = {
    wet: {
      temperature: 27,
      humidity: 80,
      rainfall: 15,
      sunlightHours: 5
    },
    dry: {
      temperature: 29,
      humidity: 65,
      rainfall: 2,
      sunlightHours: 8
    }
  };
  
  return {
    ...seasonalDefaults[season],
    season,
    date: dateKey,
    source: 'seasonal-estimate'
  };
}

/**
 * Get FORECAST weather for a future date
 * Uses historical day-of-year averages
 * 
 * @param {Date|string} date - Future date to forecast
 * @returns {Object} Forecasted weather data
 */
export function getForecastForDate(date) {
  const dateKey = formatDateKey(date);
  const dayOfYearKey = getDayOfYearKey(date);
  
  if (weatherData?.forecast?.[dayOfYearKey]) {
    return {
      ...weatherData.forecast[dayOfYearKey],
      date: dateKey,
      source: 'forecast'
    };
  }
  
  // Fallback
  return getWeatherForDate(date);
}

/**
 * Get weather data for a date range (for charts/analysis)
 * 
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {Array} Array of weather data objects
 */
export function getWeatherForRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const results = [];
  
  const current = new Date(start);
  while (current <= end) {
    results.push(getWeatherForDate(current));
    current.setDate(current.getDate() + 1);
  }
  
  return results;
}

/**
 * Get available date range in the weather dataset
 * 
 * @returns {Object} { start, end } date strings
 */
export function getAvailableDateRange() {
  return weatherData?.metadata?.dateRange || {
    start: '2020-01-01',
    end: '2026-01-01'
  };
}

/**
 * Check if a date has historical data available
 * 
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if historical data exists
 */
export function hasHistoricalData(date) {
  const dateKey = formatDateKey(date);
  return !!weatherData?.data?.[dateKey];
}

/**
 * Check if a date is in the future (needs forecast)
 * 
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is in the future
 */
export function isFutureDate(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d > today;
}

// Weather service singleton
const weatherService = {
  getWeatherForDate,
  getForecastForDate,
  getWeatherForRange,
  getSeasonFromDate,
  getDayOfYearKey,
  getAvailableDateRange,
  hasHistoricalData,
  isFutureDate,
  formatDateKey,
  DEFAULT_SOIL_TYPE,
  DEFAULT_WEATHER
};

export default weatherService;
