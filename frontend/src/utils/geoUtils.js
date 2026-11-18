/**
 * Geographic reverse geocoding utility with robust PIN code resolution.
 * At high zoom (zoom=18), OpenStreetMap Nominatim often does not return postal boundaries
 * for rural or sub-district areas in India. This utility uses a multi-tier fallback
 * (zoom=12 postal zone -> display_name regex -> India Post API) to ensure pincode is reliably autofilled.
 */

export async function fetchAddressFromCoords(lat, lng, options = {}) {
 const { rawUrl = '', detectedPlace = '' } = options;
 const fixedLat = Number(lat);
 const fixedLng = Number(lng);

 if (isNaN(fixedLat) || isNaN(fixedLng)) {
 return null;
 }

 try {
 // 1. High precision reverse geocode (street / landmark level)
 const res = await fetch(
 `https://nominatim.openstreetmap.org/reverse?format=json&lat=${fixedLat}&lon=${fixedLng}&zoom=18&addressdetails=1`,
 { headers: { 'User-Agent': 'RoomScout-Property-Locator/1.0' } }
 );

 if (!res.ok) {
 throw new Error(`Nominatim request failed with status: ${res.status}`);
 }

 const data = await res.json();
 if (!data || !data.address) {
 return null;
 }

 const addr = data.address;

 // Build road / area representation without redundant repeated tokens
 const rawParts = [
 detectedPlace || addr.building || addr.amenity || addr.house_name || addr.shop || addr.tourism || '',
 addr.road || addr.pedestrian || addr.footway || addr.path || addr.street || '',
 addr.suburb || addr.neighbourhood || addr.residential || addr.colony || addr.sector || addr.hamlet || '',
 ].filter(Boolean);

 const roadParts = [];
 rawParts.forEach((part) => {
 const trimmed = part.trim();
 if (!trimmed) return;
 // Skip if this part is already substantially contained in previous parts
 if (roadParts.some((p) => p.toLowerCase().includes(trimmed.toLowerCase()))) return;
 roadParts.push(trimmed);
 });

 const road = roadParts.join(', ') || addr.road || addr.suburb || addr.neighbourhood || addr.village || data.display_name?.split(',')?.[0]?.trim() || '';
 const city = addr.city || addr.town || addr.city_district || addr.village || addr.county || '';
 const state = addr.state || '';
 const country = addr.country || 'India';

 // 2. Resolve PIN Code / Postal Code with multi-tier fallback
 let pincode = (addr.postcode || '').trim();

 // Check display_name for 6-digit Indian PIN code
 if (!pincode && data.display_name) {
 const match = data.display_name.match(/\b([1-9][0-9]{5})\b/);
 if (match) pincode = match[1];
 }

 // Check raw URL if provided
 if (!pincode && rawUrl) {
 const match = rawUrl.match(/\b([1-9][0-9]{5})\b/);
 if (match) pincode = match[1];
 }

 // Fallback A: Nominatim zoom=12 (District / Taluka / Postal Zone level)
 if (!pincode) {
 for (const z of [12, 10]) {
 try {
 const zRes = await fetch(
 `https://nominatim.openstreetmap.org/reverse?format=json&lat=${fixedLat}&lon=${fixedLng}&zoom=${z}&addressdetails=1`,
 { headers: { 'User-Agent': 'RoomScout-Property-Locator/1.0' } }
 );
 if (zRes.ok) {
 const zData = await zRes.json();
 if (zData?.address?.postcode) {
 pincode = zData.address.postcode.trim();
 break;
 }
 if (zData?.display_name) {
 const match = zData.display_name.match(/\b([1-9][0-9]{5})\b/);
 if (match) {
 pincode = match[1];
 break;
 }
 }
 }
 } catch {
 // ignore network timeout on secondary zoom
 }
 }
 }

 // Fallback B: India Post Pincode API if located in India
 if (!pincode && (addr.country_code === 'in' || country.toLowerCase() === 'india' || state)) {
 const candidatePlaces = [
 addr.village,
 addr.town,
 addr.county,
 addr.city_district,
 addr.suburb,
 addr.city,
 ].filter(Boolean);

 for (const place of candidatePlaces) {
 try {
 const postRes = await fetch(
 `https://api.postalpincode.in/postoffice/${encodeURIComponent(place)}`
 );
 if (postRes.ok) {
 const postData = await postRes.json();
 if (Array.isArray(postData) && postData[0]?.Status === 'Success' && postData[0]?.PostOffice?.length) {
 const foundPin = postData[0].PostOffice[0].Pincode;
 if (foundPin) {
 pincode = foundPin.trim();
 break;
 }
 }
 }
 } catch {
 // ignore secondary API failure
 }
 }
 }

 return {
 roadArea: road ? road.trim() : '',
 city: city ? city.trim() : '',
 state: state ? state.trim() : '',
 pincode: pincode ? pincode.trim() : '',
 country: country ? country.trim() : 'India',
 fullAddress: data.display_name || '',
 };
 } catch (err) {
 console.warn('Reverse geocode error:', err);
 return null;
 }
}

