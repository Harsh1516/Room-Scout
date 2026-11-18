import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Helper functions mirroring stayController location extractors for unit testing
function isValidLat(val) {
  return typeof val === 'number' && !isNaN(val) && val >= -90 && val <= 90;
}
function isValidLng(val) {
  return typeof val === 'number' && !isNaN(val) && val >= -180 && val <= 180;
}

function extractCoordinatesFromData(urls, html = '') {
  const candidateSources = Array.isArray(urls) ? urls : [urls];
  const textBlock = `${candidateSources.join('\n')}\n${html || ''}`;

  // 1. POI / Marker Protobuf Coordinates (!8m2!3d<lat>!4d<lng> or !3d<lat>!4d<lng>)
  const poiMatch = textBlock.match(/!8m2!3d(-?\d+(?:\.\d+)?)[^!]*?!4d(-?\d+(?:\.\d+)?)/) ||
                   textBlock.match(/!3d(-?\d+(?:\.\d+)?)[^!]*?!4d(-?\d+(?:\.\d+)?)/);
  if (poiMatch) {
    const lat = parseFloat(poiMatch[1]);
    const lng = parseFloat(poiMatch[2]);
    if (isValidLat(lat) && isValidLng(lng)) {
      return { latitude: lat, longitude: lng, source: 'protobuf_pin' };
    }
  }

  // 2. Schema.org Place Metadata in HTML (<meta itemprop="latitude" content="...">)
  if (html) {
    const mLat = html.match(/<meta[^>]*itemprop=["']latitude["'][^>]*content=["'](-?\d+(?:\.\d+)?)["']/i) ||
                 html.match(/<meta[^>]*content=["'](-?\d+(?:\.\d+)?)["'][^>]*itemprop=["']latitude["']/i);
    const mLng = html.match(/<meta[^>]*itemprop=["']longitude["'][^>]*content=["'](-?\d+(?:\.\d+)?)["']/i) ||
                 html.match(/<meta[^>]*content=["'](-?\d+(?:\.\d+)?)["'][^>]*itemprop=["']longitude["']/i);
    if (mLat && mLng) {
      const lat = parseFloat(mLat[1]);
      const lng = parseFloat(mLng[1]);
      if (isValidLat(lat) && isValidLng(lng)) {
        return { latitude: lat, longitude: lng, source: 'schema_metadata' };
      }
    }

    // 3. JSON-LD GeoCoordinates in HTML
    const jsonLd = html.match(/"latitude":\s*(-?\d+(?:\.\d+)?)[,\s]+"longitude":\s*(-?\d+(?:\.\d+)?)/i) ||
                   html.match(/"geo":\s*\{[^}]*"latitude":\s*(-?\d+(?:\.\d+)?)[^}]*"longitude":\s*(-?\d+(?:\.\d+)?)/i);
    if (jsonLd) {
      const lat = parseFloat(jsonLd[1]);
      const lng = parseFloat(jsonLd[2]);
      if (isValidLat(lat) && isValidLng(lng)) {
        return { latitude: lat, longitude: lng, source: 'json_ld' };
      }
    }

    // 4. Google Maps APP_INITIALIZATION_STATE array: [null, null, lat, lng]
    const appInit = html.match(/\[null,\s*null,\s*(-?\d+\.\d{4,}),\s*(-?\d+\.\d{4,})\]/);
    if (appInit) {
      const lat = parseFloat(appInit[1]);
      const lng = parseFloat(appInit[2]);
      if (isValidLat(lat) && isValidLng(lng)) {
        return { latitude: lat, longitude: lng, source: 'app_state' };
      }
    }

    // 5. OpenGraph Staticmap Marker Coordinates
    const staticMarker = html.match(/staticmap[^"'>]*?markers=[^&"']*?(?:%7C|\|)(?:color:[^|%]*?(?:%7C|\|))?(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/i) ||
                         html.match(/staticmap[^"'>]*?markers=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/i);
    if (staticMarker) {
      const lat = parseFloat(staticMarker[1]);
      const lng = parseFloat(staticMarker[2]);
      if (isValidLat(lat) && isValidLng(lng)) {
        return { latitude: lat, longitude: lng, source: 'staticmap_marker' };
      }
    }
  }

  // 6. Query Parameters (?q=lat,lng or ?query=lat,lng or ?daddr=lat,lng)
  for (const u of candidateSources) {
    const qMatch = u.match(/[?&](?:q|query|ll|daddr|saddr|center)=(?:loc:)?(-?\d+(?:\.\d+)?)[,+\s%]+(?:2C)?(-?\d+(?:\.\d+)?)/i);
    if (qMatch) {
      const lat = parseFloat(qMatch[1]);
      const lng = parseFloat(qMatch[2]);
      if (isValidLat(lat) && isValidLng(lng)) {
        return { latitude: lat, longitude: lng, source: 'query_param' };
      }
    }
  }

  // 7. Path Coordinates: /maps/place/lat,lng
  for (const u of candidateSources) {
    const pathMatch = u.match(/\/maps\/(?:place|search)\/(-?\d+(?:\.\d+)?)[,+\s%]+(?:2C)?(-?\d+(?:\.\d+)?)/i);
    if (pathMatch) {
      const lat = parseFloat(pathMatch[1]);
      const lng = parseFloat(pathMatch[2]);
      if (isValidLat(lat) && isValidLng(lng)) {
        return { latitude: lat, longitude: lng, source: 'path_coord' };
      }
    }
  }

  // 8. Staticmap center
  if (html) {
    const staticCenter = html.match(/staticmap[^"'>]*?center=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/i);
    if (staticCenter) {
      const lat = parseFloat(staticCenter[1]);
      const lng = parseFloat(staticCenter[2]);
      if (isValidLat(lat) && isValidLng(lng)) {
        return { latitude: lat, longitude: lng, source: 'staticmap_center' };
      }
    }
  }

  // 9. Viewport camera coordinates (@lat,lng)
  for (const u of candidateSources) {
    const atMatch = u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (isValidLat(lat) && isValidLng(lng)) {
        return { latitude: lat, longitude: lng, source: 'viewport_center' };
      }
    }
  }

  return null;
}

describe('Google Maps Mobile & Web URL Location Resolution', () => {
  it('should extract exact coordinates from mobile share URL containing protobuf !8m2!3d and !4d with complete digits', () => {
    const mobileResolvedUrl = 'https://www.google.com/maps/place/Shri+Ram+PG/@29.374833215894,79.527751428931,17z/data=!3m1!4b1!4m6!3m5!1s0x39a0a123:0x456!8m2!3d29.374833215894!4d79.527751428931';
    const result = extractCoordinatesFromData([mobileResolvedUrl]);
    assert.ok(result);
    assert.equal(result.latitude, 29.374833215894);
    assert.equal(result.longitude, 79.527751428931);
    assert.equal(result.source, 'protobuf_pin');
  });

  it('should extract exact coordinates from schema.org metadata in Google Maps mobile app web response', () => {
    const html = `
      <!DOCTYPE html><html><head>
      <meta itemprop="latitude" content="29.298151234567">
      <meta itemprop="longitude" content="79.631782567891">
      </head></html>
    `;
    const result = extractCoordinatesFromData(['https://maps.app.goo.gl/test'], html);
    assert.ok(result);
    assert.equal(result.latitude, 29.298151234567);
    assert.equal(result.longitude, 79.631782567891);
    assert.equal(result.source, 'schema_metadata');
  });

  it('should extract exact coordinates from Google staticmap og:image with full precision', () => {
    const html = `
      <meta content="https://maps.google.com/maps/api/staticmap?center=29.374833%2C79.527751&zoom=17&size=256x256&markers=color:red%7C29.37483321589,79.52775142891" property="og:image">
    `;
    const result = extractCoordinatesFromData(['https://maps.app.goo.gl/sample'], html);
    assert.ok(result);
    assert.equal(result.latitude, 29.37483321589);
    assert.equal(result.longitude, 79.52775142891);
    assert.equal(result.source, 'staticmap_marker');
  });

  it('should extract exact coordinates from Google internal APP_INITIALIZATION_STATE array', () => {
    const html = `
      <script>window.APP_INITIALIZATION_STATE=[[[1,2],[null,null,29.374833215894,79.527751428931]]];</script>
    `;
    const result = extractCoordinatesFromData(['https://maps.google.com/test'], html);
    assert.ok(result);
    assert.equal(result.latitude, 29.374833215894);
    assert.equal(result.longitude, 79.527751428931);
    assert.equal(result.source, 'app_state');
  });

  it('should extract exact coordinates from mobile navigation link with ?daddr= or ?q=', () => {
    const mobileLink = 'https://maps.google.com/maps?daddr=29.374833215894,79.527751428931';
    const result = extractCoordinatesFromData([mobileLink]);
    assert.ok(result);
    assert.equal(result.latitude, 29.374833215894);
    assert.equal(result.longitude, 79.527751428931);
    assert.equal(result.source, 'query_param');
  });

  it('should extract URL from shared mobile clipboard text with place name prepended', () => {
    const sharedText = 'Check out Hotel Mount View on Google Maps: https://maps.app.goo.gl/AbCdEf123?g_st=aw';
    const match = sharedText.match(/https?:\/\/[^\s"'<>]+/i);
    assert.ok(match);
    assert.equal(match[0], 'https://maps.app.goo.gl/AbCdEf123?g_st=aw');
  });
});
