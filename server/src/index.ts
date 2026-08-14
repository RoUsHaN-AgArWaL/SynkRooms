import { WebSocketServer, WebSocket } from "ws";
import express from "express";
import cors from "cors";
import http from "http";
import crypto from "crypto";
import multer from "multer";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());

// Configuration
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const UPLOADS_DIR = path.join(__dirname, "../uploads");

// Set up uploads directory
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use("/uploads", express.static(UPLOADS_DIR));

// Allowed file types and their MIME types
const ALLOWED_MIME_TYPES = new Set([
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/rtf",
  "text/rtf",

  // Archives
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",

  // Code
  "text/plain", // Already covered above, but keeping for clarity
  "application/java",
  "application/x-cpp",
  "text/x-c",
  "text/x-c++",
  "text/x-java-source",
  "text/x-javascript",
  "application/javascript",
  "text/javascript",
  "text/typescript",
  "text/html",
  "text/css",
  "application/json",
  "application/xml",
  "text/xml",

  // Data
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  // Other
  "application/vnd.android.package-archive",
  "application/x-iso9660-image",

  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",

  // Videos
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

// File extensions mapping for better file type detection
const EXTENSION_TO_TYPE: Record<string, string> = {
  // Documents
  '.pdf': 'document',
  '.doc': 'document',
  '.docx': 'document',
  '.txt': 'document',
  '.rtf': 'document',

  // Archives
  '.zip': 'archive',
  '.rar': 'archive',
  '.7z': 'archive',

  // Code
  '.java': 'code',
  '.cpp': 'code',
  '.c': 'code',
  '.py': 'code',
  '.js': 'code',
  '.ts': 'code',
  '.html': 'code',
  '.css': 'code',
  '.json': 'code',
  '.xml': 'code',

  // Data
  '.csv': 'data',
  '.xlsx': 'data',

  // Other
  '.apk': 'other',
  '.iso': 'other',

  // Images
  '.jpg': 'image',
  '.jpeg': 'image',
  '.png': 'image',
  '.webp': 'image',
  '.gif': 'image',
  '.svg': 'image',

  // Videos
  '.mp4': 'video',
  '.webm': 'video',
  '.mov': 'video',
};

// Multer storage and upload config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = crypto.randomUUID();
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    // Check if file type is allowed
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      // Also check by extension as fallback
      const ext = path.extname(file.originalname).toLowerCase();
      if (EXTENSION_TO_TYPE.hasOwnProperty(ext)) {
        cb(null, true);
      } else {
        cb(new Error("Unsupported file type"));
      }
    }
  },
});

app.post("/upload", (req, res) => {
  upload.any()(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message || "File upload error" });
      return;
    }

    const file = req.files && Array.isArray(req.files) && req.files.length > 0 ? req.files[0] : null;

    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const { roomCode } = req.body;
    if (!roomCode) {
      fs.unlink(file.path, () => { });
      res.status(400).json({ error: "Room code required" });
      return;
    }

    const code = roomCode.toUpperCase().trim();
    const room = rooms.get(code);

    if (!room || room.expiresAt <= Date.now()) {
      fs.unlink(file.path, () => { });
      res.status(404).json({ error: "Room not found or expired" });
      return;
    }

    // Get file extension and determine type
    const originalName = file.originalname;
    const ext = path.extname(originalName).toLowerCase();
    const fileType = EXTENSION_TO_TYPE[ext] || 'other';

    // Get file size
    const size = file.size;

    const id = crypto.randomUUID();
    const url = `/uploads/${file.filename}`;

    // Add to room's mediaFiles for cleanup
    room.mediaFiles.push(file.filename);

    res.json({
      id,
      url,
      filename: file.filename,
      originalName,
      extension: ext.substring(1), // Remove the dot
      size,
      type: fileType,
      expiresAt: room.expiresAt,
    });
  });
});


const server = http.createServer(app);
const ws = new WebSocketServer({ server });

app.get("/ping", (req, res) => {
  res.status(200).send("Server is alive");
});

app.get("/view-once/:messageId/:token", (req, res) => {
  const { messageId, token } = req.params;
  const record = viewOnceMessages.get(messageId);

  if (!record) {
    res.status(404).send("Not found");
    return;
  }

  const recipientState = Object.values(record.recipientViews).find((state) => state.token === token);
  if (!recipientState || !recipientState.opened || recipientState.deleted || !record.mediaFilename) {
    res.status(404).send("Not found");
    return;
  }

  const filePath = path.join(UPLOADS_DIR, record.mediaFilename);
  if (!fs.existsSync(filePath)) {
    res.status(404).send("Not found");
    return;
  }

  res.sendFile(filePath);
});

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface User {
  socket: WebSocket;
  roomId: string;
  displayName?: string;
  userId?: string;
}

interface Room {
  roomCode: string;
  owner: string; // owner userId
  ownerName: string;
  private: boolean;
  pin: string | null; // hashed PIN for private rooms
  expiresAt: number; // timestamp
  maxParticipants: number;
  createdAt: number;
  participants: number;
  mediaFiles: string[];
}

interface ViewOnceRecipientState {
  opened: boolean;
  openedAt?: number;
  deleted: boolean;
  token?: string;
  timer?: ReturnType<typeof setTimeout>;
}

interface ViewOnceMessageRecord {
  messageId: string;
  roomCode: string;
  sender: string;
  senderId: string;
  timestamp: number;
  deleteAfterMs: number;
  text: string;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  fileSize?: number;
  fileExtension?: string;
  mediaFilename?: string;
  recipientViews: Record<string, ViewOnceRecipientState>;
}

interface SelfDestructMessageRecord {
  messageId: string;
  roomCode: string;
  deleteAfterMs: number;
  mediaFilename?: string;
  timer?: ReturnType<typeof setTimeout>;
}

