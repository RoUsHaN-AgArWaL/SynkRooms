import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import { IoIosArrowBack } from "react-icons/io";
import { MdContentCopy } from "react-icons/md";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { IoMdCheckmark } from "react-icons/io";
import { BACKEND_URL } from "../../lib/config";
import { generateRoomId } from "../../lib/utils";
import Footer from "../components/Footer";
import { showToast } from "../components/Toast";

/* ─── Icons ────────────────────────────────────────────────────────────────── */
import { BsFillSendFill } from "react-icons/bs";
import { HiOutlineFaceSmile } from "react-icons/hi2";
import { HiOutlinePaperClip } from "react-icons/hi2";
import { HiOutlineEye, HiOutlineEyeSlash } from "react-icons/hi2";
import { HiOutlineXMark } from "react-icons/hi2";
import { HiOutlineDocument } from "react-icons/hi2";
import { HiOutlineMusicalNote } from "react-icons/hi2";
import { HiOutlineClock } from "react-icons/hi2";
import { FaCrown } from "react-icons/fa6";

/* ─── Types (client-side only, no backend change) ──────────────────────────── */

interface ChatMessage {
  messageId?: string;
  text: string;
  sender: string;
  senderId: string;
  timestamp: number;
  createdAt?: number;
  isSelf: boolean;
  viewOnce?: boolean;
  selfDestruct?: boolean;
  deleteAfter?: number;
  mediaUrl?: string;
  mediaType?: string; // "image", "video", or file type like "document", "archive", etc.
  fileName?: string; // original file name
  fileSize?: number; // in bytes
  fileExtension?: string; // without dot
  replyTo?: string;
  replySender?: string;
  replySenderId?: string;
  replyText?: string;
  replyType?: "text" | "image" | "video" | "file" | "viewOnce" | "selfDestruct" | "unknown";
  recipientId?: string;
  recipientName?: string;
  private?: boolean;
  edited?: boolean;
  pinned?: boolean;
  reactions?: Record<string, number>;
}

interface ViewOnceRecipientState {
  openedAt?: number;
  deleted?: boolean;
}

/** Groups of consecutive messages from the same sender */
interface MessageGroup {
  sender: string;
  senderId: string;
  isSelf: boolean;
  messages: ChatMessage[];
  /** Timestamp of the last message in the group */
  lastTimestamp: number;
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const VIEW_ONCE_DURATIONS = [7, 15, 20, 30, 60, 300] as const;
const SELF_DESTRUCT_DURATIONS = VIEW_ONCE_DURATIONS;
const REACTION_EMOJIS = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "👏",
  "🔥",
  "🎉",
  "😡",
  "🤔",
  "😍",
  "😎",
  "💯",
  "👀",
  "🙏",
  "🥳",
  "😅",
  "😴",
  "😇",
  "🤩",
  "🙌",
  "✅",
  "✌️",
  "💥",
  "🎶",
  "🌟",
  "💔",
  "😜",
  "🤗",
  "👎",
  "🫶",
  "🙈",
  "🧠",
  "🥰",
  "🤝",
  "💬",
  "🫰",
  "🎈",
  "💡",
  "🙃",
];

function formatTime(ts: number): string {
  const d = new Date(ts);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
}

function formatViewOnceDuration(seconds: number): string {
  if (seconds >= 60 && seconds % 60 === 0) {
    const minutes = seconds / 60;
    return minutes === 1 ? "1 min" : `${minutes} min`;
  }
  return `${seconds} sec`;
}

function formatSelfDestructDuration(seconds: number): string {
  return formatViewOnceDuration(seconds);
}

function groupMessages(messages: ChatMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];

  for (const msg of messages) {
    const last = groups[groups.length - 1];
    if (last && last.senderId === msg.senderId) {
      last.messages.push(msg);
      last.lastTimestamp = msg.timestamp;
    } else {
      groups.push({
        sender: msg.sender,
        senderId: msg.senderId,
        isSelf: msg.isSelf,
        messages: [msg],
        lastTimestamp: msg.timestamp,
      });
    }
  }

  return groups;
}

/* ─── Avatar colors for other users ────────────────────────────────────────── */

const avatarColors = [
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-cyan-500 to-blue-600",
  "from-fuchsia-500 to-purple-600",
  "from-lime-500 to-green-600",
  "from-sky-500 to-indigo-600",
  "from-red-500 to-rose-600",
];

function getAvatarColor(senderId: string): string {
  let hash = 0;
  for (let i = 0; i < senderId.length; i++) {
    hash = senderId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

/** Bubble border-radius logic for grouped messages */
function selfBubbleRadius(total: number, idx: number): string {
  if (total === 1) return "rounded-[20px] rounded-br-[6px]";
  if (idx === 0) return "rounded-[20px] rounded-br-[6px]";
  if (idx === total - 1) return "rounded-[20px] rounded-tr-[6px]";
  return "rounded-[20px] rounded-r-[6px]";
}

function otherBubbleRadius(total: number, idx: number): string {
  if (total === 1) return "rounded-[20px] rounded-bl-[6px]";
  if (idx === 0) return "rounded-[20px] rounded-bl-[6px]";
  if (idx === total - 1) return "rounded-[20px] rounded-tl-[6px]";
  return "rounded-[20px] rounded-l-[6px]";
}

/* ─── Composer Action Button ───────────────────────────────────────────────── */

function ComposerBtn({
  icon,
  label,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`
        composer-action-btn
        relative flex items-center justify-center w-9 h-9 rounded-xl
        transition-all duration-200 ease-out
        ${accent
          ? "text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 dark:hover:bg-indigo-400/10"
          : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        }
        active:scale-90
      `}
    >
      {icon}
    </button>
  );
}

/* ─── Helper: Get file icon based on extension or mediaType ───────────────────────────── */
function getFileIcon(extOrType: string): JSX.Element {
  const ext = extOrType.toLowerCase();

  // Document types
  if (ext === "pdf") return <HiOutlineDocument className="text-indigo-500" />;
  if (ext === "doc" || ext === "docx") return <HiOutlineDocument className="text-blue-500" />;
  if (ext === "txt") return <HiOutlineDocument className="text-gray-500" />;
  if (ext === "rtf") return <HiOutlineDocument className="text-gray-500" />;

  // Archive types
  if (ext === "zip") return <HiOutlineMusicalNote className="text-green-500" />;
  if (ext === "rar") return <HiOutlineMusicalNote className="text-green-500" />;
  if (ext === "7z") return <HiOutlineMusicalNote className="text-green-500" />;

  // Code types
  if (ext === "java") return <HiOutlineMusicalNote className="text-orange-500" />;
  if (ext === "cpp" || ext === "c") return <HiOutlineMusicalNote className="text-orange-500" />;
  if (ext === "py") return <HiOutlineMusicalNote className="text-green-500" />;
  if (ext === "js" || ext === "ts") return <HiOutlineMusicalNote className="text-yellow-500" />;
  if (ext === "html") return <HiOutlineMusicalNote className="text-blue-500" />;
  if (ext === "css") return <HiOutlineMusicalNote className="text-blue-500" />;
  if (ext === "json") return <HiOutlineMusicalNote className="text-yellow-500" />;
  if (ext === "xml") return <HiOutlineMusicalNote className="text-yellow-500" />;

  // Data types
  if (ext === "csv") return <HiOutlineMusicalNote className="text-blue-500" />;
  if (ext === "xlsx") return <HiOutlineMusicalNote className="text-green-500" />;

  // Other types
  if (ext === "apk") return <HiOutlineMusicalNote className="text-purple-500" />;
  if (ext === "iso") return <HiOutlineMusicalNote className="text-purple-500" />;

  // Default file icon
  return <HiOutlineDocument className="text-neutral-500" />;
}

function ViewOnceHiddenCard({ onReveal }: { onReveal: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onReveal}
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -6 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      className="group relative w-full max-w-[320px] overflow-hidden rounded-[24px] border border-white/60 dark:border-white/10 bg-gradient-to-br from-white/75 via-rose-50/70 to-fuchsia-50/70 dark:from-neutral-900/90 dark:via-neutral-900/75 dark:to-neutral-950/90 px-5 py-6 text-center shadow-[0_20px_60px_rgba(15,23,42,0.14)] backdrop-blur-2xl transition-transform duration-300 hover:-translate-y-0.5"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_32%),radial-gradient(circle_at_center,rgba(255,255,255,0.35),transparent_55%)] opacity-80 dark:opacity-100" />
      <div className="absolute -left-3 top-2 h-14 w-14 rounded-full bg-pink-300/25 blur-2xl" />
      <div className="absolute right-1 top-3 h-16 w-16 rounded-full bg-violet-300/20 blur-2xl" />
      <div className="absolute -bottom-4 left-8 h-12 w-12 rounded-full bg-rose-300/25 blur-2xl" />
      <span className="absolute left-5 top-5 h-3 w-3 rotate-45 rounded-full bg-pink-200/80 shadow-[0_0_0_8px_rgba(244,114,182,0.08)]" />
      <span className="absolute right-6 top-7 h-2.5 w-2.5 rotate-12 rounded-full bg-fuchsia-200/80" />
      <span className="absolute left-8 bottom-6 h-2 w-2 -rotate-12 rounded-full bg-violet-200/80" />

      <div className="relative flex min-h-[148px] flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.34em] text-neutral-500/80 dark:text-neutral-300/70">
          <span className="h-px w-6 bg-current opacity-40" />
          Hidden
          <span className="h-px w-6 bg-current opacity-40" />
        </div>
        <p className="font-bricolage-grotesque text-[1.35rem] font-semibold tracking-tight text-neutral-900 dark:text-white">
          Something Hidden Inside
        </p>
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-300">
          👁 Tap to Reveal
        </p>
      </div>
    </motion.button>
  );
}

