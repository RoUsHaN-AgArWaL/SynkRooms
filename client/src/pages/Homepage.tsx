import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { WordRotate } from "../components/WordFlip";
import Header from "../components/Header";
import Underline from "../components/Underline";
import Footer from "../components/Footer";
import { showToast } from "../components/Toast";
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useInView } from "framer-motion";
import { HiArrowRight } from "react-icons/hi2";
import { IoIosArrowBack } from "react-icons/io";
import {
  HiOutlineLockClosed,
  HiOutlineGlobeAlt,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineClock,
  HiOutlineUsers,
  HiOutlineShieldCheck,
  HiOutlineTrash,
  HiOutlinePhoto,
  HiOutlineVideoCamera,
  HiOutlineDocumentText,
  HiOutlineUserCircle,
  HiOutlineFingerPrint,
  HiOutlineSparkles,
  HiOutlineChatBubbleLeftRight,
  HiOutlineBolt,
  HiOutlineServer,
} from "react-icons/hi2";
import { BACKEND_URL } from "../../lib/config";

/* ─── Expiry Options ───────────────────────────────────────────────────────── */

const expiryOptions = [
  { label: "15 Minutes", value: 15 },
  { label: "30 Minutes", value: 30 },
  { label: "1 Hour", value: 60 },
  { label: "6 Hours", value: 360 },
  { label: "12 Hours", value: 720 },
  { label: "24 Hours", value: 1440 },
];

const participantOptions = [10, 20, 50, 100];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  UTILITY COMPONENTS                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

