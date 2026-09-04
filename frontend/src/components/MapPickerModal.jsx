import { useState, useEffect } from 'react';

// Famous Cities with Coordinates for Uttarakhand & North India
const CITY_HOTSPOTS = [
  { name: 'Nainital', lat: 29.3803, lon: 79.4636 },
  { name: 'Bhimtal', lat: 29.3500, lon: 79.5667 },
  { name: 'Bhowali', lat: 29.3833, lon: 79.5167 },
  { name: 'Haldwani', lat: 29.2183, lon: 79.5130 },
  { name: 'Mukteshwar', lat: 29.4722, lon: 79.6472 },
  { name: 'Almora', lat: 29.5971, lon: 79.6591 },
  { name: 'Dehradun', lat: 30.3165, lon: 78.0322 },
  { name: 'Delhi', lat: 28.6139, lon: 77.2090 },
];

export function MapPickerModal({ isOpen, onClose, onSelectLocation }) {
  const [pinPos, setPinPos] = useState({ lat: 29.3803, lon: 79.4636 });
  const [extractedCity, setExtractedCity] = useState('Nainital');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Dynamically load Leaflet script & CSS if not present
  useEffect(() => {
    if (!isOpen) return;

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    if (!window.L) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setLeafletLoaded(true);
      document.body.appendChild(script);
    } else {
      setLeafletLoaded(true);
    }
  }, [isOpen]);

  // Initialize interactive Leaflet map inside container when open
  useEffect(() => {
    if (!isOpen || !leafletLoaded || !window.L) return;

    const mapContainer = document.getElementById('interactive-picker-map');
    if (!mapContainer) return;

    // Remove old map instance if already initialized
    if (mapContainer._leaflet_id) {
      mapContainer._leaflet_id = null;
      mapContainer.innerHTML = '';
    }

    const map = window.L.map('interactive-picker-map', {
      zoomControl: false,
    }).setView([pinPos.lat, pinPos.lon], 11);

    window.L.control.zoom({ position: 'bottomright' }).addTo(map);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);

    // Initial marker
    let marker = window.L.marker([pinPos.lat, pinPos.lon], { draggable: true }).addTo(map);
    marker.bindPopup(`<b>${extractedCity}</b><br>${pinPos.lat.toFixed(3)}, ${pinPos.lon.toFixed(3)}`).openPopup();

    // Reverse geocode handler
    const handleLocationSelect = async (lat, lon) => {
      setPinPos({ lat, lon });
      setIsGeocoding(true);

      // Check closest city hotspot first
      const closest = CITY_HOTSPOTS.find(
        (c) => Math.abs(c.lat - lat) < 0.15 && Math.abs(c.lon - lon) < 0.15
      );

      let cityName = closest ? closest.name : 'Selected Point';

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
        );
        const data = await response.json();
        if (data && data.address) {
          const extracted =
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.suburb ||
            data.address.county ||
            data.address.state_district;
          if (extracted) {
            cityName = extracted;
          }
        }
      } catch (e) {
        console.warn('Reverse geocoding fallback:', e);
      }

      setExtractedCity(cityName);
      setIsGeocoding(false);
      marker.setLatLng([lat, lon]);
      marker.bindPopup(`<b>${cityName}</b>`).openPopup();
    };

    // Click map event
    map.on('click', (e) => {
      handleLocationSelect(e.latlng.lat, e.latlng.lng);
    });

    // Drag marker event
    marker.on('dragend', (e) => {
      const position = marker.getLatLng();
      handleLocationSelect(position.lat, position.lng);
    });

    return () => {
      map.remove();
    };
  }, [isOpen, leafletLoaded]);

  if (!isOpen) return null;

  const handleSelectHotspot = (city) => {
    setPinPos({ lat: city.lat, lon: city.lon });
    setExtractedCity(city.name);
  };

  const handleApply = (finalLocation) => {
    const loc = finalLocation || extractedCity;
    if (onSelectLocation) {
      onSelectLocation(loc);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="fixed inset-0" onClick={onClose} />

      {/* Compact & Lightweight Modal Container */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Compact Modal Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2">
            <span className="text-base">📍</span>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">
              Choose Location
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 space-y-3">
          {/* Quick Destination Hotspot Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
            {CITY_HOTSPOTS.map((city) => {
              const isSelected = extractedCity.toLowerCase() === city.name.toLowerCase();
              return (
                <button
                  key={city.name}
                  type="button"
                  onClick={() => handleSelectHotspot(city)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border shrink-0 cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-cyan-500/50'
                  }`}
                >
                  {city.name}
                </button>
              );
            })}
          </div>

          {/* Interactive Map View */}
          <div className="relative w-full h-56 sm:h-60 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner bg-slate-100 dark:bg-slate-800">
            <div id="interactive-picker-map" className="w-full h-full z-0" />

            {/* Extracted City Overlay Badge */}
            <div className="absolute top-2.5 left-2.5 z-10 bg-slate-950/85 text-white backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 shadow-md flex items-center gap-2 max-w-[80%]">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
              <span className="font-bold text-xs text-white truncate">
                {isGeocoding ? 'Detecting...' : extractedCity}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 px-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Location: <span className="font-bold text-cyan-600 dark:text-cyan-400">{extractedCity}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleApply()}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-sm cursor-pointer active:scale-95 transition-all"
            >
              Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MapPickerModal;