function SelfDestructDeletedCard() {
  const particles = [
    { left: "18%", top: "28%", x: -28, y: -34 },
    { left: "34%", top: "18%", x: 20, y: -42 },
    { left: "52%", top: "26%", x: 34, y: -18 },
    { left: "70%", top: "38%", x: -20, y: -26 },
    { left: "24%", top: "62%", x: -30, y: 20 },
    { left: "64%", top: "66%", x: 26, y: 18 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -10 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      className="group relative w-full max-w-[320px] overflow-hidden rounded-[24px] border border-dashed border-rose-300/70 dark:border-rose-500/25 bg-gradient-to-br from-white/80 via-rose-50/75 to-orange-50/70 dark:from-neutral-900/90 dark:via-neutral-900/80 dark:to-neutral-950/90 px-5 py-6 text-center shadow-[0_20px_60px_rgba(15,23,42,0.14)] backdrop-blur-2xl"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,113,133,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.15),transparent_32%),radial-gradient(circle_at_center,rgba(255,255,255,0.38),transparent_55%)] opacity-90 dark:opacity-100" />
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((particle, index) => (
          <motion.span
            key={index}
            initial={{ opacity: 0.9, scale: 1, x: 0, y: 0 }}
            animate={{ opacity: 0, scale: 0.2, x: particle.x, y: particle.y }}
            transition={{ duration: 0.75, delay: index * 0.05, ease: "easeOut" }}
            className="absolute h-2 w-2 rounded-full bg-rose-400/70 blur-[1px]"
            style={{ left: particle.left, top: particle.top }}
          />
        ))}
      </div>
      <div className="absolute -left-2 top-2 h-12 w-12 rounded-full bg-rose-300/25 blur-2xl" />
      <div className="absolute right-1 top-4 h-14 w-14 rounded-full bg-orange-300/20 blur-2xl" />
      <div className="absolute -bottom-3 left-8 h-10 w-10 rounded-full bg-amber-300/20 blur-2xl" />
      <div className="relative flex min-h-[136px] flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.34em] text-rose-500/80 dark:text-rose-300/70">
          <span className="h-px w-6 bg-current opacity-40" />
          Deleted
          <span className="h-px w-6 bg-current opacity-40" />
        </div>
        <p className="font-bricolage-grotesque text-[1.25rem] font-semibold tracking-tight text-neutral-900 dark:text-white">
          🗑 This message has self-destructed.
        </p>
        <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-300">
          <span className="inline-flex h-2 w-2 rounded-full bg-rose-400" />
          Removed for everyone
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════ */
/*  CHAT COMPONENT                                                           */
/* ══════════════════════════════════════════════════════════════════════════════════════ */

