// netlify/functions/weather-proxy.js
const fetch = require('node-fetch');

exports.handler = async function (event) {
  const apiKey = process.env.OPENWEATHER_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server missing API key' })
    };
  }

  // Example incoming queries:
  // /.netlify/functions/weather-proxy?q=London&units=metric
  // /.netlify/functions/weather-proxy?lat=12.34&lon=56.78&units=metric
  const params = new URLSearchParams({ appid: apiKey });
  const incoming = event.queryStringParameters || {};

  // copy allowed params (q or lat/lon + units)
  if (incoming.q) params.set('q', incoming.q);
  if (incoming.lat) params.set('lat', incoming.lat);
  if (incoming.lon) params.set('lon', incoming.lon);
  if (incoming.units) params.set('units', incoming.units);

  const url = `https://api.openweathermap.org/data/2.5/${
    incoming.forecast === 'true' ? 'forecast' : 'weather'
  }?${params.toString()}`;

  try {
    const res = await fetch(url);
    const text = await res.text();
    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: text
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Proxy request failed', details: err.message })
    };
  }
};
