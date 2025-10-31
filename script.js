/* ============================================================
   WeatherNow — Combined script.js (corrected IDs + robust)
   ============================================================ */

/* CONFIG */
const API_KEY = '0ff4b4aee450de38b133dce284102288'; // your key (keep secret for production)
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';
const CACHE_PREFIX = 'wn_cache_';
const CACHE_TTL = 120 * 1000; // 120 seconds in ms
let units = localStorage.getItem('wn_units') || 'metric';

/* DOM refs (match IDs in index.html) */
const searchForm = document.getElementById('searchForm');
const cityInput = document.getElementById('cityInput');
const weatherCard = document.getElementById('weatherCard');
const favoriteList = document.getElementById('favoriteList');
const favCountEl = document.getElementById('favCount');
const clearFavsBtn = document.getElementById('clearFavsBtn');
const themeToggle = document.getElementById('themeToggle');
const locationBtn = document.getElementById('locationBtn');
const messageEl = document.getElementById('message');
const spinnerEl = document.getElementById('spinner');

/* Helpers: messages & spinner */
function showMessage(text, type = 'info', useAlertRole = false) {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.dataset.type = type;
  if (useAlertRole) messageEl.setAttribute('role', 'alert');
  else messageEl.setAttribute('role', 'status');
}
function clearMessage() {
  if (!messageEl) return;
  messageEl.textContent = '';
  messageEl.removeAttribute('role');
  delete messageEl.dataset.type;
}
function showSpinner() {
  if (!spinnerEl) return;
  spinnerEl.hidden = false;
  spinnerEl.setAttribute('aria-hidden', 'false');
}
function hideSpinner() {
  if (!spinnerEl) return;
  spinnerEl.hidden = true;
  spinnerEl.setAttribute('aria-hidden', 'true');
}

/* Local cache helpers */
function setCache(key, data, ttlMs = CACHE_TTL) {
  try {
    const payload = { ts: Date.now(), ttl: ttlMs, data };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(payload));
  } catch (e) {
    console.warn('setCache failed', e);
  }
}
function getCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.ts || !parsed.ttl) return null;
    if (Date.now() - parsed.ts > parsed.ttl) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return parsed.data;
  } catch (e) {
    console.warn('getCache failed', e);
    return null;
  }
}

/* Favorites (simple API) */
const FAV_KEY = 'wn_favorites_v1';
const FAV_MAX = 8;

function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
  } catch {
    return [];
  }
}
function saveFavorites(arr) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(arr));
  } catch {}
  renderFavorites();
}
function addFavorite(city) {
  if (!city) return;
  const normalized = city.trim();
  if (!normalized) return;
  const favs = loadFavorites();
  const dedup = favs.filter(c => c.toLowerCase() !== normalized.toLowerCase());
  dedup.unshift(normalized);
  if (dedup.length > FAV_MAX) dedup.length = FAV_MAX;
  saveFavorites(dedup);
}
function removeFavorite(city) {
  const favs = loadFavorites().filter(c => c.toLowerCase() !== city.toLowerCase());
  saveFavorites(favs);
}
function clearFavorites() {
  localStorage.removeItem(FAV_KEY);
  renderFavorites();
}
function renderFavorites() {
  if (!favoriteList) return;
  const favs = loadFavorites();
  favCountEl && (favCountEl.textContent = favs.length ? `${favs.length} saved` : '0 saved');
  if (!favs.length) {
    favoriteList.innerHTML = `<p class="placeholder" style="margin:0">No favorites yet. Add a city after search.</p>`;
    return;
  }
  favoriteList.innerHTML = favs.map(c => `
    <div class="fav-pill" role="listitem" data-city="${escapeHtml(c)}">
      <button class="favorite-btn fav-open" data-city="${escapeHtml(c)}" aria-label="Open ${escapeHtml(c)}">${escapeHtml(c)}</button>
      <button class="favorite-remove" data-city="${escapeHtml(c)}" aria-label="Remove ${escapeHtml(c)}">&times;</button>
    </div>
  `).join('');

  // attach handlers
  favoriteList.querySelectorAll('.fav-open').forEach(btn => {
    btn.addEventListener('click', e => {
      const city = e.currentTarget.dataset.city;
      cityInput.value = city;
      fetchWeather(city);
    });
  });
  favoriteList.querySelectorAll('.favorite-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      const city = e.currentTarget.dataset.city;
      // animate removal
      const wrapper = e.currentTarget.closest('.fav-pill');
      if (wrapper) {
        wrapper.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.95)' }], { duration: 140 });
        setTimeout(() => removeFavorite(city), 140);
      } else removeFavorite(city);
    });
  });
}