const FadeIn = ({ children, delay = 0, direction = "up", className = "" }: any) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const variants = {
    hidden: {
      opacity: 0,
      y: direction === "up" ? 40 : direction === "down" ? -40 : 0,
      x: direction === "left" ? 40 : direction === "right" ? -40 : 0,
    },
    visible: { opacity: 1, y: 0, x: 0 },
  };
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const GlowCard = ({ children, className = "" }: any) => (
  <motion.div
    whileHover={{ y: -6, scale: 1.01 }}
    transition={{ duration: 0.35, ease: "easeOut" }}
    className={`relative group rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.07] via-transparent to-fuchsia-500/[0.07] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-violet-500/20 via-transparent to-fuchsia-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
    <div className="relative">{children}</div>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SECTION DATA                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

const features = [
  { icon: HiOutlineLockClosed, title: "Private Rooms", desc: "PIN-protected spaces for sensitive conversations." },
  { icon: HiOutlineClock, title: "Room Expiry", desc: "Auto-destruct timers from 15 minutes to 24 hours." },
  { icon: HiOutlineEye, title: "View Once", desc: "Messages that vanish after a single glance." },
  { icon: HiOutlineTrash, title: "Self Destruct", desc: "Set messages to disappear after reading." },
  { icon: HiOutlinePhoto, title: "Image Sharing", desc: "Share photos securely without leaving a trace." },
  { icon: HiOutlineVideoCamera, title: "Video Sharing", desc: "Stream and share videos in real-time." },
  { icon: HiOutlineDocumentText, title: "Temporary Files", desc: "Documents that exist only for the room lifetime." },
  { icon: HiOutlineUserCircle, title: "Room Owner", desc: "Full control over participants and settings." },
  { icon: HiOutlineUsers, title: "Kick Users", desc: "Remove unwanted participants instantly." },
  { icon: HiOutlineBolt, title: "Destroy Room", desc: "End everything with a single click." },
  { icon: HiOutlineFingerPrint, title: "Anonymous Chat", desc: "No names, no emails, no identity required." },
  { icon: HiOutlineServer, title: "Zero History", desc: "Nothing is ever stored on our servers." },
];

const steps = [
  { title: "Create Room", desc: "Set expiry, participants & privacy in seconds." },
  { title: "Chat Freely", desc: "Share messages, media & files anonymously." },
  { title: "Leave Anytime", desc: "Close the tab. No logout needed." },
  { title: "Everything Deleted", desc: "Poof. Gone forever. No recovery possible." },
];

const whyCards = [
  { icon: HiOutlineUserCircle, title: "No Accounts", desc: "We don't want your email, phone, or name. Just a display name that lasts one session." },
  { icon: HiOutlineTrash, title: "No History", desc: "Every message, image, and file is ephemeral. The moment the room dies, everything vanishes." },
  { icon: HiOutlineFingerPrint, title: "No Footprint", desc: "No cookies tracking you. No analytics. No logs. We don't even know you were here." },
];

const stats = [
  { label: "Rooms Created", value: 12847, suffix: "+" },
  { label: "Messages Sent", value: 482931, suffix: "+" },
  { label: "Media Shared", value: 56204, suffix: "+" },
  { label: "Avg Room Lifetime", value: 42, suffix: " min" },
];

const testimonials = [
  { name: "Alex M.", role: "Journalist", text: "SynkRooms is the only platform I trust for sensitive source communication. It simply disappears." },
  { name: "Sarah K.", role: "Security Researcher", text: "Finally, a chat app that actually respects privacy. No accounts, no history, no nonsense." },
  { name: "David L.", role: "Product Manager", text: "We use it for quick team syncs that don't need to live forever. Clean, fast, beautiful." },
  { name: "Emily R.", role: "Designer", text: "The UI alone makes me want to use it. But the zero-data approach is what keeps me here." },
];

const faqs = [
  { q: "Is anything stored on your servers?", a: "Absolutely nothing. Messages exist only in memory during the room lifetime and are permanently erased when the room expires or is destroyed." },
  { q: "Can I recover a deleted room?", a: "No. By design, there is no recovery mechanism. Once a room is gone, it is gone forever." },
  { q: "Do I need to create an account?", a: "Never. We don't collect emails, phone numbers, or any personal information." },
  { q: "How secure are private rooms?", a: "Private rooms require a 4-digit PIN. While not military-grade encryption, they provide a strong barrier against unauthorized access." },
  { q: "Can the room owner see my IP address?", a: "No. We do not expose participant IPs or any identifying metadata to room owners or other users." },
  { q: "Is there a message limit?", a: "There is no hard message limit. However, rooms are bound by their expiry timer and maximum participant count." },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  HOMEPAGE COMPONENT                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

const Homepage = () => {
  const navigate = useNavigate();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [roomType, setRoomType] = useState<"public" | "private">("public");
  const [expiry, setExpiry] = useState(60);
  const [maxParticipants, setMaxParticipants] = useState(20);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };
  const mouseX = useSpring(0, springConfig);
  const mouseY = useSpring(0, springConfig);

  useEffect(() => {
    const savedName = localStorage.getItem("chattr_display_name");
    if (savedName) setDisplayName(savedName);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth - 0.5) * 30);
      mouseY.set((e.clientY / window.innerHeight - 0.5) * 30);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const isNameValid =
    displayName.trim().length >= 2 && displayName.trim().length <= 20;
  const isPinValid =
    roomType === "public" || (/^\d{4}$/.test(pin) && pin === confirmPin);
  const isFormValid = isNameValid && isPinValid;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const name = displayName.trim();
    if (name.length < 2 || name.length > 20) {
      setFormError("Display name must be 2-20 characters.");
      return;
    }

    if (roomType === "private") {
      if (!/^\d{4}$/.test(pin)) {
        setFormError("PIN must be exactly 4 digits.");
        return;
      }
      if (pin !== confirmPin) {
        setFormError("PINs do not match.");
        return;
      }
    }

    setIsSubmitting(true);
    localStorage.setItem("chattr_display_name", name);

    // Connect via WebSocket to create the room
    const userId = crypto.randomUUID();
    const ws = new WebSocket(BACKEND_URL);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "create_room",
          payload: {
            displayName: name,
            roomType,
            pin: roomType === "private" ? pin : undefined,
            confirmPin: roomType === "private" ? confirmPin : undefined,
            expiry: expiry.toString(),
            maxParticipants: maxParticipants.toString(),
            userId,
          },
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "room_created") {
          const { roomCode, ownerId, expiresAt, roomType: type } = data.payload;
          showToast("success", `Room ${roomCode} created successfully!`);

          const params = new URLSearchParams();
          params.set("code", roomCode);
          params.set("owner", ownerId);
          params.set("expiresAt", expiresAt.toString());
          params.set("type", type);
          params.set("name", name);

          ws.close();
          setIsSubmitting(false);
          navigate(`/room-created?${params.toString()}`);
        } else if (data.type === "create_room_error") {
          setFormError(data.payload.message);
          showToast("error", data.payload.message);
          setIsSubmitting(false);
          ws.close();
        }
      } catch {
        setIsSubmitting(false);
        ws.close();
      }
    };

    ws.onerror = () => {
      setFormError("Network error. Please try again.");
      showToast("error", "Network error. Could not connect to server.");
      setIsSubmitting(false);
    };

    ws.onclose = () => {
      // Ensure submitting state is reset
      setIsSubmitting(false);
    };
  };

  return (
    <div className="min-h-screen flex flex-col dark:text-neutral-100 text-neutral-800 bg-[#05050a] dark:bg-[#05050a] text-white overflow-x-hidden">
      <Header />

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/*  HERO SECTION                                                          */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <motion.main
        ref={heroRef}
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative flex flex-col items-center justify-center min-h-screen pt-20 pb-32 overflow-hidden"
      >
        {/* Animated background orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            style={{ x: mouseX, y: mouseY }}
            className="absolute top-[10%] left-[20%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px]"
          />
          <motion.div
            style={{ x: useTransform(mouseX, v => -v * 0.5), y: useTransform(mouseY, v => -v * 0.5) }}
            className="absolute top-[40%] right-[10%] w-[400px] h-[400px] rounded-full bg-fuchsia-600/8 blur-[100px]"
          />
          <motion.div
            style={{ x: useTransform(mouseX, v => v * 0.3), y: useTransform(mouseY, v => v * 0.3) }}
            className="absolute bottom-[10%] left-[40%] w-[350px] h-[350px] rounded-full bg-indigo-600/8 blur-[90px]"
          />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        {/* Floating glass cards */}
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[18%] right-[12%] hidden lg:block"
        >
          <div className="w-48 p-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-2xl shadow-violet-500/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">Live Room</span>
            </div>
            <div className="space-y-1.5">
              <div className="h-2 w-3/4 rounded bg-white/10" />
              <div className="h-2 w-1/2 rounded bg-white/10" />
            </div>
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[25%] left-[8%] hidden lg:block"
        >
          <div className="w-40 p-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-2xl shadow-fuchsia-500/5">
            <div className="flex items-center gap-2 mb-2">
              <HiOutlineShieldCheck className="text-violet-400 text-sm" />
              <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">Encrypted</span>
            </div>
            <div className="text-xs text-neutral-300 font-mono">AES-256-GCM</div>
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-[30%] left-[15%] hidden xl:block"
        >
          <div className="w-36 p-3 rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-[10px] font-bold">JD</div>
              <div className="h-2 w-16 rounded bg-white/10" />
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center w-full max-w-5xl px-6 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-md mb-10"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-neutral-400 font-medium tracking-wide">No signup required — No data saved — Ever</span>
          </motion.div>

          <AnimatePresence mode="wait">
            {!showCreateForm ? (
              <motion.div
                key="hero"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center"
              >
                {/* Headline */}
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.1 }}
                  className="font-extrabold text-5xl sm:text-6xl lg:text-7xl xl:text-8xl tracking-tight leading-[1.05] mb-6"
                >
                  <span className="text-white">Chat Without</span>
                  <br />
                  <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
                    Leaving A Footprint
                  </span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.25 }}
                  className="text-lg sm:text-xl text-neutral-400 max-w-2xl leading-relaxed mb-12"
                >
                  Private temporary conversations with disappearing messages,
                  view-once media, and secure ephemeral rooms.
                  <span className="text-white font-medium"> Private Rooms. Zero History.</span>
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.4 }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="group relative flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold text-sm overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_-10px_rgba(139,92,246,0.5)] hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative">Create a Room</span>
                    <HiArrowRight className="relative text-lg group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={() => navigate("/join")}
                    className="flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl border border-white/[0.1] bg-white/[0.03] backdrop-blur-sm text-neutral-300 font-semibold text-sm hover:bg-white/[0.06] hover:border-white/[0.15] hover:text-white transition-all duration-300 active:scale-[0.98]"
                  >
                    Join a Room
                  </button>
                </motion.div>

                {/* Feature tags */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.6 }}
                  className="flex flex-wrap justify-center gap-3 mt-16"
                >
                  {["No Login", "Anonymous", "Encrypted", "Temporary", "Zero History"].map((tag, i) => (
                    <span
                      key={tag}
                      className="px-4 py-1.5 rounded-full text-xs font-medium text-neutral-400 border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="create-form"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-md mx-auto"
              >
                <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl p-8 shadow-2xl shadow-black/40">
                  {/* Glow effect */}
                  <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-violet-500/20 via-transparent to-transparent opacity-50 pointer-events-none" />

                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="flex items-center gap-1.5 text-neutral-500 hover:text-white transition-colors mb-6 text-sm font-medium"
                  >
                    <IoIosArrowBack className="text-lg" />
                    Back
                  </button>

                  <h2 className="font-bold text-2xl text-white mb-1">Create a Room</h2>
                  <p className="text-neutral-500 text-sm mb-8">Set up your anonymous temporary space.</p>

                  <form onSubmit={handleCreateSubmit} className="flex flex-col gap-5">
                    {/* Display Name */}
                    <div className="flex flex-col">
                      <label className="mb-2 text-neutral-300 text-sm font-medium">
                        Display Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Satoshi"
                        maxLength={20}
                        className="rounded-xl px-4 py-3 bg-white/[0.05] outline-none font-medium border border-white/[0.08] text-white placeholder:text-neutral-600 text-sm focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all duration-200"
                      />
                      <div className="flex justify-between mt-1.5 px-1">
                        <span className="text-xs text-neutral-600">2-20 characters</span>
                        <span className="text-xs font-mono text-neutral-600">{displayName.trim().length}/20</span>
                      </div>
                    </div>

                    {/* Room Expiry */}
                    <div className="flex flex-col">
                      <label className="mb-2 text-neutral-300 text-sm font-medium">
                        Room Expiry <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={expiry}
                        onChange={(e) => setExpiry(parseInt(e.target.value))}
                        className="rounded-xl px-4 py-3 bg-white/[0.05] outline-none font-medium border border-white/[0.08] text-white text-sm focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all duration-200 cursor-pointer appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", backgroundSize: "16px" }}
                      >
                        {expiryOptions.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-[#0a0a12] text-white">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Room Type */}
                    <div className="flex flex-col">
                      <label className="mb-2 text-neutral-300 text-sm font-medium">
                        Room Type <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setRoomType("public");
                            setPin("");
                            setConfirmPin("");
                          }}
                          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                            roomType === "public"
                              ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
                              : "border-white/[0.08] bg-white/[0.03] text-neutral-500 hover:border-white/[0.15] hover:text-neutral-300"
                          }`}
                        >
                          <HiOutlineGlobeAlt className="text-lg flex-none" />
                          <span className="text-sm font-medium">Public</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRoomType("private")}
                          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                            roomType === "private"
                              ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
                              : "border-white/[0.08] bg-white/[0.03] text-neutral-500 hover:border-white/[0.15] hover:text-neutral-300"
                          }`}
                        >
                          <HiOutlineLockClosed className="text-lg flex-none" />
                          <span className="text-sm font-medium">Private</span>
                        </button>
                      </div>
                    </div>

                    {/* PIN Fields (Private only) */}
                    <AnimatePresence>
                      {roomType === "private" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-col gap-4 pt-1">
                            <div className="flex flex-col">
                              <label className="mb-2 text-neutral-300 text-sm font-medium">
                                4-Digit PIN <span className="text-rose-500">*</span>
                              </label>
                              <div className="relative">
                                <input
                                  type={showPin ? "text" : "password"}
                                  value={pin}
                                  onChange={(e) => {
                                    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                                    setPin(v);
                                  }}
                                  placeholder="••••"
                                  maxLength={4}
                                  inputMode="numeric"
                                  className="w-full rounded-xl px-4 py-3 pr-11 bg-white/[0.05] outline-none font-medium border border-white/[0.08] text-white placeholder:text-neutral-600 text-sm tracking-[0.25em] text-center font-mono focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all duration-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPin(!showPin)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300 transition-colors"
                                  tabIndex={-1}
                                >
                                  {showPin ? <HiOutlineEyeSlash className="text-lg" /> : <HiOutlineEye className="text-lg" />}
                                </button>
                              </div>
                              <span className="text-xs text-neutral-600 mt-1 px-1">Exactly 4 digits, numeric only</span>
                            </div>

                            <div className="flex flex-col">
                              <label className="mb-2 text-neutral-300 text-sm font-medium">
                                Confirm PIN <span className="text-rose-500">*</span>
                              </label>
                              <div className="relative">
                                <input
                                  type={showConfirmPin ? "text" : "password"}
                                  value={confirmPin}
                                  onChange={(e) => {
                                    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                                    setConfirmPin(v);
                                  }}
                                  placeholder="••••"
                                  maxLength={4}
                                  inputMode="numeric"
                                  className={`w-full rounded-xl px-4 py-3 pr-11 bg-white/[0.05] outline-none font-medium border text-white placeholder:text-neutral-600 text-sm tracking-[0.25em] text-center font-mono focus:ring-2 transition-all duration-200 ${
                                    confirmPin.length === 4 && pin !== confirmPin
                                      ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/10"
                                      : "border-white/[0.08] focus:border-violet-500/50 focus:ring-violet-500/10"
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300 transition-colors"
                                  tabIndex={-1}
                                >
                                  {showConfirmPin ? <HiOutlineEyeSlash className="text-lg" /> : <HiOutlineEye className="text-lg" />}
                                </button>
                              </div>
                              {confirmPin.length === 4 && pin !== confirmPin && (
                                <span className="text-xs text-rose-400 mt-1 px-1">PINs do not match</span>
                              )}
                              {confirmPin.length === 4 && pin === confirmPin && (
                                <span className="text-xs text-emerald-400 mt-1 px-1">PINs match ✓</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Max Participants */}
                    <div className="flex flex-col">
                      <label className="mb-2 text-neutral-300 text-sm font-medium">
                        Maximum Participants <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={maxParticipants}
                        onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
                        className="rounded-xl px-4 py-3 bg-white/[0.05] outline-none font-medium border border-white/[0.08] text-white text-sm focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all duration-200 cursor-pointer appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", backgroundSize: "16px" }}
                      >
                        {participantOptions.map((n) => (
                          <option key={n} value={n} className="bg-[#0a0a12] text-white">
                            {n} participants
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Error message */}
                    {formError && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm font-medium"
                      >
                        {formError}
                      </motion.div>
                    )}

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={!isFormValid || isSubmitting}
                      className="relative flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 disabled:from-neutral-800 disabled:to-neutral-800 text-white disabled:text-neutral-600 font-semibold py-3.5 rounded-xl mt-2 hover:shadow-[0_0_30px_-8px_rgba(139,92,246,0.4)] disabled:hover:shadow-none disabled:hover:translate-y-0 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed text-sm overflow-hidden"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          Create Room
                          <HiArrowRight className="text-lg" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Scroll indicator */}
        {!showCreateForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-6 h-10 rounded-full border-2 border-white/10 flex justify-center pt-2"
            >
              <div className="w-1 h-2 rounded-full bg-white/30" />
            </motion.div>
          </motion.div>
        )}
      </motion.main>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/*  LIVE PRODUCT PREVIEW                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {!showCreateForm && (
        <section className="relative py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <FadeIn className="text-center mb-16">
              <span className="text-violet-400 text-xs font-semibold uppercase tracking-[0.2em] mb-4 block">Live Preview</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">See It In Action</h2>
              <p className="text-neutral-500 max-w-xl mx-auto">A glimpse into your next private conversation.</p>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl p-2 shadow-2xl shadow-black/50 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 via-transparent to-transparent pointer-events-none" />
                {/* Mock chat interface */}
                <div className="relative rounded-2xl bg-[#08080f] border border-white/[0.05] overflow-hidden">
                  {/* Chat header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold text-white">T</div>
                      <div>
                        <div className="text-sm font-semibold text-white">TempRoom-7X9A</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
                          <span className="w-1 h-1 rounded-full bg-emerald-400" />
                          4 participants · Expires in 42m
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20">Private</span>
                    </div>
                  </div>
                  {/* Messages */}
                  <div className="px-5 py-5 space-y-4 min-h-[280px]">
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 flex-none mt-0.5">A</div>
                      <div className="max-w-[70%]">
                        <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm bg-white/[0.06] text-neutral-300 text-sm leading-relaxed">
                          Hey everyone, thanks for joining. This room auto-destructs in an hour.
                        </div>
                        <span className="text-[10px] text-neutral-600 mt-1 ml-1">2:34 PM</span>
                      </div>
                    </div>
                    <div className="flex gap-3 flex-row-reverse">
                      <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-[10px] font-bold text-violet-400 flex-none mt-0.5">Y</div>
                      <div className="max-w-[70%]">
                        <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm bg-gradient-to-br from-violet-600/30 to-fuchsia-600/20 text-white text-sm leading-relaxed border border-violet-500/10">
                          Perfect. Sent the files — view once only.
                        </div>
                        <span className="text-[10px] text-neutral-600 mt-1 mr-1 text-right block">2:35 PM</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-bold text-amber-400 flex-none mt-0.5">M</div>
                      <div className="max-w-[70%]">
                        <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm bg-white/[0.06] text-neutral-300 text-sm leading-relaxed flex items-center gap-2">
                          <HiOutlinePhoto className="text-violet-400" />
                          <span className="text-neutral-400 text-xs">Photo (view once)</span>
                        </div>
                        <span className="text-[10px] text-neutral-600 mt-1 ml-1">2:36 PM · Viewed once</span>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <span className="px-3 py-1 rounded-full text-[10px] text-neutral-600 bg-white/[0.03] border border-white/[0.05]">
                        Self-destruct message sent
                      </span>
                    </div>
                  </div>
                  {/* Input */}
                  <div className="px-5 py-4 border-t border-white/[0.05] flex items-center gap-3">
                    <div className="flex-1 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center px-4">
                      <span className="text-neutral-600 text-sm">Type a message...</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/20 flex items-center justify-center">
                      <HiArrowRight className="text-violet-400 text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/*  FEATURES GRID                                                         */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {!showCreateForm && (
        <section className="relative py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <FadeIn className="text-center mb-16">
              <span className="text-violet-400 text-xs font-semibold uppercase tracking-[0.2em] mb-4 block">Features</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">Everything You Need</h2>
              <p className="text-neutral-500 max-w-xl mx-auto">Built for privacy-first conversations without compromise.</p>
            </FadeIn>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {features.map((f, i) => (
                <FadeIn key={f.title} delay={i * 0.05}>
                  <GlowCard className="h-full p-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 border border-violet-500/10 flex items-center justify-center mb-4">
                      <f.icon className="text-violet-400 text-lg" />
                    </div>
                    <h3 className="text-white font-semibold text-sm mb-1.5">{f.title}</h3>
                    <p className="text-neutral-500 text-xs leading-relaxed">{f.desc}</p>
                  </GlowCard>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/*  PRIVACY SECTION — TIMELINE                                            */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {!showCreateForm && (
        <section className="relative py-24 px-6 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/5 blur-[120px]" />
          </div>
          <div className="max-w-4xl mx-auto relative">
            <FadeIn className="text-center mb-20">
              <span className="text-violet-400 text-xs font-semibold uppercase tracking-[0.2em] mb-4 block">How It Works</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">From Creation to Nothingness</h2>
              <p className="text-neutral-500 max-w-xl mx-auto">A lifecycle designed for absolute privacy.</p>
            </FadeIn>

            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-violet-500/40 via-fuchsia-500/20 to-transparent hidden md:block" />

              {steps.map((step, i) => (
                <FadeIn key={step.title} delay={i * 0.15}>
                  <div className={`flex items-center gap-8 mb-16 last:mb-0 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} flex-col`}>
                    <div className={`flex-1 text-center ${i % 2 === 0 ? "md:text-right" : "md:text-left"}`}>
                      <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                      <p className="text-neutral-500 text-sm">{step.desc}</p>
                    </div>
                    <div className="relative flex-none">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <span className="text-white font-bold text-lg">{i + 1}</span>
                      </div>
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 blur-lg opacity-40" />
                    </div>
                    <div className="flex-1 hidden md:block" />
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/*  WHY SYNKROOMS                                                           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {!showCreateForm && (
        <section className="relative py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <FadeIn className="text-center mb-16">
              <span className="text-[#A855F7] text-xs font-semibold uppercase tracking-[0.2em] mb-4 block">Why SynkRooms</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">Privacy By Design</h2>
              <p className="text-neutral-500 max-w-xl mx-auto">We built SynkRooms because we were tired of apps that claim privacy but store everything.</p>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {whyCards.map((card, i) => (
                <FadeIn key={card.title} delay={i * 0.1}>
                  <GlowCard className="h-full p-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 border border-violet-500/10 flex items-center justify-center mx-auto mb-6">
                      <card.icon className="text-violet-400 text-2xl" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-3">{card.title}</h3>
                    <p className="text-neutral-500 text-sm leading-relaxed">{card.desc}</p>
                  </GlowCard>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/*  STATISTICS                                                            */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {!showCreateForm && (
        <section className="relative py-24 px-6 border-y border-white/[0.04]">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((s, i) => (
                <FadeIn key={s.label} delay={i * 0.1}>
                  <div className="text-center">
                    <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent mb-2">
                      {s.value.toLocaleString()}{s.suffix}
                    </div>
                    <div className="text-neutral-500 text-sm">{s.label}</div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/*  TESTIMONIALS                                                          */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {!showCreateForm && (
        <section className="relative py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <FadeIn className="text-center mb-16">
              <span className="text-violet-400 text-xs font-semibold uppercase tracking-[0.2em] mb-4 block">Testimonials</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">Loved By Privacy Seekers</h2>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {testimonials.map((t, i) => (
                <FadeIn key={t.name} delay={i * 0.1}>
                  <GlowCard className="h-full p-8">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-sm font-bold text-white">
                        {t.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <div className="text-white font-semibold text-sm">{t.name}</div>
                        <div className="text-neutral-500 text-xs">{t.role}</div>
                      </div>
                    </div>
                    <p className="text-neutral-400 text-sm leading-relaxed italic">"{t.text}"</p>
                  </GlowCard>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/*  FAQ                                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {!showCreateForm && (
        <section className="relative py-24 px-6">
          <div className="max-w-3xl mx-auto">
            <FadeIn className="text-center mb-16">
              <span className="text-violet-400 text-xs font-semibold uppercase tracking-[0.2em] mb-4 block">FAQ</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">Questions & Answers</h2>
            </FadeIn>

            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <FadeIn key={i} delay={i * 0.05}>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-white font-medium text-sm pr-4">{faq.q}</span>
                      <motion.div
                        animate={{ rotate: openFaq === i ? 45 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-none w-5 h-5 rounded-full border border-white/10 flex items-center justify-center text-neutral-400 text-xs"
                      >
                        +
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {openFaq === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <div className="px-6 pb-5 text-neutral-400 text-sm leading-relaxed border-t border-white/[0.04] pt-4">
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/*  FINAL CTA                                                             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {!showCreateForm && (
        <section className="relative py-32 px-6 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-violet-600/8 blur-[120px]" />
          </div>
          <FadeIn className="max-w-3xl mx-auto text-center relative">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">Ready to Disappear?</h2>
            <p className="text-neutral-500 text-lg mb-10 max-w-xl mx-auto">
              Create a room in seconds. Chat freely. Leave no trace behind.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowCreateForm(true)}
                className="group relative flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold text-sm overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_-10px_rgba(139,92,246,0.5)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative">Create a Room</span>
                <HiArrowRight className="relative text-lg group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate("/join")}
                className="flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl border border-white/[0.1] bg-white/[0.03] backdrop-blur-sm text-neutral-300 font-semibold text-sm hover:bg-white/[0.06] hover:border-white/[0.15] hover:text-white transition-all duration-300 active:scale-[0.98]"
              >
                Join a Room
              </button>
            </div>
          </FadeIn>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default Homepage;
