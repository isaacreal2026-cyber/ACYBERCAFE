import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/theme';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-surface-card hover:bg-gray-100 transition-colors border border-gray-200"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-text-secondary" />
      ) : (
        <Sun className="w-5 h-5 text-brand-accent" />
      )}
    </button>
  );
};
