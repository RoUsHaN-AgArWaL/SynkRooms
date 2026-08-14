import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { showToast } from "../components/Toast";
import {
  HiOutlineClipboardDocument,
  HiOutlineShare,
  HiOutlineArrowRight,
  HiOutlineCheckCircle,
  HiOutlineLockClosed,
  HiOutlineGlobeAlt,
  HiOutlineClock,
} from "react-icons/hi2";
import { IoMdCheckmark } from "react-icons/io";

const RoomCreated = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const roomCode = params.get("code") || "";
  const ownerId = params.get("owner") || "";
  const expiresAt = parseInt(params.get("expiresAt") || "0");
  const roomType = params.get("type") || "public";
  const displayName = params.get("name") || "";
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState("");

  // Calculate countdown
  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = expiresAt - Date.now();
      if (diff <= 0) {
        setCountdown("Expired");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 0) {
        setCountdown(`${h}h ${m}m ${s}s`);
      } else if (m > 0) {
        setCountdown(`${m}m ${s}s`);
      } else {
        setCountdown(`${s}s`);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const copyCode = () => {
    navigator.clipboard
      .writeText(roomCode)
      .then(() => {
        setCopied(true);
        showToast("success", "Room code copied!");
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {
        showToast("error", "Failed to copy room code.");
      });
  };

  const shareCode = async () => {
    const shareData = {
      title: "Join my SynkRooms room!",
      text: `Join my anonymous room on SynkRooms! Room code: ${roomCode}`,
      url: `${window.location.origin}/join?code=${roomCode}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or error
        copyCode();
      }
    } else {
      // Fallback: copy the share link
      navigator.clipboard
        .writeText(`${shareData.text}\n${shareData.url}`)
        .then(() => {
          showToast("success", "Share link copied to clipboard!");
        })
        .catch(() => {
          showToast("error", "Failed to copy share link.");
        });
    }
  };

  const enterRoom = () => {
    const p = new URLSearchParams();
    p.set("roomid", roomCode);
    p.set("name", displayName);
    p.set("owner", ownerId);
    navigate(`/chat?${p.toString()}`);
  };

  if (!roomCode) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
      <Header />

      <main className="flex flex-1 justify-center items-center flex-col relative overflow-hidden py-20">
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-emerald-400/10 dark:from-emerald-600/8 via-transparent to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-gradient-radial from-indigo-400/8 dark:from-indigo-600/5 via-transparent to-transparent rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-md px-6"
        >
          <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-xl shadow-neutral-200/50 dark:shadow-black/20">
            {/* Success Header */}
            <div className="flex flex-col items-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                  delay: 0.2,
                }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/15 dark:from-emerald-500/25 dark:to-emerald-600/25 border border-emerald-200/60 dark:border-emerald-600/30 flex items-center justify-center mb-4"
              >
                <HiOutlineCheckCircle className="text-3xl text-emerald-500 dark:text-emerald-400" />
              </motion.div>
              <h1 className="font-bricolage-grotesque font-bold text-2xl text-neutral-900 dark:text-white mb-1">
                Room Created!
              </h1>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm text-center">
                Share the room code with your friends to start chatting.
              </p>
            </div>

            {/* Room Code */}
            <div className="mb-6">
              <div className="flex items-center justify-center gap-3 py-5 px-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200/80 dark:border-neutral-700/50">
                <span className="font-courier text-3xl font-bold tracking-[0.25em] text-neutral-900 dark:text-white select-all">
                  {roomCode}
                </span>
              </div>
            </div>

            {/* Room Info */}
            <div className="flex flex-col gap-3 mb-8">
              <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-neutral-50/50 dark:bg-neutral-800/30">
                <div className="flex items-center gap-2">
                  <HiOutlineClock className="text-base text-neutral-400 dark:text-neutral-500" />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    Expires in
                  </span>
                </div>
                <span className="text-sm font-semibold font-mono text-neutral-900 dark:text-white">
                  {countdown}
                </span>
              </div>

              <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-neutral-50/50 dark:bg-neutral-800/30">
                <div className="flex items-center gap-2">
                  {roomType === "private" ? (
                    <HiOutlineLockClosed className="text-base text-neutral-400 dark:text-neutral-500" />
                  ) : (
                    <HiOutlineGlobeAlt className="text-base text-neutral-400 dark:text-neutral-500" />
                  )}
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    Room type
                  </span>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    roomType === "private"
                      ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-700/40"
                      : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-700/40"
                  }`}
                >
                  {roomType === "private" ? "Private" : "Public"}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  onClick={copyCode}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all duration-200 text-sm font-medium cursor-pointer"
                >
                  {copied ? (
                    <>
                      <IoMdCheckmark className="text-emerald-500 text-base" />
                      Copied
                    </>
                  ) : (
                    <>
                      <HiOutlineClipboardDocument className="text-base" />
                      Copy Code
                    </>
                  )}
                </button>
                <button
                  onClick={shareCode}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all duration-200 text-sm font-medium cursor-pointer"
                >
                  <HiOutlineShare className="text-base" />
                  Share
                </button>
              </div>

              <button
                onClick={enterRoom}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer text-sm"
              >
                Enter Room
                <HiOutlineArrowRight className="text-base" />
              </button>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default RoomCreated;