const CODE_ALPHABET = '23456789CFGHJMPQRVWX';
const ENCODING_BASE = 20;

function decodeOpenLocationCode(code) {
 let lat = -90;
 let lng = -180;
 let latRes = 20;
 let lngRes = 20;
 const clean = code.replace('+', '').toUpperCase();
 for (let i = 0; i < Math.min(clean.length, 10); i += 2) {
 const latDigit = CODE_ALPHABET.indexOf(clean[i]);
 const lngDigit = CODE_ALPHABET.indexOf(clean[i + 1]);
 if (latDigit === -1 || lngDigit === -1) break;
 lat += latDigit * latRes;
 lng += lngDigit * lngRes;
 latRes /= ENCODING_BASE;
 lngRes /= ENCODING_BASE;
 }
 return {
 latitude: lat + (latRes * ENCODING_BASE) / 2,
 longitude: lng + (lngRes * ENCODING_BASE) / 2,
 };
}

function recoverNearestPlusCode(shortCode, refLat, refLng) {
 const parts = shortCode.split('+');
 if (parts[0].length >= 8) {
 return decodeOpenLocationCode(shortCode);
 }
 let adjustedLat = Math.min(90, Math.max(-90, refLat)) + 90;
 let adjustedLng = Math.min(180, Math.max(-180, refLng)) + 180;
 let prefix = '';
 let latRes = 20;
 let lngRes = 20;
 for (let i = 0; i < 2; i++) {
 const latDigit = Math.floor(adjustedLat / latRes);
 const lngDigit = Math.floor(adjustedLng / lngRes);
 adjustedLat -= latDigit * latRes;
 adjustedLng -= lngDigit * lngRes;
 prefix += CODE_ALPHABET[latDigit] + CODE_ALPHABET[lngDigit];
 latRes /= ENCODING_BASE;
 lngRes /= ENCODING_BASE;
 }
 const fullCode = prefix + shortCode;
 return decodeOpenLocationCode(fullCode);
}

/**
 * Parses Google Maps URL with high precision:
 * Prioritizes the true PIN/Marker coordinates (!3d/!4d, Plus Code, query pin, direct place coords)
 * over the viewport/camera center (@lat,lng), preventing side-panel camera shift dislocation.
 */
/**
 * Formats a coordinate value to preserve Google Maps standard precision (6 decimal places),
 * ensuring trailing zeros are preserved (e.g. 29.374860 instead of 29.37486).
 */
export function formatCoordinate(val, minDecimals = 6) {
  if (val === null || val === undefined || val === '') return '';
  const str = String(val).trim();
  const parts = str.split('.');
  if (parts.length === 2) {
    if (parts[1].length < minDecimals) {
      return parts[0] + '.' + parts[1].padEnd(minDecimals, '0');
    }
    return str;
  }
  const num = Number(val);
  if (isNaN(num)) return str;
  return num.toFixed(minDecimals);
}

