/**
 * Geographic reverse geocoding utility with robust PIN code resolution.
 * At high zoom (zoom=18), OpenStreetMap Nominatim often does not return postal boundaries
 * for rural or sub-district areas in India. This utility uses a multi-tier fallback
 * (zoom=12 postal zone -> display_name regex -> India Post API) to ensure pincode is reliably autofilled.
 */

export async function fetchAddressFromCoords(lat, lng, options = {}) {
  const { rawUrl = '', detectedPlace = '' } = options;
  const fixedLat = parseFloat(Number(lat).toFixed(6));
  const fixedLng = parseFloat(Number(lng).toFixed(6));

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
export function parseGoogleMapsUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();

  let lat = null;
  let lng = null;
  let detectedPlace = '';

  // 1. Exact POI / Marker coordinates in protobuf data (!3d<lat> and !4d<lng>)
  const lat3d = trimmed.match(/!3d(-?\d+\.\d+)/);
  const lng4d = trimmed.match(/!4d(-?\d+\.\d+)/);
  if (lat3d && lng4d) {
    lat = parseFloat(lat3d[1]);
    lng = parseFloat(lng4d[1]);
  }

  // 2. Query search / pin marker (?q=lat,lng or ?query=lat,lng or ?ll=lat,lng)
  if (lat === null || lng === null) {
    const queryMatch = trimmed.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (queryMatch) {
      lat = parseFloat(queryMatch[1]);
      lng = parseFloat(queryMatch[2]);
    }
  }

  // 3. Direct coordinates in place path: /maps/place/lat,lng
  if (lat === null || lng === null) {
    const directPlaceMatch = trimmed.match(/\/maps\/place\/(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (directPlaceMatch) {
      lat = parseFloat(directPlaceMatch[1]);
      lng = parseFloat(directPlaceMatch[2]);
    }
  }

  // Camera viewport match (@lat,lng) - used as reference or fallback
  const atMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const atLat = atMatch ? parseFloat(atMatch[1]) : null;
  const atLng = atMatch ? parseFloat(atMatch[2]) : null;

  // 4. Place name extraction and Plus Code / Open Location Code decoding
  const placeMatch = trimmed.match(/\/maps\/place\/([^/@]+)/);
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
        const decoded = recoverNearestPlusCode(code, refLat, refLng);
        // If !3d/!4d exact pin was absent, plus code represents the exact rooftop / building pin
        if (lat === null || lng === null) {
          lat = decoded.latitude;
          lng = decoded.longitude;
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
    latitude: parseFloat(lat.toFixed(6)),
    longitude: parseFloat(lng.toFixed(6)),
    detectedPlace: detectedPlace ? detectedPlace.trim() : '',
  };
}

