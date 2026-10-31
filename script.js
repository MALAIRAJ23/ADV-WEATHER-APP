// ===================================
// WEATHERNOW - MODERN WEATHER APP
// Using Open-Meteo API (Free, No API Key Required)
// ===================================

class WeatherApp {
  constructor() {
    // API Configuration - Open-Meteo (Free API)
    this.weatherApiUrl = 'https://api.open-meteo.com/v1/forecast';
    this.geocodingApiUrl = 'https://geocoding-api.open-meteo.com/v1/search';
    this.airQualityApiUrl = 'https://air-quality-api.open-meteo.com/v1/air-quality';

    // App State
    this.currentLocation = null;
    this.currentCoords = null;
    this.favorites = this.loadFavorites();
    this.theme = localStorage.getItem('theme') || 'light';
    this.units = 'metric';

    // DOM Elements
    this.elements = {
      // Header
      themeToggle: document.getElementById('themeToggle'),
      refreshBtn: document.getElementById('refreshBtn'),

      // Search
      cityInput: document.getElementById('cityInput'),
      searchBtn: document.getElementById('searchBtn'),
      locationBtn: document.getElementById('locationBtn'),

      // Current Weather
      cityName: document.getElementById('cityName'),
      dateTime: document.getElementById('dateTime'),
      favoriteBtn: document.getElementById('favoriteBtn'),
      mainWeatherIcon: document.getElementById('mainWeatherIcon'),
      currentTemp: document.getElementById('currentTemp'),
      weatherCondition: document.getElementById('weatherCondition'),
      feelsLike: document.getElementById('feelsLike'),
      windSpeed: document.getElementById('windSpeed'),
      humidity: document.getElementById('humidity'),
      pressure: document.getElementById('pressure'),
      visibility: document.getElementById('visibility'),

      // Forecasts
      hourlyForecast: document.getElementById('hourlyForecast'),
      dailyForecast: document.getElementById('dailyForecast'),

      // Additional Info
      sunrise: document.getElementById('sunrise'),
      sunset: document.getElementById('sunset'),
      uvValue: document.getElementById('uvValue'),
      uvIndicator: document.getElementById('uvIndicator'),
      uvDescription: document.getElementById('uvDescription'),
      aqiValue: document.getElementById('aqiValue'),
      aqiDescription: document.getElementById('aqiDescription'),
      pm25: document.getElementById('pm25'),
      pm10: document.getElementById('pm10'),
      rainChance: document.getElementById('rainChance'),
      rainAmount: document.getElementById('rainAmount'),

      // Favorites
      favoritesGrid: document.getElementById('favoritesGrid'),

      // UI
      loadingOverlay: document.getElementById('loadingOverlay'),
      toast: document.getElementById('toast'),
      toastMessage: document.getElementById('toastMessage')
    };

    this.init();
  }

  // Initialize App
  init() {
    this.applyTheme();
    this.setupEventListeners();
    this.renderFavorites();
    this.getUserLocation();
  }

