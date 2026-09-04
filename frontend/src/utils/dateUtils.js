/**
 * Date utilities for Monthly Slot Schedules (User and Host)
 */

// Generate 30 upcoming calendar days starting today with standard 12:00 PM Check-in slot
export function getUpcoming30Days() {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); // "Sun", "Mon", ...
    const dayNum = d.getDate(); // 1..31
    const dayOfWeek = d.getDay(); // 0 for Sun, 1 for Mon, ..., 6 for Sat
    const monthShort = d.toLocaleDateString('en-US', { month: 'short' }); // "Sep"
    const monthLong = d.toLocaleDateString('en-US', { month: 'long' }); // "September"
    const monthDay = `${monthShort} ${dayNum}`;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(dayNum).padStart(2, '0');
    const fullISO = `${year}-${month}-${day}`;
    const monthYear = `${monthLong} ${year}`; // e.g. "September 2026"

    days.push({
      index: i,
      dayName,
      dayNum,
      dayOfWeek,
      monthShort,
      monthLong,
      monthDay,
      year,
      monthYear,
      timeSlot: '12:00 PM',
      fullISO,
      label: `${dayName}, ${monthDay} (12:00 PM)`,
      dateObj: d,
    });
  }
  return days;
}

// Group 30 days into distinct month blocks (e.g. September 2026 and October 2026)
export function groupDaysByMonth(days) {
  const map = new Map();
  days.forEach((day) => {
    if (!map.has(day.monthYear)) {
      map.set(day.monthYear, {
        monthYear: day.monthYear,
        monthLong: day.monthLong,
        year: day.year,
        firstDayOfWeek: day.dateObj.getDay(),
        days: [],
      });
    }
    map.get(day.monthYear).days.push(day);
  });
  return Array.from(map.values());
}

/**
 * Check if a rate unit represents monthly pricing (/month, /mo, etc.)
 */
export function isMonthlyRateUnit(rateUnit) {
  if (!rateUnit) return true; // Default rental in PG/Flat/Hostel is monthly
  const u = String(rateUnit).toLowerCase().trim();
  if (u.includes('night') || u.includes('day')) return false;
  return true;
}

/**
 * Generate 12 upcoming calendar months starting from the current month
 */
export function getUpcoming12Months() {
  const months = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0..11

  for (let i = 0; i < 12; i++) {
    const d = new Date(currentYear, currentMonth + i, 1);
    const year = d.getFullYear();
    const monthNum = d.getMonth() + 1;
    const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
    const monthShort = d.toLocaleDateString('en-US', { month: 'short' }); // e.g. "Sep"
    const monthLong = d.toLocaleDateString('en-US', { month: 'long' }); // e.g. "September"
    const monthYear = `${monthLong} ${year}`;
    const monthYearShort = `${monthShort} ${year}`;

    // First and last day of this calendar month
    const startISO = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const lastDayNum = new Date(year, monthNum, 0).getDate();
    const endISO = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;

    months.push({
      index: i,
      monthKey,
      monthNum,
      year,
      monthShort,
      monthLong,
      monthYear,
      monthYearShort,
      startISO,
      endISO,
      daysInMonth: lastDayNum,
      isCurrentMonth: i === 0,
      label: monthYear,
      checkIn: `1st ${monthShort}, ${year} (12:00 AM)`,
      checkOut: `${lastDayNum}th ${monthShort}, ${year} (11:59 PM)`,
    });
  }
  return months;
}

/**
 * Generate all daily ISO strings ("YYYY-MM-DD") for a list of month keys ("YYYY-MM")
 */
export function getDatesForMonthKeys(monthKeys = []) {
  const dates = [];
  monthKeys.forEach((mKey) => {
    if (!mKey || typeof mKey !== 'string') return;
    const [yStr, mStr] = mKey.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    if (!year || !month) return;
    const daysCount = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysCount; d++) {
      dates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
  });
  return dates;
}