/* Utility: escape text for HTML injection */
function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/* Theme toggle */
(function initTheme() {
  const saved = localStorage.getItem('wn_theme');
  if (saved === 'dark') document.documentElement.classList.add('dark');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('wn_theme', isDark ? 'dark' : 'light');
      themeToggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    });
  }
})();

/* Unit toggle helper (used inside card or global) */
function toggleUnitsAndRefresh() {
  units = units === 'metric' ? 'imperial' : 'metric';
  localStorage.setItem('wn_units', units);
  const currentCity = cityInput?.value || localStorage.getItem('lastCity');
  if (currentCity) fetchWeather(currentCity);
}

/* Render helpers: placeholder, weather card, forecast */
function renderWeatherPlaceholder() {
  if (!weatherCard) return;
  weatherCard.innerHTML = `<p class="placeholder">Search a city to see current weather.</p>`;
  // remove forecast container if exists
  const fc = document.getElementById('forecastContainer');
  if (fc) fc.innerHTML = '';
}

function renderWeatherCard(data) {
  if (!weatherCard) return;
  if (!data || !data.weather) { renderWeatherPlaceholder(); return; }

  const cityName = `${data.name}${data.sys?.country ? ', ' + data.sys.country : ''}`;
  const weather = data.weather[0] || {};
  const iconUrl = weather.icon ? `https://openweathermap.org/img/wn/${weather.icon}@2x.png` : '';
  const tempUnit = units === 'metric' ? '°C' : '°F';
  const windUnit = units === 'metric' ? 'm/s' : 'mph';

  const temp = Math.round(data.main?.temp ?? 0);
  const feels = Math.round(data.main?.feels_like ?? 0);
  const humidity = data.main?.humidity ?? '—';
  const pressure = data.main?.pressure ?? '—';
  const wind = data.wind?.speed ?? '—';
  const description = weather.description ? weather.description.replace(/\b\w/g, c => c.toUpperCase()) : '';

  weatherCard.innerHTML = `
    <div class="weather-head">
      <div class="city">
        <h2>${escapeHtml(cityName)}</h2>
        <p class="desc">${escapeHtml(description)}</p>
      </div>
      <div class="icon" aria-hidden="true">
        ${iconUrl ? `<img src="${iconUrl}" alt="${escapeHtml(description)} icon" width="80" height="80" loading="lazy">` : ''}
      </div>
      <div class="temps">
        <div class="large-temp">${temp}${tempUnit}</div>
        <div class="muted">Feels like ${feels}${tempUnit}</div>
      </div>
    </div>

    <hr style="margin:1rem 0; border:none; border-top:1px solid rgba(11,37,69,0.06)">

    <div class="weather-details">
      <div class="detail"><strong>Humidity</strong><div>${humidity}%</div></div>
      <div class="detail"><strong>Wind</strong><div>${wind} ${windUnit}</div></div>
      <div class="detail"><strong>Pressure</strong><div>${pressure} hPa</div></div>
      <div class="detail"><strong>Timestamp</strong><div>${new Date(data.dt * 1000).toLocaleString()}</div></div>
    </div>

    <div style="margin-top:1rem; display:flex; gap:0.5rem; align-items:center;">
      <button id="saveFavBtn" class="favorite-btn">Add to Favorites</button>
      <button id="toggleUnitBtn" class="favorite-btn">${units === 'metric' ? 'Switch to °F' : 'Switch to °C'}</button>
    </div>
  `;

  // Attach listeners for the new buttons
  const saveBtn = document.getElementById('saveFavBtn');
  saveBtn && saveBtn.addEventListener('click', () => {
    addFavorite(data.name);
    showMessage(`${data.name} added to favorites`, 'success');
    setTimeout(clearMessage, 1200);
  });

  const toggleBtn = document.getElementById('toggleUnitBtn');
  toggleBtn && toggleBtn.addEventListener('click', () => {
    toggleUnitsAndRefresh();
  });
}

