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

  const handleApply = (finalLocation, coords = pinPos) => {
    const loc = finalLocation || extractedCity;
    const finalCoords = coords || pinPos;
    if (onSelectLocation) {
      onSelectLocation(loc, finalCoords, false);
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
      <div style="min-width: 130px; padding: 4px; font-family: inherit;">
        <b style="font-size: 13px; color: #0f172a; display: block; margin-bottom: 2px;">${cName}</b>
        <div style="font-size: 10px; color: #64748b; margin-bottom: 8px;">${lPos.lat.toFixed(3)}, ${lPos.lon.toFixed(3)}</div>
        <button id="leaflet-popup-select-btn" style="width: 100%; padding: 6px 12px; background: #2b2c37; color: #fff; font-size: 11px; font-weight: 600; border-radius: 9999px; border: 1px solid #3b3d4d; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
          <span>Confirm This Point</span>
        </button>
      </div>
    `;
    marker.bindPopup(getPopupHtml(extractedCity, pinPos)).openPopup();

    // Attach click handler to popup select button
    const wirePopupBtn = (currentCName, currentPos) => {
      setTimeout(() => {
        const btn = document.getElementById('leaflet-popup-select-btn');
        if (btn) {
          btn.onclick = () => {
            handleApply(currentCName, currentPos);
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

    // Invalidate size to guarantee smooth tile rendering
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
    <div className="fixed inset-0 z-50 bg-[#121418]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="fixed inset-0 cursor-pointer" onClick={onClose} />

      {/* Modal Container with Left Panel Settings: Rounded [28px]/[36px], White, Border, Shadow */}
      <div className="relative w-full max-w-xl sm:max-w-2xl bg-white text-[#1f1b16] rounded-[28px] sm:rounded-[36px] shadow-[0_20px_50px_rgba(0,0,0,0.22)] overflow-hidden border border-slate-200/90 z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header: Centered Choose Location, No cross button (matching left panel) */}
        <div className="relative px-4 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-center bg-white">
          <h2 className="text-[24px] font-bold text-[#1f1b16] tracking-tight leading-none">
            Choose Location
          </h2>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3">
          {/* Quick Destination Hotspot Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
            {CITY_HOTSPOTS.map((city) => {
              const isSelected = extractedCity.toLowerCase() === city.name.toLowerCase();
              return (
                <button
                  key={city.name}
                  type="button"
                  onClick={() => handleSelectHotspot(city)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border shrink-0 cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-[#2b2c37] text-white border-[#3b3d4d] shadow-xs'
                      : 'bg-slate-100 border-slate-200/80 text-slate-700 hover:bg-slate-200/80'
                  }`}
                >
                  {city.name}
                </button>
              );
            })}
          </div>

          {/* Interactive Map View */}
          <div className="relative w-full h-[440px] sm:h-[480px] rounded-2xl overflow-hidden border border-slate-200/90 shadow-inner bg-slate-100">
            <div id="interactive-picker-map" className="w-full h-full z-0" />

            {/* Extracted City Overlay Badge */}
            <div className="absolute top-3 left-3 z-10 bg-[#2b2c37]/90 text-white px-3.5 py-1.5 rounded-full border border-white/15 shadow-md flex items-center gap-2 max-w-[65%] backdrop-blur-md">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="font-semibold text-xs text-white truncate">
                {isGeocoding ? 'Detecting...' : extractedCity}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 px-5 border-t border-slate-100 bg-white flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Location: <span className="font-semibold text-slate-900">{extractedCity}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleApply(extractedCity, pinPos)}
              className="min-h-[42px] px-5 py-2 rounded-full bg-[#2b2c37] hover:bg-[#343542] text-white border border-[#3b3d4d] font-semibold text-sm transition-all cursor-pointer active:scale-95 shadow-xs"
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
