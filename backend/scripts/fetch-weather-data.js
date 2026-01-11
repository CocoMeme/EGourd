/**
 * Fetch Historical Weather Data Script (Daily)
 * =============================================
 * 
 * Fetches DAILY weather data from Open-Meteo Archive API
 * Uses actual sunshine_duration data instead of estimating from cloud cover.
 * 
 * Also calculates day-of-year averages for FUTURE WEATHER FORECASTING.
 * This allows predicting weather for future dates based on historical patterns.
 * 
 * Location: Philippines (Laguna area - coordinates: 14.376099, 121.0)
 * Date Range: 2020-01-01 to 2025-12-31 (for averaging)
 * 
 * Run: node scripts/fetch-weather-data.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  latitude: 14.376099,
  longitude: 121.0,
  startDate: '2020-01-01',
  endDate: '2025-12-31'  // End at 2025 so we have full years to average
};

/**
 * Fetch data from Open-Meteo Archive API (Daily endpoint)
 */
async function fetchWeatherData() {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${CONFIG.latitude}&longitude=${CONFIG.longitude}&start_date=${CONFIG.startDate}&end_date=${CONFIG.endDate}&daily=temperature_2m_mean,sunshine_duration,relative_humidity_2m_mean,rain_sum&timezone=GMT`;
  
  console.log('🌤️ Fetching weather data from Open-Meteo (Daily API)...');
  console.log(`📍 Location: ${CONFIG.latitude}, ${CONFIG.longitude}`);
  console.log(`📅 Date range: ${CONFIG.startDate} to ${CONFIG.endDate}`);
  
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(json.reason || 'API Error'));
          } else {
            resolve(json);
          }
        } catch (e) {
          reject(new Error('Failed to parse API response'));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Determine season from date (Philippine seasons)
 * Wet season: June to November
 * Dry season: December to May
 */
function getSeason(dateStr) {
  const month = parseInt(dateStr.split('-')[1], 10);
  return (month >= 6 && month <= 11) ? 'wet' : 'dry';
}

/**
 * Get day-of-year key (MM-DD format) for averaging across years
 */
function getDayOfYearKey(dateStr) {
  return dateStr.substring(5); // Returns "MM-DD" from "YYYY-MM-DD"
}

/**
 * Process daily data from API response
 */
function processDailyData(dailyResponse) {
  const { time, temperature_2m_mean, sunshine_duration, relative_humidity_2m_mean, rain_sum } = dailyResponse;
  
  console.log(`📊 Processing ${time.length} daily records...`);
  
  const dailyData = {};
  const dayOfYearData = {}; // For calculating averages
  
  for (let i = 0; i < time.length; i++) {
    const date = time[i];
    const dayKey = getDayOfYearKey(date); // MM-DD
    
    // Convert sunshine_duration from seconds to hours
    const sunlightHours = sunshine_duration[i] !== null 
      ? Math.round((sunshine_duration[i] / 3600) * 10) / 10 
      : 6; // default fallback
    
    const temp = temperature_2m_mean[i] !== null ? temperature_2m_mean[i] : 28;
    const humid = relative_humidity_2m_mean[i] !== null ? relative_humidity_2m_mean[i] : 75;
    const rain = rain_sum[i] !== null ? rain_sum[i] : 0;
    
    dailyData[date] = {
      temperature: Math.round(temp * 10) / 10,
      humidity: Math.round(humid),
      rainfall: Math.round(rain * 10) / 10,
      sunlightHours: sunlightHours,
      season: getSeason(date)
    };
    
    // Accumulate for day-of-year averaging
    if (!dayOfYearData[dayKey]) {
      dayOfYearData[dayKey] = {
        temps: [],
        humidities: [],
        rainfalls: [],
        sunlights: []
      };
    }
    dayOfYearData[dayKey].temps.push(temp);
    dayOfYearData[dayKey].humidities.push(humid);
    dayOfYearData[dayKey].rainfalls.push(rain);
    dayOfYearData[dayKey].sunlights.push(sunlightHours);
  }
  
  return { dailyData, dayOfYearData };
}

/**
 * Calculate day-of-year averages for forecasting
 */
function calculateDayOfYearAverages(dayOfYearData) {
  const averages = {};
  
  for (const [dayKey, data] of Object.entries(dayOfYearData)) {
    const avgTemp = data.temps.reduce((a, b) => a + b, 0) / data.temps.length;
    const avgHumidity = data.humidities.reduce((a, b) => a + b, 0) / data.humidities.length;
    const avgRainfall = data.rainfalls.reduce((a, b) => a + b, 0) / data.rainfalls.length;
    const avgSunlight = data.sunlights.reduce((a, b) => a + b, 0) / data.sunlights.length;
    
    // MM-DD format, extract month for season
    const month = parseInt(dayKey.split('-')[0], 10);
    const season = (month >= 6 && month <= 11) ? 'wet' : 'dry';
    
    averages[dayKey] = {
      temperature: Math.round(avgTemp * 10) / 10,
      humidity: Math.round(avgHumidity),
      rainfall: Math.round(avgRainfall * 10) / 10,
      sunlightHours: Math.round(avgSunlight * 10) / 10,
      season: season,
      yearsAveraged: data.temps.length
    };
  }
  
  return averages;
}

/**
 * Main function
 */
async function main() {
  try {
    const response = await fetchWeatherData();
    
    console.log(`✅ Received ${response.daily.time.length} daily records from API`);
    
    // Process the daily data and get day-of-year groupings
    const { dailyData, dayOfYearData } = processDailyData(response.daily);
    const recordCount = Object.keys(dailyData).length;
    console.log(`📈 Processed ${recordCount} daily records`);
    
    // Calculate day-of-year averages for forecasting
    const forecast = calculateDayOfYearAverages(dayOfYearData);
    console.log(`🔮 Calculated ${Object.keys(forecast).length} day-of-year averages for forecasting`);
    
    // Sample data for verification
    const sampleDate = '2024-01-01';
    if (dailyData[sampleDate]) {
      console.log(`\n📋 Sample historical data for ${sampleDate}:`);
      console.log(JSON.stringify(dailyData[sampleDate], null, 2));
    }
    
    // Sample forecast data
    const sampleDayOfYear = '02-15';
    if (forecast[sampleDayOfYear]) {
      console.log(`\n🔮 Sample forecast for Feb 15 (any year):`);
      console.log(JSON.stringify(forecast[sampleDayOfYear], null, 2));
    }
    
    // Prepare output with metadata
    const output = {
      metadata: {
        latitude: CONFIG.latitude,
        longitude: CONFIG.longitude,
        location: 'Laguna, Philippines',
        startDate: CONFIG.startDate,
        endDate: CONFIG.endDate,
        generatedAt: new Date().toISOString(),
        source: 'Open-Meteo Archive API (Daily)',
        recordCount: recordCount,
        forecastDays: Object.keys(forecast).length,
        units: {
          temperature: '°C',
          humidity: '%',
          rainfall: 'mm',
          sunlightHours: 'hours'
        },
        description: 'Historical data for past dates, forecast averages for future dates'
      },
      data: dailyData,
      forecast: forecast  // Day-of-year averages for predicting future weather
    };
    
    // Save formatted version
    const outputPath = path.join(__dirname, '..', 'data', 'weather-history.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    const fileSize = (fs.statSync(outputPath).size / 1024).toFixed(1);
    console.log(`\n💾 Saved formatted: ${outputPath} (${fileSize} KB)`);
    
    // Save minified version for frontend
    const minOutputPath = path.join(__dirname, '..', 'data', 'weather-history.min.json');
    fs.writeFileSync(minOutputPath, JSON.stringify(output));
    const minFileSize = (fs.statSync(minOutputPath).size / 1024).toFixed(1);
    console.log(`💾 Saved minified: ${minOutputPath} (${minFileSize} KB)`);
    
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
