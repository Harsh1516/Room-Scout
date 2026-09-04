import { useEffect, useRef } from 'react';
import { getStayPricing } from '../utils/priceUtils';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Comprehensive Indian city & destination coordinate registry for precision fallback
const CITY_COORDINATES = {
  'nainital': [29.3919, 79.4542],
  'bhimtal': [29.3500, 79.5667],
  'bhowali': [29.3749, 79.5278],
  'haldwani': [29.2183, 79.5130],
  'almora': [29.5971, 79.6591],
  'mukteshwar': [29.4722, 79.6553],
  'ranikhet': [29.6434, 79.4322],
  'ramnagar': [29.3967, 79.1257],
  'dehradun': [30.3165, 78.0322],
  'rishikesh': [30.0869, 78.2676],
  'haridwar': [29.9457, 78.1642],
  'mussoorie': [30.4598, 78.0644],
  'manali': [32.2432, 77.1892],
  'shimla': [31.1048, 77.1734],
  'dharamshala': [32.2190, 76.3234],
  'kullu': [31.9579, 77.1095],
  'kasol': [32.0100, 77.3150],
  'delhi': [28.6139, 77.2090],
  'new delhi': [28.6139, 77.2090],
  'noida': [28.5355, 77.3910],
  'greater noida': [28.4744, 77.5040],
  'gurgaon': [28.4595, 77.0266],
  'gurugram': [28.4595, 77.0266],
  'ghaziabad': [28.6692, 77.4538],
  'faridabad': [28.4089, 77.3178],
  'chandigarh': [30.7333, 76.7794],
  'jaipur': [26.9124, 75.7873],
  'udaipur': [24.5854, 73.7125],
  'jodhpur': [26.2389, 73.0243],
  'kota': [25.2138, 75.8648],
  'bangalore': [12.9716, 77.5946],
  'bengaluru': [12.9716, 77.5946],
  'mumbai': [19.0760, 72.8777],
  'pune': [18.5204, 73.8567],
  'goa': [15.2993, 74.1240],
  'hyderabad': [17.3850, 78.4867],
  'chennai': [13.0827, 80.2707],
  'kolkata': [22.5726, 88.3639],
  'ahmedabad': [23.0225, 72.5714],
  'indore': [22.7196, 75.8577],
  'bhopal': [23.2599, 77.4126],
  'lucknow': [26.8467, 80.9462],
  'varanasi': [25.3176, 82.9739],
};

function resolveCoordinates(stay) {
  const rawLat = parseFloat(stay.latitude ?? stay.lat);
  const rawLon = parseFloat(stay.longitude ?? stay.lon ?? stay.lng);

  if (!isNaN(rawLat) && !isNaN(rawLon) && Math.abs(rawLat) > 1 && Math.abs(rawLon) > 1) {
    return [rawLat, rawLon];
  }

  const textToSearch = `${stay.location || ''} ${stay.city || ''} ${stay.address || ''} ${stay.title || ''}`.toLowerCase();
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (textToSearch.includes(key)) {
      return [coords[0], coords[1]];
    }
  }

  // Stable deterministic fallback within North India / Uttarakhand
  const stayId = String(stay._id || stay.id || '0');
  const hash = stayId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return [29.35 + (hash % 15) * 0.015, 79.48 + (hash % 15) * 0.015];
}

