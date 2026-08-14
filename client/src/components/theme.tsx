import { useState, useEffect } from "react";
import { MdSunny } from "react-icons/md";
import { IoIosMoon } from "react-icons/io";

const Theme = () => {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const handleThemeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={handleThemeToggle}
      className="w-9 h-9 rounded-xl flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all duration-200 cursor-pointer border border-neutral-200 dark:border-neutral-700"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <MdSunny className="text-lg text-amber-400" />
      ) : (
        <IoIosMoon className="text-lg text-indigo-600" />
      )}
    </button>
  );
};

export default Theme;
