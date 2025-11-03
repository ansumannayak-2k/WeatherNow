/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { getByText, getByRole, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';

// Mock fetch to prevent network requests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);

beforeAll(() => {
  // Clear localStorage before each test suite
  localStorage.clear();
  
  // load DOM from index.html (simple static minimal markup)
  document.body.innerHTML = `
    <main class="container main" role="main">
      <form id="searchForm" class="search-form">
        <input id="cityInput" type="search" placeholder="Enter city name" />
        <button type="submit">Search</button>
      </form>
      <button id="locationBtn" type="button">📍 Use my location</button>
      <button id="themeToggle" type="button">🌙</button>
      <section id="weatherCard" class="weather-card" aria-live="polite"></section>
      <div id="message" role="status" aria-live="polite"></div>
      <div id="spinner" hidden></div>
      <section id="favorites" class="favorites">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h2>Favorites</h2>
          <div style="display:flex;align-items:center;gap:.5rem">
            <div id="favCount" style="color:var(--muted);font-size:.9rem">0 saved</div>
            <button id="clearFavsBtn" type="button" class="favorite-btn">Clear All</button>
          </div>
        </div>
        <div id="favoriteList" class="favorite-list" style="margin-top:.5rem"></div>
      </section>
    </main>
  `;

  // require the script (ensure script.js attaches things to window)
  require('../script.js'); // path relative to project root — adjust if needed
});

beforeEach(() => {
  // Clear localStorage before each test
  localStorage.clear();
  // Reset fetch mock
  fetch.mockClear();
});

test('renderWeatherCard produces content for sample data', () => {
  const sample = {
    name: 'Testville',
    sys: { country: 'US' },
    weather: [{ icon: '01d', description: 'clear sky' }],
    main: { temp: 20, feels_like: 19, humidity: 50, pressure: 1012 },
    wind: { speed: 2 },
    dt: 1620000000
  };

  // call renderWeatherCard if exposed, else call via global
  if (window.__WeatherNow?.renderWeatherCard) {
    window.__WeatherNow.renderWeatherCard(sample);
  } else {
    // fallback: attempt to call global renderWeatherCard
    // (depends on how you structured script.js)
    renderWeatherCard(sample);
  }

  expect(screen.getByText('Testville, US')).toBeInTheDocument();
  expect(screen.getByText(/Humidity/i)).toBeInTheDocument();
});

test('favorites add/remove roundtrip', async () => {
  // use the exposed API to add favorite
  window.__WeatherNow?.addFavorite?.('CityA');
  window.__WeatherNow?.renderFavorites?.();

  expect(document.querySelector('#favoriteList')).toHaveTextContent('CityA');

  // remove via removeFavorite
  window.__WeatherNow?.removeFavorite?.('CityA');
  window.__WeatherNow?.renderFavorites?.();
  expect(document.querySelector('#favoriteList')).not.toHaveTextContent('CityA');
});