export function parseDMSCoordinates(str) {
  if (!str || typeof str !== 'string') return null;
  let decoded = str;
  try {
    decoded = decodeURIComponent(str).replace(/\+/g, ' ');
  } catch {
    /* ignore malformed URI */
  }

  // Match DMS patterns like: 29°22'29.4"N 79°31'39.9"E or 29° 22' 29.4" N, 79° 31' 39.9" E
  const dmsRegex = /(\d+(?:\.\d+)?)[°\s]+(?:(\d+(?:\.\d+)?)['′\s]+)?(?:(\d+(?:\.\d+)?)["″\s]+)?([NSEW])/gi;
  const matches = [...decoded.matchAll(dmsRegex)];
  if (matches.length >= 2) {
    let lat = null;
    let lng = null;
    for (const m of matches) {
      const deg = parseFloat(m[1]) || 0;
      const min = parseFloat(m[2]) || 0;
      const sec = parseFloat(m[3]) || 0;
      const dir = m[4].toUpperCase();
      const val = (deg + min / 60 + sec / 3600) * (dir === 'S' || dir === 'W' ? -1 : 1);
      if (dir === 'N' || dir === 'S') lat = val;
      if (dir === 'E' || dir === 'W') lng = val;
    }
    if (lat !== null && lng !== null) {
      return {
        latitude: Number(lat),
        longitude: Number(lng),
      };
    }
  }
  return null;
}

export function parseGoogleMapsUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();

  // Extract URL candidate if text is prepended/appended (e.g. mobile clipboard share)
  let cleanUrl = trimmed;
  const urlExtractMatch = trimmed.match(/https?:\/\/[^\s"'<>]+/i);
  if (urlExtractMatch) {
    cleanUrl = urlExtractMatch[0].replace(/[.,;:)]}>]+$/, '');
  }

  let lat = null;
  let lng = null;
  let detectedPlace = '';

  // 0a. Direct DMS coordinates input (e.g. "29°22'29.4\"N 79°31'39.9\"E")
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    /* ignore malformed URI */
  }

  let decodedClean = cleanUrl;
  try {
    decodedClean = decodeURIComponent(cleanUrl);
  } catch {
    /* ignore malformed URI */
  }

  const directDms = parseDMSCoordinates(trimmed) || parseDMSCoordinates(decoded) || parseDMSCoordinates(cleanUrl);
  if (directDms) {
    lat = directDms.latitude;
    lng = directDms.longitude;
  }

  // 0b. Direct decimal coordinates input (e.g. "29.2981512, 79.6317825" or "29.2981512 79.6317825")
  if (lat === null || lng === null) {
    const rawCoordMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
    if (rawCoordMatch) {
      lat = Number(rawCoordMatch[1]);
      lng = Number(rawCoordMatch[2]);
    }
  }

  // 0c. Coordinates inside place/search path: /maps/place/ or /maps/search/
  if (lat === null || lng === null) {
    const placePathMatch = decodedClean.match(/\/maps\/(?:place|search)\/(?:loc:)?([^/@]+)/) || decoded.match(/\/maps\/(?:place|search)\/(?:loc:)?([^/@]+)/);
    if (placePathMatch && placePathMatch[1]) {
      const pDms = parseDMSCoordinates(placePathMatch[1]);
      if (pDms) {
        lat = pDms.latitude;
        lng = pDms.longitude;
      }
    }
  }

  // 0d. Coordinates inside query string: ?q=... or ?query=...
  if (lat === null || lng === null) {
    const queryDmsMatch = decodedClean.match(/[?&](?:q|query|ll|daddr|saddr)=([^&]+)/i) || decoded.match(/[?&](?:q|query|ll|daddr|saddr)=([^&]+)/i);
    if (queryDmsMatch) {
      const qDms = parseDMSCoordinates(queryDmsMatch[1]);
      if (qDms) {
        lat = qDms.latitude;
        lng = qDms.longitude;
      }
    }
  }

  // 1. Authoritative: Exact POI Marker Protobuf Coordinates (!8m2!3d<lat>!4d<lng> or !3d<lat>!4d<lng>)
  if (lat === null || lng === null) {
    const candidateTexts = [cleanUrl, trimmed, decodedClean, decoded];
    for (const t of candidateTexts) {
      const poiMarkerMatch =
        t.match(/!8m2!3d(-?\d+(?:\.\d+)?)[^!]*?!4d(-?\d+(?:\.\d+)?)/) ||
        t.match(/!3d(-?\d+(?:\.\d+)?)[^!]*?!4d(-?\d+(?:\.\d+)?)/);
      if (poiMarkerMatch) {
        const pLat = Number(poiMarkerMatch[1]);
        const pLng = Number(poiMarkerMatch[2]);
        if (pLat >= -90 && pLat <= 90 && pLng >= -180 && pLng <= 180) {
          lat = pLat;
          lng = pLng;
          break;
        }
      }
    }
  }

  // 2. Query search / pin marker (?q=lat,lng or ?daddr=lat,lng or ?saddr=lat,lng or ?query=lat,lng or ?ll=lat,lng)
  if (lat === null || lng === null) {
    const candidateTexts = [cleanUrl, trimmed, decodedClean, decoded];
    for (const t of candidateTexts) {
      const queryMatch =
        t.match(/[?&](?:q|query|ll|daddr|saddr)=(?:loc:)?(-?\d+(?:\.\d+)?)[,+\s%]+(?:2C)?(-?\d+(?:\.\d+)?)/i);
      if (queryMatch) {
        const qLat = Number(queryMatch[1]);
        const qLng = Number(queryMatch[2]);
        if (qLat >= -90 && qLat <= 90 && qLng >= -180 && qLng <= 180) {
          lat = qLat;
          lng = qLng;
          break;
        }
      }
    }
  }

  // 3. Direct coordinates in place or search path: /maps/place/lat,lng or /maps/search/lat,lng
  if (lat === null || lng === null) {
    const candidateTexts = [cleanUrl, trimmed, decodedClean, decoded];
    for (const t of candidateTexts) {
      const directCoordMatch =
        t.match(/\/maps\/(?:place|search)\/(?:loc:)?(-?\d+(?:\.\d+)?)[,+\s%]+(?:2C)?(-?\d+(?:\.\d+)?)/);
      if (directCoordMatch) {
        const dLat = Number(directCoordMatch[1]);
        const dLng = Number(directCoordMatch[2]);
        if (dLat >= -90 && dLat <= 90 && dLng >= -180 && dLng <= 180) {
          lat = dLat;
          lng = dLng;
          break;
        }
      }
    }
  }

  // Camera viewport match (@lat,lng) - used as reference or fallback
  const atMatch = cleanUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const atLat = atMatch ? Number(atMatch[1]) : null;
  const atLng = atMatch ? Number(atMatch[2]) : null;

  // 4. Place name extraction and Plus Code / Open Location Code decoding
  const placeMatch = cleanUrl.match(/\/maps\/place\/([^/@]+)/) || trimmed.match(/\/maps\/place\/([^/@]+)/);
  if (placeMatch && placeMatch[1]) {
    try {
      detectedPlace = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    } catch {
      detectedPlace = placeMatch[1].replace(/\+/g, ' ');
    }

    // Check if the place query contains a Plus Code (e.g. CHW4+WWP or 7JXXCHW4+WWP)
    const plusMatch = detectedPlace.match(/\b([23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3})\b/i);
    if (plusMatch) {
      const code = plusMatch[1];
      const refLat = lat !== null ? lat : (atLat !== null ? atLat : 0);
      const refLng = lng !== null ? lng : (atLng !== null ? atLng : 0);
      if (refLat !== 0 || refLng !== 0) {
        const decodedCode = recoverNearestPlusCode(code, refLat, refLng);
        // If !3d/!4d exact pin was absent, plus code represents the exact rooftop / building pin
        if (lat === null || lng === null) {
          lat = decodedCode.latitude;
          lng = decodedCode.longitude;
        }
      }
    }
  }

  // 5. Last resort: Viewport center (@lat,lng) ONLY if no specific pin, POI, or Plus Code exists
  if (lat === null || lng === null) {
    if (atLat !== null && atLng !== null) {
      lat = atLat;
      lng = atLng;
    }
  }

  if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
    return null;
  }

  return {
    latitude: Number(lat),
    longitude: Number(lng),
    detectedPlace: detectedPlace ? detectedPlace.trim() : '',
  };
}

