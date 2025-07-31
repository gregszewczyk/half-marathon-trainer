# Weather API Integration Plan

## Current State ✅
- **Location field exists** in onboarding form
- **Database stores location** in user profile
- **AI already references weather** (Manchester October conditions, heat adjustments)

## Implementation Complexity: **EASY-MEDIUM** 🟢

### Option 1: OpenWeatherMap API (Recommended)
**Pros:**
- Free tier: 1000 calls/day (plenty for your use case)
- Historical weather data available
- Simple REST API
- Reliable and fast

**API Example:**
```javascript
// Get weather for session date/time
const weather = await fetch(`https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${sessionTimestamp}&appid=${API_KEY}`);
```

**Cost:** FREE (up to 1000 calls/day)

### Option 2: WeatherAPI.com
**Pros:**
- Free tier: 1M calls/month
- Historical weather back to 2015
- Very detailed data

**Cost:** FREE (generous limits)

## Implementation Steps

### 1. Add Weather Service (1-2 hours)
```typescript
// src/lib/weather/weatherService.ts
export class WeatherService {
  async getHistoricalWeather(location: string, date: Date): Promise<WeatherData> {
    // Get lat/lon from location string
    // Fetch historical weather for that date/time
    // Return temperature, humidity, wind, conditions
  }
}
```

### 2. Update Session Feedback Collection (30 minutes)
When user submits feedback, automatically fetch weather data for that session's scheduled time:

```typescript
// src/app/api/feedback/route.ts
const weather = await weatherService.getHistoricalWeather(
  userLocation, 
  session.scheduledDate
);

await prisma.sessionFeedback.create({
  data: {
    // ... existing feedback
    weatherTemp: weather.temperature,
    weatherConditions: weather.conditions,
    weatherWind: weather.windSpeed,
    weatherHumidity: weather.humidity
  }
});
```

### 3. Update Database Schema (15 minutes)
Add weather fields to SessionFeedback table:
```prisma
model SessionFeedback {
  // ... existing fields
  weatherTemp     Float?
  weatherConditions String?  // "sunny", "rainy", "cloudy"
  weatherWind     Float?     // wind speed km/h
  weatherHumidity Float?     // humidity %
}
```

### 4. Enhance AI Logic (1 hour)
Update AI prompts to include weather context:

```typescript
const weatherContext = feedback.weatherTemp ? 
  `Weather: ${feedback.weatherTemp}°C, ${feedback.weatherConditions}, wind ${feedback.weatherWind}km/h` : 
  'Weather: Unknown';

const prompt = `
SESSION ANALYSIS WITH WEATHER CONTEXT:
${weatherContext}

WEATHER IMPACT GUIDELINES:
- Hot (>25°C): Expect 10-30s/km slower, higher RPE normal
- Cold (<5°C): Expect faster paces, lower RPE normal  
- Windy (>20km/h): Expect 5-15s/km slower
- Rainy: Expect cautious pacing, higher difficulty perception
- Humid (>80%): Expect higher RPE at same pace

Session Performance:
- Actual pace: ${feedback.actualPace}
- RPE: ${feedback.rpe} (adjusted for weather: ${getWeatherAdjustedRPE(feedback)})
`;
```

## Benefits for AI Intelligence

### 1. **Accurate Performance Assessment**
- **Hot day + slower pace** = Don't penalize performance
- **Perfect conditions + slow pace** = Investigate training issues
- **Cold day + fast pace** = Account for temperature boost

### 2. **Smarter Adaptations**
- **Heatwave predicted** = Reduce intensity proactively
- **Perfect weather** = Schedule harder sessions
- **Rainy week** = Suggest indoor alternatives

### 3. **Better Predictions**
- **Race day weather forecast** = Adjust predicted times
- **Historical patterns** = "You run 15s/km faster in 15°C vs 25°C"

## Example AI Improvements

**Before Weather:**
> "RPE 7 for easy run suggests overexertion - reduce intensity"

**After Weather:**
> "RPE 7 for easy run on 28°C hot day is expected - maintain current intensity, ensure hydration"

**Before Weather:**
> "5:20 pace for tempo session is slower than target 5:13"

**After Weather:**
> "5:20 pace for tempo in 30°C heat equals ~5:10 in ideal conditions - excellent performance!"

## Implementation Timeline
- **Day 1**: Set up weather API account & basic service (2 hours)
- **Day 2**: Update database schema & feedback collection (1 hour)  
- **Day 3**: Enhance AI prompts with weather context (1 hour)
- **Day 4**: Test and refine weather-aware logic (1 hour)

**Total: ~5 hours of development**

## Monthly Cost
- **OpenWeatherMap**: £0 (free tier sufficient)
- **WeatherAPI**: £0 (free tier sufficient)

This would be a **game-changing improvement** to AI accuracy for minimal cost and effort!