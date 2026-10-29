# PulseCore — Single-Page Marketing Landing Page

A complete, runnable single-page marketing landing page built with **React** and served by a minimal **Node.js (Express)** server.

---

## Quick Start (Run Locally)

### 1. Install Dependencies
```bash
cd marketing-landing-page
npm install
```

### 2. Build the Production Client
```bash
npm run build
```

### 3. Start the Server
```bash
npm start
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser.

> **Development Mode (with live hot reload):**
> ```bash
> # In terminal 1 (start backend API):
> node server.js
>
> # In terminal 2 (start Vite dev server):
> npm run dev
> ```
> Open **[http://localhost:5173](http://localhost:5173)** (API requests to `/api/*` are automatically proxied to port 5000).

---

## Storage & Lead Capture
- **Storage Location:** Submissions are automatically appended to `marketing-landing-page/submissions.json`.
- **Console Log:** Each capture logs `[LEAD CAPTURED] ID: lead_... | Email: ...` to standard output.
- **Inspect Leads in Browser:** Navigate to `http://localhost:5000/api/submissions` to see all stored leads in JSON.

---

## Sections to Customize (Placeholders)

Search for `PLACEHOLDER:` in `src/App.jsx` and `index.html` to customize the copy:

| Section | Placeholder Tag in `App.jsx` | Description |
| :--- | :--- | :--- |
| **Site Head** | `<!-- PLACEHOLDER: replace with your site title and meta description -->` | Located in `index.html` |
| **Header** | `// PLACEHOLDER: replace with your brand name` | Top navbar brand text & logo |
| **Hero Badge** | `// PLACEHOLDER: replace with your hero category or badge text` | Eyebrow pill above hero title |
| **Hero Title** | `// PLACEHOLDER: replace with your product headline` | Main `<h1>` headline |
| **Hero Subtitle** | `// PLACEHOLDER: replace with your product subheadline` | Supporting paragraph under hero |
| **Hero CTAs** | `// PLACEHOLDER: replace with your primary CTA button label` | Primary & secondary action buttons |
| **Hero Guarantee** | `// PLACEHOLDER: replace with your trust reassurance micro-copy` | Guarantee text below hero buttons |
| **Problem Section** | `// PLACEHOLDER: replace with your problem / core value headline` | Section title & core value explanation |
| **Comparison Cards** | `// PLACEHOLDER: replace with your 'before / pain point' list items` | Before vs. After bullet points |
| **Features Section** | `// PLACEHOLDER: replace with Feature 1/2/3/4 title & description` | 4 benefit cards with SVG icons |
| **Social Proof** | `// PLACEHOLDER: replace with your key metrics / trust stats` | 4 statistical metric boxes |
| **Testimonials** | `// PLACEHOLDER: replace with your customer testimonials` | Quotes, author names, and roles |
| **Trust Badges** | `// PLACEHOLDER: replace with your partner or client logos` | Compliance & accreditation badges |
| **Closing CTA** | `// PLACEHOLDER: replace with your closing call-to-action headline` | Final conversion title & description |
| **Form Labels** | `// PLACEHOLDER: replace with your input label text` | Email input label & button text |
| **Footer** | `// PLACEHOLDER: replace with your contact email and footer links` | Footer links, email, & copyright |
