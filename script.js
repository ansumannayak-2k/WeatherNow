// script.js — starter for WeatherNow
// -------------------------------
// TODOs for next batches:
//  - Add function fetchWeather(city) to call OpenWeatherMap API
//  - Add geolocation handling to get local city
//  - Add favorites (localStorage) features
//  - Add unit toggle (C/F) and 5-day forecast
// -------------------------------

const searchForm = document.getElementById('searchForm');
const cityInput = document.getElementById('cityInput');
const weatherCard = document.getElementById('weatherCard');
const messageEl = document.getElementById('message');
const favoriteList = document.getElementById('favoriteList');
const themeToggle = document.getElementById('themeToggle');

let units = 'metric'; // 'metric' for C, 'imperial' for F (will use later)

// simple helper to show status messages
function showMessage(text, type = 'info') {
  messageEl.textContent = text;
  // could add styling/class names based on type (error/success)
}

// placeholder render function
function renderWeatherPlaceholder() {
  weatherCard.innerHTML = `
    <p class="placeholder">Search a city to see current weather.</p>
  `;
}

// initial render
renderWeatherPlaceholder();

// form submit handler (we'll implement fetch in Batch 2)
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) {
    showMessage('Please enter a city name.');
    return;
  }
  showMessage(`Searching weather for ${city} ...`);
  // TODO: call fetchWeather(city)
  setTimeout(() => {
    showMessage('This is a placeholder — weather fetching will be implemented in Batch 2.');
  }, 700);
});

// theme toggle (placeholder)
themeToggle.addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
  themeToggle.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
});
