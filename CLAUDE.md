# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Run production server
npm run lint     # Run ESLint
```

Bootstrap the first admin user (idempotent, run once after setting up DB):
```
POST /api/seed-admin
```

## Environment Variables

Create `.env.local` with:
```
MONGODB_URI=mongodb+srv://[user]:[password]@[cluster]/?appName=[name]
JWT_SECRET=supersecretkey
```

## Architecture

This is a Next.js App Router banking system with two roles: **ADMIN** and **USER**.

### Role Separation

- **Users** log in to view their own balance, transactions, and notices. They can download a PDF of transactions.
- **Admins** manage all users (CRUD), apply individual or bulk transactions (profit/loss distribution), view login audit logs, and post notices.

Both roles share the same login page (`/login`). After login, the client stores `token`, `role`, and `userId` in localStorage. The JWT payload is `{ userId, role }` and expires in **40 minutes**.

### Data Flow

**Auth:** `POST /api/auth/login` → bcrypt compare → sign JWT → `LoginActivity.create()` → client stores token.

**User dashboard:** fetches own balance and transactions via `/api/admin/users/[userId]/balance` and `/api/admin/users/[userId]/transactions`. Server verifies `decoded.userId === id` to prevent access to other users' data.

**Admin operations:** all `/api/admin/*` routes are protected by `adminOnly(req)` middleware that checks `role === "ADMIN"`.

### Key Directories

- `app/` — Next.js App Router pages and API routes
- `app/api/` — All backend logic (no separate server)
- `lib/` — `mongodb.ts` (singleton connection), `jwt.ts` (sign/verify), `auth.ts` (authenticate middleware), `adminAuth.ts` (role guard), `password.ts` (bcrypt helpers)
- `models/` — Mongoose schemas: `User`, `Account`, `Transaction`, `LoginActivity`, `Notice`

### Database Models

| Model | Key Fields |
|-------|-----------|
| `User` | name, email, password (hashed), role (`ADMIN`/`USER`), isActive |
| `Account` | userId (ref), balance |
| `Transaction` | accountId (ref), type (`CREDIT`/`DEBIT`), amount, description, createdBy (admin ref) |
| `LoginActivity` | userId (ref), status (`success`/`failed`/`wrong_password`), loginTime — indexed |
| `Notice` | message — single document (upsert pattern) |

### Notable Patterns

**Bulk profit/loss:** `POST /api/admin/bank` distributes an amount evenly across all active users using MongoDB bulk write.

**Soft deletes:** users are never deleted — only toggled via `isActive`. Bulk operations skip inactive users.

**MongoDB connection:** singleton pattern in `lib/mongodb.ts` caches the connection on the global object to survive hot module reloads.

**PDF export:** `jspdf` + `jspdf-autotable` generate a transaction report from the user dashboard.

**Pagination:** `GET /api/admin/login-activity` supports `page` and `limit` query params.


