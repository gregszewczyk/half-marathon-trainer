// src/lib/weather/weatherService.ts
export interface WeatherData {
  temperature: number; // Celsius
  conditions: string; // "sunny", "cloudy", "rainy", "snowy", etc.
  windSpeed: number; // km/h
  humidity: number; // percentage
  description: string; // human readable description
  timestamp: number; // unix timestamp
}

export interface LocationCoords {
  lat: number;
  lon: number;
  name: string;
}

export class WeatherService {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';
  private geoUrl = 'https://api.openweathermap.org/geo/1.0';

  constructor() {
    this.apiKey = process.env['OPENWEATHER_API_KEY'] || '';
    if (!this.apiKey) {
      console.warn('⚠️ OpenWeather API key not found. Weather integration disabled.');
    }
  }

  /**
   * Get coordinates for a location string (e.g., "Manchester, UK")
   */
  async getLocationCoords(locationString: string): Promise<LocationCoords | null> {
    if (!this.apiKey) return null;

    try {
      const response = await fetch(
        `${this.geoUrl}/direct?q=${encodeURIComponent(locationString)}&limit=1&appid=${this.apiKey}`
      );

      if (!response.ok) {
        console.error('Geocoding API error:', response.status);
        return null;
      }

      const data = await response.json();
      if (data.length === 0) {
        console.warn(`Location not found: ${locationString}`);
        return null;
      }

      return {
        lat: data[0].lat,
        lon: data[0].lon,
        name: `${data[0].name}, ${data[0].country}`
      };
    } catch (error) {
      console.error('Error geocoding location:', error);
      return null;
    }
  }

  /**
   * Get historical weather data for a specific date/time and location
   * Note: OpenWeatherMap historical data is available for the last 40 years
   */
  async getHistoricalWeather(
    locationString: string, 
    sessionDate: Date
  ): Promise<WeatherData | null> {
    if (!this.apiKey) {
      console.warn('Weather API key not available');
      return null;
    }

    try {
      // First get coordinates for the location
      const coords = await this.getLocationCoords(locationString);
      if (!coords) {
        console.warn(`Could not geocode location: ${locationString}`);
        return null;
      }

      // Check if date is within the last 5 days (current weather API)
      const now = new Date();
      const daysDiff = (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24);

      let weatherData;

      if (daysDiff <= 5) {
        // Use current weather API for recent dates
        weatherData = await this.getCurrentWeather(coords.lat, coords.lon);
      } else {
        // Use historical weather API for older dates
        const timestamp = Math.floor(sessionDate.getTime() / 1000);
        weatherData = await this.getHistoricalWeatherByTimestamp(coords.lat, coords.lon, timestamp);
      }

      return weatherData;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return null;
    }
  }

