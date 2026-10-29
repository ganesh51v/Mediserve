import React, { useState } from "react";

export default function App() {
  // ─── Email Capture State ──────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle"); // "idle" | "submitting" | "success" | "error"
  const [serverMessage, setServerMessage] = useState("");

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // ─── Client-side Validation ───────────────────────────────────────────────
  const validateEmail = (value) => {
    if (!value || !value.trim()) {
      return "Please enter your work email address.";
    }
    // Standard RFC-5322 compatible email pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value.trim())) {
      return "Please enter a valid email address (e.g., name@company.com).";
    }
    return "";
  };

  const handleInputChange = (e) => {
    setEmail(e.target.value);
    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setStatus("submitting");

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to process subscription. Please try again.");
      }

      setStatus("success");
      setServerMessage(data.message || "Thank you! Your spot is reserved. Check your inbox shortly.");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Network error. Please try again later.");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setError("");
    setServerMessage("");
  };

  const scrollToCTA = () => {
    setIsMobileNavOpen(false);
    const el = document.getElementById("cta-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      const input = document.getElementById("cta-email-input");
      if (input) {
        setTimeout(() => input.focus(), 400);
      }
    }
  };

  return (
    <div className="page-shell">
      {/* ─── Accessibility: Skip to Main Content ──────────────────────────── */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* ─── Top Brand Header ─────────────────────────────────────────────── */}
      <header className="site-header">
        <div className="container header-inner">
          <a href="#hero" className="brand-logo" aria-label="PulseCore Home">
            <span className="logo-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </span>
            {/* PLACEHOLDER: replace with your brand name */}
            <span className="brand-name">PulseCore</span>
          </a>

          {/* Desktop Navigation */}
          <nav className="header-nav" aria-label="Main navigation">
            <a href="#problem" className="nav-link">Overview</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#proof" className="nav-link">Proof</a>
            <button type="button" onClick={scrollToCTA} className="btn btn-sm btn-primary">
              {/* PLACEHOLDER: replace with your header button label */}
              Get Early Access
            </button>
          </nav>

          {/* Mobile Navigation Toggle Button */}
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label={isMobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileNavOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setIsMobileNavOpen((prev) => !prev)}
          >
            {isMobileNavOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="24" height="24" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="24" height="24" aria-hidden="true">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>
        </div>

        {/* Collapsible Mobile Navigation Drawer */}
        <div
          id="mobile-nav-drawer"
          className={`mobile-nav-drawer ${isMobileNavOpen ? "is-open" : ""}`}
          aria-hidden={!isMobileNavOpen}
        >
          <nav className="mobile-nav-links" aria-label="Mobile menu">
            <a
              href="#problem"
              className="mobile-nav-link"
              onClick={() => setIsMobileNavOpen(false)}
            >
              Overview
            </a>
            <a
              href="#features"
              className="mobile-nav-link"
              onClick={() => setIsMobileNavOpen(false)}
            >
              Features
            </a>
            <a
              href="#proof"
              className="mobile-nav-link"
              onClick={() => setIsMobileNavOpen(false)}
            >
              Proof
            </a>
            <button
              type="button"
              onClick={scrollToCTA}
              className="btn btn-primary btn-mobile-cta"
            >
              {/* PLACEHOLDER: replace with your header button label */}
              Get Early Access &rarr;
            </button>
          </nav>
        </div>
      </header>

      <main id="main-content">
        {/* ─── Section 1: Hero ────────────────────────────────────────────── */}
        <section id="hero" className="section hero-section" aria-labelledby="hero-heading">
          <div className="container hero-container">
            {/* PLACEHOLDER: replace with your hero category or badge text */}
            <div className="badge">
              <span className="badge-dot" aria-hidden="true"></span>
              Enterprise Telemetry Infrastructure v2.4 Live
            </div>

            {/* PLACEHOLDER: replace with your product headline */}
            <h1 id="hero-heading" className="hero-title">
              Real-time telemetry and monitoring built for zero-downtime teams
            </h1>

            {/* PLACEHOLDER: replace with your product subheadline */}
            <p className="hero-subtitle">
              PulseCore unifies distributed hardware telemetry, clinical IoT signals, and cloud events into a single, tamper-evident stream. Detect anomalies in milliseconds before they impact users.
            </p>

            <div className="hero-actions">
              {/* Primary Call To Action Button */}
              <button
                type="button"
                onClick={scrollToCTA}
                className="btn btn-lg btn-primary"
                aria-label="Jump to early access registration"
              >
                {/* PLACEHOLDER: replace with your primary CTA button label */}
                Request Priority Access &rarr;
              </button>

              <a href="#problem" className="btn btn-lg btn-secondary">
                {/* PLACEHOLDER: replace with your secondary CTA button label */}
                Explore Architecture
              </a>
            </div>

            <div className="hero-guarantee">
              <span className="checkmark" aria-hidden="true">&#10003;</span>
              {/* PLACEHOLDER: replace with your trust reassurance micro-copy */}
              <span>No credit card required &middot; 14-day full staging sandbox &middot; SOC 2 Type II certified</span>
            </div>

            {/* ─── Responsive Visual Telemetry Console Mockup ────────────────── */}
            <div className="hero-preview-wrapper" aria-hidden="true">
              <div className="telemetry-mockup-card">
                <div className="mockup-header">
                  <div className="mockup-dots">
                    <span className="dot dot-red"></span>
                    <span className="dot dot-yellow"></span>
                    <span className="dot dot-green"></span>
                  </div>
                  <span className="mockup-title">pulse-stream // edge-telemetry-cluster-01</span>
                  <span className="mockup-status-badge">
                    <span className="status-indicator"></span>
                    Active Stream
                  </span>
                </div>
                <div className="mockup-metrics-row">
                  <div className="mockup-metric">
                    <span className="mockup-metric-label">Ingestion Rate</span>
                    <span className="mockup-metric-value">284,512 <span className="mockup-metric-unit">msg/s</span></span>
                  </div>
                  <div className="mockup-metric">
                    <span className="mockup-metric-label">P99 Propagation</span>
                    <span className="mockup-metric-value text-accent">11.4 <span className="mockup-metric-unit">ms</span></span>
                  </div>
                  <div className="mockup-metric">
                    <span className="mockup-metric-label">Connected Nodes</span>
                    <span className="mockup-metric-value">45,120 <span className="mockup-metric-unit">online</span></span>
                  </div>
                </div>
                <div className="mockup-chart-container">
                  <svg
                    viewBox="0 0 800 130"
                    preserveAspectRatio="none"
                    className="mockup-chart-svg"
                  >
                    <defs>
                      <linearGradient id="streamGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0d9488" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,95 Q80,55 160,70 T320,40 T480,60 T640,30 T800,45 L800,130 L0,130 Z"
                      fill="url(#streamGrad)"
                    />
                    <path
                      d="M0,95 Q80,55 160,70 T320,40 T480,60 T640,30 T800,45"
                      fill="none"
                      stroke="#0d9488"
                      strokeWidth="2.5"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Section 2: Core Value / Problem Solved ──────────────────────── */}
        <section id="problem" className="section problem-section" aria-labelledby="problem-heading">
          <div className="container">
            <div className="section-header text-center">
              {/* PLACEHOLDER: replace with your problem section eyebrow */}
              <p className="section-eyebrow">The Challenge</p>
              {/* PLACEHOLDER: replace with your problem / core value headline */}
              <h2 id="problem-heading" className="section-title">
                Traditional monitoring tools fragment when hardware meets high-concurrency cloud.
              </h2>
              {/* PLACEHOLDER: replace with your core value proposition explanation */}
              <p className="section-description">
                Engineering teams lose hours reconciling fragmented logs between edge microcontrollers, cellular modems, and backend microservices. PulseCore eliminates the blind spots by providing a single source of truth.
              </p>
            </div>

            <div className="comparison-grid">
              <div className="comparison-card card-before">
                <div className="card-badge card-badge-error">Before PulseCore</div>
                <h3 className="card-title">Fragmented &amp; Reactive</h3>
                <ul className="comparison-list">
                  {/* PLACEHOLDER: replace with your 'before / pain point' list items */}
                  <li>Multiple disconnected dashboards for edge sensors, MQTT brokers, and cloud databases.</li>
                  <li>Alert storms with 80% false positives that burn out on-call engineers.</li>
                  <li>Delayed discovery of offline hardware units until after customer escalations.</li>
                  <li>Unverifiable logs lacking cryptographic integrity for clinical or regulatory compliance.</li>
                </ul>
              </div>

              <div className="comparison-card card-after">
                <div className="card-badge card-badge-success">With PulseCore</div>
                <h3 className="card-title">Unified &amp; Autonomous</h3>
                <ul className="comparison-list">
                  {/* PLACEHOLDER: replace with your 'after / solution' list items */}
                  <li>Single glass pane correlating edge hardware heartbeat, battery, SIM state, and API latency.</li>
                  <li>Heuristic noise dampening with sub-second predictive threshold routing.</li>
                  <li>Immediate automated fallback failover triggers with multi-channel push dispatch.</li>
                  <li>Immutable append-only audit trail meeting 21 CFR Part 11 and HIPAA compliance.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Section 3: Features / Benefits ──────────────────────────────── */}
        <section id="features" className="section features-section" aria-labelledby="features-heading">
          <div className="container">
            <div className="section-header text-center">
              {/* PLACEHOLDER: replace with your features section eyebrow */}
              <p className="section-eyebrow">Key Capabilities</p>
              {/* PLACEHOLDER: replace with your features section headline */}
              <h2 id="features-heading" className="section-title">
                Built from the silicon up for mission-critical reliability
              </h2>
              {/* PLACEHOLDER: replace with your features section subheadline */}
              <p className="section-description">
                Everything required to govern, observe, and debug distributed equipment fleets at global scale.
              </p>
            </div>

            <div className="features-grid">
              {/* Feature 1 */}
              <article className="feature-card">
                <div className="feature-icon-wrapper" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                {/* PLACEHOLDER: replace with Feature 1 title */}
                <h3 className="feature-title">Sub-Millisecond Stream Ingestion</h3>
                {/* PLACEHOLDER: replace with Feature 1 description */}
                <p className="feature-body">
                  Ingest over 250,000 telemetry samples per second across raw TCP, MQTT, WebSockets, or REST without packet dropping or buffer exhaustion.
                </p>
              </article>

              {/* Feature 2 */}
              <article className="feature-card">
                <div className="feature-icon-wrapper" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                {/* PLACEHOLDER: replace with Feature 2 title */}
                <h3 className="feature-title">Digital Twin Device Simulation</h3>
                {/* PLACEHOLDER: replace with Feature 2 description */}
                <p className="feature-body">
                  Simulate firmware versions, sensor faults, low-battery states, and intermittent connectivity before pushing updates to physical field units.
                </p>
              </article>

              {/* Feature 3 */}
              <article className="feature-card">
                <div className="feature-icon-wrapper" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                {/* PLACEHOLDER: replace with Feature 3 title */}
                <h3 className="feature-title">Cryptographic Audit Ledger</h3>
                {/* PLACEHOLDER: replace with Feature 3 description */}
                <p className="feature-body">
                  Every dosage event, telemetry frame, and configuration mutation is hashed into a verifiable SHA-256 chain ready for compliance reviews.
                </p>
              </article>

              {/* Feature 4 */}
              <article className="feature-card">
                <div className="feature-icon-wrapper" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </div>
                {/* PLACEHOLDER: replace with Feature 4 title */}
                <h3 className="feature-title">Multi-Region Edge Topology</h3>
                {/* PLACEHOLDER: replace with Feature 4 description */}
                <p className="feature-body">
                  Automatic data residency compliance routing telemetry through regional hubs (US, EU, APAC) with localized failover and zero data leaks.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ─── Section 4: Social Proof / Trust Elements ─────────────────────── */}
        <section id="proof" className="section proof-section" aria-labelledby="proof-heading">
          <div className="container">
            <div className="section-header text-center">
              {/* PLACEHOLDER: replace with your social proof section eyebrow */}
              <p className="section-eyebrow">Trusted Across Continents</p>
              {/* PLACEHOLDER: replace with your social proof section headline */}
              <h2 id="proof-heading" className="section-title">
                Powering over 14 million daily telemetry events
              </h2>
            </div>

            {/* Metrics Grid */}
            <div className="metrics-grid">
              <div className="metric-box">
                {/* PLACEHOLDER: replace with Metric 1 value and label */}
                <span className="metric-number">99.995%</span>
                <span className="metric-label">Operational Ingestion Uptime</span>
              </div>
              <div className="metric-box">
                {/* PLACEHOLDER: replace with Metric 2 value and label */}
                <span className="metric-number">&lt; 14ms</span>
                <span className="metric-label">Global P99 Event Propagation</span>
              </div>
              <div className="metric-box">
                {/* PLACEHOLDER: replace with Metric 3 value and label */}
                <span className="metric-number">45,000+</span>
                <span className="metric-label">Connected Medical Dispensers</span>
              </div>
              <div className="metric-box">
                {/* PLACEHOLDER: replace with Metric 4 value and label */}
                <span className="metric-number">Zero</span>
                <span className="metric-label">Data Breaches or Halted Audits</span>
              </div>
            </div>

            {/* Testimonials */}
            <div className="testimonials-grid">
              {/* Testimonial 1 */}
              <blockquote className="testimonial-card">
                {/* PLACEHOLDER: replace with Testimonial 1 quote */}
                <p className="testimonial-quote">
                  &ldquo;PulseCore eliminated our team’s late-night debugging marathons. When our medical dispensers run low or experience dispensing anomalies, our clinical supervisors know before the patient even reports it.&rdquo;
                </p>
                <footer className="testimonial-author">
                  <div className="author-avatar" aria-hidden="true">DR</div>
                  <div>
                    {/* PLACEHOLDER: replace with Testimonial 1 author name and title */}
                    <div className="author-name">Dr. Elena Rostova</div>
                    <div className="author-role">Chief Medical Technology Officer, BioCare Global</div>
                  </div>
                </footer>
              </blockquote>

              {/* Testimonial 2 */}
              <blockquote className="testimonial-card">
                {/* PLACEHOLDER: replace with Testimonial 2 quote */}
                <p className="testimonial-quote">
                  &ldquo;The cryptographic audit trail made our FDA Part 11 certification effortless. The audit team pulled verifiable proof of every medication event in minutes rather than weeks.&rdquo;
                </p>
                <footer className="testimonial-author">
                  <div className="author-avatar" aria-hidden="true">MK</div>
                  <div>
                    {/* PLACEHOLDER: replace with Testimonial 2 author name and title */}
                    <div className="author-name">Marcus Kim</div>
                    <div className="author-role">VP of Embedded Systems, MedEquip Dynamics</div>
                  </div>
                </footer>
              </blockquote>
            </div>

            {/* Trust Badges / Partner Strip */}
            <div className="trust-strip" aria-label="Certifications and standards">
              {/* PLACEHOLDER: replace with your partner or compliance badges */}
              <span className="trust-badge">SOC 2 Type II</span>
              <span className="trust-badge">HIPAA Compliant</span>
              <span className="trust-badge">FDA 21 CFR Part 11 Ready</span>
              <span className="trust-badge">ISO 27001 Certified</span>
              <span className="trust-badge">GDPR Data Shield</span>
            </div>
          </div>
        </section>

        {/* ─── Section 5: Closing Call-To-Action (Functional CTA) ───────────── */}
        <section id="cta-section" className="section cta-section" aria-labelledby="cta-heading">
          <div className="container cta-container">
            <div className="cta-card">
              <div className="cta-header text-center">
                {/* PLACEHOLDER: replace with your closing call-to-action headline */}
                <h2 id="cta-heading" className="cta-title">
                  Ready to modernize your hardware telemetry?
                </h2>
                {/* PLACEHOLDER: replace with your closing CTA supporting copy */}
                <p className="cta-subtitle">
                  Join our technical pilot. Deploy our lightweight SDK into your devices and experience unified, zero-latency telemetry in under 15 minutes.
                </p>
              </div>

              {/* Email Capture Form / Success State */}
              <div className="cta-form-wrapper">
                {status === "success" ? (
                  <div className="alert-success" role="alert" aria-live="polite">
                    <div className="success-icon" aria-hidden="true">&#10003;</div>
                    <div className="success-content">
                      <h3 className="success-title">Submission Confirmed!</h3>
                      <p className="success-body">{serverMessage}</p>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="btn btn-sm btn-outline mt-3"
                      >
                        Submit another email
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="cta-form" noValidate>
                    <div className="form-group">
                      <label htmlFor="cta-email-input" className="form-label">
                        {/* PLACEHOLDER: replace with your input label text */}
                        Work Email Address <span className="required-mark" aria-hidden="true">*</span>
                      </label>
                      <div className="input-row">
                        <input
                          id="cta-email-input"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          value={email}
                          onChange={handleInputChange}
                          placeholder="e.g. alex@healthtech.com"
                          className={`form-input ${error ? "input-error" : ""}`}
                          aria-invalid={error ? "true" : "false"}
                          aria-describedby={error ? "cta-email-error" : undefined}
                          disabled={status === "submitting"}
                        />
                        <button
                          type="submit"
                          className="btn btn-primary btn-submit"
                          disabled={status === "submitting"}
                        >
                          {status === "submitting" ? (
                            <span className="btn-loading">
                              <span className="spinner" aria-hidden="true"></span>
                              Reserving...
                            </span>
                          ) : (
                            /* PLACEHOLDER: replace with your form submit button text */
                            "Get Immediate Access"
                          )}
                        </button>
                      </div>

                      {/* Client-side Inline Error Message */}
                      {error ? (
                        <p id="cta-email-error" className="error-message" role="alert" aria-live="assertive">
                          {error}
                        </p>
                      ) : null}
                    </div>

                    <p className="form-disclaimer">
                      {/* PLACEHOLDER: replace with your privacy or spam reassurance text */}
                      We respect your privacy. No spam, ever. Unsubscribe at any time with one click.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <span className="brand-name">PulseCore Systems</span>
            {/* PLACEHOLDER: replace with your footer tagline */}
            <p className="footer-tagline">
              Precision telemetry and automated hardware fleet governance.
            </p>
          </div>

          <div className="footer-links">
            <a href="#hero">Back to Top</a>
            <a href="#problem">Overview</a>
            <a href="#features">Features</a>
            {/* PLACEHOLDER: replace with your contact email */}
            <a href="mailto:support@pulsecore.example">support@pulsecore.example</a>
          </div>
        </div>

        <div className="container footer-bottom">
          {/* PLACEHOLDER: replace with your company copyright */}
          <p>&copy; {new Date().getFullYear()} PulseCore Technologies Inc. All rights reserved.</p>
          <p className="footer-note">Telemetry platform designed for mission-critical engineering.</p>
        </div>
      </footer>
    </div>
  );
}
