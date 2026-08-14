import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineXMark, HiOutlineLockClosed } from "react-icons/hi2";

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
  error?: string;
  loading?: boolean;
}

export default function PinModal({
  isOpen,
  onClose,
  onSubmit,
  error,
  loading,
}: PinModalProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDigits(["", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  // Clear errors when user types
  useEffect(() => {
    if (error) {
      setDigits(["", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [error]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Auto-focus next input
    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 digits entered
    if (digit && index === 3) {
      const pin = newDigits.join("");
      if (pin.length === 4) {
        onSubmit(pin);
      }
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted.length > 0) {
      const newDigits = [...digits];
      for (let i = 0; i < pasted.length && i < 4; i++) {
        newDigits[i] = pasted[i];
      }
      setDigits(newDigits);
      if (pasted.length === 4) {
        onSubmit(pasted);
      } else {
        inputRefs.current[Math.min(pasted.length, 3)]?.focus();
      }
    }
  };

  const handleSubmit = () => {
    const pin = digits.join("");
    if (pin.length === 4) {
      onSubmit(pin);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-sm bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
              aria-label="Close"
            >
              <HiOutlineXMark className="text-lg" />
            </button>

            {/* Header */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/20 dark:to-violet-500/20 border border-indigo-200/50 dark:border-indigo-500/20 flex items-center justify-center mb-4">
                <HiOutlineLockClosed className="text-2xl text-indigo-500 dark:text-indigo-400" />
              </div>
              <h2 className="font-bricolage-grotesque font-bold text-xl text-neutral-900 dark:text-white mb-1">
                Private Room
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm text-center">
                Enter the 4-digit PIN to join
              </p>
            </div>

            {/* PIN Input */}
            <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  disabled={loading}
                  className={`w-14 h-16 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-all duration-200 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-900 dark:text-white
                    ${
                      error
                        ? "border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 animate-shake"
                        : "border-neutral-200 dark:border-neutral-700 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    }
                    ${loading ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                  aria-label={`PIN digit ${i + 1}`}
                />
              ))}
            </div>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-center text-sm text-rose-500 dark:text-rose-400 font-medium mb-4"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={digits.join("").length !== 4 || loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 disabled:from-neutral-300 disabled:to-neutral-400 dark:disabled:from-neutral-700 dark:disabled:to-neutral-700 text-white disabled:text-neutral-500 dark:disabled:text-neutral-500 font-semibold py-3.5 rounded-xl hover:from-indigo-500 hover:to-violet-500 disabled:hover:from-neutral-300 disabled:hover:to-neutral-400 dark:disabled:hover:from-neutral-700 dark:disabled:hover:to-neutral-700 shadow-lg shadow-indigo-500/20 disabled:shadow-none hover:-translate-y-0.5 disabled:hover:translate-y-0 active:translate-y-0 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <HiOutlineLockClosed className="text-base" />
                  Unlock Room
                </>
              )}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
