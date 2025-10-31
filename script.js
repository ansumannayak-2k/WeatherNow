/* WeatherNow - Fixed working version */

const API_KEY = '0ff4b4aee450de38b133dce284102288';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';
let units = localStorage.getItem('wn_units') || 'metric';

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

/* Helper: messages + spinner */
function showMessage(text, type = 'info') {
  messageEl.textContent = text;
  messageEl.dataset.type = type;
}
function clearMessage() {
  messageEl.textContent = '';
  delete messageEl.dataset.type;
}
function showSpinner() { spinnerEl.hidden = false; }
function hideSpinner() { spinnerEl.hidden = true; }

/* Simple localStorage caching */
function setCache(key, data) {
  localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
}
function getCache(key, ttl = 120000) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (Date.now() - parsed.ts > ttl) return null;
  return parsed.data;
}

/* === Favorites === */
const FAV_KEY = 'wn_favorites_v1';
function loadFavorites() {
  return JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
}
function saveFavorites(favs) {
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  renderFavorites();
}
function addFavorite(city) {
  const favs = loadFavorites();
  if (!favs.includes(city)) {
    favs.unshift(city);
    saveFavorites(favs.slice(0, 8));
    showMessage(`${city} added to favorites`);
  }
}
function removeFavorite(city) {
  saveFavorites(loadFavorites().filter(c => c !== city));
}
function clearFavorites() {
  localStorage.removeItem(FAV_KEY);
  renderFavorites();
}
function renderFavorites() {
  const favs = loadFavorites();
  favCountEl.textContent = `${favs.length} saved`;
  favoriteList.innerHTML = favs.length
    ? favs.map(c => `
      <div class="fav-pill">
        <button class="favorite-btn fav-open" data-city="${c}">${c}</button>
        <button class="favorite-remove" data-city="${c}">×</button>
      </div>`).join('')
    : `<p class="placeholder">No favorites yet.</p>`;

  favoriteList.querySelectorAll('.fav-open').forEach(btn =>
    btn.addEventListener('click', e => fetchWeather(e.target.dataset.city))
  );
  favoriteList.querySelectorAll('.favorite-remove').forEach(btn =>
    btn.addEventListener('click', e => removeFavorite(e.target.dataset.city))
  );
}

/* === Theme === */
themeToggle?.addEventListener('click', () => {
  const dark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('wn_theme', dark ? 'dark' : 'light');
});

/* === Fetch Weather === */
async function fetchWeather(city) {
  if (!city) return;
  clearMessage();
  showSpinner();
  weatherCard.innerHTML = `<p class="placeholder">Loading weather for ${city}...</p>`;
  const cacheKey = `wn_${city}_${units}`;
  const cached = getCache(cacheKey);
  if (cached) renderWeatherCard(cached);

  try {
    const res = await fetch(`${BASE_URL}?q=${encodeURIComponent(city)}&units=${units}&appid=${API_KEY}`);
    hideSpinner();
    if (!res.ok) throw new Error("City not found");
    const data = await res.json();
    setCache(cacheKey, data);
    renderWeatherCard(data);
    fetchForecast(city);
    localStorage.setItem('lastCity', data.name);
  } catch (err) {
    hideSpinner();
    showMessage(err.message || 'Failed to fetch weather', 'error');
  }
}

/* === Fetch Forecast === */
async function fetchForecast(city) {
  try {
    const res = await fetch(`${FORECAST_URL}?q=${encodeURIComponent(city)}&units=${units}&appid=${API_KEY}`);
    if (!res.ok) return;
    const data = await res.json();
    renderForecast(aggregateDailyForecast(data));
  } catch {}
}

function aggregateDailyForecast(raw) {
  if (!raw.list) return [];
  const map = {};
  raw.list.forEach(item => {
    const date = item.dt_txt.split(' ')[0];
    if (!map[date]) map[date] = { min: item.main.temp_min, max: item.main.temp_max, icon: item.weather[0].icon };
    else {
      map[date].min = Math.min(map[date].min, item.main.temp_min);
      map[date].max = Math.max(map[date].max, item.main.temp_max);
    }
  });
  return Object.entries(map).slice(0, 5).map(([date, d]) => ({
    date,
    min: Math.round(d.min),
    max: Math.round(d.max),
    icon: `https://openweathermap.org/img/wn/${d.icon}@2x.png`
  }));
}
function renderForecast(days) {
  const c = document.getElementById('forecastContainer') || document.createElement('div');
  c.id = 'forecastContainer';
  c.className = 'forecast-container';
  c.innerHTML = `
    <h3>5-Day Forecast</h3>
    <div class="forecast-row">
      ${days.map(d => `
        <div class="forecast-card">
          <div>${d.date}</div>
          <img src="${d.icon}" width="48" height="48">
          <div>${d.max}° / ${d.min}°</div>
        </div>`).join('')}
    </div>`;
  weatherCard.insertAdjacentElement('afterend', c);
}

/* === Render weather card === */
function renderWeatherCard(data) {
  const cityName = `${data.name}, ${data.sys.country}`;
  const w = data.weather[0];
  const temp = Math.round(data.main.temp);
  const unit = units === 'metric' ? '°C' : '°F';
  weatherCard.innerHTML = `
    <div class="weather-head">
      <h2>${cityName}</h2>
      <img src="https://openweathermap.org/img/wn/${w.icon}@2x.png" alt="${w.description}">
      <p>${w.description}</p>
    </div>
    <div class="temps">
      <div class="large-temp">${temp}${unit}</div>
      <div>Humidity: ${data.main.humidity}%</div>
      <div>Wind: ${data.wind.speed} ${units === 'metric' ? 'm/s' : 'mph'}</div>
    </div>
    <div style="margin-top:1rem;display:flex;gap:.5rem">
      <button id="saveFavBtn" class="favorite-btn">Add to Favorites</button>
      <button id="toggleUnitBtn" class="favorite-btn">${units === 'metric' ? 'Switch to °F' : 'Switch to °C'}</button>
    </div>
  `;
  document.getElementById('saveFavBtn').onclick = () => addFavorite(data.name);
  document.getElementById('toggleUnitBtn').onclick = toggleUnitsAndRefresh;
}

/* === Units === */
function toggleUnitsAndRefresh() {
  units = units === 'metric' ? 'imperial' : 'metric';
  localStorage.setItem('wn_units', units);
  const lastCity = localStorage.getItem('lastCity');
  if (lastCity) fetchWeather(lastCity);
}

/* === Events === */
searchForm?.addEventListener('submit', e => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return showMessage('Enter a city name', 'error');
  fetchWeather(city);
});
locationBtn?.addEventListener('click', () => {
  if (!navigator.geolocation) return showMessage('Geolocation not supported', 'error');
  showMessage('Fetching location...');
  navigator.geolocation.getCurrentPosition(pos => {
    fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
  }, () => showMessage('Location access denied', 'error'));
});
async function fetchWeatherByCoords(lat, lon) {
  const res = await fetch(`${BASE_URL}?lat=${lat}&lon=${lon}&units=${units}&appid=${API_KEY}`);
  if (res.ok) {
    const data = await res.json();
    renderWeatherCard(data);
    fetchForecast(data.name);
    localStorage.setItem('lastCity', data.name);
  }
}
clearFavsBtn?.addEventListener('click', () => {
  if (confirm('Clear all favorites?')) clearFavorites();
});

/* === Init === */
(function init() {
  renderFavorites();
  const theme = localStorage.getItem('wn_theme');
  if (theme === 'dark') document.documentElement.classList.add('dark');
  const last = localStorage.getItem('lastCity');
  if (last) fetchWeather(last);
})();
