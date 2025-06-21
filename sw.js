// Service Worker for Advanced Weather App
const CACHE_NAME = 'weather-app-v1.0.0';
const STATIC_CACHE = 'weather-static-v1.0.0';
const DYNAMIC_CACHE = 'weather-dynamic-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker installed');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests (weather data)
  if (url.pathname.includes('/VisualCrossingWebServices/')) {
    event.respondWith(handleWeatherAPI(request));
    return;
  }

  // Handle static files
  if (request.method === 'GET' && request.destination !== 'image') {
    event.respondWith(handleStaticFiles(request));
    return;
  }

  // Handle images
  if (request.destination === 'image') {
    event.respondWith(handleImages(request));
    return;
  }
});

// Handle weather API requests with cache-first strategy
async function handleWeatherAPI(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the response for offline use
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    
    // Try cache as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback
    return new Response(
      JSON.stringify({
        error: 'No internet connection. Please check your connection and try again.',
        offline: true
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

// Handle static files with cache-first strategy
async function handleStaticFiles(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Static file fetch failed:', error);
    
    // Return offline page for HTML requests
    if (request.destination === 'document') {
      return caches.match('/index.html');
    }
    
    throw error;
  }
}

// Handle images with cache-first strategy
async function handleImages(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Image fetch failed:', error);
    // Return a placeholder image or null
    return new Response(null, { status: 404 });
  }
}

// Background sync for weather updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'weather-update') {
    console.log('Background sync triggered for weather update');
    event.waitUntil(updateWeatherData());
  }
});

// Update weather data in background
async function updateWeatherData() {
  try {
    const clients = await self.clients.matchAll();
    
    for (const client of clients) {
      client.postMessage({
        type: 'WEATHER_UPDATE',
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.log('Background weather update failed:', error);
  }
}

// Push notifications for weather alerts
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Weather update available',
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Weather',
        icon: '/icon-96.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-96.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Weather App', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle message events from main thread
self.addEventListener('message', (event) => {
  console.log('Message received in service worker:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_WEATHER') {
    event.waitUntil(cacheWeatherData(event.data.weatherData));
  }
});

// Cache weather data for offline use
async function cacheWeatherData(weatherData) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const response = new Response(JSON.stringify(weatherData), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Create a request URL for the weather data
    const request = new Request('/api/weather-cache');
    await cache.put(request, response);
    
    console.log('Weather data cached for offline use');
  } catch (error) {
    console.log('Failed to cache weather data:', error);
  }
} 