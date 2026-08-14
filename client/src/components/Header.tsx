import { useNavigate } from "react-router-dom";
import Theme from "./theme";

const Header = () => {
  const navigate = useNavigate();
  return (
    <div className="flex-none flex justify-between items-center px-6 sm:px-12 lg:px-16 h-16 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800/60 text-neutral-800 dark:text-neutral-100 z-50">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-3 group transition-opacity hover:opacity-80"
      >
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center shadow-lg shadow-[#7C3AED]/20 group-hover:shadow-[#A855F7]/30 transition-shadow duration-300">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="2.5" fill="white" />
            <circle cx="17" cy="7" r="2.5" fill="white" />
            <circle cx="12" cy="16" r="2.5" fill="white" />
            <path d="M8.5 7L11.5 11.5L15.5 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 9.5V14" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <span className="font-extrabold font-bricolage-grotesque text-xl sm:text-2xl tracking-tight">
          SynkRooms
        </span>
      </button>
      <Theme />
    </div>
  );
};

export default Header;