/**
 * Calculates great-circle distance between two coordinate pairs in kilometers using the Haversine formula.
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's mean radius in km
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);
  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return 9999;

  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLon = ((nLon2 - nLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Resolves [latitude, longitude] from any stay document format with multi-layer fallback.
 */
export function resolveStayCoordinates(stay) {
  if (!stay) return [29.3803, 79.4636];

  // 1. GeoJSON [lon, lat]
  if (
    stay?.locationGeo?.coordinates &&
    Array.isArray(stay.locationGeo.coordinates) &&
    stay.locationGeo.coordinates.length === 2
  ) {
    const [lon, lat] = stay.locationGeo.coordinates;
    const nLat = parseFloat(lat);
    const nLon = parseFloat(lon);
    if (!isNaN(nLat) && !isNaN(nLon) && Math.abs(nLat) > 1 && Math.abs(nLon) > 1) {
      return [nLat, nLon];
    }
  }

  // 2. Direct lat / lon properties
  const rawLat = parseFloat(stay.latitude ?? stay.lat);
  const rawLon = parseFloat(stay.longitude ?? stay.lon ?? stay.lng);
  if (!isNaN(rawLat) && !isNaN(rawLon) && Math.abs(rawLat) > 1 && Math.abs(rawLon) > 1) {
    return [rawLat, rawLon];
  }

  // 3. Fallback dictionary for popular Uttarakhand / Indian cities
  const CITY_COORDS = {
    nainital: [29.3803, 79.4636],
    bhimtal: [29.35, 79.5667],
    bhowali: [29.3833, 79.5167],
    haldwani: [29.2183, 79.513],
    mukteshwar: [29.4722, 79.6472],
    almora: [29.5971, 79.6591],
    ranikhet: [29.6433, 79.4322],
    dehradun: [30.3165, 78.0322],
    mussoorie: [30.4598, 78.0644],
    rishikesh: [30.0869, 78.2676],
    haridwar: [29.9457, 78.1642],
    delhi: [28.6139, 77.209],
  };

  const textToSearch = `${stay.location || ''} ${stay.city || ''} ${stay.address || ''} ${stay.title || ''}`.toLowerCase();
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (textToSearch.includes(key)) {
      return [coords[0], coords[1]];
    }
  }

  // Deterministic seed fallback based on stay id
  const stayId = String(stay._id || '0');
  const hash = stayId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return [29.35 + (hash % 15) * 0.015, 79.48 + (hash % 15) * 0.015];
}
