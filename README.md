# 💻 Harshit Garg — Personal Portfolio & AI Systems Architect

> **AI Systems Architect & Full-Stack Platform Builder** | Computer Science @ UMD (ML Track)
> 
> A high-performance, visually stunning developer portfolio and personal website. Designed with modern aesthetics, premium CSS micro-animations, glassmorphic UI components, and custom interactive features.

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

---

## 🛠️ Technology Stack

- **Core & Logic**: Node.js, Express.js, EJS View Engine
- **Styling**: Pure CSS (Vanilla) with modular variables, CSS grid/flexbox, custom animations
- **Interactions**: Vanilla JS (observability trackers, swipe triggers, keybound events)
- **Deployment**: Vercel Serverless Functions (`@vercel/node`)

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

### 3. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🚢 Vercel Deployment

This project is configured to run out-of-the-box on the **Vercel Serverless** network.

The custom configuration in `vercel.json` maps incoming requests to our Express app and explicitly packages dynamic views and assets:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "app.js",
      "use": "@vercel/node",
      "config": {
        "includeFiles": ["views/**", "public/**"]
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "app.js"
    }
  ]
}
```

### Deploy using Vercel CLI
```bash
# Link and deploy to Vercel
vercel
# Promote deployment to production
vercel --prod
```

---

## 📬 Contact & Collaborations

- **Name**: Harshit Garg
- **Email**: [garg.archie@gmail.com](mailto:garg.archie@gmail.com)
- **GitHub**: [github.com/hgarg1](https://github.com/hgarg1)
- **Website**: [harshit-garg.com](https://www.harshit-garg.com)
