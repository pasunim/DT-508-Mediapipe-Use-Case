# Hand Gesture Game

เกมทายท่ามือแบบ Real-time โดยใช้ **MediaPipe Hands** ตรวจจับท่ามือผ่านกล้อง พร้อมระบบ Login, เก็บสถิติ และ Leaderboard

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Auth | NextAuth.js v5 beta (JWT + Credentials) |
| ORM | Prisma 7 |
| Database | PostgreSQL (Neon Serverless) |
| DB Adapter | @prisma/adapter-neon |
| Hand Tracking | MediaPipe Hands (CDN + SRI) |
| Password Hash | bcryptjs (cost factor 12) |
| Package Manager | Yarn |
| Container | Docker (multi-stage, non-root) |

---

## Features

- **Register / Login** — สมัครสมาชิกด้วย Email + Password พร้อม validation ทั้ง client และ server
- **MediaPipe Loading Gate** — ปุ่มเริ่มเกมจะ unlock หลังจาก MediaPipe โหลดจาก CDN สำเร็จเท่านั้น
- **Hand Gesture Detection** — ตรวจจับท่ามือ 6 ท่า Real-time ผ่านกล้อง (y-axis only, mirror-safe)
- **Practice Mode** — ซ้อมมือ 3 รอบก่อนเริ่มเกมจริง (ไม่นับคะแนน)
- **Countdown** — นับถอยหลัง Ready → 3 → 2 → 1 → GO! ก่อนเกมจริง
- **20 Rounds** — สุ่มท่ามือ 20 รอบ รอบละ 5 วินาที
- **Give Up** — กดยอมแพ้ได้ทุกเมื่อ บันทึกผลทันที
- **Result Screen** — สรุปคะแนน + เวลาที่ใช้แต่ละรอบ + auto-save ลง DB (กัน double-save ด้วย ref guard)
- **Profile** — ดูสถิติส่วนตัว (คะแนนสูงสุด, เฉลี่ย, ประวัติ 10 เกมล่าสุด)
- **Leaderboard** — อันดับ Top 20 จากคะแนนสูงสุด (revalidate ทุก 60 วินาที)
- **Mobile Responsive** — Bottom tab bar, camera stack vertically บน mobile

---

## Gesture List

| ไฟล์ภาพ | ท่า | วิธีทำ |
|---------|-----|--------|
| 1.png | Thumbs Up | โป้งชี้ขึ้น นิ้วอื่นปิดทั้งหมด |
| 2.png | Peace ✌️ | นิ้วชี้ + นิ้วกลางตั้ง นิ้วนาง + ก้อย + โป้งปิด |
| 3.png | Ok 👌 | โป้งแตะนิ้วชี้เป็นวงกลม นิ้วที่เหลือตั้งขึ้น |
| 4.png | สี่นิ้ว | 4 นิ้วตั้งขึ้น โป้งหุบเข้า |
| 5.png | Two Thumbs Up | สองมือ โป้งชี้ขึ้นพร้อมกัน |
| 6.png | กำหมัด | กำมือทุกนิ้ว โป้งพับเข้า |

> **หมายเหตุ**: ตรวจจับด้วย y-axis เท่านั้น ไม่สับสนเรื่อง mirror ของกล้อง

---

## Security

### CVE & Dependency
- `yarn resolutions` บังคับ `postcss >=8.5.10` (XSS via CSS stringify — CVE fixed)
- `yarn resolutions` บังคับ `@hono/node-server >=1.19.13` (middleware bypass — CVE fixed)
- รัน `yarn audit` → **0 vulnerabilities**

### HTTP Security Headers (ทุก route)
| Header | Value |
|--------|-------|
| Content-Security-Policy | default-src 'self'; script-src 'self' CDN เท่านั้น |
| X-Frame-Options | DENY |
| X-Content-Type-Options | nosniff |
| X-XSS-Protection | 1; mode=block |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | camera=self (ไม่อนุญาต mic/geo) |

