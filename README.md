# 💻 Harshit Garg — Personal Portfolio & AI Systems Architect

> **AI Systems Architect & Full-Stack Platform Builder** | Computer Science @ UMD (ML Track)
> 
> A high-performance, visually stunning developer portfolio and personal website. Designed with modern aesthetics, premium CSS micro-animations, glassmorphic UI components, a Git-style VCS, administrative User Management, and a context-aware AI assistant.

---

## 🚀 Key Features

### 1. 🎛️ Premium Sticky Scroll Experience
- **Interactive Work History**: A bespoke, sticky scroll section for job timelines that locks down during page navigation.
- **Staggered Animations**: Visual highlights fade and translate sequentially as the user scrolls, tracking experience cards dynamically.
- **Monospace Nav Dots**: Direct timeline jumps with active glows and indicator counters.

### 2. 📸 Center-Aligned Photo Strip & Carousel Modal
- **Dynamic Grid Strip**: Prominent photo showcase with dedicated viewport scaling, tailored margins, and active-transform highlights.
- **Interactive Carousel**: Full-screen modal overlay using custom glassmorphic blur filters, keyboard controls (`Esc`, `←`, `→`), touch swipe thresholds, and dot navigations.
- **Unique Backdrops**: Custom radial blur lighting layers that automatically match the color palette of the active photo.

### 3. 🎨 Visual System & Theme Architecture
- **Curated Color Palettes**: Smooth gradients, deep space background tones, and styled glows (`--purple`, `--grad-text`).
- **Google Fonts Typography**: Built on **Space Grotesk** (headings) and **Inter** (body text) for professional, editorial readability.
- **SEO & Layout Structure**: Integrated HTML5 semantics, metadata, and custom EJS views optimized for fast rendering on edge serverless functions.

### 4. 🌳 Git-Style Version Control System (VCS) for CMS
- **DAG Revision Tree**: Full git-like commit tree with branching, immutable commit snapshots, and merge request workflows.
- **Monaco Diff Viewer**: Side-by-side visual diff comparisons between unstaged editor states and any commit history.
- **Merge Request Review Gate**: Admin controls to view diffs, approve merges, or close pull requests from draft branches into `main`.

### 5. 👥 User Management & Passkey Auth
- **4-Step User Creation Wizard**: Administrative user accounts setup (Account details, Password setup, Email alerts, Review).
- **Passkey Support**: WebAuthn/FIDO2 passkey integration for passwordless logins.
- **Privilege Roles**: Segmented roles (`ADMIN`, `EDITOR`, `VIEWER`) restricting CMS editing and administrative tools.

### 6. 📜 Dual-Database Audit Logger
- **Fast Local Writes**: Synchronously logs all administrative actions locally.
- **Async Remote Sync**: Asynchronously syncs logs to a remote production PostgreSQL database to ensure zero latency blocking on UI transactions.
- **Detail Tracker**: Captures full actor credentials, targets, action types, and structured JSON change details.

### 7. 🤖 Context-Aware AI Portfolio Assistant
- **Vercel AI Gateway Integration**: Powered by `'openai/gpt-4o-mini'` via Vercel's unified gateway.
- **Resume QA**: In-memory PDF parser extracts Harshit's resume (`Harshit Garg -UMD.pdf`) on startup to answer questions about skills and education.
- **Page Context-Awareness**: Keeps track of page text content and URL to answer questions related to the active section.
- **Admin MCP Tools**: Exposes interactive, human-in-the-loop validation tools (list users, delete user, reset password, update role) with confirm/cancel cards in the chat UI.
- **Dual-Tiered Rate Limiter**: Strictly restricts public visitors to 5 requests/minute, and authenticated admins to 60 requests/minute.

### 8. 🔍 Advanced Audit Logs Filter Panel
- **Multi-Attribute Filters**: Filter logs by general search query, source category (User Management, AI Chatbot, System/Other), action, actor email, target email, AI page context, and date ranges.
- **Interactive UI Form**: Glassmorphic filter inputs directly above the table with persistent active tab loading.

---

## 🛠️ Technology Stack

- **Core & Logic**: Node.js, Express.js (v5), EJS View Engine, Prisma ORM
- **Database**: PostgreSQL (local & remote production via pg-pool/PrismaPg adapter)
- **AI Integration**: Vercel AI SDK, `@ai-sdk/gateway`, `pdf-parse` (pure JS)
- **Security**: WebAuthn (SimpleWebAuthn), `bcryptjs`, Cookie Session
- **Styling**: Pure CSS (Vanilla) with modular variables, CSS grid/flexbox, custom animations
- **Interactions**: Vanilla JS (observability trackers, swipe triggers, keybound events, Monaco diff editor)
- **Deployment**: Vercel Serverless Functions (`@vercel/node`) with dynamic `/tmp` fallback file uploads

---

## ⚙️ Installation & Local Development

### 1. Clone the Repository
```bash
git clone https://github.com/hgarg1/personal-portfolio.git
cd personal-portfolio
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables
Create a `.env` and `.env.local` file in the project root:
```env
# .env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://username:password@localhost:5432/portfolio_db"
SESSION_SECRET="your-session-secret"

# Gmail OAuth2 SMTP Settings (Optional - falls back to terminal mock-logging if omitted)
GMAIL_USER="your-email@gmail.com"
GMAIL_CLIENT_ID="your-oauth2-client-id"
GMAIL_CLIENT_SECRET="your-oauth2-client-secret"
GMAIL_REFRESH_TOKEN="your-oauth2-refresh-token"
```

```env
# .env.local
AI_GATEWAY_API_KEY="your-vercel-ai-gateway-api-key"
```

### 4. Database Setup & Sync
Generate the Prisma Client and sync the schema to your database:
```bash
npx prisma generate
npx prisma db push
```

### 5. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.


---

## 📬 Contact & Collaborations

- **Name**: Harshit Garg
- **Email**: [garg.archie@gmail.com](mailto:garg.archie@gmail.com)
- **GitHub**: [github.com/hgarg1](https://github.com/hgarg1)
- **Website**: [harshit-garg.com](https://www.harshit-garg.com)
