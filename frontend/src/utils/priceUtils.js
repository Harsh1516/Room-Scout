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
      primaryUnit: '/mo',
      showSecondary: false,
      secondaryPrice: '',
      secondaryUnit: '',
    };
  }

  const rates = Array.isArray(stay.roomRates) ? stay.roomRates : [];
  const monthRateObj = rates.find(
    (r) => r && (r.rateUnit === '/month' || r.rateUnit === '/mo')
  );
  const nightRateObj = rates.find(
    (r) => r && (r.rateUnit === '/night' || r.rateUnit === '/day')
  );

  // Determine main rate unit from property or first rate tier
  const mainUnit =
    stay.rateUnit ||
    (rates.length > 0 && rates[0].rateUnit ? rates[0].rateUnit : null) ||
    '/mo';

  const isPerNight = mainUnit === '/night' || mainUnit === '/day';

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
        primaryUnit: '/mo',
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
      primaryUnit: '/mo',
      showSecondary: true,
      secondaryPrice: rawNight.toLocaleString('en-IN'),
      secondaryUnit: '/night',
    };
  }

  return {
    primaryPrice: formattedMonth,
    primaryUnit: '/mo',
    showSecondary: false,
    secondaryPrice: '',
    secondaryUnit: '',
  };
}

