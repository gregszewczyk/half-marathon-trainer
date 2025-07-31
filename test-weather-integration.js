// Test script for weather integration
// Run with: node test-weather-integration.js

require('dotenv').config({ path: '.env.local' });
const { WeatherService } = require('./src/lib/weather/weatherService.ts');

async function testWeatherIntegration() {
  console.log('🌤️ Testing Weather Integration...');
  
  const weatherService = new WeatherService();
  
  // Test location geocoding
  console.log('\n1. Testing location geocoding...');
  const coords = await weatherService.getLocationCoords('Manchester, UK');
  console.log('Manchester coordinates:', coords);
  
  // Test recent weather (last few days)
  console.log('\n2. Testing recent weather data...');
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 2); // 2 days ago
  
  const recentWeather = await weatherService.getHistoricalWeather('Manchester, UK', recentDate);
  console.log('Recent weather:', recentWeather);
  
  // Test weather impact analysis
  if (recentWeather) {
    console.log('\n3. Testing weather impact analysis...');
    const impact = WeatherService.analyzeWeatherImpact(recentWeather);
    console.log('Weather impact:', impact);
    
    console.log('\n4. Testing weather-adjusted RPE...');
    const adjustedRPE = WeatherService.getWeatherAdjustedRPE(7, recentWeather);
    console.log('Weather-adjusted RPE:', adjustedRPE);
  }
  
  console.log('\n✅ Weather integration test completed!');
}

testWeatherIntegration().catch(console.error);