### API Security
- **Rate Limiting** (in-memory sliding window, per-IP):
  - `/api/register` POST — 5 req / 15 min
  - `/api/auth/*` POST — 10 req / 10 min
  - `/api/game` POST — 25 req / 10 min
  - `/api/leaderboard` GET — 30 req / min
- **Server-side score recount** — ป้องกัน score tampering (client ส่งมาไม่ถูก server ปฏิเสธ)
- **Input validation** บน register: email regex, username regex (3-30 chars), password 8-128 chars
- **Game data validation**: whitelist gestureId, bound totalRounds ≤ 20, bound elapsedSec ≤ 300s
- **Constant-time auth**: bcrypt compare รันเสมอแม้ user ไม่มีในระบบ (ป้องกัน user enumeration timing attack)
- **Subresource Integrity (SRI)**: MediaPipe CDN scripts มี `integrity="sha384-..."` กัน supply-chain attack
- **Session**: JWT maxAge 7 วัน, secret จาก env
- **Password**: bcrypt cost factor 12 (เพิ่มจาก 10)

### Docker Security
- Multi-stage build (builder ≠ runner) — ไม่มี devDependencies ใน production image
- Non-root user `nextjs:nodejs` (uid 1001)
- Standalone output — minimal footprint
- Healthcheck built-in

---

## Project Structure

```
.
├── Dockerfile
├── .dockerignore
├── .env.example              # ตัวอย่าง env (ไม่มี secret จริง)
├── next.config.ts            # Security headers + standalone output
├── prisma/
│   └── schema.prisma
├── prisma.config.ts          # Prisma 7 datasource URL
└── src/
    ├── middleware.ts          # Rate limiting (per-IP sliding window)
    ├── app/
    │   ├── (auth)/
    │   │   ├── login/page.tsx
    │   │   └── register/page.tsx
    │   ├── (main)/
    │   │   ├── layout.tsx             # Auth guard + Navbar
    │   │   ├── game/
    │   │   │   ├── layout.tsx         # MediaPipe CDN scripts (SRI)
    │   │   │   ├── page.tsx
    │   │   │   └── GameClient.tsx     # Lobby + MediaPipe loading gate
    │   │   ├── profile/page.tsx
    │   │   └── leaderboard/page.tsx
    │   ├── api/
    │   │   ├── auth/[...nextauth]/route.ts
    │   │   ├── register/route.ts      # Validated, rate-limited
    │   │   ├── game/route.ts          # Server-side score recount
    │   │   └── leaderboard/route.ts
    │   └── page.tsx                   # Redirect → /leaderboard or /login
    ├── components/
    │   ├── GestureGame.tsx            # MediaPipe + gesture logic (ref-based, no stale closure)
    │   ├── GameResult.tsx             # Result screen (double-save protected)
    │   └── Navbar.tsx                 # Top bar + mobile bottom tab bar
    └── lib/
        ├── prisma.ts                  # PrismaClient singleton (Neon adapter)
        ├── auth.ts                    # NextAuth config (constant-time auth)
        └── rateLimit.ts              # Sliding-window rate limiter
```

---

## Database Schema

```prisma
model User {
  id           String       @id @default(cuid())
  email        String       @unique
  username     String       @unique
  passwordHash String
  avatarColor  String       @default("#7c3aed")
  createdAt    DateTime     @default(now())
  gameResults  GameResult[]
}

model GameResult {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  score       Int
  totalRounds Int
  playedAt    DateTime      @default(now())
  rounds      RoundResult[]
}

model RoundResult {
  id           String     @id @default(cuid())
  gameResultId String
  gameResult   GameResult @relation(fields: [gameResultId], references: [id], onDelete: Cascade)
  gestureId    Int
  gestureName  String
  correct      Boolean
  elapsedSec   Float?     // null = หมดเวลา
}
```

