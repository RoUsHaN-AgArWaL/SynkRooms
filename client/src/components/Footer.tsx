const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-neutral-200/50 dark:border-neutral-800/30 bg-white/30 dark:bg-neutral-950/30 backdrop-blur-xl">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Brand + Description */}
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center shadow-sm shadow-[#7C3AED]/20">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="7" cy="7" r="2" />
                <circle cx="17" cy="7" r="2" />
                <circle cx="12" cy="16" r="2" />
                <path d="M8.5 7L11.5 11.5L15.5 7" />
                <path d="M12 9.5V14" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/RoUsHaN-AgArWaL"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 hover:text-[#7C3AED] dark:hover:text-[#A855F7] transition-colors duration-200"
              >
                SynkRooms
              </a>
              <span className="hidden sm:inline text-neutral-300 dark:text-neutral-700">·</span>
              <span className="hidden sm:inline text-[12px] text-neutral-400 dark:text-neutral-600">
                Anonymous chat rooms with zero footprint.
              </span>
            </div>
          </div>

          {/* Center: Credit + Socials */}
          <div className="flex items-center gap-3 text-[12px] text-neutral-400 dark:text-neutral-600">
            <span className="flex items-center gap-1">
              Crafted with
              <span className="text-rose-500 text-[10px]">❤️</span>
              by
            </span>
            <a
              href="https://github.com/RoUsHaN-AgArWaL"
              className="font-semibold text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              RoUsHaN AgArWaL
            </a>
            <div className="flex items-center gap-1.5 ml-1">
              <a
                href="https://github.com/RoUsHaN-AgArWaL"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-400 dark:text-neutral-600 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/in/roushan-agarawal/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-400 dark:text-neutral-600 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Right: Year */}
          <span className="text-[11px] text-neutral-400 dark:text-neutral-600 tabular-nums">
            © {currentYear}
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;