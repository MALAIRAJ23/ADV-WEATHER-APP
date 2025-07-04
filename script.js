// Weather App - Advanced Features
class WeatherApp {
  constructor() {
    this.apiKey = "WVBBBUZG6Z3KAL8TFGSR35A4B";
    this.googleMapsApiKey = "AIzaSyB0biE37HC3gkUvKIB_ZfzIk30ZdRARZEM"; // Your Google Maps API key
    this.currentLocation = null;
    this.currentCoordinates = null;
    this.currentWeather = null;
    this.favorites = this.loadFavorites();
    this.units = 'metric'; // metric or imperial
    this.theme = this.loadTheme();
    this.map = null;
    this.mapMarker = null;
    this.geocoder = null;
    this.infoWindow = null;
    
    this.initializeApp();
  }

  initializeApp() {
    this.setupEventListeners();
    this.applyTheme();
    this.renderFavorites();
    this.initializeGeolocation();
    this.setupServiceWorker();
    this.initializeMap();
    this.setupFavoriteToggle();
  }

  setupEventListeners() {
    // Search functionality
    document.getElementById('searchBtn').addEventListener('click', () => this.searchWeather());
    document.getElementById('cityInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.searchWeather();
    });

    // Voice search
    document.getElementById('voiceSearchBtn').addEventListener('click', () => this.startVoiceSearch());

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

    // Units toggle
    document.getElementById('unitsToggle').addEventListener('click', () => this.toggleUnits());

    // Favorites
    document.getElementById('favoritesBtn').addEventListener('click', () => this.showFavoritesModal());
    document.getElementById('closeFavorites').addEventListener('click', () => this.hideFavoritesModal());

    // Refresh
    document.getElementById('refreshBtn').addEventListener('click', () => this.refreshWeather());

