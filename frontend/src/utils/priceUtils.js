// Helper to safely parse any price input (string, number, with/without ₹)
export function parsePriceNumber(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Helper to determine primary & secondary pricing display for stay cards
export function getStayPricing(stay) {
  if (!stay) {
    return {
      primaryPrice: '0',
      primaryUnit: '/month',
      showSecondary: false,
      secondaryPrice: '',
      secondaryUnit: '',
    };
  }

  const rates = Array.isArray(stay.roomRates) ? stay.roomRates : [];
  const monthRateObj = rates.find(
    (r) => r && String(r.rateUnit || '').toLowerCase().includes('month')
  );
  const nightRateObj = rates.find(
    (r) =>
      r &&
      (String(r.rateUnit || '').toLowerCase().includes('night') ||
        String(r.rateUnit || '').toLowerCase().includes('day'))
  );

  // Determine main rate unit from property or first rate tier
  const mainUnit =
    stay.rateUnit ||
    (rates.length > 0 && rates[0].rateUnit ? rates[0].rateUnit : null) ||
    '/month';

  const isPerNight =
    String(mainUnit).toLowerCase().includes('night') ||
    String(mainUnit).toLowerCase().includes('day');

  if (isPerNight) {
    const rawNight = parsePriceNumber(
      stay.nightPrice || stay.price || (nightRateObj ? nightRateObj.price : 0)
    );
    const formattedNight =
      rawNight > 0 ? rawNight.toLocaleString('en-IN') : '0';

    const rawMonth = parsePriceNumber(monthRateObj ? monthRateObj.price : 0);
    const hasBoth = rawMonth > 0 && rawMonth !== rawNight;

    if (hasBoth) {
      return {
        primaryPrice: rawMonth.toLocaleString('en-IN'),
        primaryUnit: '/month',
        showSecondary: true,
        secondaryPrice: formattedNight,
        secondaryUnit: '/night',
      };
    }

    return {
      primaryPrice: formattedNight,
      primaryUnit: '/night',
      showSecondary: false,
      secondaryPrice: '',
      secondaryUnit: '',
    };
  }

  // Default: Primary rate is per month
  const rawMonth = parsePriceNumber(
    stay.price ||
      (monthRateObj
        ? monthRateObj.price
        : rates.length > 0
        ? rates[0].price
        : 3500)
  );
  const formattedMonth =
    rawMonth > 0 ? rawMonth.toLocaleString('en-IN') : '0';

  const rawNight = parsePriceNumber(
    stay.nightPrice || (nightRateObj ? nightRateObj.price : 0)
  );
  const hasExplicitNight = rawNight > 0;

  if (hasExplicitNight) {
    return {
      primaryPrice: formattedMonth,
      primaryUnit: '/month',
      showSecondary: true,
      secondaryPrice: rawNight.toLocaleString('en-IN'),
      secondaryUnit: '/night',
    };
  }

  return {
    primaryPrice: formattedMonth,
    primaryUnit: '/month',
    showSecondary: false,
    secondaryPrice: '',
    secondaryUnit: '',
  };
}

// Helper to extract all other prices for a stay in a single column
export function getOtherStayPrices(stay, lowestPriceNum) {
  if (!stay) return [];
  const list = [];
  const seen = new Set();
  const lowest = typeof lowestPriceNum === 'number' ? lowestPriceNum : parsePriceNumber(lowestPriceNum);

  const cleanUnit = (u) => {
    if (!u) return '/month';
    const s = String(u).trim();
    if (s.toLowerCase().includes('month') || s.toLowerCase() === '/mo' || s.toLowerCase() === 'mo') {
      return '/month';
    }
    if (s.toLowerCase().includes('night') || s.toLowerCase() === '/night') {
      return '/night';
    }
    if (s.toLowerCase().includes('day')) {
      return '/day';
    }
    return s.startsWith('/') ? s : `/${s}`;
  };

  // 1. Check roomRates
  if (Array.isArray(stay.roomRates) && stay.roomRates.length > 0) {
    for (const r of stay.roomRates) {
      if (!r) continue;
      const num = parsePriceNumber(r.price);
      if (num <= 0) continue;
      const unit = cleanUnit(r.rateUnit);
      const key = `${num}-${unit}`;
      if (lowest > 0 && num === lowest && unit === '/month' && !seen.has(key)) {
        seen.add(key);
        continue;
      }
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          label: r.type ? String(r.type).trim() : '',
          price: num.toLocaleString('en-IN'),
          unit,
        });
      }
    }
  }

  // 2. Check individual rooms if list is empty
  if (list.length === 0 && Array.isArray(stay.rooms) && stay.rooms.length > 0) {
    for (const rm of stay.rooms) {
      if (!rm) continue;
      const num = parsePriceNumber(rm.price);
      if (num <= 0) continue;
      const unit = cleanUnit(rm.rateUnit);
      const key = `${num}-${unit}`;
      if (lowest > 0 && num === lowest && unit === '/month' && !seen.has(key)) {
        seen.add(key);
        continue;
      }
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          label: rm.type ? String(rm.type).trim() : (rm.roomNumber ? `Room ${rm.roomNumber}` : ''),
          price: num.toLocaleString('en-IN'),
          unit,
        });
      }
    }
  }

  // 3. Check nightPrice
  if (stay.nightPrice) {
    const nightNum = parsePriceNumber(stay.nightPrice);
    if (nightNum > 0 && nightNum !== lowest) {
      const key = `${nightNum}-/night`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          label: 'Per Night',
          price: nightNum.toLocaleString('en-IN'),
          unit: '/night',
        });
      }
    }
  }

  // 4. Check secondary price from getStayPricing if nothing was added
  const pricing = getStayPricing(stay);
  if (pricing.showSecondary && pricing.secondaryPrice) {
    const secNum = parsePriceNumber(pricing.secondaryPrice);
    const secUnit = cleanUnit(pricing.secondaryUnit);
    const key = `${secNum}-${secUnit}`;
    if (!seen.has(key)) {
      seen.add(key);
      list.push({
        label: secUnit === '/night' ? 'Per Night' : '',
        price: pricing.secondaryPrice,
        unit: secUnit,
      });
    }
  }

  return list;
}