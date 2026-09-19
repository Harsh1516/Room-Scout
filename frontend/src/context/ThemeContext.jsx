import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('room_scout_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  // Synchronize on initial mount or external theme change
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [theme]);

  // ⚡ Instantaneous zero-latency toggle (synchronous execution on the same user click tick)
  const toggleTheme = () => {
    const root = document.documentElement;
    const isDarkNow = root.classList.contains('dark');
    const nextTheme = isDarkNow ? 'light' : 'dark';

    // 1. Instant synchronous DOM mutation (0ms latency, zero delay)
    if (nextTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    // 2. Instant persistence & event broadcast
    try {
      localStorage.setItem('room_scout_theme', nextTheme);
    } catch {}
    window.dispatchEvent(new CustomEvent('room-scout-theme-change', { detail: { theme: nextTheme } }));

    // 3. Update React context state
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