/* Forecast helper functions */
function aggregateDailyForecast(raw) {
  if (!raw || !raw.list) return [];
  const map = {};
  for (const item of raw.list) {
    const dt = new Date(item.dt * 1000);
    const dateKey = dt.toISOString().slice(0, 10);
    if (!map[dateKey]) {
      map[dateKey] = {
        date: dateKey,
        temp_min: item.main.temp_min,
        temp_max: item.main.temp_max,
        icon: item.weather?.[0]?.icon || '',
        desc: item.weather?.[0]?.description || ''
      };
    } else {
      map[dateKey].temp_min = Math.min(map[dateKey].temp_min, item.main.temp_min);
      map[dateKey].temp_max = Math.max(map[dateKey].temp_max, item.main.temp_max);
      const hour = dt.getUTCHours();
      if (hour === 12) {
        map[dateKey].icon = item.weather?.[0]?.icon || map[dateKey].icon;
        map[dateKey].desc = item.weather?.[0]?.description || map[dateKey].desc;
      }
    }
  }
  return Object.values(map)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)
    .map(d => ({
      date: new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      icon: d.icon ? `https://openweathermap.org/img/wn/${d.icon}@2x.png` : '',
      desc: d.desc ? d.desc.replace(/\b\w/g, c => c.toUpperCase()) : '',
      temp_min: Math.round(d.temp_min),
      temp_max: Math.round(d.temp_max)
    }));
}

function renderForecast(daily) {
  let forecastContainer = document.getElementById('forecastContainer');
  if (!forecastContainer) {
    forecastContainer = document.createElement('div');
    forecastContainer.id = 'forecastContainer';
    forecastContainer.className = 'forecast-container';
    const card = document.getElementById('weatherCard');
    card && card.parentNode && card.parentNode.insertBefore(forecastContainer, card.nextSibling);
  }
  if (!daily || !daily.length) { forecastContainer.innerHTML = ''; return; }

  forecastContainer.innerHTML = `
    <h3 style="margin-top:1rem; margin-bottom:.5rem;">5-Day Forecast</h3>
    <div class="forecast-row">
      ${daily.map(d => `
        <div class="forecast-card" role="group" aria-label="Forecast for ${d.date}">
          <div class="f-date">${d.date}</div>
          <div class="f-icon">${d.icon ? `<img src="${d.icon}" alt="${d.desc} icon" width="48" height="48" loading="lazy">` : ''}</div>
          <div class="f-desc">${d.desc}</div>
          <div class="f-temps"><span class="f-max">${d.temp_max}°</span>&nbsp;/&nbsp;<span class="f-min">${d.temp_min}°</span></div>
        </div>
      `).join('')}
    </div>
  `;
}

/* Fetch forecast (caching + 429 fallback) */
async function fetchForecast(city) {
  if (!city) return;
  const cacheKey = `forecast_${city.toLowerCase()}_${units}`;
  const cached = getCache(cacheKey);
  if (cached) {
    renderForecast(cached);
    // do not block; optionally background refresh
  }
  try {
    const res = await fetch(`${FORECAST_URL}?q=${encodeURIComponent(city)}&units=${units}&appid=${API_KEY}`, { cache: 'no-store' });
    if (!res.ok) {
      if (res.status === 429) {
        showMessage('API rate limit reached. Showing cached forecast if available.', 'error', true);
        const fallback = getCache(cacheKey);
        fallback && renderForecast(fallback);
      }
      return;
    }
    const json = await res.json();
    const daily = aggregateDailyForecast(json);
    setCache(cacheKey, daily);
    renderForecast(daily);
  } catch (err) {
    console.warn('fetchForecast error', err);
    const fallback = getCache(cacheKey);
    fallback && renderForecast(fallback);
  }
}

/* Refresh current weather in background */
async function refreshCurrentWeather(city, cacheKey) {
  try {
    const res = await fetch(`${BASE_URL}?q=${encodeURIComponent(city)}&units=${units}&appid=${API_KEY}`, { cache: 'no-store' });
    if (!res.ok) return;
    const json = await res.json();
    setCache(cacheKey, json);
  } catch (e) { /* ignore */ }
}

/* Fetch current weather by city (caching & 429 handling) */
async function fetchWeather(city) {
  try {
    showSpinner(true);
    const response = await fetch(`/api/weather-proxy?q=${encodeURIComponent(city)}`);
    if (!response.ok) throw new Error("City not found");
    const data = await response.json();
    renderWeather(data);
    saveLastSearchedCity(city);
  } catch (err) {
    showMessage(err.message || "Failed to fetch weather data", true);
  } finally {
    showSpinner(false);
  }
}


  showSpinner(); clearMessage();
  weatherCard.innerHTML = `<p class="placeholder">Loading weather for <strong>${escapeHtml(city)}</strong>…</p>`;
  try {
    const res = await fetch(`${BASE_URL}?q=${encodeURIComponent(city)}&units=${units}&appid=${API_KEY}`, { cache: 'no-store' });
    hideSpinner();
    if (!res.ok) {
      if (res.status === 404) { showMessage(`City "${city}" not found.`, 'error', true); renderWeatherPlaceholder(); return; }
      if (res.status === 429) {
        showMessage('API rate limit reached. Showing cached data if available.', 'error', true);
        const fb = getCache(cacheKey); fb ? renderWeatherCard(fb) : renderWeatherPlaceholder();
        return;
      }
      showMessage(`Error fetching weather (status ${res.status}).`, 'error', true); renderWeatherPlaceholder(); return;
    }
    const json = await res.json();
    setCache(cacheKey, json);
    renderWeatherCard(json);
    fetchForecast(city);
    // persist last city
    if (json.name) localStorage.setItem('lastCity', json.name);
  } catch (err) {
    hideSpinner();
    console.error('fetchWeather error', err);
    showMessage('Network error — please check your connection and try again.', 'error', true);
    const fb = getCache(cacheKey); fb ? renderWeatherCard(fb) : renderWeatherPlaceholder();
  }


