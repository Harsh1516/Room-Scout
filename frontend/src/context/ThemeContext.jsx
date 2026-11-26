import { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext({
 theme: 'light',
 isDark: false,
 toggleTheme: () => {},
 setTheme: () => {},
});

export function ThemeProvider({ children }) {
 useEffect(() => {
 const root = document.documentElement;
 root.classList.remove('dark');
 root.classList.add('light');
 try {
 localStorage.removeItem('stayin_theme');
 } catch {}
 }, []);

 return (
 <ThemeContext.Provider value={{ theme: 'light', isDark: false, toggleTheme: () => {}, setTheme: () => {} }}>
 {children}
 </ThemeContext.Provider>
 );
}

export function useTheme() {
 return useContext(ThemeContext);
}

export default ThemeContext;