  // Setup Event Listeners
  setupEventListeners() {
    // Theme Toggle
    this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

    // Refresh
    this.elements.refreshBtn.addEventListener('click', () => this.refreshWeather());

    // Search
    this.elements.searchBtn.addEventListener('click', () => this.searchWeather());
    this.elements.cityInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.searchWeather();
    });

    // Location
    this.elements.locationBtn.addEventListener('click', () => this.getUserLocation());

    // Favorite
    this.elements.favoriteBtn.addEventListener('click', () => this.toggleFavorite());
  }

  // Get User Location
  getUserLocation() {
    if (!navigator.geolocation) {
      this.showToast('Geolocation is not supported', 'error');
      this.fetchWeatherByCity('London'); // Fallback
      return;
    }

    this.showLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.currentCoords = { lat: latitude, lon: longitude };
        this.fetchWeatherByCoords(latitude, longitude);
      },
      (error) => {
        this.showLoading(false);
        this.showToast('Unable to get your location', 'error');
        // Fallback to default city
        this.fetchWeatherByCity('London');
      }
    );
  }

  // Search Weather
  async searchWeather() {
    const city = this.elements.cityInput.value.trim();
    if (!city) {
      this.showToast('Please enter a city name', 'error');
      return;
    }

    await this.fetchWeatherByCity(city);
    this.elements.cityInput.value = '';
  }

  // Refresh Weather
  refreshWeather() {
    if (!this.currentCoords) {
      this.getUserLocation();
      return;
    }

    this.elements.refreshBtn.classList.add('spinning');
    this.fetchWeatherByCoords(this.currentCoords.lat, this.currentCoords.lon);

    setTimeout(() => {
      this.elements.refreshBtn.classList.remove('spinning');
    }, 1000);
  }

  // Fetch Weather by City Name
  async fetchWeatherByCity(city) {
    this.showLoading(true);

    try {
      // First, geocode the city name to get coordinates
      const geoUrl = `${this.geocodingApiUrl}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
      const geoResponse = await fetch(geoUrl);

      if (!geoResponse.ok) throw new Error('City not found');

      const geoData = await geoResponse.json();

      if (!geoData.results || geoData.results.length === 0) {
        throw new Error('City not found');
      }

      const location = geoData.results[0];
      this.currentCoords = { lat: location.latitude, lon: location.longitude };
      this.currentLocation = `${location.name}${location.admin1 ? ', ' + location.admin1 : ''}${location.country ? ', ' + location.country : ''}`;

      // Now fetch weather data
      await this.fetchWeatherByCoords(location.latitude, location.longitude);

    } catch (error) {
      this.showLoading(false);
      this.showToast('City not found. Please try again.', 'error');
      console.error('Error:', error);
    }
  }

  // Fetch Weather by Coordinates
  async fetchWeatherByCoords(lat, lon) {
    this.showLoading(true);

    try {
      // Build weather API URL with all required parameters
      const weatherParams = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m',
        hourly: 'temperature_2m,weather_code,precipitation_probability,precipitation',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max',
        timezone: 'auto',
        forecast_days: 7
      });

      const weatherUrl = `${this.weatherApiUrl}?${weatherParams}`;
      const weatherResponse = await fetch(weatherUrl);

      if (!weatherResponse.ok) throw new Error('Unable to fetch weather');

      const weatherData = await weatherResponse.json();

      // Fetch air quality data
      const airQualityParams = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: 'pm10,pm2_5,european_aqi',
        timezone: 'auto'
      });

      const airQualityUrl = `${this.airQualityApiUrl}?${airQualityParams}`;
      let airQualityData = null;

      try {
        const airResponse = await fetch(airQualityUrl);
        if (airResponse.ok) {
          airQualityData = await airResponse.json();
        }
      } catch (e) {
        console.log('Air quality data not available');
      }

      // If we don't have a location name yet (from geolocation), reverse geocode
      if (!this.currentLocation) {
        await this.reverseGeocode(lat, lon);
      }

      this.updateUI(weatherData, airQualityData);
      this.showLoading(false);
      this.showToast('Weather updated successfully', 'success');

    } catch (error) {
      this.showLoading(false);
      this.showToast('Failed to fetch weather data', 'error');
      console.error('Error:', error);
    }
  }

  // Reverse Geocode (get city name from coordinates)
  async reverseGeocode(lat, lon) {
    try {
      // Use a simple reverse geocoding approach
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        const address = data.address;
        const city = address.city || address.town || address.village || address.county || 'Unknown Location';
        const country = address.country || '';
        this.currentLocation = `${city}${country ? ', ' + country : ''}`;
      } else {
        this.currentLocation = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
      }
    } catch (error) {
      this.currentLocation = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    }
  }

  // Update UI with Weather Data
  updateUI(data, airQualityData) {
    const current = data.current;
    const daily = data.daily;
    const hourly = data.hourly;

    // Location & Time
    this.elements.cityName.textContent = this.currentLocation || 'Unknown Location';
    this.elements.dateTime.textContent = this.formatDateTime(new Date());

    // Current Weather
    const weatherCode = current.weather_code;
    this.elements.mainWeatherIcon.innerHTML = this.getWeatherIcon(weatherCode, this.isDay(daily.sunrise[0], daily.sunset[0]));
    this.elements.currentTemp.textContent = Math.round(current.temperature_2m);
    this.elements.weatherCondition.textContent = this.getWeatherDescription(weatherCode);
    this.elements.feelsLike.textContent = `Feels like ${Math.round(current.apparent_temperature)}°C`;

    // Stats
    this.elements.windSpeed.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    this.elements.humidity.textContent = `${Math.round(current.relative_humidity_2m)}%`;
    this.elements.pressure.textContent = `${Math.round(current.surface_pressure)} hPa`;

    // Visibility (Open-Meteo doesn't provide this, so we'll estimate based on weather)
    const visibility = this.estimateVisibility(weatherCode);
    this.elements.visibility.textContent = `${visibility} km`;

    // Sun Times
    this.elements.sunrise.textContent = this.formatTime(daily.sunrise[0]);
    this.elements.sunset.textContent = this.formatTime(daily.sunset[0]);

    // UV Index
    const uvIndex = daily.uv_index_max[0] || 0;
    this.elements.uvValue.textContent = uvIndex.toFixed(1);
    this.elements.uvIndicator.style.width = `${Math.min(uvIndex * 10, 100)}%`;
    this.elements.uvDescription.textContent = this.getUVDescription(uvIndex);

    // Air Quality
    if (airQualityData && airQualityData.current) {
      const aqi = airQualityData.current.european_aqi || 0;
      this.elements.aqiValue.textContent = Math.round(aqi);
      this.elements.aqiDescription.textContent = this.getAQIDescription(aqi);
      this.elements.pm25.textContent = airQualityData.current.pm2_5?.toFixed(1) || '--';
      this.elements.pm10.textContent = airQualityData.current.pm10?.toFixed(1) || '--';
    } else {
      this.elements.aqiValue.textContent = '--';
      this.elements.aqiDescription.textContent = 'Data unavailable';
      this.elements.pm25.textContent = '--';
      this.elements.pm10.textContent = '--';
    }

    // Precipitation
    this.elements.rainChance.textContent = `${Math.round(daily.precipitation_probability_max[0] || 0)}%`;
    this.elements.rainAmount.textContent = `${(daily.precipitation_sum[0] || 0).toFixed(1)} mm`;

    // Forecasts
    this.updateHourlyForecast(hourly);
    this.updateDailyForecast(daily);

    // Update Favorite Button
    this.updateFavoriteButton();
  }

  // Check if it's daytime
  isDay(sunrise, sunset) {
    const now = new Date();
    const sunriseTime = new Date(sunrise);
    const sunsetTime = new Date(sunset);
    return now >= sunriseTime && now <= sunsetTime;
  }

  // Estimate visibility based on weather code
  estimateVisibility(code) {
    if (code >= 45 && code <= 48) return 2; // Fog
    if (code >= 51 && code <= 67) return 5; // Rain
    if (code >= 71 && code <= 77) return 3; // Snow
    if (code >= 80 && code <= 99) return 4; // Showers/Thunderstorm
    return 10; // Clear/Cloudy
  }

  // Update Hourly Forecast
  updateHourlyForecast(hourly) {
    const currentHour = new Date().getHours();
    const now = new Date();

    // Get next 24 hours
    const next24Hours = [];
    for (let i = 0; i < 24; i++) {
      next24Hours.push({
        time: hourly.time[i],
        temp: hourly.temperature_2m[i],
        weatherCode: hourly.weather_code[i],
        precipitation: hourly.precipitation_probability[i]
      });
    }

    this.elements.hourlyForecast.innerHTML = next24Hours.map((hour, index) => {
      const hourTime = new Date(hour.time);
      const timeStr = index === 0 ? 'Now' : hourTime.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
      const isNight = hourTime.getHours() < 6 || hourTime.getHours() > 20;

      return `
        <div class="hourly-item">
          <div class="time">${timeStr}</div>
          <div class="icon">${this.getWeatherIcon(hour.weatherCode, !isNight)}</div>
          <div class="temp">${Math.round(hour.temp)}°</div>
        </div>
      `;
    }).join('');
  }

  // Update Daily Forecast
  updateDailyForecast(daily) {
    if (!this.elements.dailyForecast) return; // Skip if element doesn't exist
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push({
        date: daily.time[i],
        weatherCode: daily.weather_code[i],
        tempMax: daily.temperature_2m_max[i],
        tempMin: daily.temperature_2m_min[i]
      });
    }

    this.elements.dailyForecast.innerHTML = days.map((day, index) => {
      const date = new Date(day.date);
      const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });

      return `
        <div class="daily-item">
          <div class="day">${dayName}</div>
          <div class="icon">${this.getWeatherIcon(day.weatherCode, true)}</div>
          <div class="condition">${this.getWeatherDescription(day.weatherCode)}</div>
          <div class="temps">
            <span class="temp-max">${Math.round(day.tempMax)}°</span>
            <span class="temp-min">${Math.round(day.tempMin)}°</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Get Weather Icon based on WMO Weather Code
  getWeatherIcon(code, isDay = true) {
    const icons = {
      0: isDay ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>', // Clear
      1: isDay ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>', // Mainly clear
      2: isDay ? '<i class="fas fa-cloud-sun"></i>' : '<i class="fas fa-cloud-moon"></i>', // Partly cloudy
      3: '<i class="fas fa-cloud"></i>', // Overcast
      45: '<i class="fas fa-smog"></i>', // Fog
      48: '<i class="fas fa-smog"></i>', // Depositing rime fog
      51: '<i class="fas fa-cloud-rain"></i>', // Drizzle light
      53: '<i class="fas fa-cloud-rain"></i>', // Drizzle moderate
      55: '<i class="fas fa-cloud-rain"></i>', // Drizzle dense
      61: '<i class="fas fa-cloud-rain"></i>', // Rain slight
      63: '<i class="fas fa-cloud-showers-heavy"></i>', // Rain moderate
      65: '<i class="fas fa-cloud-showers-heavy"></i>', // Rain heavy
      71: '<i class="fas fa-snowflake"></i>', // Snow slight
      73: '<i class="fas fa-snowflake"></i>', // Snow moderate
      75: '<i class="fas fa-snowflake"></i>', // Snow heavy
      77: '<i class="fas fa-snowflake"></i>', // Snow grains
      80: '<i class="fas fa-cloud-rain"></i>', // Rain showers slight
      81: '<i class="fas fa-cloud-showers-heavy"></i>', // Rain showers moderate
      82: '<i class="fas fa-cloud-showers-heavy"></i>', // Rain showers violent
      85: '<i class="fas fa-snowflake"></i>', // Snow showers slight
      86: '<i class="fas fa-snowflake"></i>', // Snow showers heavy
      95: '<i class="fas fa-cloud-bolt"></i>', // Thunderstorm
      96: '<i class="fas fa-cloud-bolt"></i>', // Thunderstorm with hail
      99: '<i class="fas fa-cloud-bolt"></i>' // Thunderstorm with heavy hail
    };

    return icons[code] || '<i class="fas fa-cloud-sun"></i>';
  }

  // Get Weather Description based on WMO Weather Code
  getWeatherDescription(code) {
    const descriptions = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with hail',
      99: 'Thunderstorm with heavy hail'
    };

    return descriptions[code] || 'Unknown';
  }

  // Get UV Description
  getUVDescription(uv) {
    if (uv <= 2) return 'Low';
    if (uv <= 5) return 'Moderate';
    if (uv <= 7) return 'High';
    if (uv <= 10) return 'Very High';
    return 'Extreme';
  }

  // Get AQI Description (European AQI)
  getAQIDescription(aqi) {
    if (aqi <= 20) return 'Good';
    if (aqi <= 40) return 'Fair';
    if (aqi <= 60) return 'Moderate';
    if (aqi <= 80) return 'Poor';
    if (aqi <= 100) return 'Very Poor';
    return 'Extremely Poor';
  }

  // Format Date Time
  formatDateTime(date) {
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
  }

  // Format Time (ISO to readable)
  formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  // Toggle Theme
  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    this.applyTheme();
    localStorage.setItem('theme', this.theme);
  }

  // Apply Theme
  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
    const icon = this.elements.themeToggle.querySelector('i');
    icon.className = this.theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
  }

  // Toggle Favorite
  toggleFavorite() {
    if (!this.currentLocation) return;

    const index = this.favorites.findIndex(fav => fav.name === this.currentLocation);

    if (index === -1) {
      // Add to favorites
      this.favorites.push({
        name: this.currentLocation,
        coords: this.currentCoords,
        addedAt: Date.now()
      });
      this.showToast('Added to favorites', 'success');
    } else {
      // Remove from favorites
      this.favorites.splice(index, 1);
      this.showToast('Removed from favorites', 'success');
    }

    this.saveFavorites();
    this.updateFavoriteButton();
    this.renderFavorites();
  }

  // Update Favorite Button
  updateFavoriteButton() {
    if (!this.currentLocation) return;

    const isFavorite = this.favorites.some(fav => fav.name === this.currentLocation);

    if (isFavorite) {
      this.elements.favoriteBtn.classList.add('active');
    } else {
      this.elements.favoriteBtn.classList.remove('active');
    }
  }

  // Render Favorites
  renderFavorites() {
    if (this.favorites.length === 0) {
      this.elements.favoritesGrid.innerHTML = `
        <div class="empty-favorites">
          <i class="fas fa-heart-crack"></i>
          <p>No favorite locations yet</p>
          <small>Click the heart icon to save locations</small>
        </div>
      `;
      return;
    }

    this.elements.favoritesGrid.innerHTML = this.favorites.map((fav, index) => `
      <div class="favorite-location-card" onclick="app.loadFavorite(${index})">
        <div class="city-name">${fav.name.split(',')[0]}</div>
        <div class="weather-quick">
          <i class="fas fa-cloud-sun"></i>
          <span>Click to view</span>
        </div>
        <button class="remove-btn" onclick="event.stopPropagation(); app.removeFavorite(${index})">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');
  }

  // Load Favorite
  loadFavorite(index) {
    const fav = this.favorites[index];
    if (fav && fav.coords) {
      this.currentLocation = fav.name;
      this.currentCoords = fav.coords;
      this.fetchWeatherByCoords(fav.coords.lat, fav.coords.lon);
    }
  }

  // Remove Favorite
  removeFavorite(index) {
    this.favorites.splice(index, 1);
    this.saveFavorites();
    this.updateFavoriteButton();
    this.renderFavorites();
    this.showToast('Removed from favorites', 'success');
  }

  // Load Favorites from LocalStorage
  loadFavorites() {
    try {
      return JSON.parse(localStorage.getItem('weatherFavorites') || '[]');
    } catch {
      return [];
    }
  }

  // Save Favorites to LocalStorage
  saveFavorites() {
    localStorage.setItem('weatherFavorites', JSON.stringify(this.favorites));
  }

  // Show Loading
  showLoading(show) {
    if (show) {
      this.elements.loadingOverlay.classList.add('active');
    } else {
      this.elements.loadingOverlay.classList.remove('active');
    }
  }

  // Show Toast
  showToast(message, type = 'info') {
    this.elements.toastMessage.textContent = message;
    this.elements.toast.className = `toast ${type} show`;

    setTimeout(() => {
      this.elements.toast.classList.remove('show');
    }, 3000);
  }
}

// Initialize App
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new WeatherApp();
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(registration => console.log('SW registered:', registration))
      .catch(error => console.log('SW registration failed:', error));
  });
}
