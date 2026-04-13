import './Header.css'

/**
 * Header — App name, tagline, and theme toggle button.
 * Props:
 *   theme         {string}   "dark" | "light"
 *   onToggleTheme {function} called when the theme button is clicked
 */
export default function Header({ theme, onToggleTheme }) {
  return (
    <header className="site-header">
      {/* Logo / app name */}
      <div className="header-left">
        <span className="header-logo">HireReady</span>
      </div>

      {/* Tagline — hidden on small screens via CSS */}
      <div className="header-tagline">Know your chances before they do</div>

      {/* Theme toggle button */}
      <button
        className="theme-toggle"
        onClick={onToggleTheme}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </header>
  )
}
