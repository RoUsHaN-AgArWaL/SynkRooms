# 🔐 SynkRooms

### Fast. Anonymous. Private.

**SynkRooms** is a real-time, privacy-focused temporary chat platform built for conversations that don't need to become permanent.

Create a room, share the code, chat anonymously, exchange media, and leave. Rooms are designed to be temporary, with features such as private PIN-protected rooms, disappearing messages, view-once content, and private messages between selected participants.

> **No account. No permanent profile. No unnecessary footprint.**

---

## ✨ Why SynkRooms?

Most messaging platforms are designed to **keep everything**.

SynkRooms is designed for conversations that you **don't want to keep forever**.

Whether you're sharing something privately, having a quick anonymous conversation, sending a temporary file, or creating a room for a short-lived discussion, SynkRooms keeps the experience simple and temporary.

---

## 🚀 Features

### 🏠 Temporary Rooms

Create a room instantly without creating an account.

* Public rooms
* Private rooms
* 4-digit PIN protection
* Room expiry
* Room owner
* Room code sharing
* Instant room destruction

### 💬 Real-Time Messaging

Powered by WebSockets for fast communication.

* Real-time messages
* Anonymous display names
* Online participant count
* Message timestamps
* Emoji reactions
* Message search
* Pinned messages
* Reply to messages
* Message grouping

### 🔒 Privacy-Focused Messaging

Send messages to specific participants using **Private Whisper**.

```text
Send To
├── Everyone
├── Anonymous Rahul
├── Anonymous Akash
└── Anonymous Priya
```

A private message is delivered only to the sender and selected recipient.

Other participants don't receive or see the message.

### 👁️ View Once

Send content that can be opened only once.

Supported content includes:

* Text
* Images
* Videos
* Files

Once opened, the content becomes unavailable according to the configured view-once behavior.

### ⏳ Self-Destruct

Messages and supported attachments can automatically disappear after a configured duration.

Example:

```text
7 seconds
15 seconds
20 seconds
...
```

### 📎 Media Sharing

Share temporary content directly inside a room.

* 🖼️ Images
* 🎥 Videos
* 📁 Files

### 👥 Participants

See who is currently inside the room.

Participants are displayed using anonymous identities while still allowing users to distinguish between different people.

### 👑 Room Owner Controls

The room owner can manage the room and its lifecycle.

* View participants
* Kick participants
* Destroy the room
* Manage room settings

### 🔗 Room Sharing

Share a room using its temporary room code.

```text
Room Code: X7G9P2
```

### 📱 Responsive

Designed to work across:

* Desktop
* Laptop
* Tablet
* Mobile

---

# 🧠 How It Works

```text
Create Room
     │
     ▼
Get Room Code
     │
     ▼
Share Code
     │
     ▼
Others Join
     │
     ▼
Anonymous Conversation
     │
     ├── Text
     ├── Images
     ├── Videos
     ├── Files
     ├── View Once
     ├── Self Destruct
     └── Private Whisper
     │
     ▼
Leave / Expire / Destroy
     │
     ▼
Temporary Room Ends
```

---

# 🛠️ Tech Stack

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* Framer Motion
* React Icons

## Real-Time Communication

* WebSocket
* Node.js
* Express
* `ws`

## Architecture

```text
┌───────────────────────────┐
│       SynkRooms UI        │
│       React + Vite        │
└─────────────┬─────────────┘
              │
              │ WebSocket
              ▼
┌───────────────────────────┐
│      SynkRooms Server     │
│      Node + Express       │
│      WebSocket (ws)       │
└─────────────┬─────────────┘
              │
              ▼
       Room / User State
```

---

# 📂 Project Structure

```text
SynkRooms/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── ...
│   │
│   ├── public/
│   ├── package.json
│   └── ...
│
├── server/
│   ├── src/
│   ├── package.json
│   └── ...
│
├── .gitignore
├── README.md
└── ...
```

---

# ⚡ Getting Started

## Prerequisites

Make sure you have installed:

* Node.js 18+
* npm

Check your versions:

```bash
node --version
npm --version
```

---

## 1. Clone

