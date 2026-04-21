import './Header.css'

/**
 * Header — App name, tagline, theme toggle, and compare mode button.
 * Props:
 *   theme            {string}   "dark" | "light"
 *   onToggleTheme    {function} called when the theme button is clicked
 *   compareMode      {bool}     true when compare mode is active
 *   onToggleCompare  {function} called when the compare button is clicked
 *   onLogoClick      {function} called when the logo/name is clicked — resets app
 */
export default function Header({ theme, onToggleTheme, compareMode, onToggleCompare, onLogoClick }) {
  return (
    <header className="site-header">
      {/* Inner wrapper keeps content aligned to the same max-width as the page */}
      <div className="header-inner">
        {/* Logo / app name — clickable, resets to the initial state */}
        <button
          className="header-left header-logo-btn"
          onClick={onLogoClick}
          type="button"
          aria-label="Go to home"
        >
          <img src="/logo.svg" alt="HireReady Logo" className="header-icon" />
          <span className="header-logo">HireReady</span>
        </button>

        {/* Tagline — hidden on small screens via CSS */}
        <div className="header-tagline">Know your chances before they do</div>

        <div className="header-actions">
          {/* Compare mode toggle */}
          <button
            className={`compare-toggle${compareMode ? ' compare-toggle--active' : ''}`}
            onClick={onToggleCompare}
            title={compareMode ? 'Back to single mode' : 'Compare resume against multiple JDs'}
            type="button"
          >
            ⚖ Compare
          </button>

          {/* Theme toggle button */}
          <button
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  )
}
