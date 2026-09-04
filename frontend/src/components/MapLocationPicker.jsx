import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issues in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Premium SVG Pin Icon
const createCustomPin = () => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `<div style="
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid #ffffff;
      box-shadow: 0 6px 16px rgba(0,0,0,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 10px;
        height: 10px;
        background-color: #ffffff;
        border-radius: 50%;
        transform: rotate(45deg);
      "></div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
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
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const baseLayerRef = useRef(null);
  const overlayLayerRef = useRef(null);
  const markerRef = useRef(null);

  // Map Mode: 'satellite' | 'street'
  const [mapMode, setMapMode] = useState(initialMapMode);

  // Reverse Geocoding helper (OpenStreetMap Nominatim)
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'StayHub-Property-Locator/1.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.address && onAddressDetected) {
          const addr = data.address;
          const roadParts = [
            addr.building || addr.amenity || addr.house_name || addr.shop || addr.tourism || '',
            addr.road || addr.pedestrian || addr.footway || addr.path || addr.street || '',
            addr.suburb || addr.neighbourhood || addr.residential || addr.colony || addr.sector || addr.hamlet || '',
          ].filter(Boolean);

          const road = roadParts.join(', ') || addr.road || addr.suburb || addr.neighbourhood || addr.village || data.display_name?.split(',')?.[0]?.trim() || '';
          const city = addr.city || addr.town || addr.city_district || addr.village || addr.county || '';
          const state = addr.state || '';
          const postcode = addr.postcode || '';
          onAddressDetected({
            roadArea: road,
            city,
            state,
            pincode: postcode,
            fullAddress: data.display_name,
          });
        }
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

      marker.bindPopup('<b>Property Spot</b><br>Drag pin to exact roof or building.').openPopup();

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

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }

    return () => {
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
    <div className="space-y-3">
      {/* Interactive Map Container with Floating Satellite & Street Switcher */}
      <div className="relative w-full h-56 sm:h-64 lg:h-[280px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm z-0">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Top Left Instructions Badge */}
        <div className="absolute top-3 left-3 z-[400] bg-slate-950/85 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[11px] font-normal shadow-md border border-slate-800 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Click map or drag pin to pinpoint property</span>
        </div>

        {/* Top Right Satellite & Street Switcher */}
        <div className="absolute top-3 right-3 z-[400] bg-slate-950/85 backdrop-blur-md p-1 rounded-xl shadow-md border border-slate-800 flex items-center gap-1">
          {Object.entries(MAP_MODES).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMapMode(key);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5 ${
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
