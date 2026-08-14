import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HiArrowLeft, HiArrowRight } from "react-icons/hi2";
import PinModal from "../components/PinModal";
import { showToast } from "../components/Toast";
import { BACKEND_URL } from "../../lib/config";

export const Join = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [roomCode, setRoomCode] = useState(searchParams.get("code") || "");
  const [displayName, setDisplayName] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const savedName = localStorage.getItem("chattr_display_name");
    if (savedName) setDisplayName(savedName);
  }, []);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  function onSubmitHandler(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    const name = displayName.trim();

    if (code.length !== 6) {
      showToast("error", "Room code must be 6 characters.");
      return;
    }
    if (name.length < 2 || name.length > 20) {
      showToast("error", "Display name must be 2-20 characters.");
      return;
    }

    localStorage.setItem("chattr_display_name", name);
    setIsChecking(true);

    // Check room via WebSocket
    const ws = new WebSocket(BACKEND_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "check_room",
          payload: { roomCode: code },
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "check_room_result") {
          if (!data.payload.exists) {
            showToast("error", data.payload.error || "Room not found.");
            setIsChecking(false);
            ws.close();
            wsRef.current = null;
            return;
          }

          if (data.payload.isPrivate) {
            // Show PIN modal
            setIsChecking(false);
            setShowPinModal(true);
            // Keep WS open for PIN validation
          } else {
            // Public room — join directly
            ws.close();
            wsRef.current = null;
            setIsChecking(false);
            navigateToChat(code, name);
          }
        }

        if (data.type === "pin_validated") {
          setPinLoading(false);
          setShowPinModal(false);
          ws.close();
          wsRef.current = null;
          navigateToChat(code, name);
        }

        if (data.type === "pin_error") {
          setPinLoading(false);
          setPinError(data.payload.message);
          if (data.payload.rateLimited) {
            showToast(
              "warning",
              `Too many attempts. Try again in ${data.payload.retryAfter}s.`
            );
          }
        }
      } catch {
        setIsChecking(false);
      }
    };

    ws.onerror = () => {
      showToast("error", "Network error. Could not connect to server.");
      setIsChecking(false);
    };

    ws.onclose = () => {
      setIsChecking(false);
    };
  }

  function navigateToChat(code: string, name: string) {
    navigate(
      `/chat?roomid=${code}&name=${encodeURIComponent(name)}`
    );
  }

  function handlePinSubmit(pin: string) {
    const code = roomCode.trim().toUpperCase();
    setPinError("");
    setPinLoading(true);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "validate_pin",
          payload: { roomCode: code, pin },
        })
      );
    } else {
      // Reconnect if WS was closed
      const ws = new WebSocket(BACKEND_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "validate_pin",
            payload: { roomCode: code, pin },
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "pin_validated") {
            setPinLoading(false);
            setShowPinModal(false);
            ws.close();
            wsRef.current = null;
            navigateToChat(code, displayName.trim());
          }

          if (data.type === "pin_error") {
            setPinLoading(false);
            setPinError(data.payload.message);
            if (data.payload.rateLimited) {
              showToast(
                "warning",
                `Too many attempts. Try again in ${data.payload.retryAfter}s.`
              );
            }
          }
        } catch {
          setPinLoading(false);
        }
      };

      ws.onerror = () => {
        showToast("error", "Network error.");
        setPinLoading(false);
      };
    }
  }

  const isValid =
    roomCode.trim().length === 6 &&
    displayName.trim().length >= 2 &&
    displayName.trim().length <= 20;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
      <Header />

      <main className="flex flex-1 justify-center items-center flex-col relative overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-gradient-radial from-indigo-400/8 dark:from-indigo-600/6 via-transparent to-transparent rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-md px-6"
        >
          {/* Back button */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors mb-6 text-sm font-medium"
          >
            <HiArrowLeft className="text-lg" />
            Back
          </button>

          {/* Card */}
          <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-xl shadow-neutral-200/50 dark:shadow-black/20">
            <div className="mb-6">
              <h1 className="font-bricolage-grotesque font-bold text-2xl text-neutral-900 dark:text-white mb-1.5">
                Join a Room
              </h1>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                Enter the room code and your display name.
              </p>
            </div>

            <form onSubmit={onSubmitHandler} className="flex flex-col gap-5">
              <div className="flex flex-col">
                <label className="mb-2 text-neutral-700 dark:text-neutral-300 text-sm font-medium">
                  Room Code <span className="text-rose-500">*</span>
                </label>
                <input
                  autoFocus
                  maxLength={6}
                  type="text"
                  value={roomCode}
                  onChange={(e) =>
                    setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                  }
                  placeholder="######"
                  className="rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-800/60 outline-none font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 font-courier text-lg tracking-[0.2em] text-center focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 uppercase"
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-2 text-neutral-700 dark:text-neutral-300 text-sm font-medium">
                  Display Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Satoshi"
                  maxLength={20}
                  className="rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-800/60 outline-none font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-sm focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                />
                <div className="flex justify-between mt-1.5 px-1">
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">
                    2-20 characters
                  </span>
                  <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">
                    {displayName.trim().length}/20
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={!isValid || isChecking}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 disabled:from-neutral-300 disabled:to-neutral-400 dark:disabled:from-neutral-700 dark:disabled:to-neutral-700 text-white disabled:text-neutral-500 dark:disabled:text-neutral-500 font-semibold py-3.5 rounded-xl mt-2 hover:from-indigo-500 hover:to-violet-500 disabled:hover:from-neutral-300 disabled:hover:to-neutral-400 dark:disabled:hover:from-neutral-700 dark:disabled:hover:to-neutral-700 shadow-lg shadow-indigo-500/20 disabled:shadow-none hover:-translate-y-0.5 disabled:hover:translate-y-0 active:translate-y-0 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed text-sm"
              >
                {isChecking ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Join Room
                    <HiArrowRight className="text-lg" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-neutral-400 dark:text-neutral-600 text-xs mt-6">
            Rooms are temporary and disappear when expired
          </p>
        </motion.div>
      </main>

      {/* PIN Modal */}
      <PinModal
        isOpen={showPinModal}
        onClose={() => {
          setShowPinModal(false);
          setPinError("");
          if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
          }
        }}
        onSubmit={handlePinSubmit}
        error={pinError}
        loading={pinLoading}
      />
    </div>
  );
};