  /**
   * Get current weather (for recent sessions)
   */
  private async getCurrentWeather(lat: number, lon: number): Promise<WeatherData | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
      );

      if (!response.ok) {
        console.error('Current weather API error:', response.status);
        return null;
      }

      const data = await response.json();
      return this.parseWeatherResponse(data);
    } catch (error) {
      console.error('Error fetching current weather:', error);
      return null;
    }
  }

  /**
   * Get historical weather by timestamp (requires One Call API)
   * Note: This requires a paid plan for historical data older than 5 days
   */
  private async getHistoricalWeatherByTimestamp(
    lat: number, 
    lon: number, 
    timestamp: number
  ): Promise<WeatherData | null> {
    try {
      // For now, return null for historical data older than 5 days
      // This would require OpenWeatherMap's paid historical data API
      console.warn('Historical weather data older than 5 days requires paid API access');
      return null;
    } catch (error) {
      console.error('Error fetching historical weather:', error);
      return null;
    }
  }

  /**
   * Parse OpenWeatherMap API response into our WeatherData format
   */
  private parseWeatherResponse(data: any): WeatherData {
    const main = data.main || {};
    const weather = data.weather?.[0] || {};
    const wind = data.wind || {};

    return {
      temperature: Math.round(main.temp || 20), // Default to 20°C if missing
      conditions: this.mapWeatherCondition(weather.main),
      windSpeed: Math.round((wind.speed || 0) * 3.6), // Convert m/s to km/h
      humidity: main.humidity || 50,
      description: weather.description || 'Unknown conditions',
      timestamp: data.dt || Math.floor(Date.now() / 1000)
    };
  }

  /**
   * Map OpenWeatherMap weather conditions to our simplified categories
   */
  private mapWeatherCondition(condition: string): string {
    if (!condition) return 'unknown';
    
    const conditionLower = condition.toLowerCase();
    
    if (conditionLower.includes('clear')) return 'sunny';
    if (conditionLower.includes('cloud')) return 'cloudy';
    if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) return 'rainy';
    if (conditionLower.includes('snow')) return 'snowy';
    if (conditionLower.includes('thunder')) return 'stormy';
    if (conditionLower.includes('mist') || conditionLower.includes('fog')) return 'foggy';
    
    return conditionLower;
  }

  /**
   * Analyze weather impact on running performance
   */
  static analyzeWeatherImpact(weather: WeatherData): {
    paceImpact: string;
    rpeImpact: string;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    let paceImpact = 'neutral';
    let rpeImpact = 'neutral';

    // Temperature impact
    if (weather.temperature > 25) {
      paceImpact = 'slower';
      rpeImpact = 'higher';
      recommendations.push('Expect 10-30s/km slower pace in hot conditions');
      recommendations.push('Focus on hydration and effort over pace');
    } else if (weather.temperature < 5) {
      paceImpact = 'faster';
      rpeImpact = 'lower';
      recommendations.push('Cool conditions ideal for faster paces');
      recommendations.push('Warm up thoroughly in cold weather');
    } else if (weather.temperature >= 15 && weather.temperature <= 20) {
      recommendations.push('Ideal temperature conditions for running');
    }

    // Wind impact
    if (weather.windSpeed > 20) {
      paceImpact = paceImpact === 'faster' ? 'neutral' : 'slower';
      recommendations.push('Strong winds - focus on effort over pace');
    }

    // Humidity impact
    if (weather.humidity > 80) {
      rpeImpact = rpeImpact === 'lower' ? 'neutral' : 'higher';
      recommendations.push('High humidity increases perceived effort');
    }

    // Conditions impact
    if (weather.conditions === 'rainy') {
      recommendations.push('Wet conditions - prioritize safety over pace');
    } else if (weather.conditions === 'sunny' && weather.temperature > 20) {
      recommendations.push('Sunny and warm - ensure sun protection');
    }

    return { paceImpact, rpeImpact, recommendations };
  }

  /**
   * Get weather-adjusted RPE expectation
   */
  static getWeatherAdjustedRPE(baseRPE: number, weather: WeatherData): {
    adjustedRPE: number;
    explanation: string;
  } {
    let adjustment = 0;
    const factors: string[] = [];

    // Temperature adjustments
    if (weather.temperature > 25) {
      adjustment += 1;
      factors.push(`hot conditions (+1 RPE)`);
    } else if (weather.temperature < 5) {
      adjustment -= 0.5;
      factors.push(`cold conditions (-0.5 RPE)`);
    }

    // Humidity adjustments
    if (weather.humidity > 80) {
      adjustment += 0.5;
      factors.push(`high humidity (+0.5 RPE)`);
    }

    // Wind adjustments
    if (weather.windSpeed > 20) {
      adjustment += 0.5;
      factors.push(`strong winds (+0.5 RPE)`);
    }

    const adjustedRPE = Math.max(1, Math.min(10, baseRPE - adjustment));
    const explanation = factors.length > 0 
      ? `Weather-adjusted from RPE ${baseRPE} to ${adjustedRPE.toFixed(1)} (${factors.join(', ')})`
      : `No weather adjustment needed (RPE ${baseRPE})`;

    return { adjustedRPE, explanation };
  }
}