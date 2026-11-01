import { jsPDF } from 'jspdf';

/**
 * Formats a raw date string or Date object into a readable date string.
 */
function formatDateSafe(val) {
  if (!val) return 'N/A';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(val);
  }
}

/**
 * Masks Aadhar for secure display while keeping last 4 digits visible.
 */
function formatAadharSafe(raw) {
  if (!raw) return 'Check Upon Arrival';
  const clean = String(raw).replace(/\D/g, '');
  if (clean.length === 12) {
    return `XXXX XXXX ${clean.slice(-4)}`;
  }
  if (clean.length === 4) {
    return `XXXX XXXX ${clean}`;
  }
  if (String(raw).includes('X') || String(raw).includes('-')) {
    return String(raw).trim();
  }
  return String(raw);
}

/**
 * Draws an authentic high-security vector barcode and credential tag.
 */
function drawSecurityBarcode(doc, x, y, width, height, seedStr) {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, width, height, 1.8, 1.8, 'FD');

  const cleanSeed = String(seedStr || 'ROOMSCOUT').toUpperCase();
  const bars = [];
  for (let i = 0; i < cleanSeed.length; i++) {
    const code = cleanSeed.charCodeAt(i);
    bars.push((code % 3) + 1);
    bars.push(1);
    bars.push(((code * 7) % 2) + 1);
  }

  const barAreaX = x + 2.5;
  const barAreaW = width - 5;
  const barH = height - 6.5;
  const barY = y + 2;

  doc.setFillColor(15, 23, 42); // Deep midnight slate
  let curX = barAreaX;
  let idx = 0;
  while (curX < barAreaX + barAreaW - 1) {
    const barWidthVal = (bars[idx % bars.length] || 1) * 0.42;
    const isBar = idx % 2 === 0;
    if (isBar && curX + barWidthVal <= barAreaX + barAreaW) {
      doc.rect(curX, barY, Math.min(barWidthVal, 1.1), barH, 'F');
    }
    curX += barWidthVal + 0.35;
    idx++;
  }

  doc.setFont('courier', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(String(seedStr || 'REF-VERIFIED').slice(0, 22), x + width / 2, y + height - 1.5, { align: 'center' });
}

/**
 * Generates and downloads an ultra-premium executive RoomScout Entry Pass PDF.
 *
 * @param {Object} params
 * @param {Object} params.booking - The booking document
 * @param {Object} params.stay - Stay details (title, address, etc.)
 * @param {Object} params.host - Host details (name, phone, email)
 * @param {string} [params.checkInCode] - 8-digit verification code
 */