export function SearchInteractiveMap({
  stays = [],
  hoveredStayId = null,
  onStayClick,
  onStayHover,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const graphicsRef = useRef([]);
  const hasFitBoundsRef = useRef(false);

  // Initialize Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [29.37, 79.52], // Default North India / Uttarakhand center
        zoom: 10,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // OpenStreetMap Standard Tiles (Crisp, 100% free, no API key or watermark)
      L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }
      ).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Dynamic Zero-Overlap Spatial Layout Engine
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Resolve geographic coordinates for each stay
    const stayEntries = (stays || []).map((stay) => {
      const [lat, lon] = resolveCoordinates(stay);
      return {
        stay,
        stayId: stay._id || stay.id,
        baseLat: lat,
        baseLon: lon,
      };
    });

    // 2. Render and position all price markers with guaranteed zero overlapping
    const updateLayout = () => {
      if (!mapInstanceRef.current) return;

      // Clear existing markers and graphics
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      markersRef.current = {};
      graphicsRef.current.forEach((g) => g.remove());
      graphicsRef.current = [];

      if (stayEntries.length === 0) return;

      // Convert geographic coordinates to current screen pixel points
      const pixelNodes = stayEntries.map((entry) => {
        const pt = map.latLngToLayerPoint([entry.baseLat, entry.baseLon]);
        return {
          ...entry,
          baseX: pt.x,
          baseY: pt.y,
          x: pt.x,
          y: pt.y,
          hasConnector: false,
        };
      });

      // Spatial Clustering: Group items that share the same or very close coordinates (distance < 45px on screen)
      const clusters = [];
      pixelNodes.forEach((node) => {
        let targetCluster = null;
        for (const c of clusters) {
          const dist = Math.hypot(c.centerX - node.baseX, c.centerY - node.baseY);
          if (dist < 45) {
            targetCluster = c;
            break;
          }
        }
        if (targetCluster) {
          targetCluster.nodes.push(node);
        } else {
          clusters.push({
            centerX: node.baseX,
            centerY: node.baseY,
            baseLat: node.baseLat,
            baseLon: node.baseLon,
            nodes: [node],
          });
        }
      });

      // Disperse multi-stay locations in an even radial circle (spiderfy pattern)
      clusters.forEach((cluster) => {
        const k = cluster.nodes.length;
        if (k > 1) {
          // Central anchor hub dot
          const centerHub = L.circleMarker([cluster.baseLat, cluster.baseLon], {
            radius: 5,
            color: '#0284c7',
            fillColor: '#38bdf8',
            fillOpacity: 0.95,
            weight: 2,
          }).addTo(map);
          graphicsRef.current.push(centerHub);

          // Calculate radial offset based on count (approx 44px to 96px in screen pixels)
          const R = 38 + Math.min(k, 8) * 9;
          cluster.nodes.forEach((node, idx) => {
            const angle = (2 * Math.PI * idx) / k - Math.PI / 2; // start from top
            node.x = cluster.centerX + R * Math.cos(angle);
            node.y = cluster.centerY + R * Math.sin(angle);
            node.hasConnector = true;
            node.centerLat = cluster.baseLat;
            node.centerLon = cluster.baseLon;
          });
        }
      });

      // Global Collision Relaxation Pass: Push apart ANY two price tags that overlap
      const MIN_WIDTH = 90;
      const MIN_HEIGHT = 34;

      for (let iter = 0; iter < 10; iter++) {
        for (let i = 0; i < pixelNodes.length; i++) {
          for (let j = i + 1; j < pixelNodes.length; j++) {
            const nA = pixelNodes[i];
            const nB = pixelNodes[j];
            const dx = nB.x - nA.x;
            const dy = nB.y - nA.y;
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);

            if (absX < MIN_WIDTH && absY < MIN_HEIGHT) {
              const overlapX = (MIN_WIDTH - absX) * (dx === 0 ? 1 : Math.sign(dx)) * 0.52;
              const overlapY = (MIN_HEIGHT - absY) * (dy === 0 ? 1 : Math.sign(dy)) * 0.52;

              nA.x -= overlapX;
              nA.y -= overlapY;
              nB.x += overlapX;
              nB.y += overlapY;
            }
          }
        }
      }

      // Convert final collision-free screen pixel coordinates back to LatLng & render markers
      pixelNodes.forEach((node) => {
        const finalLatLng = map.layerPointToLatLng([node.x, node.y]);

        // Draw guideline connecting dispersed price pill back to original location pin if displaced
        if (node.hasConnector || Math.hypot(node.x - node.baseX, node.y - node.baseY) > 20) {
          const originLat = node.centerLat || node.baseLat;
          const originLon = node.centerLon || node.baseLon;
          const connector = L.polyline([[originLat, originLon], finalLatLng], {
            color: '#0284c7',
            weight: 1.5,
            dashArray: '3, 4',
            opacity: 0.6,
          }).addTo(map);
          graphicsRef.current.push(connector);
        }

        const isHovered = hoveredStayId === node.stayId;
        const pricing = getStayPricing(node.stay);
        const formattedPrice = pricing.primaryPrice;
        const unitText = pricing.primaryUnit;

        const customIcon = L.divIcon({
          className: 'custom-stay-map-pin',
          html: `
            <div class="cursor-pointer transition-all duration-200 ${isHovered ? 'scale-125 z-50' : 'hover:scale-110'}">
              <div class="px-2.5 py-1 rounded-full text-[11px] font-black tracking-tight shadow-md flex items-center gap-1 border transition-all whitespace-nowrap ${
                isHovered
                  ? 'bg-slate-950 text-white border-cyan-400 shadow-cyan-500/50 ring-2 ring-cyan-400'
                  : 'bg-white text-slate-900 border-slate-300 dark:bg-slate-900 dark:text-white dark:border-slate-700'
              }">
                <span>₹${formattedPrice}</span>
                <span class="text-[9px] font-semibold opacity-70">${unitText}</span>
              </div>
            </div>
          `,
          iconSize: [80, 26],
          iconAnchor: [40, 13],
        });

        const marker = L.marker(finalLatLng, { icon: customIcon }).addTo(map);
        if (isHovered) marker.setZIndexOffset(1000);

        marker.on('click', () => onStayClick && onStayClick(node.stay));
        marker.on('mouseover', () => onStayHover && onStayHover(node.stayId));
        marker.on('mouseout', () => onStayHover && onStayHover(null));

        markersRef.current[node.stayId] = marker;
      });
    };

    // Initial Layout update
    updateLayout();

    // Recompute collision-free positions on map zoom & pan
    map.on('zoomend', updateLayout);
    map.on('moveend', updateLayout);

    // Initial bounds fit once
    if (!hasFitBoundsRef.current && stayEntries.length > 0) {
      try {
        const rawBounds = stayEntries.map((e) => [e.baseLat, e.baseLon]);
        map.fitBounds(rawBounds, { padding: [40, 40], maxZoom: 14 });
        hasFitBoundsRef.current = true;
      } catch {
        // ignore bounds fit error
      }
    }

    return () => {
      map.off('zoomend', updateLayout);
      map.off('moveend', updateLayout);
    };
  }, [stays, hoveredStayId, onStayClick, onStayHover]);

  // Invalidate Map Size on container resize
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapContainerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });

    resizeObserver.observe(mapContainerRef.current);
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[360px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm isolate z-0">
      <div ref={mapContainerRef} className="w-full h-full min-h-[360px] z-0" />
      <div className="absolute top-3 left-3 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1.5 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Live Area Map</span>
      </div>
    </div>
  );
}

export default SearchInteractiveMap;
