# Authentication — Chattr

## Overview

**Chattr has NO authentication system.**

There is no login, no signup, no user accounts, no sessions, no tokens, and no identity management of any kind. Every user is completely anonymous.

---

## Current State

| Feature | Status |
|---------|--------|
| Login | ❌ Not implemented |
| Signup / Registration | ❌ Not implemented |
| Guest access | ✅ Effectively yes — all users are "guests" |
| JWT tokens | ❌ Not implemented (library installed but unused) |
| Session management | ❌ Not implemented |
| Cookies | ❌ Not used |
| OAuth / Social login | ❌ Not implemented |
| Password hashing | ❌ Not applicable |
| Email verification | ❌ Not applicable |
| Password reset | ❌ Not applicable |
| Protected routes | ❌ None — all routes are public |
| Role-based access | ❌ Not implemented |
| User identification | ❌ Not implemented |
| Token refresh | ❌ Not applicable |
| Rate limiting | ❌ Not implemented |

---

## JWT Package (Unused)

The `jsonwebtoken` package (v9.0.2) is listed in `server/package.json` dependencies:

```json
{
  "dependencies": {
    "jsonwebtoken": "^9.0.2"
  }
}
```

However, it is **never imported or used** in any server source file. This suggests it was added with the intention of implementing authentication but was never utilized.

---

## User Identity

Users have **no identity whatsoever**:

- No usernames
- No display names
- No user IDs
- No session IDs
- No cookies
- No anonymous identifiers

This means:

1. **In the chat UI**, there is no way to distinguish which messages you sent versus which messages others sent. All messages appear as identical blue bubbles aligned to the right.

2. **On the server**, the only way to identify a user is by their WebSocket object reference (`socket`). This is used internally to find which room a sender belongs to, but no identifier is ever sent to other clients.

---

## Access Control

### Frontend Routes

| Route | Protection | Who Can Access |
|-------|-----------|----------------|
| `/` | None | Anyone |
| `/join` | None | Anyone |
| `/chat` | None | Anyone |

There are no route guards, no `PrivateRoute` components, and no redirect logic.

### WebSocket Connection

| Action | Protection | Who Can Perform |
|--------|-----------|-----------------|
| Connect | None | Anyone with the URL |
| Join a room | None | Any connected socket |
| Send a message | None | Any connected socket (must have joined a room) |
| Read messages | None | Any socket in the room |

---

## Room "Security"

Room access is controlled solely by knowledge of the 6-character room code:

- **Room code generation**: `Math.random().toString(36).substring(2, 8)` — **not cryptographically secure**
- **Room code validation**: None — any string is accepted
- **Room code brute-force protection**: None
- **Room discovery**: Not possible via the API (no room listing endpoint)
- **Room passwords**: Not implemented
- **Room expiry**: Not implemented

### Room Code Entropy Analysis

- Character set: 36 (a-z, 0-9)
- Length: 6 characters
- Total combinations: 36^6 = **2,176,782,336** (~2.18 billion)
- Effective entropy: ~31.7 bits

While 2.18 billion possibilities make random guessing impractical for casual users, the lack of rate limiting means an automated attack could potentially probe rooms. However, since rooms are ephemeral and the server doesn't reveal whether a room exists, blind brute-force attacks would only succeed if the attacker happens to find a room with active users.

---

## Recommendations for Adding Authentication

If authentication were to be added, the recommended approach would be:

### Phase 1: Anonymous Identity (Minimal)

1. Assign a random UUID to each WebSocket connection server-side
2. Include sender ID in broadcasted messages
3. Store "display name" per connection (user-chosen, not verified)

### Phase 2: Optional Accounts

1. Use `jsonwebtoken` (already installed) for JWT-based auth
2. Add `/api/auth/register` and `/api/auth/login` endpoints
3. Store users in a database with bcrypt-hashed passwords
4. Send JWT in WebSocket connection URL or first message
5. Validate JWT on WebSocket connection

### Phase 3: Full Auth

1. Add refresh tokens
2. Add email verification
3. Add OAuth providers (Google, GitHub)
4. Add rate limiting on auth endpoints
5. Add session management
6. Add role-based access (room admin, moderator)