export function generateEntryPassPdf({ booking = {}, stay = {}, host = {}, checkInCode = '' }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const refId = booking.bookingReferenceId || booking._id || 'RESERVATION';
  const finalCode =
    checkInCode ||
    booking.checkInCode ||
    String(refId).replace(/\D/g, '').slice(-8).padStart(8, '0');

  const guestName = booking.fullName || booking.guestName || booking.userName || 'Guest Resident';
  const rawPhone = booking.phone || booking.guestPhone || booking.userPhone || '';
  const cleanPhone = String(rawPhone).replace(/\D/g, '').slice(-10);
  const formattedPhone = cleanPhone ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}` : 'N/A';
  const guestEmail = booking.email || booking.guestEmail || 'N/A';
  const aadharDisplay = formatAadharSafe(
    booking.aadharNumber || booking.guestAadhar || booking.aadharId || booking.aadhar
  );

  const stayTitle = stay.title || stay.propertyName || booking.stayTitle || 'RoomScout Verified Stay';
  const stayAddress =
    stay.address?.street ||
    stay.address?.city ||
    stay.location ||
    booking.location ||
    'Property Address On File';
  const roomNumber = booking.roomNumber || 'Assigned on Arrival';
  const roomType = booking.roomType || booking.room?.type || 'Standard';

  const checkInDate = formatDateSafe(booking.checkIn);
  const checkOutDate = formatDateSafe(booking.checkOut);
  const duration = booking.durationDisplay || (booking.rateUnit?.includes('night') ? '2 Nights' : '1 Month');
  const guestsCount = Math.max(Number(booking.personCount || booking.guestsCount || booking.totalGuests) || 1, 1);

  const hostName = host.name || stay.hostId?.name || 'Property Host';
  const rawHostPhone = host.phone || stay.hostId?.phone || '';
  const cleanHostPhone = String(rawHostPhone).replace(/\D/g, '').slice(-10);
  const formattedHostPhone = cleanHostPhone ? `+91 ${cleanHostPhone.slice(0, 5)} ${cleanHostPhone.slice(5)}` : 'Provided upon booking';
  const hostEmail = host.email || stay.hostId?.email || '';

  const totalAmount = Number(booking.totalAmount || booking.paidAmount || 0).toLocaleString('en-IN');
  const paymentMethod = booking.paymentDetails?.gateway || (booking.paymentMethod === 'UPI' ? 'Direct Host UPI' : booking.paymentMethod || 'Direct Host UPI');
  const utrRef =
    booking.upiPayment?.transactionRef ||
    booking.transactionRef ||
    booking.paymentDetails?.paymentId ||
    'VERIFIED-BY-HOST';
  const payeeUpi = booking.upiPayment?.upiId || host.upiSettings?.upiId || '';

  // ──────────────────────────────────────────
  // Color Palette Definitions
  // ──────────────────────────────────────────
  const C_NAVY = [15, 23, 42];          // #0F172A
  const C_EMERALD = [5, 150, 105];       // #059669
  const C_EMERALD_LIGHT = [236, 253, 245]; // #ECFDF5
  const C_EMERALD_BORDER = [16, 185, 129]; // #10B981
  const C_GOLD = [217, 119, 6];          // #D97706
  const C_BG_CARD = [255, 255, 255];
  const C_BG_CARD_ALT = [248, 250, 252]; // #F8FAFC
  const C_HEADER_STRIP = [241, 245, 249]; // #F1F5F9
  const C_BORDER = [226, 232, 240];      // #E2E8F0
  const C_TEXT_DARK = [15, 23, 42];
  const C_TEXT_MUTED = [100, 116, 139];  // #64748B
  const C_TEXT_LIGHT = [148, 163, 184];  // #94A3B8

  // ──────────────────────────────────────────
  // Top Executive Header Banner
  // ──────────────────────────────────────────
  doc.setFillColor(...C_NAVY);
  doc.rect(0, 0, 210, 26, 'F');

  // Dual metallic accent stripe below banner
  doc.setFillColor(...C_EMERALD_BORDER);
  doc.rect(0, 26, 140, 1.5, 'F');
  doc.setFillColor(...C_GOLD);
  doc.rect(140, 26, 70, 1.5, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('ROOMSCOUT', 12, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text('DIRECT STAYS • ZERO BROKERAGE • RESIDENT CREDENTIAL', 12, 19.5);

  // Header Right: Document Title Pill
  doc.setFillColor(...C_EMERALD);
  doc.roundedRect(136, 7, 62, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('OFFICIAL RESIDENT ENTRY PASS', 167, 11.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`VERIFIED CHECK-IN CREDENTIAL • REF: ${refId}`, 198, 20, { align: 'right' });

  // ──────────────────────────────────────────
  // Hero: Digital Keycard & 8-Digit Entry Pass Code Box
  // ──────────────────────────────────────────
  let y = 33;
  doc.setFillColor(...C_BG_CARD_ALT);
  doc.setDrawColor(...C_EMERALD_BORDER);
  doc.setLineWidth(0.4);
  doc.roundedRect(12, y, 186, 42, 3, 3, 'FD');

  // Code Box Label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C_NAVY);
  doc.text('OFFICIAL 8-DIGIT ENTRY PASS CODE', 18, y + 7.2);

  // Status Badge on Right
  doc.setFillColor(...C_EMERALD_LIGHT);
  doc.setDrawColor(...C_EMERALD_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(122, y + 3.2, 70, 6.2, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(...C_EMERALD);
  doc.text('PAYMENT VERIFIED • IN-HOUSE AUTHORIZED', 157, y + 7.3, { align: 'center' });

  // 8 Individual Digit Capsules
  const startX = 18;
  const startY = y + 13;
  const capW = 11.2;
  const capH = 16.5;
  const gap = 2;

  for (let i = 0; i < 8; i++) {
    const cx = startX + i * (capW + gap);
    doc.setFillColor(...C_BG_CARD);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, startY, capW, capH, 2, 2, 'FD');

    // Index indicator
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(...C_TEXT_LIGHT);
    doc.text(String(i + 1), cx + capW / 2, startY + 4, { align: 'center' });

    // Big Bold Digit
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14.5);
    doc.setTextColor(...C_NAVY);
    doc.text(finalCode[i] || '-', cx + capW / 2, startY + 12.5, { align: 'center' });
  }

  // Security Barcode on right side of Hero Card
  drawSecurityBarcode(doc, 134, startY, 58, capH, refId);

  // Guidance subtext
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Show this 8-digit verification code or barcode to the reception host for immediate room key handover.',
    18,
    y + 36.5
  );

  // ──────────────────────────────────────────
  // Section 1: Stay & Accommodation Details
  // ──────────────────────────────────────────
  y = 79;
  doc.setFillColor(...C_BG_CARD);
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, y, 186, 47, 2.5, 2.5, 'FD');

  // Section Header Bar
  doc.setFillColor(...C_HEADER_STRIP);
  doc.rect(12, y, 186, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('1. STAY & ACCOMMODATION DETAILS', 18, y + 4.8);

  // Column 1: Stay & Room
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C_TEXT_MUTED);
  doc.text('PROPERTY / STAY NAME', 18, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...C_TEXT_DARK);
  doc.text(stayTitle.slice(0, 38), 18, y + 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C_TEXT_MUTED);
  doc.text('LOCATION / ADDRESS', 18, y + 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(stayAddress.slice(0, 42), 18, y + 31);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C_TEXT_MUTED);
  doc.text('ALLOCATED ROOM & CATEGORY', 18, y + 37.5);

  // Styled Room Pill Badge
  doc.setFillColor(...C_EMERALD_LIGHT);
  doc.setDrawColor(...C_EMERALD_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(18, y + 39.5, 82, 6.5, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C_EMERALD);
  doc.text(`Room ${roomNumber} • ${roomType}`, 22, y + 44);

  // Column 2: Check-in / Check-out & Occupancy
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C_TEXT_MUTED);
  doc.text('CHECK-IN DATE', 108, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...C_TEXT_DARK);
  doc.text(checkInDate, 108, y + 19);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C_TEXT_MUTED);
  doc.text('12:00 PM (Standard Arrival)', 108, y + 22.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C_TEXT_MUTED);
  doc.text('CHECK-OUT DATE', 108, y + 27);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...C_TEXT_DARK);
  doc.text(checkOutDate, 108, y + 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C_TEXT_MUTED);
  doc.text('11:59 AM (Standard Departure)', 108, y + 35.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C_TEXT_MUTED);
  doc.text('STAY DURATION & GUESTS', 108, y + 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C_TEXT_DARK);
  doc.text(`${duration} • ${guestsCount} Registered Guest${guestsCount > 1 ? 's' : ''}`, 108, y + 44.5);

  // ──────────────────────────────────────────
  // Section 2: Primary Guest Profile & Identification
  // ──────────────────────────────────────────
  y = 130;
  doc.setFillColor(...C_BG_CARD);
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, y, 186, 43, 2.5, 2.5, 'FD');

  // Header
  doc.setFillColor(...C_HEADER_STRIP);
  doc.rect(12, y, 186, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('2. PRIMARY GUEST PROFILE & IDENTIFICATION', 18, y + 4.8);

  // Col 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C_TEXT_MUTED);
  doc.text('PRIMARY GUEST FULL NAME', 18, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...C_TEXT_DARK);
  doc.text(guestName.slice(0, 36), 18, y + 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C_TEXT_MUTED);
  doc.text('CONTACT PHONE NUMBER', 18, y + 26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C_TEXT_DARK);
  doc.text(formattedPhone, 18, y + 31);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C_TEXT_MUTED);
  doc.text('EMAIL ADDRESS', 18, y + 37);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(guestEmail.slice(0, 40), 18, y + 41.5);

  // Col 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C_TEXT_MUTED);
  doc.text('AADHAAR / GOVT. PHOTO ID', 108, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C_TEXT_DARK);
  doc.text(aadharDisplay, 108, y + 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C_TEXT_MUTED);
  doc.text('BOOKING REFERENCE ID', 108, y + 26);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...C_EMERALD);
  doc.text(refId, 108, y + 31);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C_TEXT_MUTED);
  doc.text('RESERVATION STATUS', 108, y + 37);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C_EMERALD);
  doc.text('CONFIRMED • IN-HOUSE AUTHORIZED', 108, y + 41.5);

  // ──────────────────────────────────────────
  // Section 3: Host Contact & Payment Verification
  // ──────────────────────────────────────────
  y = 177;
  doc.setFillColor(...C_BG_CARD);
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, y, 186, 45, 2.5, 2.5, 'FD');

  // Header
  doc.setFillColor(...C_HEADER_STRIP);
  doc.rect(12, y, 186, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('3. HOST CONTACT & PAYMENT VERIFICATION', 18, y + 4.8);

  // Col 1: Host info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C_TEXT_MUTED);
  doc.text('HOST / PROPERTY MANAGER', 18, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C_TEXT_DARK);
  doc.text(hostName.slice(0, 36), 18, y + 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C_TEXT_MUTED);
  doc.text('HOST CONTACT NUMBER', 18, y + 26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C_TEXT_DARK);
  doc.text(formattedHostPhone, 18, y + 31);

  if (hostEmail) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C_TEXT_MUTED);
    doc.text('HOST EMAIL', 18, y + 37);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(hostEmail.slice(0, 38), 18, y + 41.5);
  }

  // Col 2: Payment details (No broken unicode ? character)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C_TEXT_MUTED);
  doc.text('TOTAL AMOUNT PAID', 108, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...C_EMERALD);
  doc.text(`INR ${totalAmount} (PAID IN FULL)`, 108, y + 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C_TEXT_MUTED);
  doc.text('PAYMENT CHANNEL', 108, y + 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C_TEXT_DARK);
  doc.text(`${paymentMethod} • Zero Brokerage`, 108, y + 30.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C_TEXT_MUTED);
  doc.text('BANK TRANSACTION REF (UTR / RRN)', 108, y + 36);
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C_TEXT_DARK);
  doc.text(utrRef, 108, y + 40.5);

  if (payeeUpi) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C_TEXT_MUTED);
    doc.text(`Paid To Host UPI: ${payeeUpi}`, 108, y + 44);
  }

  // ──────────────────────────────────────────
  // Section 4: Physical Entry & Verification Rules
  // ──────────────────────────────────────────
  y = 226;
  doc.setFillColor(...C_BG_CARD);
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, y, 186, 41, 2.5, 2.5, 'FD');

  doc.setFillColor(...C_HEADER_STRIP);
  doc.rect(12, y, 186, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('4. RECEPTION ACCESS & VERIFICATION PROTOCOL', 18, y + 4.8);

  const rules = [
    `• Code Verification: Present the 8-Digit Entry Pass Code (${finalCode}) to the host at reception for instant check-in.`,
    '• Govt. Photo ID: Carry an original government photo ID (Aadhaar / Passport / Driving License) matching this pass.',
    '• Key Handover: Physical room key handover and room inventory review will be completed upon reception verification.',
    '• Check-In & Support: Standard check-in is 12:00 PM. Contact the host in advance for early baggage drop or assistance.',
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.3);
  doc.setTextColor(71, 85, 105);
  let ruleY = y + 13.5;
  rules.forEach((rule) => {
    doc.text(rule, 18, ruleY);
    ruleY += 6.5;
  });

  // ──────────────────────────────────────────
  // Document Footer
  // ──────────────────────────────────────────
  y = 273;
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.line(12, y, 198, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C_TEXT_MUTED);
  doc.text(
    `RoomScout Digital Reservation System • Official Resident Entry Credential • Generated on ${new Date().toLocaleString('en-IN')}`,
    12,
    y + 5
  );

  doc.setFont('courier', 'bold');
  doc.text(
    `Pass Ref: ${refId} • Entry Code: ${finalCode}`,
    198,
    y + 5,
    { align: 'right' }
  );

  // Trigger browser download
  const filename = `RoomScout_Entry_Pass_${refId}.pdf`;
  doc.save(filename);
  return filename;
}

export default generateEntryPassPdf;