/* Rate-limiting for PIN attempts */
interface PinAttemptTracker {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number;
}

/* ─── State ────────────────────────────────────────────────────────────────── */

let userCount: number = 0;
let allSockets: User[] = [];
const rooms: Map<string, Room> = new Map();
const pinAttempts: Map<string, PinAttemptTracker> = new Map(); // key: ip/socketId + roomCode
const viewOnceMessages: Map<string, ViewOnceMessageRecord> = new Map();
const selfDestructMessages: Map<string, SelfDestructMessageRecord> = new Map();
const VALID_VIEW_ONCE_DELETE_AFTER = new Set([7, 15, 20, 30, 60, 300]);
const VALID_SELF_DESTRUCT_DELETE_AFTER = new Set([7, 15, 20, 30, 60, 300]);

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function generateRoomCode(): string {
  // Generate a 6-character alphanumeric code
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars (0,O,1,I)
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateUniqueRoomCode(): string {
  let code = generateRoomCode();
  let attempts = 0;
  while (rooms.has(code) && attempts < 100) {
    code = generateRoomCode();
    attempts++;
  }
  return code;
}

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

function sanitize(input: string): string {
  return input
    .replace(/[<>]/g, "") // Strip basic HTML
    .trim()
    .substring(0, 200); // Max length safety
}

function getParticipantCount(roomCode: string): number {
  return allSockets.filter(
    (u) => u.roomId === roomCode.toUpperCase()
  ).length;
}

function broadcastToRoom(roomCode: string, message: object) {
  const msg = JSON.stringify(message);
  allSockets.forEach((user) => {
    if (user.roomId === roomCode.toUpperCase() && user.socket.readyState === WebSocket.OPEN) {
      user.socket.send(msg);
    }
  });
}

function sendToRoomUserIds(roomCode: string, message: string | object, userIds: string[]) {
  const msg = typeof message === "string" ? message : JSON.stringify(message);
  const seen = new Set<WebSocket>();

  allSockets.forEach((user) => {
    const userId = user.userId || "";
    if (
      user.roomId === roomCode.toUpperCase() &&
      userIds.includes(userId) &&
      user.socket.readyState === WebSocket.OPEN &&
      !seen.has(user.socket)
    ) {
      user.socket.send(msg);
      seen.add(user.socket);
    }
  });
}

function getRoomSocketUsers(roomCode: string): User[] {
  return allSockets.filter((user) => user.roomId === roomCode.toUpperCase());
}

function getPrivateViewOnceMediaUrl(messageId: string, token: string): string {
  return `/view-once/${messageId}/${token}`;
}

function buildHiddenViewOnceMessage(record: ViewOnceMessageRecord) {
  return JSON.stringify({
    messageId: record.messageId,
    text: "",
    sender: record.sender,
    senderId: record.senderId,
    timestamp: record.timestamp,
    viewOnce: true,
    deleteAfter: record.deleteAfterMs / 1000,
  });
}

interface RoomMessageRecord {
  roomCode: string;
  messageId: string;
  sender: string;
  senderId: string;
  timestamp: number;
  createdAt: number;
  text: string;
  content: string;
  type: string;
  viewOnce: boolean;
  selfDestruct: boolean;
  deleteAfter?: number;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  fileSize?: number;
  fileExtension?: string;
  replyTo?: string;
  replySender?: string;
  replySenderId?: string;
  replyText?: string;
  recipientId?: string;
  recipientName?: string;
  private?: boolean;
  edited?: boolean;
  deleted?: boolean;
  pinned?: boolean;
}

const roomMessages: Map<string, RoomMessageRecord[]> = new Map();
const messageReactions: Map<string, Record<string, Set<string>>> = new Map();
const roomPinnedMessage: Map<string, string | null> = new Map();

function getRoomMessages(roomCode: string): RoomMessageRecord[] {
  const key = roomCode.toUpperCase();
  if (!roomMessages.has(key)) {
    roomMessages.set(key, []);
  }
  return roomMessages.get(key)!;
}

function findRoomMessage(roomCode: string, messageId: string): RoomMessageRecord | undefined {
  return getRoomMessages(roomCode).find((msg) => msg.messageId === messageId);
}

function addRoomMessage(record: RoomMessageRecord) {
  getRoomMessages(record.roomCode).push(record);
}

function updateRoomMessage(roomCode: string, messageId: string, patch: Partial<RoomMessageRecord>) {
  const record = findRoomMessage(roomCode, messageId);
  if (record) {
    Object.assign(record, patch);
  }
}

function getMessageReactionState(messageId: string): Record<string, Set<string>> {
  if (!messageReactions.has(messageId)) {
    messageReactions.set(messageId, {});
  }
  return messageReactions.get(messageId)!;
}

function recordReaction(messageId: string, reaction: string, userId: string) {
  const state = getMessageReactionState(messageId);
  if (!state[reaction]) {
    state[reaction] = new Set();
  }
  state[reaction].add(userId);
}

function removeReaction(messageId: string, reaction: string, userId: string) {
  const state = getMessageReactionState(messageId);
  state[reaction]?.delete(userId);
}

function reactionCounts(messageId: string) {
  const state = getMessageReactionState(messageId);
  return Object.fromEntries(
    Object.entries(state).map(([reaction, users]) => [reaction, users.size])
  );
}

function getRoomPinnedMessage(roomCode: string): string | null {
  const key = roomCode.toUpperCase();
  return roomPinnedMessage.get(key) ?? null;
}

function setRoomPinnedMessage(roomCode: string, messageId: string | null) {
  const key = roomCode.toUpperCase();
  if (messageId) {
    roomPinnedMessage.set(key, messageId);
  } else {
    roomPinnedMessage.delete(key);
  }
}

function clearRoomMessagesForRoom(roomCode: string) {
  roomMessages.forEach((messages, key) => {
    if (key === roomCode.toUpperCase()) {
      roomMessages.delete(key);
    }
  });
}

function clearMessageReactionsForRoom(roomCode: string) {
  const messageIds = getRoomMessages(roomCode).map((message) => message.messageId);
  messageIds.forEach((messageId) => messageReactions.delete(messageId));
}

function clearPinnedMessagesForRoom(roomCode: string) {
  roomPinnedMessage.delete(roomCode.toUpperCase());
}

function searchRoomMessages(roomCode: string, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return getRoomMessages(roomCode)
    .filter((msg) =>
      !msg.deleted &&
      msg.text.toLowerCase().includes(normalized)
    )
    .slice(-50)
    .map((msg) => ({
      messageId: msg.messageId,
      sender: msg.sender,
      senderId: msg.senderId,
      text: msg.text,
      timestamp: msg.timestamp,
      replyTo: msg.replyTo,
      replyText: msg.replyText,
      replySender: msg.replySender,
      replySenderId: msg.replySenderId,
      mediaType: msg.mediaType,
      mediaUrl: msg.mediaUrl,
    }));
}

function getRecipientState(record: ViewOnceMessageRecord, userId: string): ViewOnceRecipientState {
  const existing = record.recipientViews[userId];
  if (existing) {
    return existing;
  }

  const state: ViewOnceRecipientState = {
    opened: false,
    deleted: false,
  };
  record.recipientViews[userId] = state;
  return state;
}

function maybeFinalizeViewOnceRecord(messageId: string) {
  const record = viewOnceMessages.get(messageId);
  if (!record) {
    return;
  }

  const hasPendingRecipients = Object.values(record.recipientViews).some((state) => !state.deleted);
  if (hasPendingRecipients) {
    return;
  }

  if (record.mediaFilename) {
    const mediaPath = path.join(UPLOADS_DIR, record.mediaFilename);
    fs.unlink(mediaPath, (err) => {
      if (err && (err as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("Error deleting view-once file", record.mediaFilename, err);
      }
    });

    const room = rooms.get(record.roomCode);
    if (room) {
      room.mediaFiles = room.mediaFiles.filter((file) => file !== record.mediaFilename);
    }
  }

  viewOnceMessages.delete(messageId);
}

function sendViewOnceDeletion(messageId: string, userId: string) {
  const record = viewOnceMessages.get(messageId);
  if (!record) {
    return;
  }

  const recipientState = record.recipientViews[userId];
  if (!recipientState || recipientState.deleted) {
    return;
  }

  recipientState.deleted = true;
  if (recipientState.timer) {
    clearTimeout(recipientState.timer);
  }

  const socketUser = allSockets.find((user) => user.roomId === record.roomCode && user.userId === userId);
  if (socketUser?.socket.readyState === WebSocket.OPEN) {
    socketUser.socket.send(JSON.stringify({
      type: "view_once_deleted",
      payload: { messageId },
    }));
  }

  maybeFinalizeViewOnceRecord(messageId);
}

function scheduleRecipientViewOnceDeletion(messageId: string, userId: string) {
  const record = viewOnceMessages.get(messageId);
  if (!record) {
    return;
  }

  const recipientState = getRecipientState(record, userId);
  if (recipientState.deleted || recipientState.timer) {
    return;
  }

  recipientState.timer = setTimeout(() => {
    sendViewOnceDeletion(messageId, userId);
  }, record.deleteAfterMs);
}

function deleteSelfDestructMedia(record: SelfDestructMessageRecord) {
  if (record.mediaFilename) {
    const mediaPath = path.join(UPLOADS_DIR, record.mediaFilename);
    fs.unlink(mediaPath, (err) => {
      if (err && (err as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("Error deleting self-destruct file", record.mediaFilename, err);
      }
    });

    const room = rooms.get(record.roomCode);
    if (room) {
      room.mediaFiles = room.mediaFiles.filter((file) => file !== record.mediaFilename);
    }
  }
}

function finalizeSelfDestructRecord(messageId: string) {
  const record = selfDestructMessages.get(messageId);
  if (!record) {
    return;
  }

  if (record.timer) {
    clearTimeout(record.timer);
  }

  deleteSelfDestructMedia(record);
  selfDestructMessages.delete(messageId);
}

function scheduleSelfDestructDeletion(messageId: string) {
  const record = selfDestructMessages.get(messageId);
  if (!record || record.timer) {
    return;
  }

  record.timer = setTimeout(() => {
    const currentRecord = selfDestructMessages.get(messageId);
    if (!currentRecord) {
      return;
    }

    broadcastToRoom(currentRecord.roomCode, {
      type: "message_deleted",
      payload: {
        messageId,
        roomCode: currentRecord.roomCode,
        deletedAt: Date.now(),
      },
    });

    finalizeSelfDestructRecord(messageId);
  }, record.deleteAfterMs);
}

function clearSelfDestructMessagesForRoom(roomCode: string) {
  selfDestructMessages.forEach((record, messageId) => {
    if (record.roomCode === roomCode) {
      if (record.timer) {
        clearTimeout(record.timer);
      }
      selfDestructMessages.delete(messageId);
    }
  });
}

function clearViewOnceMessagesForRoom(roomCode: string) {
  viewOnceMessages.forEach((record, messageId) => {
    if (record.roomCode === roomCode) {
      Object.values(record.recipientViews).forEach((state) => {
        if (state.timer) {
          clearTimeout(state.timer);
        }
      });
      viewOnceMessages.delete(messageId);
    }
  });
}
/* ─── Room Expiry Cleanup ──────────────────────────────────────────────────── */

function cleanupExpiredRooms() {
  const now = Date.now();
  rooms.forEach((room, code) => {
    if (room.expiresAt <= now) {
      // Broadcast room expired message
      broadcastToRoom(code, {
        type: "room_expired",
        payload: { roomCode: code, message: "This room has expired." },
      });

      // Disconnect all users in the room
      allSockets = allSockets.filter((user) => {
        if (user.roomId === code) {
          try {
            user.socket.send(
              JSON.stringify({
                type: "room_expired",
                payload: { roomCode: code, message: "This room has expired." },
              })
            );
            user.socket.close();
          } catch {
            // Socket may already be closed
          }
          return false;
        }
        return true;
      });

      // delete media files
      room.mediaFiles.forEach((file) => {
        fs.unlink(path.join(UPLOADS_DIR, file), (err) => {
          if (err) console.error("Error deleting file", file, err);
        });
      });

      clearViewOnceMessagesForRoom(code);
      clearSelfDestructMessagesForRoom(code);
      clearRoomMessagesForRoom(code);
      clearMessageReactionsForRoom(code);
      clearPinnedMessagesForRoom(code);

      rooms.delete(code);
      console.log(`Room ${code} expired and cleaned up.`);
    }
  });
}

// Check for expired rooms every 10 seconds
setInterval(cleanupExpiredRooms, 10000);

/* ─── Rate Limiting for PIN ────────────────────────────────────────────────── */

const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 60000; // 1 minute lockout

function checkPinRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const tracker = pinAttempts.get(key);

  if (!tracker) {
    pinAttempts.set(key, { attempts: 1, lastAttempt: now, lockedUntil: 0 });
    return { allowed: true };
  }

  // Check if locked out
  if (tracker.lockedUntil > now) {
    return { allowed: false, retryAfter: Math.ceil((tracker.lockedUntil - now) / 1000) };
  }

  // Reset if last attempt was more than lockout duration ago
  if (now - tracker.lastAttempt > LOCKOUT_DURATION) {
    tracker.attempts = 1;
    tracker.lastAttempt = now;
    tracker.lockedUntil = 0;
    return { allowed: true };
  }

  tracker.attempts++;
  tracker.lastAttempt = now;

  if (tracker.attempts > MAX_PIN_ATTEMPTS) {
    tracker.lockedUntil = now + LOCKOUT_DURATION;
    return { allowed: false, retryAfter: Math.ceil(LOCKOUT_DURATION / 1000) };
  }

  return { allowed: true };
}

/* ═════════════════════════════════════════════════════════════════════════════════════ */
/*  WebSocket Connection Handler                                              */
/* ═════════════════════════════════════════════════════════════════════════════════════ */

ws.on("connection", function connection(socket: WebSocket) {
  console.log("user connected");
  userCount = userCount + 1;
  console.log(userCount);

  // Assign a unique socket ID for rate limiting
  const socketId = crypto.randomUUID();

  socket.on("message", (message) => {
    let parsedMessage: any;
    try {
      parsedMessage = JSON.parse(message.toString());
    } catch {
      socket.send(JSON.stringify({
        type: "error",
        payload: { message: "Invalid message format." },
      }));
      return;
    }

    /* ── Create Room ───────────────────────────────────────────────────── */
    if (parsedMessage.type === "create_room") {
      const { displayName, roomType, pin, confirmPin, expiry, maxParticipants } =
        parsedMessage.payload || {};

      // Validate display name
      const name = sanitize(displayName || "");
      if (name.length < 2 || name.length > 20) {
        socket.send(
          JSON.stringify({
            type: "create_room_error",
            payload: { message: "Display name must be 2-20 characters." },
          })
        );
        return;
      }

      // Validate expiry
      const validExpiries = [15, 30, 60, 360, 720, 1440];
      const expiryMinutes = parseInt(expiry);
      if (!expiryMinutes || (expiryMinutes < 1 || expiryMinutes > 1440)) {
        socket.send(
          JSON.stringify({
            type: "create_room_error",
            payload: { message: "Invalid expiry duration." },
          })
        );
        return;
      }

      // Validate max participants
      const validParticipants = [10, 20, 50, 100];
      const maxP = parseInt(maxParticipants);
      if (!validParticipants.includes(maxP)) {
        socket.send(
          JSON.stringify({
            type: "create_room_error",
            payload: { message: "Invalid participant limit." },
          })
        );
        return;
      }

      // Validate room type and PIN
      const isPrivate = roomType === "private";
      let hashedPin: string | null = null;

      if (isPrivate) {
        if (!pin || !confirmPin) {
          socket.send(
            JSON.stringify({
              type: "create_room_error",
              payload: { message: "PIN is required for private rooms." },
            })
          );
          return;
        }

        if (!/^\d{4}$/.test(pin)) {
          socket.send(
            JSON.stringify({
              type: "create_room_error",
              payload: { message: "PIN must be exactly 4 digits." },
            })
          );
          return;
        }

        if (pin !== confirmPin) {
          socket.send(
            JSON.stringify({
              type: "create_room_error",
              payload: { message: "PINs do not match." },
            })
          );
          return;
        }

        hashedPin = hashPin(pin);
      }

      // Generate unique room code
      const roomCode = generateUniqueRoomCode();
      const ownerId = parsedMessage.payload.userId || crypto.randomUUID();
      const now = Date.now();

      const room: Room = {
        roomCode,
        owner: ownerId,
        ownerName: name,
        private: isPrivate,
        pin: hashedPin,
        expiresAt: now + expiryMinutes * 60 * 1000,
        maxParticipants: maxP,
        createdAt: now,
        participants: 0,
        mediaFiles: [],
      };

      rooms.set(roomCode, room);
      console.log(`Room ${roomCode} created by ${name} (${ownerId})`);

      socket.send(
        JSON.stringify({
          type: "room_created",
          payload: {
            roomCode,
            ownerId,
            expiresAt: room.expiresAt,
            roomType: isPrivate ? "private" : "public",
            maxParticipants: maxP,
            createdAt: now,
          },
        })
      );
      return;
    }

    /* ── Validate PIN (for private rooms) ──────────────────────────────── */
    if (parsedMessage.type === "validate_pin") {
      const { roomCode, pin } = parsedMessage.payload || {};
      const code = (roomCode || "").toUpperCase().trim();

      if (!code || !pin) {
        socket.send(
          JSON.stringify({
            type: "pin_error",
            payload: { message: "Room code and PIN are required." },
          })
        );
        return;
      }

      // Rate limit check
      const rateLimitKey = `${socketId}:${code}`;
      const rateCheck = checkPinRateLimit(rateLimitKey);
      if (!rateCheck.allowed) {
        socket.send(
          JSON.stringify({
            type: "pin_error",
            payload: {
              message: `Too many attempts. Try again in ${rateCheck.retryAfter} seconds.`,
              rateLimited: true,
              retryAfter: rateCheck.retryAfter,
            },
          })
        );
        return;
      }

      const room = rooms.get(code);
      if (!room) {
        socket.send(
          JSON.stringify({
            type: "pin_error",
            payload: { message: "Room not found." },
          })
        );
        return;
      }

      if (room.expiresAt <= Date.now()) {
        rooms.delete(code);
        socket.send(
          JSON.stringify({
            type: "pin_error",
            payload: { message: "Room has expired." },
          })
        );
        return;
      }

      if (!room.private || !room.pin) {
        socket.send(
          JSON.stringify({
            type: "pin_validated",
            payload: { roomCode: code },
          })
        );
        return;
      }

      if (!/^\d{4}$/.test(pin)) {
        socket.send(
          JSON.stringify({
            type: "pin_error",
            payload: { message: "Incorrect PIN." },
          })
        );
        return;
      }

      if (hashPin(pin) !== room.pin) {
        socket.send(
          JSON.stringify({
            type: "pin_error",
            payload: { message: "Incorrect PIN." },
          })
        );
        return;
      }

      socket.send(
        JSON.stringify({
          type: "pin_validated",
          payload: { roomCode: code },
        })
      );
      return;
    }

    /* ── Check Room (before joining) ───────────────────────────────────── */
    if (parsedMessage.type === "check_room") {
      const { roomCode } = parsedMessage.payload || {};
      const code = (roomCode || "").toUpperCase().trim();

      if (!code) {
        socket.send(
          JSON.stringify({
            type: "check_room_result",
            payload: { exists: false, error: "Invalid room code." },
          })
        );
        return;
      }

      const room = rooms.get(code);
      if (!room) {
        socket.send(
          JSON.stringify({
            type: "check_room_result",
            payload: { exists: false, error: "Room not found." },
          })
        );
        return;
      }

      if (room.expiresAt <= Date.now()) {
        rooms.delete(code);
        socket.send(
          JSON.stringify({
            type: "check_room_result",
            payload: { exists: false, error: "Room has expired." },
          })
        );
        return;
      }

      const currentParticipants = getParticipantCount(code);
      if (currentParticipants >= room.maxParticipants) {
        socket.send(
          JSON.stringify({
            type: "check_room_result",
            payload: { exists: false, error: "Room is full." },
          })
        );
        return;
      }

      // Never reveal PIN or detailed info for private rooms until PIN is verified
      socket.send(
        JSON.stringify({
          type: "check_room_result",
          payload: {
            exists: true,
            isPrivate: room.private,
            roomCode: code,
          },
        })
      );
      return;
    }

    /* ── Join Room (existing behavior + room awareness) ────────────────── */
    if (parsedMessage.type === "join") {
      const roomId = (parsedMessage.payload?.roomId || "").toUpperCase().trim();
      const displayName = sanitize(parsedMessage.payload?.displayName || "Anonymous");
      const userId = parsedMessage.payload?.userId || "";

      // Check if this is a managed room
      const room = rooms.get(roomId);

      if (room) {
        // Validate room is not expired
        if (room.expiresAt <= Date.now()) {
          rooms.delete(roomId);
          socket.send(
            JSON.stringify({
              type: "join_error",
              payload: { message: "Room has expired." },
            })
          );
          return;
        }

        // Check participant count
        const currentParticipants = getParticipantCount(roomId);
        if (currentParticipants >= room.maxParticipants) {
          socket.send(
            JSON.stringify({
              type: "join_error",
              payload: { message: "Room is full." },
            })
          );
          return;
        }
      }

      // Add user to room (preserves existing behavior)
      allSockets.push({
        socket,
        roomId,
        displayName,
        userId,
      });

      // Send room info to the joiner
      if (room) {
        const participantCount = getParticipantCount(roomId);
        socket.send(
          JSON.stringify({
            type: "room_info",
            payload: {
              roomCode: roomId,
              expiresAt: room.expiresAt,
              maxParticipants: room.maxParticipants,
              currentParticipants: participantCount,
              isPrivate: room.private,
              ownerName: room.ownerName,
              ownerId: room.owner,
              isOwner: userId === room.owner,
            },
          })
        );

        // Notify room about new participant
        broadcastToRoom(roomId, {
          type: "participant_update",
          payload: {
            count: participantCount,
            action: "joined",
            displayName,
          },
        });
      }

      // Send join success
      socket.send(
        JSON.stringify({
          type: "join_success",
          payload: { roomId },
        })
      );
      return;
    }

    /* ── Chat Message (existing behavior — untouched) ──────────────────── */
    if (parsedMessage.type === "chat") {
      const currentUserRoom = allSockets.find(
        (x) => x.socket == socket
      )?.roomId;
      const senderSocket = allSockets.find((x) => x.socket === socket);

      if (!currentUserRoom) {
        return;
      }

      const rawMessage = parsedMessage.payload?.message;
      let outboundMessage = rawMessage;
      let recipientUser: User | undefined;

      if (typeof rawMessage === "string") {
        try {
          const messageData = JSON.parse(rawMessage);
          if (messageData && typeof messageData === "object") {
            const now = Date.now();
            const messageId = typeof messageData.messageId === "string"
              ? messageData.messageId
              : crypto.randomUUID();
            const viewOnce = Boolean(messageData.viewOnce);
            const selfDestruct = Boolean(messageData.selfDestruct) && !viewOnce;
            const requestedDeleteAfter = Number(messageData.deleteAfter);
            const deleteAfter = (viewOnce ? VALID_VIEW_ONCE_DELETE_AFTER : VALID_SELF_DESTRUCT_DELETE_AFTER).has(requestedDeleteAfter)
              ? requestedDeleteAfter
              : 15;

            const recipientId = typeof messageData.recipientId === "string" ? messageData.recipientId : undefined;
            recipientUser = recipientId
              ? allSockets.find((u) => u.roomId === currentUserRoom && u.userId === recipientId)
              : undefined;
            const isWhisper = Boolean(recipientUser);

            const enrichedMessage = {
              ...messageData,
              messageId,
              viewOnce,
              selfDestruct,
              deleteAfter: (viewOnce || selfDestruct) ? deleteAfter : undefined,
              createdAt: now,
              recipientId: recipientUser?.userId,
              recipientName: recipientUser?.displayName,
              private: isWhisper,
            };

            if (viewOnce) {
              const recipientViews: Record<string, ViewOnceRecipientState> = {};
              getRoomSocketUsers(currentUserRoom).forEach((user) => {
                recipientViews[user.userId || user.displayName || messageId] = {
                  opened: false,
                  deleted: false,
                };
              });

              const record: ViewOnceMessageRecord = {
                messageId,
                roomCode: currentUserRoom,
                sender: typeof enrichedMessage.sender === "string" ? enrichedMessage.sender : senderSocket?.displayName || "",
                senderId: typeof enrichedMessage.senderId === "string" ? enrichedMessage.senderId : senderSocket?.userId || "",
                timestamp: typeof enrichedMessage.timestamp === "number" ? enrichedMessage.timestamp : Date.now(),
                deleteAfterMs: deleteAfter * 1000,
                text: typeof enrichedMessage.text === "string" ? enrichedMessage.text : "",
                mediaUrl: typeof enrichedMessage.mediaUrl === "string" ? enrichedMessage.mediaUrl : undefined,
                mediaType: typeof enrichedMessage.mediaType === "string" ? enrichedMessage.mediaType : undefined,
                fileName: typeof enrichedMessage.fileName === "string" ? enrichedMessage.fileName : undefined,
                fileSize: typeof enrichedMessage.fileSize === "number" ? enrichedMessage.fileSize : undefined,
                fileExtension: typeof enrichedMessage.fileExtension === "string" ? enrichedMessage.fileExtension : undefined,
                mediaFilename:
                  typeof enrichedMessage.mediaUrl === "string" && enrichedMessage.mediaUrl.startsWith("/uploads/")
                    ? path.basename(enrichedMessage.mediaUrl)
                    : undefined,
                recipientViews,
              };

              viewOnceMessages.set(messageId, record);
              outboundMessage = buildHiddenViewOnceMessage(record);
            } else if (selfDestruct) {
              const record: SelfDestructMessageRecord = {
                messageId,
                roomCode: currentUserRoom,
                deleteAfterMs: deleteAfter * 1000,
                mediaFilename:
                  typeof enrichedMessage.mediaUrl === "string" && enrichedMessage.mediaUrl.startsWith("/uploads/")
                    ? path.basename(enrichedMessage.mediaUrl)
                    : undefined,
              };

              selfDestructMessages.set(messageId, record);
              scheduleSelfDestructDeletion(messageId);
              outboundMessage = JSON.stringify(enrichedMessage);
            } else {
              const record: RoomMessageRecord = {
                roomCode: currentUserRoom,
                messageId,
                sender: typeof enrichedMessage.sender === "string" ? enrichedMessage.sender : senderSocket?.displayName || "",
                senderId: typeof enrichedMessage.senderId === "string" ? enrichedMessage.senderId : senderSocket?.userId || "",
                timestamp: typeof enrichedMessage.timestamp === "number" ? enrichedMessage.timestamp : Date.now(),
                createdAt: now,
                text: typeof enrichedMessage.text === "string" ? enrichedMessage.text : "",
                content: typeof enrichedMessage.content === "string" ? enrichedMessage.content : (typeof enrichedMessage.text === "string" ? enrichedMessage.text : ""),
                type: typeof enrichedMessage.type === "string" ? enrichedMessage.type : "chat",
                viewOnce: false,
                selfDestruct: false,
                deleteAfter: undefined,
                mediaUrl: typeof enrichedMessage.mediaUrl === "string" ? enrichedMessage.mediaUrl : undefined,
                mediaType: typeof enrichedMessage.mediaType === "string" ? enrichedMessage.mediaType : undefined,
                fileName: typeof enrichedMessage.fileName === "string" ? enrichedMessage.fileName : undefined,
                fileSize: typeof enrichedMessage.fileSize === "number" ? enrichedMessage.fileSize : undefined,
                fileExtension: typeof enrichedMessage.fileExtension === "string" ? enrichedMessage.fileExtension : undefined,
                replyTo: typeof enrichedMessage.replyTo === "string" ? enrichedMessage.replyTo : undefined,
                replySender: typeof enrichedMessage.replySender === "string" ? enrichedMessage.replySender : undefined,
                replySenderId: typeof enrichedMessage.replySenderId === "string" ? enrichedMessage.replySenderId : undefined,
                replyText: typeof enrichedMessage.replyText === "string" ? enrichedMessage.replyText : undefined,
                recipientId: typeof enrichedMessage.recipientId === "string" ? enrichedMessage.recipientId : undefined,
                recipientName: typeof enrichedMessage.recipientName === "string" ? enrichedMessage.recipientName : undefined,
                private: isWhisper,
                edited: false,
                deleted: false,
              };

              addRoomMessage(record);
              outboundMessage = JSON.stringify(enrichedMessage);
            }
          }
        } catch {
          // Keep the original payload untouched when it is not JSON.
        }
      }

      if (recipientUser && typeof recipientUser.userId === "string") {
        const senderId = senderSocket?.userId;
        const targetIds = [senderId, recipientUser.userId].filter(Boolean) as string[];
        sendToRoomUserIds(currentUserRoom, outboundMessage, targetIds);
      } else {
        allSockets.forEach((user) => {
          if (user.roomId === currentUserRoom) {
            user.socket.send(outboundMessage);
          }
        });
      }

      return;
    }

    if (parsedMessage.type === "edit_message") {
      const { roomCode, messageId, text } = parsedMessage.payload || {};
      const requester = allSockets.find((u) => u.socket === socket);
      const code = (roomCode || requester?.roomId || "").toUpperCase().trim();
      const room = rooms.get(code);
      const message = typeof messageId === "string" ? findRoomMessage(code, messageId) : undefined;

      if (!requester || !room || !message || typeof text !== "string") {
        return;
      }

      if (requester.userId !== message.senderId && requester.userId !== room.owner) {
        return;
      }

      updateRoomMessage(code, messageId, {
        text,
        content: text,
        edited: true,
      });

      broadcastToRoom(code, {
        type: "message_edited",
        payload: {
          messageId,
          text,
          edited: true,
          senderId: message.senderId,
          sender: message.sender,
          timestamp: Date.now(),
        },
      });
      return;
    }

    if (parsedMessage.type === "delete_message") {
      const { roomCode, messageId } = parsedMessage.payload || {};
      const requester = allSockets.find((u) => u.socket === socket);
      const code = (roomCode || requester?.roomId || "").toUpperCase().trim();
      const room = rooms.get(code);
      const message = typeof messageId === "string" ? findRoomMessage(code, messageId) : undefined;

      if (!requester || !room || !message) {
        return;
      }

      if (requester.userId !== message.senderId && requester.userId !== room.owner) {
        return;
      }

      updateRoomMessage(code, messageId, { deleted: true });

      broadcastToRoom(code, {
        type: "message_deleted",
        payload: { messageId },
      });
      return;
    }

    if (parsedMessage.type === "reaction_added" || parsedMessage.type === "reaction_removed") {
      const { roomCode, messageId, reaction } = parsedMessage.payload || {};
      const requester = allSockets.find((u) => u.socket === socket);
      const code = (roomCode || requester?.roomId || "").toUpperCase().trim();
      const message = typeof messageId === "string" ? findRoomMessage(code, messageId) : undefined;

      if (!requester || !message || typeof reaction !== "string" || !reaction.trim()) {
        return;
      }

      if (parsedMessage.type === "reaction_added") {
        recordReaction(messageId, reaction, requester.userId || requester.displayName || "unknown");
      } else {
        removeReaction(messageId, reaction, requester.userId || requester.displayName || "unknown");
      }

      broadcastToRoom(code, {
        type: "message_reactions",
        payload: {
          messageId,
          reaction,
          counts: reactionCounts(messageId),
          userId: requester.userId,
          userName: requester.displayName,
          action: parsedMessage.type === "reaction_added" ? "added" : "removed",
        },
      });
      return;
    }

    if (parsedMessage.type === "pin_message") {
      const { roomCode, messageId } = parsedMessage.payload || {};
      const requester = allSockets.find((u) => u.socket === socket);
      const code = (roomCode || requester?.roomId || "").toUpperCase().trim();
      const room = rooms.get(code);
      const targetMessage = typeof messageId === "string" ? findRoomMessage(code, messageId) : undefined;

      if (!requester || !room || (messageId && !targetMessage)) {
        return;
      }

      if (requester.userId !== room.owner) {
        return;
      }

      const previousPinned = getRoomPinnedMessage(code);
      if (previousPinned) {
        updateRoomMessage(code, previousPinned, { pinned: false });
      }

      if (messageId) {
        setRoomPinnedMessage(code, messageId);
        updateRoomMessage(code, messageId, { pinned: true });
      } else {
        setRoomPinnedMessage(code, null);
      }

      broadcastToRoom(code, {
        type: "room_pin_updated",
        payload: { messageId: messageId || null },
      });
      return;
    }

    if (parsedMessage.type === "search_local") {
      const { roomCode, query } = parsedMessage.payload || {};
      const requester = allSockets.find((u) => u.socket === socket);
      const code = (roomCode || requester?.roomId || "").toUpperCase().trim();

      if (!requester || !code || typeof query !== "string") {
        return;
      }

      const results = searchRoomMessages(code, query);
      socket.send(
        JSON.stringify({
          type: "search_results",
          payload: { query, results },
        })
      );
      return;
    }

    if (parsedMessage.type === "view_once_reveal") {
      const { roomCode, messageId } = parsedMessage.payload || {};
      const requester = allSockets.find((u) => u.socket === socket);
      const code = (roomCode || requester?.roomId || "").toUpperCase().trim();

      if (!code || typeof messageId !== "string" || !requester) {
        return;
      }

      const record = viewOnceMessages.get(messageId);
      if (!record || record.roomCode !== code) {
        return;
      }

      const recipientKey = requester.userId || requester.displayName || messageId;
      const recipientState = getRecipientState(record, recipientKey);
      if (recipientState.deleted) {
        return;
      }

      if (!recipientState.opened) {
        recipientState.opened = true;
        recipientState.openedAt = Date.now();
        recipientState.token = crypto.randomUUID();

        const viewOncePayload: any = {
          messageId,
          openedAt: recipientState.openedAt,
          deleteAfter: record.deleteAfterMs / 1000,
          text: record.text,
          sender: record.sender,
          senderId: record.senderId,
          timestamp: record.timestamp,
          viewOnce: true,
        };

        if (record.mediaFilename) {
          viewOncePayload.mediaUrl = getPrivateViewOnceMediaUrl(messageId, recipientState.token);
          viewOncePayload.mediaType = record.mediaType;
          viewOncePayload.fileName = record.fileName;
          viewOncePayload.fileSize = record.fileSize;
          viewOncePayload.fileExtension = record.fileExtension;
        }

        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: "view_once_revealed",
            payload: viewOncePayload,
          }));
        }

        scheduleRecipientViewOnceDeletion(messageId, recipientKey);
      }

      return;
    }

    /* ── Get Participants ────────────────────────────────────────────────── */
    if (parsedMessage.type === "get_participants") {
      const { roomCode } = parsedMessage.payload || {};
      const code = (roomCode || "").toUpperCase().trim();
      const room = rooms.get(code);

      if (!room) return;

      const participants = allSockets
        .filter((u) => u.roomId === code)
        .map((u) => ({
          userId: u.userId,
          displayName: u.displayName,
          isOwner: u.userId === room.owner,
        }));

      participants.sort((a, b) => {
        if (a.isOwner) return -1;
        if (b.isOwner) return 1;
        return 0;
      });

      socket.send(
        JSON.stringify({
          type: "participants_list",
          payload: { participants },
        })
      );
      return;
    }

    /* ── Kick User ──────────────────────────────────────────────────────── */
    if (parsedMessage.type === "kick_user") {
      const { roomCode, targetUserId } = parsedMessage.payload || {};
      const code = (roomCode || "").toUpperCase().trim();
      const room = rooms.get(code);

      const requester = allSockets.find((u) => u.socket === socket);
      if (!requester || !room || room.owner !== requester.userId) return;

      if (targetUserId === room.owner) return; // Cannot kick self

      const targetUser = allSockets.find((u) => u.roomId === code && u.userId === targetUserId);
      if (targetUser) {
        targetUser.socket.send(
          JSON.stringify({
            type: "kicked",
            payload: { message: "You were removed by the Room Owner." },
          })
        );
        targetUser.socket.close();

        broadcastToRoom(code, {
          text: `${targetUser.displayName} was removed by the room owner.`,
          sender: "",
          senderId: "system",
          timestamp: Date.now(),
        });
      }
      return;
    }

    /* ── Destroy Room ────────────────────────────────────────────────────── */
    if (parsedMessage.type === "destroy_room") {
      const { roomCode } = parsedMessage.payload || {};
      const code = (roomCode || "").toUpperCase().trim();
      const room = rooms.get(code);

      const requester = allSockets.find((u) => u.socket === socket);
      if (!requester || !room || room.owner !== requester.userId) return;

      broadcastToRoom(code, {
        type: "room_destroyed",
        payload: { message: "This room has been destroyed by the owner." },
      });

      room.mediaFiles.forEach((file) => {
        fs.unlink(path.join(UPLOADS_DIR, file), (err) => {
          if (err) console.error("Error deleting file", file, err);
        });
      });

      clearViewOnceMessagesForRoom(code);
      clearSelfDestructMessagesForRoom(code);
      clearRoomMessagesForRoom(code);
      clearMessageReactionsForRoom(code);
      clearPinnedMessagesForRoom(code);

      allSockets = allSockets.filter((user) => {
        if (user.roomId === code) {
          try {
            user.socket.close();
          } catch { }
          return false;
        }
        return true;
      });

      rooms.delete(code);
      return;
    }

    /* ── Get Room Info ──────────────────────────────────────────────────── */
    if (parsedMessage.type === "get_room_info") {
      const { roomCode } = parsedMessage.payload || {};
      const code = (roomCode || "").toUpperCase().trim();
      const room = rooms.get(code);

      if (!room) {
        socket.send(
          JSON.stringify({
            type: "room_info",
            payload: { error: "Room not found." },
          })
        );
        return;
      }

      if (room.expiresAt <= Date.now()) {
        rooms.delete(code);
        socket.send(
          JSON.stringify({
            type: "room_info",
            payload: { error: "Room has expired." },
          })
        );
        return;
      }

      socket.send(
        JSON.stringify({
          type: "room_info",
          payload: {
            roomCode: code,
            expiresAt: room.expiresAt,
            maxParticipants: room.maxParticipants,
            currentParticipants: getParticipantCount(code),
            isPrivate: room.private,
            ownerName: room.ownerName,
            ownerId: room.owner,
          },
        })
      );
    }
  });

  socket.on("close", () => {
    console.log("user disconnected");
    userCount = userCount - 1;
    console.log(userCount);

    // Find which room the user was in before removing
    const disconnectedUser = allSockets.find((u) => u.socket === socket);

    // Remove from allSockets
    allSockets = allSockets.filter((x) => x.socket !== socket);

    // Notify remaining users about participant update
    if (disconnectedUser?.roomId) {
      const roomCode = disconnectedUser.roomId;
      const room = rooms.get(roomCode);
      if (room) {
        const participantCount = getParticipantCount(roomCode);
        broadcastToRoom(roomCode, {
          type: "participant_update",
          payload: {
            count: participantCount,
            action: "left",
            displayName: disconnectedUser.displayName || "Someone",
          },
        });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});