    // Modal close on outside click
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.hideFavoritesModal();
        this.hideShareModal();
      }
    });

    // Share functionality
    document.getElementById('copyLink').addEventListener('click', () => this.copyWeatherLink());
    document.getElementById('shareTwitter').addEventListener('click', () => this.shareToTwitter());
    document.getElementById('shareWhatsApp').addEventListener('click', () => this.shareToWhatsApp());
    document.getElementById('shareEmail').addEventListener('click', () => this.shareViaEmail());
  }

  async initializeGeolocation() {
    if (navigator.geolocation) {
      try {
        const position = await this.getCurrentPosition();
        const { latitude, longitude } = position.coords;
        
        // Store coordinates for map use
        this.currentCoordinates = { lat: latitude, lng: longitude };
        
        // Get weather using coordinates
        await this.getWeatherByCoordinates(latitude, longitude);
        
      } catch (error) {
        console.log('Geolocation failed:', error);
        this.showError('Location access denied. Please search manually.');
      }
    } else {
      this.showError('Geolocation not supported. Please search manually.');
    }
  }

  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 10000,
        enableHighAccuracy: true
      });
    });
  }

  async searchWeather() {
    const cityInput = document.getElementById('cityInput');
    const city = cityInput.value.trim();
    
    if (!city) {
      this.showError('Please enter a city name.');
      return;
    }

    try {
      await this.getWeatherByLocation(city);
      cityInput.value = '';
    } catch (error) {
      this.showError('City not found. Please try again.');
    }
  }

  async getWeatherByLocation(location) {
    this.showLoading();
    try {
      const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(location)}?unitGroup=${this.units}&key=${this.apiKey}&include=current,hours,days,alerts`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Weather data not available');
      const data = await response.json();
      this.currentWeather = data;
      this.currentLocation = data.resolvedAddress;
      this.updateLocationDisplay();
      this.renderCurrentWeather();
      this.renderHourlyForecast();
      this.renderDailyForecast();
      this.renderWeatherAlerts();
      this.updateWeatherIcon();
      this.setWeatherBackground();
      this.updateFavoriteIcon();
      // Always geocode the resolved address and update the map
      if (this.geocoder && this.currentLocation) {
        this.geocoder.geocode({ address: this.currentLocation }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location;
            this.currentCoordinates = { lat: location.lat(), lng: location.lng() };
            this.updateMapMarker(location.lat(), location.lng());
          }
        });
      }
      // Add to recent searches
      this.addToRecentSearches(location);
    } catch (error) {
      console.error('Weather fetch error:', error);
      this.showError('Failed to fetch weather data. Please try again.');
    }
  }

  renderCurrentWeather() {
    const current = this.currentWeather.currentConditions;
    
    // Update main weather display
    document.getElementById('currentTemp').textContent = `${Math.round(current.temp)}°${this.units === 'metric' ? 'C' : 'F'}`;
    document.getElementById('weatherDescription').textContent = current.conditions;
    document.getElementById('feelsLike').textContent = `Feels like ${Math.round(current.feelslike)}°${this.units === 'metric' ? 'C' : 'F'}`;
    
    // Update weather stats
    document.getElementById('humidity').textContent = `${Math.round(current.humidity)}%`;
    document.getElementById('windSpeed').textContent = `${Math.round(current.windspeed)} ${this.units === 'metric' ? 'km/h' : 'mph'}`;
    document.getElementById('pressure').textContent = `${Math.round(current.pressure)} hPa`;
    document.getElementById('visibility').textContent = `${(current.visibility / 1000).toFixed(1)} km`;
    
    // Update additional info
    this.updateAdditionalInfo();
  }

  updateAdditionalInfo() {
    const current = this.currentWeather.currentConditions;
    const today = this.currentWeather.days[0];
    
    // Air Quality (simulated - API doesn't provide this)
    const aqi = Math.floor(Math.random() * 150) + 50;
    document.getElementById('airQuality').textContent = aqi;
    document.getElementById('aqiDescription').textContent = this.getAQIDescription(aqi);
    
    // UV Index
    const uvIndex = Math.round(current.uvindex || 0);
    document.getElementById('uvIndex').textContent = uvIndex;
    document.getElementById('uvDescription').textContent = this.getUVDescription(uvIndex);
    
    // Sunrise/Sunset
    document.getElementById('sunrise').textContent = this.formatTime(today.sunrise);
    document.getElementById('sunset').textContent = this.formatTime(today.sunset);
  }

  renderHourlyForecast() {
    const hourlyContainer = document.getElementById('hourlyContainer');
    const hours = this.currentWeather.days[0].hours.slice(0, 24);
    
    const hourlyHTML = hours.map(hour => `
      <div class="hourly-item">
        <div class="time">${this.formatHour(hour.datetime)}</div>
        <div class="icon">${this.getWeatherEmoji(hour.conditions)}</div>
        <div class="temp">${Math.round(hour.temp)}°</div>
      </div>
    `).join('');
    
    hourlyContainer.innerHTML = hourlyHTML;
  }

  renderDailyForecast() {
    const dailyContainer = document.getElementById('dailyContainer');
    const days = this.currentWeather.days.slice(1, 6); // Next 5 days
    
    const dailyHTML = days.map(day => `
      <div class="daily-item">
        <div class="date">${this.formatDate(day.datetime)}</div>
        <div class="icon">${this.getWeatherEmoji(day.conditions)}</div>
        <div class="temp">${Math.round(day.temp)}°</div>
        <div class="description">${day.conditions}</div>
      </div>
    `).join('');
    
    dailyContainer.innerHTML = dailyHTML;
  }

  renderWeatherAlerts() {
    const alertsSection = document.getElementById('weatherAlerts');
    const alertText = document.getElementById('alertText');
    
    if (this.currentWeather.alerts && this.currentWeather.alerts.length > 0) {
      const alert = this.currentWeather.alerts[0];
      alertText.textContent = alert.event;
      alertsSection.style.display = 'block';
    } else {
      alertsSection.style.display = 'none';
    }
  }

  updateWeatherIcon() {
    const iconElement = document.getElementById('weatherIcon');
    const conditions = this.currentWeather.currentConditions.conditions.toLowerCase();
    iconElement.textContent = this.getWeatherEmoji(conditions);
  }

  setWeatherBackground() {
    const conditions = this.currentWeather.currentConditions.conditions.toLowerCase();
    let weatherType = 'default';
    
    if (conditions.includes('clear')) weatherType = 'clear';
    else if (conditions.includes('cloud')) weatherType = 'cloud';
    else if (conditions.includes('rain') || conditions.includes('drizzle')) weatherType = 'rain';
    else if (conditions.includes('thunder')) weatherType = 'thunder';
    else if (conditions.includes('snow')) weatherType = 'snow';
    else if (conditions.includes('fog') || conditions.includes('mist') || conditions.includes('haze')) weatherType = 'fog';
    
    document.body.setAttribute('data-weather', weatherType);
  }

  // Voice Search
  startVoiceSearch() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onstart = () => {
        document.getElementById('voiceSearchBtn').style.background = 'var(--danger-color)';
      };
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('cityInput').value = transcript;
        this.searchWeather();
      };
      
      recognition.onend = () => {
        document.getElementById('voiceSearchBtn').style.background = 'rgba(255, 255, 255, 0.2)';
      };
      
      recognition.start();
    } else {
      this.showError('Voice recognition not supported in this browser.');
    }
  }

  // Theme Management
  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    this.applyTheme();
    this.saveTheme();
    this.updateThemeButton();
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
    this.updateThemeButton();
    this.refreshMap();
  }

  refreshMap() {
    if (this.map) {
      // Force map to redraw to adapt to theme changes
      setTimeout(() => {
        google.maps.event.trigger(this.map, 'resize');
      }, 100);
    }
  }

  updateThemeButton() {
    const themeBtn = document.getElementById('themeToggle');
    if (this.theme === 'dark') {
      themeBtn.innerHTML = `
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      `;
      themeBtn.title = "Switch to Light Mode";
    } else {
      themeBtn.innerHTML = `
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      `;
      themeBtn.title = "Switch to Dark Mode";
    }
  }

  loadTheme() {
    return localStorage.getItem('weather-theme') || 'light';
  }

  saveTheme() {
    localStorage.setItem('weather-theme', this.theme);
  }

  // Units Management
  toggleUnits() {
    this.units = this.units === 'metric' ? 'imperial' : 'metric';
    document.getElementById('unitsToggle').textContent = this.units === 'metric' ? '°C' : '°F';
    if (this.currentLocation) {
      this.getWeatherByLocation(this.currentLocation);
    }
  }

  // Favorites Management
  addToFavorites() {
    if (!this.currentLocation) return;
    if (this.isFavorite(this.currentLocation)) return;
    this.favorites.push({ name: this.currentLocation });
    this.saveFavorites();
    this.renderFavorites();
    this.updateFavoriteIcon();
  }

  removeFromFavorites(name) {
    this.favorites = this.favorites.filter(fav => fav.name !== name);
    this.saveFavorites();
    this.renderFavorites();
    this.updateFavoriteIcon();
  }

  loadFavorites() {
    const saved = localStorage.getItem('weather-favorites');
    return saved ? JSON.parse(saved) : [];
  }

  saveFavorites() {
    localStorage.setItem('weather-favorites', JSON.stringify(this.favorites));
  }

  renderFavorites() {
    const favoritesList = document.getElementById('favoritesList');
    const favoritesContent = document.getElementById('favoritesContent');
    
    // Render quick favorites
    const quickFavorites = this.favorites.slice(0, 5);
    favoritesList.innerHTML = quickFavorites.map(fav => `
      <div class="favorite-item" onclick="weatherApp.searchLocation('${fav.name}')">
        ${fav.name}
      </div>
    `).join('');
    
    // Render modal favorites
    if (this.favorites.length === 0) {
      favoritesContent.innerHTML = '<p>No favorite locations yet. Search for a city and add it to favorites!</p>';
    } else {
      favoritesContent.innerHTML = this.favorites.map(fav => `
        <div class="favorite-item" style="justify-content: space-between; margin-bottom: 0.5rem;">
          <span onclick="weatherApp.searchLocation('${fav.name}')">${fav.name}</span>
          <button onclick="weatherApp.removeFromFavorites('${fav.name}')" style="background: var(--danger-color); border: none; color: white; border-radius: 50%; width: 24px; height: 24px; cursor: pointer;">×</button>
        </div>
      `).join('');
    }
  }

  searchLocation(location) {
    document.getElementById('cityInput').value = location;
    this.getWeatherByLocation(location);
    this.hideFavoritesModal();
  }

  showFavoritesModal() {
    document.getElementById('favoritesModal').style.display = 'block';
  }

  hideFavoritesModal() {
    document.getElementById('favoritesModal').style.display = 'none';
  }

  hideShareModal() {
    document.getElementById('shareModal').style.display = 'none';
  }

  // Sharing
  copyWeatherLink() {
    const url = `${window.location.origin}${window.location.pathname}?location=${encodeURIComponent(this.currentLocation)}`;
    navigator.clipboard.writeText(url).then(() => {
      this.showNotification('Link copied to clipboard!');
    });
  }

  shareToTwitter() {
    const text = `Current weather in ${this.currentLocation}: ${this.currentWeather.currentConditions.temp}°${this.units === 'metric' ? 'C' : 'F'} - ${this.currentWeather.currentConditions.conditions}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  shareToWhatsApp() {
    const text = `Current weather in ${this.currentLocation}: ${this.currentWeather.currentConditions.temp}°${this.units === 'metric' ? 'C' : 'F'} - ${this.currentWeather.currentConditions.conditions}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  shareViaEmail() {
    const subject = `Weather in ${this.currentLocation}`;
    const body = `Current weather in ${this.currentLocation}:\nTemperature: ${this.currentWeather.currentConditions.temp}°${this.units === 'metric' ? 'C' : 'F'}\nConditions: ${this.currentWeather.currentConditions.conditions}\nHumidity: ${this.currentWeather.currentConditions.humidity}%\nWind: ${this.currentWeather.currentConditions.windspeed} ${this.units === 'metric' ? 'km/h' : 'mph'}`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url);
  }

  // Utility Functions
  formatTime(timeString) {
    return new Date(timeString).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }

  formatHour(timeString) {
    return new Date(timeString).toLocaleTimeString('en-US', { 
      hour: 'numeric',
      hour12: true 
    });
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  getWeatherEmoji(conditions) {
    const condition = conditions.toLowerCase();
    if (condition.includes('clear')) return '☀️';
    if (condition.includes('cloud')) return '☁️';
    if (condition.includes('rain')) return '🌧️';
    if (condition.includes('snow')) return '❄️';
    if (condition.includes('thunder')) return '⛈️';
    if (condition.includes('fog') || condition.includes('mist')) return '🌫️';
    if (condition.includes('drizzle')) return '🌦️';
    return '🌤️';
  }

  getAQIDescription(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  }

  getUVDescription(uv) {
    if (uv <= 2) return 'Low';
    if (uv <= 5) return 'Moderate';
    if (uv <= 7) return 'High';
    if (uv <= 10) return 'Very High';
    return 'Extreme';
  }

  updateLocationDisplay() {
    document.getElementById('currentLocation').textContent = this.currentLocation;
  }

  showLoading() {
    document.getElementById('currentTemp').textContent = 'Loading...';
    document.getElementById('weatherDescription').textContent = 'Fetching weather data...';
  }

  showError(message) {
    document.getElementById('currentTemp').textContent = 'Error';
    document.getElementById('weatherDescription').textContent = message;
  }

  showNotification(message) {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--success-color);
      color: white;
      padding: 1rem;
      border-radius: var(--radius-md);
      z-index: 1001;
      animation: slideInRight 0.3s ease;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  refreshWeather() {
    if (this.currentLocation) {
      this.getWeatherByLocation(this.currentLocation);
    }
  }

  addToRecentSearches(location) {
    let recent = JSON.parse(localStorage.getItem('weather-recent') || '[]');
    recent = recent.filter(item => item !== location);
    recent.unshift(location);
    recent = recent.slice(0, 10); // Keep only 10 recent searches
    localStorage.setItem('weather-recent', JSON.stringify(recent));
  }

  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then(registration => console.log('SW registered'))
        .catch(error => console.log('SW registration failed'));
    }
  }

  initializeMap() {
    if (!this.googleMapsApiKey) {
      console.warn('Google Maps API key not provided. Map functionality will be limited.');
      document.getElementById('mapLoading').innerHTML = '<p>Google Maps API key required for full map functionality</p>';
      return;
    }

    // Load Google Maps API dynamically
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${this.googleMapsApiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    // Global callback function
    window.initGoogleMaps = () => {
      this.setupGoogleMap();
    };
  }

  setupGoogleMap() {
    try {
      // Initialize map with world view
      this.map = new google.maps.Map(document.getElementById('weatherMap'), {
        center: { lat: 20, lng: 0 },
        zoom: 2,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        styles: this.getMapStyles(),
        // Mobile-specific options
        gestureHandling: 'greedy',
        disableDefaultUI: false,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_BOTTOM
        }
      });

      // Initialize geocoder
      this.geocoder = new google.maps.Geocoder();
      
      // Initialize info window
      this.infoWindow = new google.maps.InfoWindow();

      // Add click listener to map
      this.map.addListener('click', (e) => {
        this.handleMapClick(e);
      });

      // Force map to resize after initialization (fixes mobile issues)
      setTimeout(() => {
        google.maps.event.trigger(this.map, 'resize');
      }, 100);

      // Hide loading indicator
      document.getElementById('mapLoading').style.display = 'none';

      // --- AUTOCOMPLETE FEATURE ---
      const input = document.getElementById('cityInput');
      if (input) {
        const autocomplete = new google.maps.places.Autocomplete(input, {
          types: ['(cities)'],
          fields: ['geometry', 'formatted_address', 'name']
        });
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place.geometry || !place.formatted_address) return;
          // Set input to formatted address
          input.value = place.formatted_address;
          // Fetch weather and update map
          this.getWeatherByLocation(place.formatted_address);
        });
      }
      // --- END AUTOCOMPLETE ---

    } catch (error) {
      console.error('Google Maps initialization failed:', error);
      document.getElementById('mapLoading').innerHTML = '<p>Map failed to load</p>';
    }
  }

  getMapStyles() {
    // Custom map styles for better integration with the app theme
    return [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      },
      {
        featureType: 'transit',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ];
  }

  handleMapClick(e) {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    this.getWeatherByCoordinates(lat, lng);
  }

  async getWeatherByCoordinates(lat, lng) {
    try {
      const location = `${lat},${lng}`;
      await this.getWeatherByLocation(location);
      
      // Update map marker with coordinates
      this.updateMapMarker(lat, lng);
      
      // Get location name from coordinates (reverse geocoding)
      if (this.geocoder) {
        this.geocoder.geocode({ location: { lat: lat, lng: lng } }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const formattedAddress = results[0].formatted_address;
            this.currentLocation = formattedAddress;
            this.updateLocationDisplay();
          }
        });
      }
      
    } catch (error) {
      console.error('Error getting weather for coordinates:', error);
    }
  }

  updateMapMarker(lat, lng) {
    // Remove existing marker
    if (this.mapMarker) {
      this.mapMarker.setMap(null);
    }
    
    // Add new marker
    this.mapMarker = new google.maps.Marker({
      position: { lat: lat, lng: lng },
      map: this.map,
      title: this.currentLocation || 'Weather Location'
    });
    
    // Create info window with weather info
    if (this.currentWeather) {
      const current = this.currentWeather.currentConditions;
      const content = `
        <div style="text-align: center; min-width: 150px;">
          <h4 style="margin: 0 0 8px 0;">${this.currentLocation}</h4>
          <div style="font-size: 24px; margin: 8px 0;">${Math.round(current.temp)}°${this.units === 'metric' ? 'C' : 'F'}</div>
          <div style="color: #666; margin-bottom: 8px;">${current.conditions}</div>
          <div style="font-size: 12px; color: #888;">
            Humidity: ${Math.round(current.humidity)}%<br>
            Wind: ${Math.round(current.windspeed)} ${this.units === 'metric' ? 'km/h' : 'mph'}
          </div>
        </div>
      `;
      
      this.infoWindow.setContent(content);
      this.infoWindow.open(this.map, this.mapMarker);
    }
    
    // Center map on marker
    this.map.panTo({ lat: lat, lng: lng });
    this.map.setZoom(10);
  }

  updateMapForLocation() {
    // No longer needed, handled in getWeatherByLocation
  }

  // Method to set Google Maps API key
  setGoogleMapsApiKey(apiKey) {
    this.googleMapsApiKey = apiKey;
    if (this.googleMapsApiKey && !this.map) {
      this.initializeMap();
    }
  }

  setupFavoriteToggle() {
    const btn = document.getElementById('favoriteToggleBtn');
    if (btn) {
      btn.addEventListener('click', () => {
        if (!this.currentLocation) return;
        if (this.isFavorite(this.currentLocation)) {
          this.removeFromFavorites(this.currentLocation);
        } else {
          this.addToFavorites();
        }
        this.updateFavoriteIcon();
        this.renderFavorites();
      });
    }
  }

  isFavorite(locationName) {
    return this.favorites.some(fav => fav.name === locationName);
  }

  updateFavoriteIcon() {
    const btn = document.getElementById('favoriteToggleBtn');
    const icon = document.getElementById('favoriteIcon');
    if (!btn || !icon) {
      console.error('Favorite button elements not found');
      return;
    }
    
    // Always show the button if we have a current location
    if (this.currentLocation) {
      btn.style.display = 'inline-flex';
      btn.style.visibility = 'visible';
      btn.style.opacity = '1';
      
      if (this.isFavorite(this.currentLocation)) {
        icon.setAttribute('fill', 'var(--danger-color)');
        btn.title = 'Remove from favorites';
        btn.style.background = 'rgba(252, 129, 129, 0.2)';
      } else {
        icon.setAttribute('fill', 'none');
        btn.title = 'Add to favorites';
        btn.style.background = 'rgba(255, 255, 255, 0.2)';
      }
    } else {
      // Hide button if no location
      btn.style.display = 'none';
    }
  }
}

// Initialize the app
const weatherApp = new WeatherApp();

// Add global function for favorites
window.searchLocation = (location) => weatherApp.searchLocation(location);
window.removeFromFavorites = (name) => weatherApp.removeFromFavorites(name);

// Global function to set Google Maps API key
window.setGoogleMapsApiKey = (apiKey) => weatherApp.setGoogleMapsApiKey(apiKey);

// Example usage:
// setGoogleMapsApiKey('YOUR_GOOGLE_MAPS_API_KEY_HERE');
