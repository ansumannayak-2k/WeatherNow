# WeatherNow — Real-Time Weather App
WeatherNow is a React-based real-time weather application that allows users to search for city weather, use geolocation to detect their current location, and view detailed weather information with a clean, responsive UI.

## Live Demo  **[View Deployed App on Netlify](https://weather-now-project-078921.netlify.app/)**

## Features
- Search weather by city name
- Geolocation-based weather lookup for current location
- Temperature unit toggle: **°C / °F**
- Save favourite locations using `localStorage`
- Caching of API responses to reduce repeat API calls
- Mobile-first responsive UI with **dark mode**
- Proper error handling:
  - Invalid city (404)
  - Network/API errors
  - Rate limit errors

## Tech Stack
**Frontend:** ReactJS, JavaScript (ES6+), CSS3
**API:** [OpenWeatherMap API](https://openweathermap.org/api)
**State & Data:**
- React functional components & hooks
- `localStorage` for favourites and cached data
**Tools:** Git, GitHub, VS Code, Chrome DevTools

## Testing
Run Jest tests locally: npm install and npm test.
Ensure your package.json includes: "jest": { "testEnvironment": "jsdom" }

## How to Run Locally
1. Clone the repo: git clone https://github.com/ansumannayak-2k/WeatherNow.git
2. Navigate to the folder: cd weathernow
3. Open the project code 
4. Start a live server (VS Code extension recommended)

## Author
**Ansuman Nayak**  
Email: ansumannayak800@gmail.com 
LinkedIn: https://www.linkedin.com/in/ansumannayak-2k/
GitHub: https://github.com/ansumannayak-2k





