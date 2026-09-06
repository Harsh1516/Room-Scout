import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import { toast } from '../context/ToastContext';
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
        const stays = await adminAPI.getStays();
        if (Array.isArray(stays) && stays.length > 0) {
          const match = stays.find(
            (s) =>
              (s.email && s.email.toLowerCase() === hostEmail.toLowerCase()) ||
              (s.ownerEmail && s.ownerEmail.toLowerCase() === hostEmail.toLowerCase())
          ) || stays[0];

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

  // Filter cards for the currently selected room type (or show all)
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
      id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      roomNumber: nextNum,
      roomNumInt: parseInt(nextNum, 10) || 101,
      type: activeRate.type,
      price: activeRate.price,
      rateUnit: activeRate.rateUnit || '/month',
      status: 'Available',
    };

    setRooms((prev) => [...prev, newCard]);
    toast.success(`Added Room ${nextNum}`);
  };

  // Inline edit room number
  const handleUpdateRoomNumber = (roomId, newNumber) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId) {
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
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    toast.info('Room card removed');
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
      toast.success('All room cards saved successfully!');
      navigate('/host/dashboard', { state: { tab: 'room', updatedHost } });
    } catch (err) {
      console.error('Failed to save rooms:', err);
      toast.error('Failed to save room cards to server');
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-xs text-slate-500 font-medium">Loading room layout...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans overflow-x-clip">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-3">
          {/* Left: Back button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBackToDashboard}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
              title="Back to Dashboard"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back</span>
            </button>
          </div>

          {/* Center: Title Pill Badge */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-inner">
            <span className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs">
              Room Cards Manager • {activeRate.type} ({activeRate.price}{activeRate.rateUnit})
            </span>
          </div>

          {/* Right: Save Rooms & Profile */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAndReturn}
              className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50 shadow-xs active:scale-95 flex items-center gap-1.5"
            >
              {isSaving ? 'Saving...' : 'Save Rooms'}
            </button>
            <Login />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6 overflow-x-clip">
        {/* Top Control Bar */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {activeRate.type} Cards
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                {currentTypeRooms.length} Total
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Add individual room cards. Each card has an editable room number and can be removed anytime.
            </p>
          </div>

          {/* Action: + Add Room Card Button */}
          <button
            type="button"
            onClick={handleAddCard}
            className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <span className="text-sm font-bold">+</span>
            <span>Add Room Card</span>
          </button>
        </div>

        {/* Room Cards Grid */}
        {currentTypeRooms.length === 0 ? (
          <div className="p-12 rounded-xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No room cards added for <span className="font-semibold text-slate-700 dark:text-slate-300">{activeRate.type}</span> yet.
            </p>
            <button
              type="button"
              onClick={handleAddCard}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              + Add First Room Card
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {currentTypeRooms.map((card) => (
              <div
                key={card.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-center h-28 relative group shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                {/* Cross Button to Remove Card */}
                <button
                  type="button"
                  onClick={() => handleRemoveCard(card.id)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-xs flex items-center justify-center font-bold transition-colors cursor-pointer"
                  title="Remove this room card"
                >
                  ✕
                </button>

                {/* Center: Editable Room Number Input */}
                <div className="text-center px-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">
                    Room No.
                  </label>
                  <input
                    type="text"
                    value={card.roomNumber}
                    onChange={(e) => handleUpdateRoomNumber(card.id, e.target.value)}
                    placeholder="e.g. 101"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white text-center focus:outline-none focus:border-slate-400 transition-colors"
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