/* Fetch by coordinates */
async function fetchWeatherByCoords(lat, lon) {
  if (!lat || !lon) return;
  showSpinner(); showMessage('Fetching weather for your location...', 'info');
  try {
    const res = await fetch(`${BASE_URL}?lat=${lat}&lon=${lon}&units=${units}&appid=${API_KEY}`, { cache: 'no-store' });
    hideSpinner();
    if (!res.ok) {
      if (res.status === 429) {
        showMessage('API rate limit reached. Using cached data if available.', 'error', true);
        const lastCity = localStorage.getItem('lastCity');
        if (lastCity) {
          const fb = getCache(`current_${lastCity.toLowerCase()}_${units}`);
          if (fb) { renderWeatherCard(fb); fetchForecast(lastCity); return; }
        }
        renderWeatherPlaceholder();
        return;
      }
      showMessage('Failed to fetch weather for your location.', 'error', true);
      renderWeatherPlaceholder();
      return;
    }
    const json = await res.json();
    const key = `current_${(json.name || `coords_${lat}_${lon}`).toLowerCase()}_${units}`;
    setCache(key, json);
    renderWeatherCard(json);
    if (json.name) localStorage.setItem('lastCity', json.name);
    if (json.name) fetchForecast(json.name);
    clearMessage();
  } catch (err) {
    hideSpinner();
    console.error('fetchWeatherByCoords error', err);
    showMessage('Network error while fetching location weather.', 'error', true);
    const lastCity = localStorage.getItem('lastCity');
    if (lastCity) {
      const fb = getCache(`current_${lastCity.toLowerCase()}_${units}`);
      fb && renderWeatherCard(fb);
    }
  }
}

/* Input validation & event wiring */
if (searchForm) {
  searchForm.addEventListener('submit', e => {
    e.preventDefault();
    const raw = cityInput.value.trim();
    if (!raw) { showMessage('Please enter a city name.', 'error', true); return; }
    // unicode-friendly validation
    const valid = /^[\p{L}\d\s\-\.'()]{1,80}$/u.test(raw);
    if (!valid) { showMessage('City name contains invalid characters.', 'error', true); return; }
    localStorage.setItem('lastCity', raw);
    fetchWeather(raw);
  });
}

/* Use my location button */
if (locationBtn) {
  locationBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!navigator.geolocation) {
      showMessage('Geolocation is not supported by your browser.', 'error', true);
      return;
    }
    showMessage('Requesting location permission...', 'info');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearMessage();
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn('geolocation error', err);
        if (err.code === 1) showMessage('Location permission denied. Search a city instead.', 'error', true);
        else showMessage('Unable to determine location. Try again or search a city.', 'error', true);
        // fallback to lastCity if available
        const last = localStorage.getItem('lastCity');
        if (last) fetchWeather(last);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000 }
    );
  });
}

/* Clear favorites */
clearFavsBtn && clearFavsBtn.addEventListener('click', () => {
  if (!confirm('Clear all favorites?')) return;
  clearFavorites();
});

/* init: render favorites and load lastCity or geolocation */
(function init() {
  renderFavorites();
  const lastCity = localStorage.getItem('lastCity');
  if (lastCity) fetchWeather(lastCity);
  else {
    // try geolocation silently on first load (do not panic if denied)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
        () => {} // ignore denial here
      );
    }
  }

  // register service worker (optional)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('SW register failed', err));
  }
})();

/* expose for tests */
if (typeof window !== 'undefined') {
  window.__WeatherNow = {
    renderWeatherCard,
    renderFavorites,
    addFavorite,
    removeFavorite,
    loadFavorites,
    fetchWeather,
    fetchForecast
  };
}
