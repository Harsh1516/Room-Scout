import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI, staysAPI } from '../services/api';
import { toast } from '../context/ToastContext';
import { Left } from '../components/navbar/Left';
import { Login } from '../components/navbar/Login';

export function HostRoomsPage() {
 const navigate = useNavigate();
 const location = useLocation();
 const { user } = useAuth();

 // Passed state from HostDashboardPage
 const stateRoomType = location.state?.roomType || null;
 const stateHostProperty = location.state?.hostProperty || null;

 const [hostProperty, setHostProperty] = useState(stateHostProperty);
 const [loading, setLoading] = useState(!stateHostProperty);
 const [isSaving, setIsSaving] = useState(false);

 // Active room type for which user is adding/managing cards
 const [selectedType, setSelectedType] = useState(() => {
 if (stateRoomType?.type) return stateRoomType.type;
 if (stateRoomType?.name) return stateRoomType.name;
 if (stateHostProperty?.roomRates?.[0]?.type) return stateHostProperty.roomRates[0].type;
 return 'Delux AC Room';
 });

 // Room Cards State
 const [rooms, setRooms] = useState([]);

 // Load host property from backend if not passed
 useEffect(() => {
 if (stateHostProperty) {
 setHostProperty(stateHostProperty);
 if (Array.isArray(stateHostProperty.rooms)) {
 setRooms(stateHostProperty.rooms);
 }
 setLoading(false);
 return;
 }

 const fetchHostData = async () => {
 try {
 setLoading(true);
 const hostEmail = user?.email || localStorage.getItem('user_email') || '';

 // 1. Primary: Lookup host by verified email
 if (hostEmail) {
 const res = await adminAPI.getHostByEmail(hostEmail).catch(() => null);
 if (res?.hasProperty && (res?.host || res?.stay)) {
 const prop = { ...(res.stay || {}), ...(res.host?.property || {}), ...(res.host || {}) };
 setHostProperty(prop);
 if (Array.isArray(prop.rooms)) {
 setRooms(prop.rooms);
 }
 if (!stateRoomType && prop.roomRates?.[0]?.type) {
 setSelectedType(prop.roomRates[0].type);
 }
 setLoading(false);
 return;
 }
 }

 // 2. Fallback: Search stays database
 const staysRes = await staysAPI.getStays().catch(() => []);
 const staysList = Array.isArray(staysRes) ? staysRes : (staysRes?.stays || staysRes?.data || []);
 if (Array.isArray(staysList) && staysList.length > 0) {
 const match = staysList.find(
 (s) =>
 (s.email && s.email.toLowerCase() === hostEmail.toLowerCase()) ||
 (s.ownerEmail && s.ownerEmail.toLowerCase() === hostEmail.toLowerCase()) ||
 (s.hostEmail && s.hostEmail.toLowerCase() === hostEmail.toLowerCase())
 ) || staysList[0];

 if (match) {
 setHostProperty(match);
 if (Array.isArray(match.rooms)) {
 setRooms(match.rooms);
 }
 if (!stateRoomType && match.roomRates?.[0]?.type) {
 setSelectedType(match.roomRates[0].type);
 }
 }
 }
 } catch (err) {
 console.error('Failed to fetch host property in HostRoomsPage:', err);
 } finally {
 setLoading(false);
 }
 };

 fetchHostData();
 }, [stateHostProperty, user]);

 // Current active room rate details
 const activeRate = useMemo(() => {
 if (stateRoomType && (stateRoomType.type === selectedType || stateRoomType.name === selectedType)) {
 return {
 type: stateRoomType.type || stateRoomType.name,
 price: stateRoomType.price,
 rateUnit: stateRoomType.rateUnit || '/month',
 };
 }
 const found = hostProperty?.roomRates?.find((r) => r.type === selectedType);
 if (found) return found;
 return {
 type: selectedType,
 price: stateRoomType?.price || '₹5,500',
 rateUnit: stateRoomType?.rateUnit || '/month',
 };
 }, [selectedType, stateRoomType, hostProperty]);

 // Filter cards for the currently selected room type
 const currentTypeRooms = useMemo(() => {
 return rooms.filter((r) => r.type === selectedType);
 }, [rooms, selectedType]);

 // Add a new editable room card
 const handleAddCard = () => {
 const countForType = currentTypeRooms.length;
 let nextNum = '101';
 if (countForType > 0) {
 const lastNum = parseInt(String(currentTypeRooms[countForType - 1]?.roomNumber || '').replace(/[^0-9]/g, ''), 10);
 nextNum = !isNaN(lastNum) ? String(lastNum + 1) : `${101 + countForType}`;
 }

 const newCard = {
 _id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
 roomNumber: nextNum,
 roomNumInt: parseInt(nextNum, 10) || 101,
 type: activeRate.type,
 price: activeRate.price,
 rateUnit: activeRate.rateUnit || '/month',
 status: 'Available',
 };

 setRooms((prev) => [...prev, newCard]);
 };

 // Inline edit room number
 const handleUpdateRoomNumber = (roomId, newNumber) => {
 setRooms((prev) =>
 prev.map((r) => {
 if (r._id === roomId) {
 const parsed = parseInt(newNumber.replace(/[^0-9]/g, ''), 10);
 return {
 ...r,
 roomNumber: newNumber,
 roomNumInt: !isNaN(parsed) ? parsed : r.roomNumInt,
 };
 }
 return r;
 })
 );
 };

 // Remove a room card
 const handleRemoveCard = (roomId) => {
 setRooms((prev) => prev.filter((r) => r._id !== roomId));
 };

 // Save changes to backend and return to dashboard
 const handleSaveAndReturn = async () => {
 if (!hostProperty) {
 navigate('/host/dashboard', { state: { tab: 'room' } });
 return;
 }

 try {
 setIsSaving(true);
 const totalCount = rooms.length;
 const availCount = rooms.filter((r) => r.status === 'Available').length;

 const updatedHost = {
 ...hostProperty,
 rooms,
 totalRooms: totalCount,
 availableRooms: availCount,
 };

 await adminAPI.createHost(updatedHost);
 toast.success('Rooms saved successfully');
 navigate('/host/dashboard', { state: { tab: 'room', updatedHost } });
 } catch (err) {
 console.error('Failed to save rooms:', err);
 toast.error('Failed to save rooms');
 } finally {
 setIsSaving(false);
 }
 };

 const handleBackToDashboard = async () => {
 const totalCount = rooms.length;
 const availCount = rooms.filter((r) => r.status === 'Available').length;

 const updatedHost = {
 ...hostProperty,
 rooms,
 totalRooms: totalCount,
 availableRooms: availCount,
 };

 try {
 await adminAPI.createHost(updatedHost);
 } catch (err) {
 console.warn('Auto save on back error:', err);
 }

 navigate('/host/dashboard', {
 state: {
 tab: 'room',
 updatedHost,
 },
 });
 };

 if (loading) {
 return (
 <div className="min-h-screen bg-[#f7f4ee] flex items-center justify-center">
 <div className="text-xs text-slate-500 font-medium">Loading room layout...</div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-white text-slate-800 flex flex-col host-page-scope font-body-md antialiased overflow-x-clip selection:bg-custom-btn-primary selection:text-white relative">
 {/* Top Header Navbar */}
 <header className="relative w-full h-[70px] sm:h-[88px] pointer-events-none select-none z-50 font-body-md antialiased">
        {/* Left Floating Island: Circular Back Button */}
        <Left showBadge={false} onBack={handleBackToDashboard} fallbackUrl="/host/dashboard" />

        {/* Center Floating Island: Room Info Pill */}
        <div className="hidden sm:flex fixed top-2.5 sm:top-5 left-1/2 -translate-x-1/2 z-50 items-center pointer-events-auto select-none h-[54px] sm:h-[56px]">
          <div className="flex items-center px-4 sm:px-5 h-[54px] sm:h-[56px] rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-sm text-xs sm:text-sm font-semibold text-[#1f1b16]">
            Room Cards Manager • {activeRate.type} ({activeRate.price}{activeRate.rateUnit})
          </div>
        </div>

        {/* Right Floating Island: Save Rooms Button + User Dashboard + Profile */}
        <div className="fixed top-2.5 sm:top-5 right-2.5 sm:right-6 z-50 flex items-center gap-2 sm:gap-2.5 pointer-events-auto select-none h-[54px] sm:h-[56px]">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveAndReturn}
            className="inline-flex items-center justify-center h-[54px] sm:h-[56px] px-5 sm:px-6 rounded-full bg-[#1f1b16] hover:bg-black text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 shadow-sm active:scale-95"
          >
            {isSaving ? 'Saving...' : 'Save Rooms'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            data-no-hover="true"
            className="w-[54px] h-[54px] sm:w-[56px] sm:h-[56px] min-w-[54px] min-h-[54px] rounded-full bg-white text-slate-800 border border-slate-200/90 shadow-sm hover:bg-[#f7f4ee] flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 shrink-0"
            title="Switch to User Dashboard"
            aria-label="User Dashboard"
          >
            <svg
              className="w-6 h-6 sm:w-6.5 sm:h-6.5 text-slate-700 stroke-[2.2] shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>
          <div className="relative flex items-center justify-center h-[54px] sm:h-[56px] shrink-0">
            <Login />
          </div>
        </div>
      </header>

 {/* Main Content Area */}
 <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 pt-24 pb-12 px-3 sm:px-6 lg:px-8 space-y-6 overflow-x-clip">
 <div className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <div className="flex items-center gap-2">
 <h2 className="text-base font-medium text-[#1f1b16]">
 {activeRate.type} Cards
 </h2>
 <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
 {currentTypeRooms.length} Total
 </span>
 </div>
 <p className="text-xs text-slate-500 mt-1">
 Add individual room cards. Each card has an editable room number and can be removed anytime.
 </p>
 </div>

 <button
 type="button"
 onClick={handleAddCard}
 className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
 >
 <span className="text-sm font-medium">+</span>
 <span>Add Room Card</span>
 </button>
 </div>

 {currentTypeRooms.length === 0 ? (
 <div className="p-12 rounded-xl bg-white border border-dashed border-slate-300 text-center space-y-3">
 <p className="text-xs text-slate-500">
 No room cards added for <span className="font-semibold text-slate-700">{activeRate.type}</span> yet.
 </p>
 <button
 type="button"
 onClick={handleAddCard}
 className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
 >
 + Add First Room Card
 </button>
 </div>
 ) : (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
 {currentTypeRooms.map((card) => (
 <div
 key={card._id}
 className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col justify-center h-28 relative group shadow-xs hover:border-slate-300 transition-colors"
 >
 <button
 type="button"
 onClick={() => handleRemoveCard(card._id)}
 className="absolute top-2 right-2 w-6 h-6 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 text-xs flex items-center justify-center font-medium transition-colors cursor-pointer"
 title="Remove this room card"
 >
 
 </button>

 <div className="text-center px-1">
 <label className="text-[10px] font-medium text-slate-400 block mb-1 ">
 Room No.
 </label>
 <input
 type="text"
 value={card.roomNumber}
 onChange={(e) => handleUpdateRoomNumber(card._id, e.target.value)}
 placeholder="e.g. 101"
 className="w-full px-2.5 py-1.5 rounded-lg bg-[#f7f4ee] border border-slate-200 text-sm font-medium text-[#1f1b16] text-center focus:outline-none focus:border-slate-400 transition-colors"
 />
 </div>
 </div>
 ))}
 </div>
 )}
 </main>
 </div>
 );
}

export default HostRoomsPage;