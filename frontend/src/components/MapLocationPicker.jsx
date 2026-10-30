import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchAddressFromCoords } from '../utils/geoUtils';

// Fix Leaflet's default icon path issues in bundlers (Client-only / SSR Safe)
if (typeof window !== 'undefined' && L?.Icon?.Default) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

// Custom Precision SVG Pin Icon with exact pixel-anchored needle tip
const createCustomPin = () => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `<div style="width:30px;height:40px;display:flex;align-items:center;justify-content:center;cursor:grab;">
      <svg width="30" height="40" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));">
        <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 40 15 40C15 40 30 26.25 30 15C30 6.71573 23.2843 0 15 0Z" fill="url(#pinGrd)" stroke="#ffffff" stroke-width="2"/>
        <circle cx="15" cy="15" r="5" fill="#ffffff"/>
        <defs>
          <linearGradient id="pinGrd" x1="0" y1="0" x2="30" y2="40" gradientUnits="userSpaceOnUse">
            <stop stop-color="#059669"/>
            <stop offset="1" stop-color="#10b981"/>
          </linearGradient>
        </defs>
      </svg>
    </div>`,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -40],
  });
};

const MAP_MODES = {
  satellite: {
    label: 'Satellite View',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M3.6 9h16.8M3.6 15h16.8" />
        <path d="M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18" />
      </svg>
    ),
    base: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlay: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Satellite Imagery',
  },
  street: {
    label: 'Street Map',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
    base: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    overlay: null,
    attribution: '&copy; OpenStreetMap contributors',
  },
};

export function MapLocationPicker({
  latitude = 29.3919,
  longitude = 79.4542,
  onLocationChange,
  onAddressDetected,
  initialMapMode = 'satellite',
  defaultCity = '',
  defaultState = '',
}) {
  if (typeof window === 'undefined') return null;

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const baseLayerRef = useRef(null);
  const overlayLayerRef = useRef(null);
  const markerRef = useRef(null);

  // Map Mode: 'satellite' | 'street'
  const [mapMode, setMapMode] = useState(initialMapMode);

  // Reverse Geocoding helper with robust PIN code resolution
  const reverseGeocode = async (lat, lng) => {
    try {
      const detected = await fetchAddressFromCoords(lat, lng);
      if (detected && onAddressDetected) {
        onAddressDetected(detected);
      }
    } catch (e) {
      console.warn('Reverse geocoding note:', e.message);
    }
  };

  // Helper to switch map tiles
  const applyTileLayer = (mode, map) => {
    if (!map) return;

    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current);
      baseLayerRef.current = null;
    }
    if (overlayLayerRef.current) {
      map.removeLayer(overlayLayerRef.current);
      overlayLayerRef.current = null;
    }

    const config = MAP_MODES[mode] || MAP_MODES.satellite;

    const baseLayer = L.tileLayer(config.base, {
      maxZoom: 19,
      attribution: config.attribution,
    }).addTo(map);
    baseLayerRef.current = baseLayer;

    if (config.overlay) {
      const overlayLayer = L.tileLayer(config.overlay, {
        maxZoom: 19,
      }).addTo(map);
      overlayLayerRef.current = overlayLayer;
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let resizeObserver = null;

    if (!mapInstanceRef.current) {
      const initialLat = Number(latitude) || 29.3919;
      const initialLng = Number(longitude) || 79.4542;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 16,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Apply initial satellite tile layer
      applyTileLayer(mapMode, map);

      // Add Draggable Marker
      const marker = L.marker([initialLat, initialLng], {
        icon: createCustomPin(),
        draggable: true,
      }).addTo(map);

      marker.bindPopup('<b>Property Spot</b><br><span style="font-size:11px;color:#666">Drag pin to exact roof or building.</span>');

      marker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        const fixedLat = parseFloat(lat.toFixed(6));
        const fixedLng = parseFloat(lng.toFixed(6));
        if (onLocationChange) onLocationChange(fixedLat, fixedLng);
        reverseGeocode(fixedLat, fixedLng);
      });

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        const fixedLat = parseFloat(lat.toFixed(6));
        const fixedLng = parseFloat(lng.toFixed(6));
        marker.setLatLng([fixedLat, fixedLng]);
        if (onLocationChange) onLocationChange(fixedLat, fixedLng);
        reverseGeocode(fixedLat, fixedLng);
      });

      // Keep Leaflet tiles crisp & fully drawn on dynamic container resize
      if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        });
        resizeObserver.observe(mapContainerRef.current);
      }

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Switch Layer when mapMode changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      applyTileLayer(mapMode, mapInstanceRef.current);
    }
  }, [mapMode]);

  // Update marker when coordinates change externally
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      const lat = Number(latitude) || 29.3919;
      const lng = Number(longitude) || 79.4542;
      markerRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.panTo([lat, lng]);
    }
  }, [latitude, longitude]);

  return (
    <div className="w-full h-full">
      {/* Interactive Map Container with Floating Satellite & Street Switcher */}
      <div className="relative w-full h-full overflow-hidden z-0">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Top Left Instructions Badge */}
        <div className="absolute top-2 left-2 z-[400] bg-slate-950/85 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-normal shadow-md border border-slate-800 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Click map or drag pin to pinpoint</span>
        </div>

        {/* Top Right Satellite & Street Switcher */}
        <div className="absolute top-2 right-2 z-[400] bg-slate-950/85 backdrop-blur-md p-0.5 rounded-lg shadow-md border border-slate-800 flex items-center gap-0.5">
          {Object.entries(MAP_MODES).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMapMode(key);
              }}
              className={`px-2 py-0.5 rounded-md text-[11px] font-normal transition-all cursor-pointer flex items-center gap-1 ${
                mapMode === key
                  ? 'bg-emerald-600 text-white shadow-xs font-medium'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {item.icon}
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MapLocationPicker;