```bash
git clone https://github.com/YOUR_USERNAME/SynkRooms.git
cd SynkRooms
```

---

## 2. Install Frontend

```bash
cd client
npm install
```

---

## 3. Install Backend

Open another terminal:

```bash
cd server
npm install
```

---

## 4. Environment Variables

Create the required environment files using the project's `.env.example` files.

Never commit real secrets.

Example:

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

Use your actual production endpoints when deploying.

---

# ▶️ Run Locally

### Start Server

```bash
cd server
npm run dev
```

### Start Client

```bash
cd client
npm run dev
```

Then open the local frontend URL shown by Vite.

---

# 🔐 Security Philosophy

SynkRooms is built around a simple principle:

> **Temporary conversations should remain temporary.**

The platform minimizes the need for persistent identity and focuses on short-lived rooms.

Important security principles include:

* No unnecessary account creation
* Server-side room permissions
* PIN-protected rooms
* Owner-only room controls
* Recipient validation for private messages
* Temporary room lifecycle
* Controlled media visibility
* Server-side validation of sensitive operations

### Important

SynkRooms should **not** be described as "perfectly secure", "fully anonymous", or "military-grade encryption" unless those claims have been independently verified.

Privacy and security depend on the deployment environment, infrastructure, logging configuration, transport security, media storage, and server implementation.

---

# 🌐 Deployment

SynkRooms can be deployed using a frontend hosting platform and a Node.js WebSocket server.

Typical architecture:

```text
                   Internet
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
   Frontend Hosting         WebSocket Server
          │                       │
          │                       │
          └───────────┬───────────┘
                      │
                 SynkRooms
```

Make sure your production deployment uses:

* HTTPS
* Secure WebSocket (`wss://`)
* Proper CORS configuration
* Environment variables
* Production secrets
* Server-side validation
* Appropriate rate limiting

---

# 🧪 Testing Checklist

Before deploying changes, verify:

```text
[ ] Create public room
[ ] Create private room
[ ] Join using room code
[ ] Join private room with PIN
[ ] Send message
[ ] Receive message in real time
[ ] Reply to message
[ ] React to message
[ ] Pin message
[ ] Search messages
[ ] Send image
[ ] Send video
[ ] Send file
[ ] View Once
[ ] Self Destruct
[ ] Private Whisper
[ ] Participant list
[ ] Kick participant
[ ] Destroy room
[ ] Room expiry
[ ] Reconnect after network interruption
[ ] Mobile layout
```

---

# 🗺️ Roadmap

SynkRooms is intentionally focused on temporary communication.

### Completed

* [x] Temporary rooms
* [x] Public rooms
* [x] Private PIN rooms
* [x] Room expiry
* [x] Room owner
* [x] Participant management
* [x] Real-time messaging
* [x] Image sharing
* [x] Video sharing
* [x] File sharing
* [x] View Once
* [x] Self Destruct
* [x] Replies
* [x] Reactions
* [x] Search
* [x] Pinned messages
* [x] Private Whisper
* [x] Responsive interface

### Future

Possible future improvements:

* [ ] Advanced UI/UX polish
* [ ] Better media viewer
* [ ] More room controls
* [ ] Performance optimization
* [ ] Advanced moderation
* [ ] Collaborative room experiences

---

# 🤝 Contributing

Contributions are welcome.

If you'd like to improve SynkRooms:

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/amazing-feature
```

3. Make your changes
4. Test everything
5. Commit your changes

```bash
git commit -m "feat: add amazing feature"
```

6. Push the branch

```bash
git push origin feature/amazing-feature
```

7. Open a Pull Request

---

# 📜 License

This project is licensed under the **MIT License**.

See the `LICENSE` file for details.

---

# 💜 Philosophy

SynkRooms isn't trying to replace every messaging application.

It's built for a different kind of conversation.

```text
Create.
Connect.
Share.
Disappear.
```

**Fast. Anonymous. Private.**

---

## ⭐ Support the Project

If you find SynkRooms interesting:

⭐ Star the repository

🍴 Fork it

🐛 Report issues

💡 Suggest improvements

🤝 Contribute

---

**SynkRooms — Private Rooms. Zero History.**
