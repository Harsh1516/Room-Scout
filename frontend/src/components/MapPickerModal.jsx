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
  if (typeof window === 'undefined' || !isOpen) return null;

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

  const handleApply = (finalLocation, coords = pinPos, isNearby = false) => {
    const loc = finalLocation || extractedCity;
    const finalCoords = coords || pinPos;
    if (onSelectLocation) {
      onSelectLocation(loc, finalCoords, isNearby);
    }
    onClose();
  };

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
    const getPopupHtml = (cName, lPos) => `
      <div style="min-width: 140px; padding: 4px; font-family: inherit;">
        <b style="font-size: 13px; color: #0f172a; display: block; margin-bottom: 2px;">${cName}</b>
        <div style="font-size: 10px; color: #64748b; margin-bottom: 8px;">${lPos.lat.toFixed(3)}, ${lPos.lon.toFixed(3)}</div>
        <button id="leaflet-popup-nearby-btn" style="width: 100%; padding: 6px 12px; background: #0f172a; color: #fff; font-size: 11px; font-weight: 600; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.15); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
          <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10b981;"></span>
          <span>Filter Nearby Stays</span>
        </button>
      </div>
    `;
    marker.bindPopup(getPopupHtml(extractedCity, pinPos)).openPopup();

    // Attach click handler to popup nearby button
    const wirePopupBtn = (currentCName, currentPos) => {
      setTimeout(() => {
        const btn = document.getElementById('leaflet-popup-nearby-btn');
        if (btn) {
          btn.onclick = () => {
            handleApply(currentCName, currentPos, true);
          };
        }
      }, 50);
    };

    wirePopupBtn(extractedCity, pinPos);
    map.on('popupopen', () => wirePopupBtn(extractedCity, pinPos));

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
      marker.bindPopup(getPopupHtml(cityName, { lat, lon })).openPopup();
      wirePopupBtn(cityName, { lat, lon });
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

    // Invalidate size to guarantee smooth tile rendering in 2x height
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
    };
  }, [isOpen, leafletLoaded]);

  if (!isOpen) return null;

  const handleSelectHotspot = (city) => {
    setPinPos({ lat: city.lat, lon: city.lon });
    setExtractedCity(city.name);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1f1b16]/70 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-xl sm:max-w-2xl bg-[#fbf7f4] text-[#2e1b10] rounded-2xl shadow-2xl overflow-hidden border border-[#e2d2c5] z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Compact Modal Header */}
        <div className="relative px-4 py-3 border-b border-[#ebdcd0] flex items-center justify-center bg-[#f4ece5]">
          <h2 className="text-sm font-semibold text-[#2e1b10] text-center">
            Choose Location
          </h2>

          <button
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-[#7d5740] hover:text-[#2e1b10] hover:bg-[#ebdcd0] transition-colors text-xs font-semibold cursor-pointer"
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
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border shrink-0 cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-[#824a25] text-white border-[#824a25] shadow-xs'
                      : 'bg-[#f0e4db] border-[#ddcbbe] text-[#54331e] hover:border-[#824a25]/60'
                  }`}
                >
                  {city.name}
                </button>
              );
            })}
          </div>

          {/* Interactive Map View with 2x Height */}
          <div className="relative w-full h-[460px] sm:h-[500px] rounded-2xl overflow-hidden border border-[#e2d2c5] shadow-inner bg-[#f0e4db]">
            <div id="interactive-picker-map" className="w-full h-full z-0" />

            {/* Extracted City Overlay Badge */}
            <div className="absolute top-3 left-3 z-10 bg-slate-900/90 text-white px-3 py-1.5 rounded-xl border border-white/15 shadow-md flex items-center gap-2 max-w-[55%] backdrop-blur-md">
              <div className="w-2 h-2 rounded-full bg-[#e08b52] shrink-0" />
              <span className="font-semibold text-xs text-white truncate">
                {isGeocoding ? 'Detecting...' : extractedCity}
              </span>
            </div>

            {/* Premium Minimal Floating Nearby Button inside Map */}
            <button
              type="button"
              onClick={() => handleApply(extractedCity, pinPos, true)}
              className="absolute top-3 right-3 z-10 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-950 text-white text-xs font-semibold shadow-lg shadow-black/20 border border-white/20 backdrop-blur-md transition-all cursor-pointer active:scale-95"
              title="Filter stays near this pinpoint location"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Nearby</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 px-4 border-t border-[#ebdcd0] bg-[#f4ece5]/90 flex items-center justify-between">
          <div className="text-xs text-[#7d5740]">
            Location: <span className="font-semibold text-[#824a25]">{extractedCity}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-[#7d5740] hover:text-[#2e1b10] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleApply(extractedCity, pinPos, true)}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold text-xs transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-2xs"
              title="Filter stays near this pinpoint location"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Nearby</span>
            </button>
            <button
              type="button"
              onClick={() => handleApply(extractedCity, pinPos, false)}
              className="px-4 py-1.5 rounded-xl bg-[#1f1b16] text-white font-semibold text-xs hover:bg-[#0f766e] transition-colors cursor-pointer active:scale-95"
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
