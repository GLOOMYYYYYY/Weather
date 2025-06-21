import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_KEY = '2ea77663e6ff9be68a5948a49338f0a3'; // OpenWeatherMap API key

function App() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const updateDropdownPosition = () => {
    if (searchContainerRef.current) {
      const rect = searchContainerRef.current.getBoundingClientRect();
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        const mainRect = mainContent.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom - mainRect.top,
          left: rect.left - mainRect.left,
          width: rect.width
        });
      }
    }
  };

  const fetchWeather = async (e: React.FormEvent | null = null, cityOverride?: string) => {
    if (e) e.preventDefault();
    setError('');
    setWeather(null);
    setLoading(true);
    try {
      const cityToFetch = cityOverride || city;
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityToFetch)}&appid=${API_KEY}&units=metric`
      );
      setWeather(response.data);
    } catch (err) {
      setWeather(null);
      setError('City not found or API error.');
    }
    setLoading(false);
  };

  // Autocomplete: fetch city suggestions as user types
  useEffect(() => {
    if (!city) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        // возвращаемся к geo‑endpoint для полного списка кандидатов
        const resp = await axios.get(
          `https://api.openweathermap.org/geo/1.0/direct`,
          { params: { q: city, limit: 50, appid: API_KEY } }
        );
        const list = Array.isArray(resp.data) ? resp.data : [];

        // мапим в { name, state, country }
        const mapped = list.map((c: any) => ({
          name: c.name,
          state: c.state,
          country: c.country
        }));

        // КЛИЕНТ‑САЙД префикс‑фильтр, чтобы Dnipr → Dnipro
        const prefix = city.trim().toLowerCase();
        const matched = mapped
          .filter((item: any) => item.name.toLowerCase().startsWith(prefix))
          .sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

        setSuggestions(matched);
        setShowSuggestions(matched.length > 0);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    // eslint-disable-next-line
  }, [city]);

  // Update dropdown position when suggestions show/hide
  useEffect(() => {
    if (showSuggestions && suggestions.length > 0) {
      updateDropdownPosition();
    }
  }, [showSuggestions, suggestions]);

  return (
    <>
      <div id="background-blur" />
      <div id="main-content">
        <header className="App-header">
          <div className="glass-title">Weather App</div>
          <form className="glass" onSubmit={fetchWeather} autoComplete="off">
            <div 
              ref={searchContainerRef}
              className="search-container" 
              style={{ display: 'flex', width: '100%', gap: '0.5rem', alignItems: 'center' }}
            >
              <input
                ref={inputRef}
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Enter city name"
                required
                onFocus={() => setShowSuggestions(suggestions.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                style={{ flex: 1, minWidth: 0 }}
                autoComplete="off"
              />
              <button type="submit" style={{ width: '100px' }}>Get Weather</button>
            </div>
          </form>
          
          {/* Dropdown positioned outside the form */}
          {showSuggestions && suggestions.length > 0 && (
            <ul 
              className="suggestions-list"
              style={{
                position: 'absolute',
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
                zIndex: 1000
              }}
            >
              {suggestions.slice(0, 5).map((s, i) => {
                const newCity = s.name + (s.state ? ', ' + s.state : '') + ', ' + s.country;
                return (
                  <li key={i}
                    onMouseDown={() => {
                      setCity(newCity);
                      setShowSuggestions(false);
                      setSuggestions([]);
                      setTimeout(() => {
                        if (inputRef.current) inputRef.current.value = newCity;
                        fetchWeather(null, newCity);
                      }, 0);
                    }}>
                    {s.name}{s.state ? ', ' + s.state : ''}, {s.country}
                  </li>
                );
              })}
            </ul>
          )}
          
          {loading && <div className="glass weather-card"><p>Loading...</p></div>}
          {error && <div className="glass weather-card"><p style={{ color: 'salmon' }}>{error}</p></div>}
          {weather && (
            <div className="glass weather-card">
              <h2 style={{ margin: 8 }}>{weather.name}, {weather.sys.country}</h2>
              <p style={{ fontSize: 32, margin: 8 }}>{Math.round(weather.main.temp)}°C</p>
              <p style={{ margin: 8 }}>{weather.weather[0].main} ({weather.weather[0].description})</p>
              <p style={{ margin: 8 }}>Feels like: {Math.round(weather.main.feels_like)}°C</p>
              <p style={{ margin: 8 }}>Humidity: {weather.main.humidity}%</p>
              <p style={{ margin: 8 }}>Wind: {Math.round(weather.wind.speed)} m/s</p>
            </div>
          )}
        </header>
      </div>
    </>
  );
}

export default App;
