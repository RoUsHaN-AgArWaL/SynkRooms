import { useNavigate } from "react-router-dom";
import Theme from "./theme";
import logo from "./extra1-large.jpeg";

const Header = () => {
  const navigate = useNavigate();
  return (
    <div className="flex-none flex justify-between items-center px-6 sm:px-12 lg:px-16 h-16 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800/60 text-neutral-800 dark:text-neutral-100 z-50">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-3 group transition-opacity hover:opacity-80"
      >
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center shadow-lg shadow-[#7C3AED]/20 group-hover:shadow-[#A855F7]/30 transition-shadow duration-300">
        
          <img
                    src={logo}
                    alt="SynkRooms Logo"
                    className="w-full h-full object-cover"
                  />
        </div>
       <span className="font-['Audiowide'] text-lg sm:text-xl tracking-[0.18em] uppercase">
          SynkRooms
        </span>
      </button>
      <Theme />
    </div>
  );
};

export default Header;