const Chat = () => {
  const navigate = useNavigate();
  const inviteCodeRef = useRef<HTMLDivElement>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewOnceStates, setViewOnceStates] = useState<Record<string, ViewOnceRecipientState>>({});
  const [deletedMessageIds, setDeletedMessageIds] = useState<Record<string, true>>({});
  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [editTarget, setEditTarget] = useState<ChatMessage | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<{ userId: string; displayName: string } | null>(null);
  const [reactionPickerOpenFor, setReactionPickerOpenFor] = useState<string | null>(null);
  const [composerEmojiOpen, setComposerEmojiOpen] = useState(false);
  const [userReactions, setUserReactions] = useState<Record<string, Set<string>>>({});
  const reactionPickerRef = useRef<HTMLDivElement | null>(null);
  const composerEmojiRef = useRef<HTMLDivElement | null>(null);
  const [now, setNow] = useState(Date.now());
  const [viewOnceEnabled, setViewOnceEnabled] = useState(false);
  const [viewOnceDuration, setViewOnceDuration] = useState<number>(15);
  const [selfDestructEnabled, setSelfDestructEnabled] = useState(false);
  const [selfDestructDuration, setSelfDestructDuration] = useState<number>(15);
  const wsRef = useRef<WebSocket>();
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const deletionTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [params, setParams] = useSearchParams();
  const [roomId, setRoomId] = useState<string>(
    params.get("roomid")?.toUpperCase() || ""
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const [displayName] = useState<string>(() => {
    const savedName = params.get("name") || localStorage.getItem("chattr_display_name");
    return savedName || "Anonymous";
  });

  /** Stable unique ID for this client session */
  const clientId = useRef(crypto.randomUUID());

  /** Room info state */
  const [roomInfo, setRoomInfo] = useState<{
    expiresAt?: number;
    maxParticipants?: number;
    currentParticipants?: number;
    isPrivate?: boolean;
    ownerName?: string;
    ownerId?: string;
    isOwner?: boolean;
  } | null>(null);
  const [countdown, setCountdown] = useState("");
  const ownerIdParam = params.get("owner") || "";
  const actualUserId = useRef(ownerIdParam || clientId.current);

  const [showParticipants, setShowParticipants] = useState(false);
  const [participantsList, setParticipantsList] = useState<any[]>([]);
  const [showDestroyConfirm, setShowDestroyConfirm] = useState(false);

  /** Attachment and media states */
  type AttachmentPreview = {
    type: "image" | "video" | "file";
    name: string;
    file: File;
    previewUrl: string | null; // null for non-image/video
  };
  const [attachmentPreview, setAttachmentPreview] = useState<AttachmentPreview | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  const mediaInputRef = useRef<HTMLInputElement>(null);
  const HTTP_URL = BACKEND_URL.replace(/^ws/, "http").replace(/\/$/, "");
  useEffect(() => {
    if (displayName !== "Anonymous") {
      localStorage.setItem("chattr_display_name", displayName);
    }
  }, [displayName]);

  /* ── Expiry countdown timer ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!roomInfo?.expiresAt) return;
    const update = () => {
      const diff = roomInfo.expiresAt! - Date.now();
      if (diff <= 0) {
        setCountdown("Expired");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 0) setCountdown(`${h}h ${m}m`);
      else if (m > 0) setCountdown(`${m}m ${s}s`);
      else setCountdown(`${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [roomInfo?.expiresAt]);

  useEffect(() => {
    messageRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        reactionPickerOpenFor &&
        reactionPickerRef.current &&
        !reactionPickerRef.current.contains(event.target as Node)
      ) {
        setReactionPickerOpenFor(null);
      }
      if (
        composerEmojiOpen &&
        composerEmojiRef.current &&
        !composerEmojiRef.current.contains(event.target as Node)
      ) {
        setComposerEmojiOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [reactionPickerOpenFor, composerEmojiOpen]);

  useEffect(() => {
    return () => {
      Object.values(deletionTimersRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    const ws = new WebSocket(BACKEND_URL);
    ws.onmessage = (event) => {
      const raw: string = event.data;

      try {
        const parsed = JSON.parse(raw);

        if (parsed.type === "room_info") {
          setRoomInfo(parsed.payload);
          return;
        }
        if (parsed.type === "join_success") {
          return;
        }
        if (parsed.type === "join_error") {
          showToast("error", parsed.payload.message);
          navigate("/");
          return;
        }
        if (parsed.type === "room_expired") {
          showToast("warning", "Room has expired. Returning to home.");
          navigate("/");
          return;
        }
        if (parsed.type === "participant_update") {
          setRoomInfo((prev) =>
            prev ? { ...prev, currentParticipants: parsed.payload.count } : prev
          );
          if (showParticipants && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "get_participants", payload: { roomCode: roomId } }));
          }
          return;
        }
        if (parsed.type === "room_destroyed" || parsed.type === "kicked") {
          showToast("error", parsed.payload.message);
          navigate("/");
          return;
        }
        if (parsed.type === "participants_list") {
          setParticipantsList(parsed.payload.participants);
          return;
        }

        if (parsed.type === "view_once_revealed") {
          const messageId = parsed.payload?.messageId;
          const openedAt = parsed.payload?.openedAt;
          if (typeof messageId === "string" && typeof openedAt === "number") {
            setViewOnceStates((prev) => ({
              ...prev,
              [messageId]: {
                openedAt,
                deleted: false,
              },
            }));

            setMessages((prev) => prev.map((message) => {
              if (message.messageId !== messageId) {
                return message;
              }

              return {
                ...message,
                text: typeof parsed.payload?.text === "string" ? parsed.payload.text : message.text,
                mediaUrl: typeof parsed.payload?.mediaUrl === "string" ? parsed.payload.mediaUrl : message.mediaUrl,
                mediaType: typeof parsed.payload?.mediaType === "string" ? parsed.payload.mediaType : message.mediaType,
                fileName: typeof parsed.payload?.fileName === "string" ? parsed.payload.fileName : message.fileName,
                fileSize: typeof parsed.payload?.fileSize === "number" ? parsed.payload.fileSize : message.fileSize,
                fileExtension: typeof parsed.payload?.fileExtension === "string" ? parsed.payload.fileExtension : message.fileExtension,
              };
            }));
          }
          return;
        }

        if (parsed.type === "view_once_deleted") {
          const messageId = parsed.payload?.messageId;
          if (typeof messageId === "string") {
            setViewOnceStates((prev) => ({
              ...prev,
              [messageId]: {
                ...(prev[messageId] || {}),
                deleted: true,
              },
            }));
          }
          return;
        }

        if (parsed.type === "message_deleted") {
          const messageId = parsed.payload?.messageId;
          if (typeof messageId === "string") {
            if (deletionTimersRef.current[messageId]) {
              clearTimeout(deletionTimersRef.current[messageId]);
            }

            setDeletedMessageIds((prev) => ({
              ...prev,
              [messageId]: true,
            }));

            deletionTimersRef.current[messageId] = setTimeout(() => {
              setMessages((prev) => prev.filter((message) => message.messageId !== messageId));
              setDeletedMessageIds((prev) => {
                const next = { ...prev };
                delete next[messageId];
                return next;
              });
              delete deletionTimersRef.current[messageId];
            }, 650);
          }
          return;
        }

        if (parsed.type === "message_edited") {
          const messageId = parsed.payload?.messageId;
          const text = parsed.payload?.text;
          if (typeof messageId === "string" && typeof text === "string") {
            setMessages((prev) =>
              prev.map((message) =>
                message.messageId === messageId
                  ? { ...message, text, edited: true }
                  : message
              )
            );
          }
          return;
        }

        if (parsed.type === "message_reactions") {
          const messageId = parsed.payload?.messageId;
          const counts = parsed.payload?.counts;
          const userId = parsed.payload?.userId;
          const reaction = parsed.payload?.reaction;
          const action = parsed.payload?.action;

          if (typeof messageId === "string" && counts && typeof counts === "object") {
            setMessages((prev) =>
              prev.map((message) =>
                message.messageId === messageId
                  ? { ...message, reactions: counts }
                  : message
              )
            );
          }

          if (userId === clientId.current && typeof reaction === "string" && typeof action === "string") {
            setUserReactions((prev) => {
              const next = { ...prev };
              const current = new Set(prev[messageId] || []);
              if (action === "added") {
                current.add(reaction);
              } else {
                current.delete(reaction);
              }
              next[messageId] = current;
              return next;
            });
          }

          return;
        }

        if (parsed.type === "room_pin_updated") {
          const pinId = parsed.payload?.messageId;
          setPinnedMessageId(typeof pinId === "string" ? pinId : null);
          return;
        }

        if (
          parsed &&
          typeof parsed.text === "string" &&
          typeof parsed.sender === "string" &&
          typeof parsed.senderId === "string"
        ) {
          const msg: ChatMessage = {
            messageId: typeof parsed.messageId === "string" ? parsed.messageId : undefined,
            text: parsed.text,
            sender: parsed.sender,
            senderId: parsed.senderId,
            timestamp:
              typeof parsed.timestamp === "number"
                ? parsed.timestamp
                : Date.now(),
            createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : undefined,
            isSelf: parsed.senderId === clientId.current,
            viewOnce: Boolean(parsed.viewOnce),
            selfDestruct: Boolean(parsed.selfDestruct),
            deleteAfter: typeof parsed.deleteAfter === "number" ? parsed.deleteAfter : undefined,
            mediaUrl: parsed.mediaUrl,
            mediaType: parsed.mediaType,
            fileName: parsed.fileName,
            fileSize: parsed.fileSize,
            fileExtension: parsed.fileExtension,
            replyTo: typeof parsed.replyTo === "string" ? parsed.replyTo : undefined,
            replySender: typeof parsed.replySender === "string" ? parsed.replySender : undefined,
            replySenderId: typeof parsed.replySenderId === "string" ? parsed.replySenderId : undefined,
            replyText: typeof parsed.replyText === "string" ? parsed.replyText : undefined,
            replyType: typeof parsed.replyType === "string" ? parsed.replyType as ChatMessage["replyType"] : undefined,
          };
          setMessages((m) => [...m, msg]);
          return;
        }

        const msg: ChatMessage = {
          text: raw,
          sender: "",
          senderId: "",
          timestamp: Date.now(),
          isSelf: false,
        };
        setMessages((m) => [...m, msg]);
      } catch {
        const msg: ChatMessage = {
          text: raw,
          sender: "",
          senderId: "",
          timestamp: Date.now(),
          isSelf: false,
        };
        setMessages((m) => [...m, msg]);
      }
    };
    wsRef.current = ws;

    if (!roomId) {
      const newId = generateRoomId().toUpperCase();
      setRoomId(newId);
    }

    setParams((prev) => {
      prev.set("roomid", roomId);
      return prev;
    });

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "join",
          payload: {
            roomId,
            displayName,
            userId: actualUserId.current,
          },
        })
      );
    };

    return () => {
      ws.close();
    };
  }, [roomId, setParams]);

  function startReply(message: ChatMessage) {
    console.log("Selected reply:", message);
    setEditTarget(null);
    setReplyTarget(message);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }

  function startEdit(message: ChatMessage) {
    if (!message.messageId || message.viewOnce || message.selfDestruct) {
      return;
    }
    setReplyTarget(null);
    setEditTarget(message);
    if (inputRef.current) {
      inputRef.current.value = message.text;
      inputRef.current.focus();
    }
  }

  function cancelReplyOrEdit() {
    setReplyTarget(null);
    setEditTarget(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleDeleteMessage(message: ChatMessage) {
    if (!message.messageId) return;
    wsRef.current?.send(
      JSON.stringify({
        type: "delete_message",
        payload: { roomCode: roomId, messageId: message.messageId },
      })
    );
  }

  function handleReactionToggle(message: ChatMessage, reaction: string) {
    if (!message.messageId) return;
    const alreadyReacted = userReactions[message.messageId]?.has(reaction);
    const type = alreadyReacted ? "reaction_removed" : "reaction_added";

    wsRef.current?.send(
      JSON.stringify({
        type,
        payload: {
          roomCode: roomId,
          messageId: message.messageId,
          reaction,
        },
      })
    );

    setMessages((prev) =>
      prev.map((m) => {
        if (m.messageId !== message.messageId) return m;
        const currentCounts = { ...(m.reactions || {}) };
        currentCounts[reaction] = Math.max(0, (currentCounts[reaction] || 0) + (alreadyReacted ? -1 : 1));
        if (currentCounts[reaction] === 0) {
          delete currentCounts[reaction];
        }
        return { ...m, reactions: currentCounts };
      })
    );

    setUserReactions((prev) => {
      const next = { ...prev };
      const messageKey = message.messageId as string;
      const current = new Set(prev[messageKey] || []);
      if (alreadyReacted) {
        current.delete(reaction);
      } else {
        current.add(reaction);
      }
      next[messageKey] = current;
      return next;
    });
  }

  function toggleReactionPicker(messageId: string) {
    setReactionPickerOpenFor((current) => (current === messageId ? null : messageId));
  }

  function handlePinMessage(message: ChatMessage) {
    if (!message.messageId) return;
    wsRef.current?.send(
      JSON.stringify({
        type: "pin_message",
        payload: { roomCode: roomId, messageId: pinnedMessageId === message.messageId ? null : message.messageId },
      })
    );
  }

  function summarizeReply(message: ChatMessage) {
    if (message.viewOnce) {
      return { replyType: "viewOnce" as const, preview: "View Once Message" };
    }
    if (message.selfDestruct) {
      return { replyType: "selfDestruct" as const, preview: "Self Destruct Message" };
    }
    if (message.mediaType === "image") {
      return { replyType: "image" as const, preview: "Photo" };
    }
    if (message.mediaType === "video") {
      return { replyType: "video" as const, preview: "Video" };
    }
    if (message.mediaUrl) {
      return {
        replyType: "file" as const,
        preview: message.fileName || message.fileExtension || "File",
      };
    }
    const text = message.text?.trim() || "";
    return {
      replyType: "text" as const,
      preview: text.length > 50 ? `${text.slice(0, 50)}…` : text || "Text message",
    };
  }

  function getReplyIcon(type?: ChatMessage["replyType"]) {
    switch (type) {
      case "image":
        return "📷";
      case "video":
        return "🎥";
      case "file":
        return "📄";
      case "viewOnce":
        return "👁";
      case "selfDestruct":
        return "🔥";
      default:
        return "↩";
    }
  }

  function scrollToMessage(messageId?: string) {
    if (!messageId) return;
    const target = messageRefs.current[messageId];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("ring-2", "ring-indigo-400", "ring-opacity-60");
      window.setTimeout(() => {
        target.classList.remove("ring-2", "ring-indigo-400", "ring-opacity-60");
      }, 1200);
    }
  }

  function onSubmitHandler(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const message = inputRef.current?.value?.trim();
    if (!message || !wsRef.current) {
      return;
    }

    if (editTarget?.messageId) {
      wsRef.current.send(
        JSON.stringify({
          type: "edit_message",
          payload: {
            roomCode: roomId,
            messageId: editTarget.messageId,
            text: message,
          },
        })
      );
      setEditTarget(null);
      setReplyTarget(null);
    } else {
      const enrichedMessage = {
        messageId: crypto.randomUUID(),
        text: message,
        sender: displayName,
        senderId: clientId.current,
        timestamp: Date.now(),
        viewOnce: viewOnceEnabled,
        selfDestruct: selfDestructEnabled,
        deleteAfter: viewOnceEnabled
          ? viewOnceDuration
          : selfDestructEnabled
            ? selfDestructDuration
            : undefined,
        createdAt: Date.now(),
        recipientId: selectedRecipient?.userId,
        recipientName: selectedRecipient?.displayName,
      } as any;

      if (replyTarget?.messageId) {
        const replySummary = summarizeReply(replyTarget);
        enrichedMessage.replyTo = replyTarget.messageId;
        enrichedMessage.replySender = replyTarget.sender;
        enrichedMessage.replySenderId = replyTarget.senderId;
        enrichedMessage.replyType = replySummary.replyType;
        enrichedMessage.replyText = replySummary.preview;
      }

      wsRef.current.send(
        JSON.stringify({
          type: "chat",
          payload: {
            message: JSON.stringify(enrichedMessage),
          },
        })
      );
      setReplyTarget(null);
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    setAttachmentPreview(null);
  }

  const copyInviteCode = () => {
    if (inviteCodeRef.current) {
      navigator.clipboard
        .writeText(roomId)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        })
        .catch((err) => {
          console.error("Failed to copy: ", err);
        });
    }
  };

  /* ── Attachment handlers ────────────────────────────────────────────────── */

  const handleMediaFile = (file: File) => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      showToast("error", `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.`);
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    const previewUrl = isImage || isVideo ? URL.createObjectURL(file) : null;
    let type: AttachmentPreview["type"] = "file";
    if (isImage) type = "image";
    if (isVideo) type = "video";

    setAttachmentPreview({
      type,
      name: file.name,
      file,
      previewUrl,
    });
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) handleMediaFile(file);
          break;
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleMediaFile(file);
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleEmojiClick = () => {
    setComposerEmojiOpen((prev) => !prev);
  };

  const handleComposerEmojiSelect = (emoji: string) => {
    if (inputRef.current) {
      inputRef.current.value += emoji;
      inputRef.current.focus();
    }
  };

  const handleMediaSelect = () => {
    mediaInputRef.current?.click();
  };

  const handleMediaChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleMediaFile(file);
    e.target.value = "";
  };

  const cancelAttachment = () => {
    if (attachmentPreview?.previewUrl) URL.revokeObjectURL(attachmentPreview.previewUrl);
    setAttachmentPreview(null);
  };

  const sendAttachment = async () => {
    if (!attachmentPreview || isUploading) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", attachmentPreview.file);
    formData.append("roomCode", roomId);

    try {
      const res = await fetch(`${HTTP_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      const enrichedMessage = JSON.stringify({
        messageId: crypto.randomUUID(),
        text: "",
        sender: displayName,
        senderId: clientId.current,
        timestamp: Date.now(),
        viewOnce: viewOnceEnabled,
        selfDestruct: selfDestructEnabled,
        deleteAfter: viewOnceEnabled
          ? viewOnceDuration
          : selfDestructEnabled
            ? selfDestructDuration
            : undefined,
        createdAt: Date.now(),
        mediaUrl: data.url,
        mediaType: data.type, // e.g., "document", "archive", "image", "video"
        fileName: data.originalName,
        fileSize: data.size,
        fileExtension: data.extension,
      });

      wsRef.current?.send(
        JSON.stringify({
          type: "chat",
          payload: {
            message: enrichedMessage,
          },
        })
      );

      cancelAttachment();
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRevealViewOnce = (message: {
    messageId?: string;
    viewOnce?: boolean;
  }) => {
    if (!message.messageId || !message.viewOnce) {
      return;
    }

    const localState = viewOnceStates[message.messageId];
    if (localState?.openedAt || localState?.deleted) {
      return;
    }

    wsRef.current?.send(
      JSON.stringify({
        type: "view_once_reveal",
        payload: {
          roomCode: roomId,
          messageId: message.messageId,
        },
      })
    );
  };

  const toggleViewOnce = () => {
    setViewOnceEnabled((prev) => {
      const next = !prev;
      if (next) {
        setSelfDestructEnabled(false);
      }
      return next;
    });
  };

  const toggleSelfDestruct = () => {
    setSelfDestructEnabled((prev) => {
      const next = !prev;
      if (next) {
        setViewOnceEnabled(false);
      }
      return next;
    });
  };

  /* ── Grouped messages for rendering ──────────────────────────────────────── */
  const grouped = groupMessages(messages);

  /* ═══════════════════════════════════════════════════════════════════════════════════════════ */
  /*  RENDER                                                                   */
  /* ═════════════════════════════════════════════════════════════════════════════════════ */

  return (
    <div
      className="chat-page h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Header />

      {/* ── Chat Toolbar ───────────────────────────────────────────────────── */}
      <div className="flex-none flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-neutral-200/80 dark:border-neutral-800/60 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl">
        {/* Left: Exit & Profile */}
        <div className="flex items-center gap-3 sm:gap-5">
          <button
            onClick={() => navigate("/")}
            className="group flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500 hover:text-rose-500 dark:hover:text-rose-400 transition-all duration-200 text-sm font-medium"
          >
            <IoIosArrowBack className="text-lg group-hover:-translate-x-0.5 transition-transform duration-200" />
            <span className="hidden sm:inline">Exit</span>
          </button>

          <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />

          {/* Profile Chip */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/80 dark:bg-neutral-800/80 border border-neutral-200/70 dark:border-neutral-700/50 shadow-sm backdrop-blur-sm">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white uppercase ring-2 ring-white dark:ring-neutral-800">
              {displayName.charAt(0)}
            </div>
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200 truncate max-w-[100px]">
              {displayName}
            </span>
          </div>
        </div>

        {/* Right: Room info */}
        <div className="flex items-center gap-2">
          {/* Expiry countdown */}
          {countdown && (
            <div className={`hidden sm:flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full font-mono ${countdown === "Expired"
              ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10"
              : "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10"
              }`}>
              <HiOutlineClock className="text-xs" />
              {countdown}
            </div>
          )}

          {/* Participant count */}
          {roomInfo?.currentParticipants != null && (
            <button
              onClick={() => {
                setShowParticipants(true);
                wsRef.current?.send(JSON.stringify({ type: "get_participants", payload: { roomCode: roomId } }));
              }}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 px-2 py-0.5 rounded-full transition-colors"
            >
              👥 {roomInfo.currentParticipants}{roomInfo.maxParticipants ? `/${roomInfo.maxParticipants}` : ""}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setShowParticipants(true);
              wsRef.current?.send(JSON.stringify({ type: "get_participants", payload: { roomCode: roomId } }));
            }}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-800 px-2 py-0.5 rounded-full transition-colors"
          >
            🤫 Whisper
          </button>

          {/* Destroy Room button */}
          {roomInfo?.isOwner && (
            <button
              onClick={() => setShowDestroyConfirm(true)}
              className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 px-2 py-0.5 rounded-full transition-colors"
            >
              🗑 Destroy Room
            </button>
          )}

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
            Live
          </div>

          {/* Invite code */}
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-neutral-800/80 border border-neutral-200/70 dark:border-neutral-700/50 font-courier text-xs text-neutral-700 dark:text-neutral-300 tracking-wider shadow-sm backdrop-blur-sm cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors duration-200"
            onClick={copyInviteCode}
            title="Click to copy room code"
          >
            <span ref={inviteCodeRef} className="select-all">
              {roomId}
            </span>
            <span className="text-neutral-300 dark:text-neutral-600">|</span>
            {isCopied ? (
              <IoMdCheckmark className="text-emerald-500 text-sm" />
            ) : (
              <MdContentCopy className="text-neutral-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors duration-200 text-sm" />
            )}
          </div>
        </div>
      </div>

      {/* ── Messages Area ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <section className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto chat-scrollbar">
            <div className="max-w-[850px] mx-auto px-4 sm:px-6 py-4">
              {/* Empty state */}
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center chat-msg-enter">
                  <div className="relative mb-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/20 dark:to-violet-500/20 border border-indigo-200/50 dark:border-indigo-500/20 flex items-center justify-center">
                      <BsFillSendFill className="text-2xl text-indigo-500/60 dark:text-indigo-400/60 -rotate-45 translate-x-[-2px] translate-y-[2px]" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-950 flex items-center justify-center">
                      <span className="text-[8px] text-white font-bold">✓</span>
                    </div>
                  </div>
                  <h3 className="text-neutral-800 dark:text-neutral-200 font-semibold text-base mb-1">
                    Welcome, {displayName}
                  </h3>
                  <p className="text-neutral-400 dark:text-neutral-500 text-sm max-w-[260px] leading-relaxed">
                    Start the conversation. <br />
                    Everything here is temporary.
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-[11px] text-neutral-400 dark:text-neutral-600">
                    <span className="w-8 h-px bg-neutral-200 dark:bg-neutral-800" />
                    End-to-end ephemeral
                    <span className="w-8 h-px bg-neutral-200 dark:bg-neutral-800" />
                  </div>
                </div>
              )}

              {/* ── Messages — grouped by sender ───────────────────────────── */}
              <div className="space-y-3">
                {grouped.map((group, gi) => (
                  <div
                    key={gi}
                    ref={gi === grouped.length - 1 ? messageRef : undefined}
                    className={`flex chat-msg-enter ${group.isSelf ? "justify-end" : "justify-start"
                      }`}
                    style={{ animationDelay: `${Math.min(gi * 0.03, 0.3)}s` }}
                  >
                    {/* ── Other user: avatar ──────────────────────────────── */}
                    {!group.isSelf && group.sender && (
                      <div className="flex-none mr-2 self-end mb-5">
                        <div
                          className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarColor(
                            group.senderId
                          )} flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm ring-2 ring-white dark:ring-neutral-950`}
                        >
                          {group.sender.charAt(0)}
                        </div>
                      </div>
                    )}

                    <div
                      className={`flex flex-col max-w-[75%] sm:max-w-[65%] ${group.isSelf ? "items-end" : "items-start"
                        }`}
                    >
                      {/* ── Display name + Owner badge ────────────────── */}
                      {group.sender && (
                        <span
                          className={`text-[11px] font-semibold mb-0.5 px-1 tracking-wide flex items-center gap-1 ${group.isSelf
                            ? "text-indigo-400/80 dark:text-indigo-400/70"
                            : "text-neutral-400 dark:text-neutral-500"
                            }`}
                        >
                          {group.isSelf ? "You" : group.sender}
                          {roomInfo?.ownerId && group.senderId === roomInfo.ownerId && (
                            <FaCrown className="text-amber-500 dark:text-amber-400 text-[9px]" title="Room Owner" />
                          )}
                        </span>
                      )}

                      {/* ── Bubbles ───────────────────────────────────────── */}
                      <div
                        className={`flex flex-col gap-[3px] ${group.isSelf ? "items-end" : "items-start"
                          }`}
                      >
                        {group.messages.map((m, mi) => {
                          const isViewOnce = Boolean(m.viewOnce && m.messageId);
                          const isSelfDestruct = Boolean(m.selfDestruct && m.messageId);
                          const localState = m.messageId ? viewOnceStates[m.messageId] : undefined;
                          const isViewOnceDeleted = Boolean(localState?.deleted);
                          const isSelfDestructDeleted = Boolean(m.messageId && deletedMessageIds[m.messageId]);
                          const isDeleted = isViewOnceDeleted || isSelfDestructDeleted;
                          const revealStartedAt = localState?.openedAt;
                          const isRevealed = !isViewOnce || Boolean(revealStartedAt);
                          const remainingSeconds =
                            isViewOnce && revealStartedAt && m.deleteAfter
                              ? Math.max(0, Math.ceil((revealStartedAt + m.deleteAfter * 1000 - now) / 1000))
                              : isSelfDestruct && m.createdAt && m.deleteAfter
                                ? Math.max(0, Math.ceil((m.createdAt + m.deleteAfter * 1000 - now) / 1000))
                              : 0;

                          return (
                            <div
                              key={m.messageId ?? `${group.senderId}-${m.timestamp}-${mi}`}
                              className={`flex ${group.isSelf ? "justify-end" : "justify-start"}`}
                            >
                              <AnimatePresence mode="wait" initial={false}>
                                {isDeleted ? (
                                  isSelfDestructDeleted ? (
                                    <SelfDestructDeletedCard key="deleted" />
                                  ) : (
                                    <motion.div
                                      key="deleted"
                                      initial={{ opacity: 0, scale: 0.98, y: 8 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.98, y: -6 }}
                                      transition={{ type: "spring", stiffness: 320, damping: 28 }}
                                      className="max-w-[320px] rounded-[24px] border border-dashed border-neutral-300/70 dark:border-neutral-700/50 bg-white/70 dark:bg-neutral-900/70 px-5 py-6 text-center text-sm font-medium text-neutral-500 dark:text-neutral-400 backdrop-blur-xl"
                                    >
                                      This message has disappeared.
                                    </motion.div>
                                  )
                                ) : !isRevealed ? (
                                  <ViewOnceHiddenCard
                                    key="hidden"
                                    onReveal={() => handleRevealViewOnce(m)}
                                  />
                                ) : (
                                  <motion.div
                                    key="revealed"
                                    initial={{ opacity: 0, scale: 0.98, y: 8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.98, y: -6 }}
                                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                                    className={`
                                      relative
                                      chat-bubble
                                      py-2 px-3.5 break-words whitespace-pre-wrap
                                      text-[0.875rem] sm:text-[0.9375rem] leading-[1.55]
                                      ${group.isSelf
                                        ? `bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/15 ${selfBubbleRadius(
                                          group.messages.length,
                                          mi
                                        )}`
                                        : `bg-white dark:bg-neutral-800/90 text-neutral-800 dark:text-neutral-200 border border-neutral-200/70 dark:border-neutral-700/40 shadow-sm ${otherBubbleRadius(
                                          group.messages.length,
                                          mi
                                        )}`
                                      }
                                    `}
                                  >
                                    {m.mediaUrl ? (
                                      m.mediaType === "image" ? (
                                        <img
                                          src={`${BACKEND_URL.replace(/^ws/, "http").replace(/\/$/, "")}${m.mediaUrl}`}
                                          alt="attachment"
                                          className="max-w-[240px] sm:max-w-[320px] rounded-[14px] cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={() => setFullScreenImage(`${BACKEND_URL.replace(/^ws/, "http").replace(/\/$/, "")}${m.mediaUrl!}`)}
                                        />
                                      ) : m.mediaType === "video" ? (
                                        <video
                                          src={`${BACKEND_URL.replace(/^ws/, "http").replace(/\/$/, "")}${m.mediaUrl}`}
                                          controls
                                          className="max-w-[240px] sm:max-w-[320px] rounded-[14px]"
                                        />
                                      ) : (
                                        <div className="flex items-center space-x-3 p-3 bg-white dark:bg-neutral-800/90 rounded-[14px] border border-neutral-200/70 dark:border-neutral-700/40 shadow-sm max-w-[240px] sm:max-w-[320px]">
                                          <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-indigo-100 dark:bg-indigo-200/50 rounded-[6px]">
                                            {getFileIcon(m.fileExtension || m.mediaType || "file")}
                                          </div>
                                          <div className="flex-1 flex-col space-y-1">
                                            <div className="flex items-center space-x-2 text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[180px]">
                                              {m.fileName || "Unknown file"}
                                            </div>
                                            <div className="flex items-center space-x-2 text-xs text-neutral-500 dark:text-neutral-400">
                                              {(m.fileSize ?? 0) > 1024 * 1024
                                                ? `${((m.fileSize ?? 0) / (1024 * 1024)).toFixed(2)} MB`
                                                : `${((m.fileSize ?? 0) / 1024).toFixed(1)} KB`}
                                            </div>
                                          </div>
                                          <div className="flex-shrink-0">
                                            <a
                                              href={`${BACKEND_URL.replace(/^ws/, "http").replace(/\/$/, "")}${m.mediaUrl}`}
                                              download={m.fileName}
                                              className="flex items-center justify-center w-8 h-8 text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"
                                            >
                                              <span className="material-symbols-outlined">download</span>
                                            </a>
                                          </div>
                                        </div>
                                      )
                                    ) : null}
                                    {m.private && m.recipientName ? (
                                      <div className="mb-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/80 border border-indigo-200/80 dark:border-indigo-700/50 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-200">
                                        Whisper to {m.recipientName}
                                      </div>
                                    ) : null}
                                    {m.replySender ? (
                                    <button
                                      type="button"
                                      onClick={() => scrollToMessage(m.replyTo)}
                                      className={`mb-3 w-full rounded-2xl border-l-4 px-3 py-2 text-left transition-all duration-150 ${messages.some((msg) => msg.messageId === m.replyTo)
                                        ? "border-indigo-500/70 bg-white/90 shadow-sm shadow-black/5 hover:border-indigo-400 dark:border-indigo-400/70 dark:bg-neutral-950/80"
                                        : "border-dashed border-neutral-300 bg-neutral-100 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 cursor-not-allowed"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                                        <span className="flex items-center gap-2">
                                          <span className="text-sm">{getReplyIcon(m.replyType)}</span>
                                          {messages.some((msg) => msg.messageId === m.replyTo)
                                            ? `Replying to ${m.replySender}`
                                            : "Original message unavailable"}
                                        </span>
                                        {messages.some((msg) => msg.messageId === m.replyTo) ? (
                                          <span className="text-[10px] text-indigo-500 dark:text-indigo-300">Tap to view</span>
                                        ) : null}
                                      </div>
                                      {messages.some((msg) => msg.messageId === m.replyTo) ? (
                                        <div className="mt-2 text-sm leading-snug text-neutral-700 dark:text-neutral-200">
                                          {m.replyType === "image" ? (
                                            <div className="flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-neutral-50 p-2 dark:border-neutral-700/80 dark:bg-neutral-900/70">
                                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-lg dark:bg-slate-800">📷</span>
                                              <span>Photo</span>
                                            </div>
                                          ) : m.replyType === "video" ? (
                                            <div className="flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-neutral-50 p-2 dark:border-neutral-700/80 dark:bg-neutral-900/70">
                                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-lg dark:bg-slate-800">▶️</span>
                                              <span>Video</span>
                                            </div>
                                          ) : m.replyType === "file" ? (
                                            <div className="flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-neutral-50 p-2 dark:border-neutral-700/80 dark:bg-neutral-900/70">
                                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-lg dark:bg-slate-800">📄</span>
                                              <span>{m.replyText || "File"}</span>
                                            </div>
                                          ) : m.replyType === "viewOnce" ? (
                                            <div className="rounded-xl border border-neutral-200/80 bg-neutral-50 p-2 text-sm text-neutral-700 dark:border-neutral-700/80 dark:bg-neutral-900/70 dark:text-neutral-200">
                                              👁 View Once Message
                                            </div>
                                          ) : m.replyType === "selfDestruct" ? (
                                            <div className="rounded-xl border border-neutral-200/80 bg-neutral-50 p-2 text-sm text-neutral-700 dark:border-neutral-700/80 dark:bg-neutral-900/70 dark:text-neutral-200">
                                              🔥 Self Destruct Message
                                            </div>
                                          ) : (
                                            <div className="rounded-xl border border-neutral-200/80 bg-neutral-50 p-2 text-sm text-neutral-700 dark:border-neutral-700/80 dark:bg-neutral-900/70 dark:text-neutral-200 line-clamp-2">
                                              {m.replyText}
                                            </div>
                                          )}
                                        </div>
                                      ) : null}
                                    </button>
                                  ) : null}
                                    {m.text && <div className={m.mediaUrl ? "mt-2" : ""}>{m.text}</div>}
                                    {pinnedMessageId === m.messageId ? (
                                      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-200">
                                        <span>📌</span>
                                        Pinned
                                      </div>
                                    ) : null}
                                    {isSelfDestruct && m.createdAt && m.deleteAfter ? (
                                      <div className="mt-3 space-y-1">
                                        <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:bg-rose-400/10 dark:text-rose-300">
                                          <span>🔥</span>
                                          Self Destruct
                                        </div>
                                        <div className="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:bg-white/10 dark:text-amber-300">
                                          <HiOutlineClock className="text-[11px]" />
                                          Deleting in {remainingSeconds}s
                                        </div>
                                      </div>
                                    ) : null}
                                    {isViewOnce && revealStartedAt && m.deleteAfter ? (
                                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:bg-white/10 dark:text-amber-300">
                                        <HiOutlineClock className="text-[11px]" />
                                        Deleting in {remainingSeconds}...
                                      </div>
                                    ) : null}
                                  { !isDeleted && isRevealed ? (
                                    <div className="mt-2 flex flex-col gap-2 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => startReply(m)}
                                          className="hover:text-indigo-500"
                                        >
                                          Reply
                                        </button>
                                        {m.senderId === clientId.current && !m.viewOnce && !m.selfDestruct ? (
                                          <button
                                            type="button"
                                            onClick={() => startEdit(m)}
                                            className="hover:text-indigo-500"
                                          >
                                            Edit
                                          </button>
                                        ) : null}
                                        {(m.senderId === clientId.current || roomInfo?.isOwner) && m.messageId ? (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteMessage(m)}
                                            className="hover:text-rose-500"
                                          >
                                            Delete
                                          </button>
                                        ) : null}
                                        {roomInfo?.isOwner && m.messageId && !m.viewOnce && !m.selfDestruct ? (
                                          <button
                                            type="button"
                                            onClick={() => handlePinMessage(m)}
                                            className="hover:text-indigo-500"
                                          >
                                            {pinnedMessageId === m.messageId ? "Unpin" : "Pin"}
                                          </button>
                                        ) : null}
                                      </div>

                                      <div className="flex flex-wrap items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => toggleReactionPicker(m.messageId!)}
                                          className="hover:text-indigo-500"
                                        >
                                          React
                                        </button>

                                        {m.messageId && m.reactions && Object.keys(m.reactions).length > 0 ? (
                                          <div className="flex flex-wrap items-center gap-1">
                                            {Object.entries(m.reactions).map(([emoji, count]) => (
                                              <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => handleReactionToggle(m, emoji)}
                                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] transition-colors ${userReactions[m.messageId!]?.has(emoji)
                                                  ? "border-indigo-300 bg-indigo-100 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-200"
                                                  : "border-neutral-200 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                                                }`}
                                              >
                                                <span>{emoji}</span>
                                                <span>{count}</span>
                                              </button>
                                            ))}
                                          </div>
                                        ) : null}
                                      </div>

                                      {reactionPickerOpenFor === m.messageId && (
                                        <div ref={reactionPickerRef} className="absolute right-0 z-10 mt-2 w-full min-w-[300px] max-w-[420px] rounded-3xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
                                          <div className="mb-3 flex items-center justify-between gap-2">
                                            <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">React to message</span>
                                            <button
                                              type="button"
                                              onClick={() => setReactionPickerOpenFor(null)}
                                              className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-100"
                                            >
                                              <HiOutlineXMark className="h-5 w-5" />
                                            </button>
                                          </div>
                                          <div className="grid grid-cols-7 gap-3">
                                            {REACTION_EMOJIS.map((emoji) => {
                                              const selected = m.messageId ? userReactions[m.messageId]?.has(emoji) : false;
                                              return (
                                                <button
                                                  key={emoji}
                                                  type="button"
                                                  onClick={() => handleReactionToggle(m, emoji)}
                                                  className={`h-12 w-12 rounded-3xl text-xl transition-colors ${selected
                                                    ? "bg-indigo-600 text-white"
                                                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                                                  }`}
                                                >
                                                  {emoji}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : null}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>

                      {/* ── Timestamp ─────────────────────────────────────── */}
                      {group.lastTimestamp > 0 && (
                        <span className="text-[10px] mt-1 px-1 text-neutral-400/70 dark:text-neutral-600 font-medium tabular-nums">
                          {formatTime(group.lastTimestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Composer ───────────────────────────────────────────────────── */}
          <div className="flex-none border-t border-neutral-200/70 dark:border-neutral-800/50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl">
            <div className="max-w-[850px] mx-auto px-3 sm:px-5 py-2.5">

              {/* Action buttons row */}
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <ComposerBtn
                  icon={viewOnceEnabled ? <HiOutlineEyeSlash className="text-lg" /> : <HiOutlineEye className="text-lg" />}
                  label="View Once"
                  onClick={toggleViewOnce}
                  accent={viewOnceEnabled}
                />
                {viewOnceEnabled && (
                  <div className="flex items-center gap-2 px-3 h-9 rounded-xl border border-indigo-200/70 dark:border-indigo-500/20 bg-indigo-50/70 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-200 text-xs font-semibold backdrop-blur-sm">
                    <HiOutlineClock className="text-sm" />
                    <select
                      value={viewOnceDuration}
                      onChange={(e) => setViewOnceDuration(Number(e.target.value))}
                      className="bg-transparent outline-none appearance-none font-semibold"
                      aria-label="View once duration"
                    >
                      {VIEW_ONCE_DURATIONS.map((seconds) => (
                        <option key={seconds} value={seconds}>
                          {formatViewOnceDuration(seconds)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <ComposerBtn
                  icon={<span className="text-base leading-none">🔥</span>}
                  label="Self Destruct"
                  onClick={toggleSelfDestruct}
                  accent={selfDestructEnabled}
                />
                {selfDestructEnabled && (
                  <div className="flex items-center gap-2 px-3 h-9 rounded-xl border border-rose-200/70 dark:border-rose-500/20 bg-rose-50/70 dark:bg-rose-500/10 text-rose-700 dark:text-rose-200 text-xs font-semibold backdrop-blur-sm">
                    <HiOutlineClock className="text-sm" />
                    <select
                      value={selfDestructDuration}
                      onChange={(e) => setSelfDestructDuration(Number(e.target.value))}
                      className="bg-transparent outline-none appearance-none font-semibold"
                      aria-label="Self destruct duration"
                    >
                      {SELF_DESTRUCT_DURATIONS.map((seconds) => (
                        <option key={seconds} value={seconds}>
                          {formatSelfDestructDuration(seconds)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div ref={composerEmojiRef} className="relative">
                  <ComposerBtn
                    icon={<HiOutlineFaceSmile className="text-lg" />}
                    label="Emoji"
                    onClick={handleEmojiClick}
                    accent
                  />
                  {composerEmojiOpen && (
                    <div className="absolute bottom-full right-0 z-50 mb-2 w-[360px] rounded-3xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                          Choose emoji
                        </span>
                        <button
                          type="button"
                          onClick={() => setComposerEmojiOpen(false)}
                          className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-100"
                        >
                          <HiOutlineXMark className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="grid max-h-72 grid-cols-7 gap-2 overflow-y-auto pr-1">
                        {REACTION_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleComposerEmojiSelect(emoji)}
                            className="h-12 w-12 rounded-3xl bg-neutral-100 text-xl transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <ComposerBtn
                  icon={<HiOutlinePaperClip className="text-lg" />}
                  label="Attachment"
                  onClick={handleMediaSelect}
                />
              </div>

              {/* Input + Send */}
              { (replyTarget || editTarget) && (
                <div className="mb-2 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/70 px-4 py-3 text-sm text-neutral-700 dark:text-neutral-200 flex items-start justify-between gap-3">
                  <div className="max-w-[calc(100%-70px)]">
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {editTarget ? "Editing message" : `Replying to ${replyTarget?.sender || "Unknown"}`}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      {editTarget?.text || replyTarget?.text || "No preview available"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={cancelReplyOrEdit}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-300 hover:text-indigo-500"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <form
                onSubmit={onSubmitHandler}
                className="flex items-center gap-2"
              >
                <div className="flex-1 flex flex-col gap-2">
                  {selectedRecipient && (
                    <div className="rounded-2xl border border-indigo-200/70 bg-indigo-50/80 dark:border-indigo-700/50 dark:bg-indigo-950/60 px-3 py-2 text-sm text-indigo-700 dark:text-indigo-200 flex items-center justify-between gap-3">
                      <span className="truncate">Whispering to <span className="font-semibold">{selectedRecipient.displayName}</span></span>
                      <button
                        type="button"
                        onClick={() => setSelectedRecipient(null)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-100"
                      >
                        Send to all
                      </button>
                    </div>
                  )}
                  <div className="flex items-center composer-input-glass rounded-2xl px-4 py-2.5 transition-all duration-200">
                    <input
                      type="text"
                      className="flex-1 font-medium outline-none w-full bg-transparent text-neutral-800 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-sm"
                      autoFocus
                      ref={inputRef}
                      placeholder={editTarget ? "Edit your message…" : "Type a temporary message…"}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="send-btn w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-90 transition-all duration-200 flex-none"
                >
                  <BsFillSendFill className="text-[14px] -translate-x-[1px] translate-y-[1px]" />
                </button>
              </form>
            </div>

            <input
              ref={mediaInputRef}
              type="file"
              className="hidden"
              onChange={handleMediaChosen}
            />
          </div>
        </section>
      </main>

      <Footer />

      {/* ── Participants Modal ────────────────────────────────────────────── */}
      {showParticipants && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col border border-neutral-200 dark:border-neutral-800">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-950">
              <h3 className="font-semibold text-neutral-800 dark:text-neutral-200">
                Participants ({roomInfo?.currentParticipants || 0})
              </h3>
              <button
                onClick={() => setShowParticipants(false)}
                className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                <HiOutlineXMark className="text-xl" />
              </button>
            </div>
            <div className="p-2 overflow-y-auto max-h-[60vh] space-y-1">
              {participantsList.map((p) => (
                <div
                  key={p.userId}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/50"
                >
                  <div className="flex flex-col py-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none select-none">
                        {p.isOwner ? "👑" : "👤"}
                      </span>
                      <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        {p.displayName.toLowerCase() === "anonymous" ? "Anonymous" : `Anonymous ${p.displayName}`}
                      </span>
                    </div>
                    {p.userId === actualUserId.current && (
                      <span className="text-[12px] font-medium text-neutral-500 dark:text-neutral-400 ml-[26px] mt-0.5 select-none">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {p.userId !== actualUserId.current && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRecipient({ userId: p.userId, displayName: p.displayName });
                          setShowParticipants(false);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${selectedRecipient?.userId === p.userId
                          ? "bg-indigo-600 text-white"
                          : "text-indigo-600 border border-indigo-200 hover:bg-indigo-50 dark:border-indigo-900 dark:hover:bg-indigo-700/50 dark:text-indigo-300"
                        }`}
                      >
                        {selectedRecipient?.userId === p.userId ? "Selected" : "Whisper"}
                      </button>
                    )}
                    {roomInfo?.isOwner && !p.isOwner && p.userId !== actualUserId.current && (
                      <button
                        onClick={() => {
                          wsRef.current?.send(
                            JSON.stringify({
                              type: "kick_user",
                              payload: { roomCode: roomId, targetUserId: p.userId },
                            })
                          );
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-white border border-rose-200 hover:bg-rose-500 dark:border-rose-900 dark:hover:bg-rose-600 rounded-lg transition-colors"
                      >
                        Kick
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Destroy Room Confirm ────────────────────────────────────────── */}
      {showDestroyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center border border-neutral-200 dark:border-neutral-800">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-500/20 text-rose-600 mx-auto rounded-full flex items-center justify-center mb-4">
              <span className="text-xl">🗑</span>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              Destroy Room?
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
              This action cannot be undone.<br />
              All users will be disconnected.<br />
              Messages and temporary media will be deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDestroyConfirm(false)}
                className="flex-1 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  wsRef.current?.send(
                    JSON.stringify({
                      type: "destroy_room",
                      payload: { roomCode: roomId },
                    })
                  );
                  setShowDestroyConfirm(false);
                }}
                className="flex-1 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition-colors"
              >
                Destroy Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Media Preview Dialog ────────────────────────────────────────── */}
      {attachmentPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col w-full max-w-lg border border-neutral-200 dark:border-neutral-800">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-950">
              <h3 className="font-semibold text-neutral-800 dark:text-neutral-200">
                Send {attachmentPreview.type === "video" ? "Video" : attachmentPreview.type === "image" ? "Image" : "File"}
              </h3>
              <button
                onClick={cancelAttachment}
                className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                disabled={isUploading}
              >
                <HiOutlineXMark className="text-xl" />
              </button>
            </div>
            <div className="p-4 bg-neutral-100 dark:bg-black/50 flex justify-center items-center min-h-[300px]">
              {attachmentPreview.type === "video" ? (
                <video src={attachmentPreview.previewUrl!} controls className="max-h-[50vh] rounded-xl max-w-full" />
              ) : attachmentPreview.type === "image" ? (
                <img src={attachmentPreview.previewUrl!} alt="Preview" className="max-h-[50vh] rounded-xl max-w-full object-contain" />
              ) : (
                // File preview - show icon and info
                <div className="flex flex-col items-center space-y-3">
                  <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-indigo-100 dark:bg-indigo-200/50 rounded-[6px]">
                    {getFileIcon(attachmentPreview.file.name.split('.').pop()?.toLowerCase() || '')}
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[200px]">
                      {attachmentPreview.file.name}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {(attachmentPreview.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 flex gap-3 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800">
              <button
                onClick={cancelAttachment}
                disabled={isUploading}
                className="flex-1 px-4 py-2.5 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendAttachment}
                disabled={isUploading}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <BsFillSendFill className="text-sm" /> Send
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen Image Viewer ────────────────────────────────────────── */}
      {fullScreenImage && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 cursor-zoom-out"
          onClick={() => setFullScreenImage(null)}
        >
          <img
            src={fullScreenImage}
            alt="Fullscreen"
            className="max-w-full max-h-full object-contain select-none"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setFullScreenImage(null)}
            className="absolute top-6 right-6 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md"
          >
            <HiOutlineXMark className="text-xl" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Chat;