---

## Getting Started

### 1. Clone & ติดตั้ง dependencies

```bash
git clone https://github.com/pasunim/DT-508-Mediapipe-Use-Case.git
cd DT-508-Mediapipe-Use-Case
yarn install
```

### 2. ตั้งค่า Environment Variables

```bash
cp .env.example .env
```

แก้ไข `.env`:

```env
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
NEXTAUTH_SECRET="สร้าง random string ยาว 32+ ตัวอักษร"
NEXTAUTH_URL="http://localhost:3000"
```

สร้าง NEXTAUTH_SECRET แบบ secure:
```bash
openssl rand -base64 32
```

### 3. Migrate Database

```bash
yarn prisma migrate dev --name init
yarn prisma generate
```

### 4. รัน Dev Server

```bash
yarn dev
```

เปิด [http://localhost:3000](http://localhost:3000)

---

## Docker Deployment

### Build & Run

```bash
docker build -t gesture-game .

docker run -d \
  --name gesture-game \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_SECRET="your-secret" \
  -e NEXTAUTH_URL="https://yourdomain.com" \
  gesture-game
```

### Docker Compose (แนะนำ)

```yaml
version: "3.9"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/leaderboard"]
      interval: 30s
      timeout: 10s
      retries: 3
```

```bash
docker compose up -d
```

---

## API Routes

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/register` | สมัครสมาชิก (rate: 5/15min) | ไม่ |
| POST | `/api/auth/[...nextauth]` | Login / Session (rate: 10/10min) | — |
| POST | `/api/game` | บันทึกผลเกม พร้อม server-side recount (rate: 25/10min) | ใช่ |
| GET | `/api/game` | ประวัติเกมของตัวเอง 20 รายการล่าสุด | ใช่ |
| GET | `/api/leaderboard` | Top 20 by best score (rate: 30/min) | ไม่ |

### Error Responses

| Status | ความหมาย |
|--------|----------|
| 400 | Invalid / missing fields |
| 401 | Not authenticated |
| 409 | Email / Username ซ้ำ |
| 429 | Rate limit exceeded (ดู `Retry-After` header) |
| 500 | Server error |

---

## Penetration Testing Notes

สิ่งที่ระบบป้องกันแล้ว:
- **Brute force login** — rate limit 10/10min per IP + constant-time compare
- **Account enumeration** — auth response time เท่ากันไม่ว่า email มีหรือไม่มีในระบบ
- **Score manipulation** — server recounts จาก rounds array จริง (ไม่เชื่อ client-sent score)
- **CSRF** — NextAuth JWT ไม่ใช้ cookie session แบบ traditional, ใช้ `credentials: "include"` + SameSite
- **Clickjacking** — `X-Frame-Options: DENY`
- **XSS** — CSP จำกัด script-src + SRI บน CDN scripts
- **Supply chain** — SRI hashes บน MediaPipe CDN scripts
- **SQL Injection** — Prisma ORM ใช้ parameterized queries ทั้งหมด
- **Sensitive data exposure** — bcrypt hash ไม่เคย return กลับไปยัง client, `select` explicit ทุก query
- **Dependency CVEs** — yarn resolutions force-patch, `yarn audit` = 0 vulnerabilities

---

## Notes

- MediaPipe โหลดจาก CDN (`cdn.jsdelivr.net`) — bundle size ใหญ่มากถ้าใส่เป็น npm package
- ต้องอนุญาตกล้องในเบราว์เซอร์เมื่อ prompt ขึ้นมา (HTTPS required ใน production)
- Gesture images อยู่ที่ `public/images/1.png` ถึง `6.png`
- Rate limiter เป็น in-memory — ถ้า scale เป็น multi-instance ให้เปลี่ยนเป็น Redis (`@upstash/ratelimit`)
- HTML เวอร์ชันเดิมเก็บไว้ที่ `_note/` (ไม่อยู่ใน git)
