// frontend/shell-app/src/pages/LandingPage.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bolt as BoltIcon,
  EvStation as EvStationIcon,
  CalendarMonth as CalendarMonthIcon,
  EmojiEvents as EmojiEventsIcon,
  Savings as SavingsIcon,
  Speed as SpeedIcon,
  Shield as ShieldIcon,
  Nature as NatureIcon,
  ArrowForward as ArrowForwardIcon,
  Star as StarIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from "@mui/icons-material";

const ADMIN_URL = process.env.REACT_APP_ADMIN_URL || "http://localhost:3007";

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [visible, setVisible] = useState({});

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setVisible((p) => ({ ...p, [e.target.id]: true }));
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll("[data-animate]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const [currentSlide, setCurrentSlide] = useState(0);
  const testimonials = [
    { name: "Rahul S.", role: "Nexon EV Owner", text: "EV Saarthi made finding reliable chargers so easy! The Green Points system is just the cherry on top. I've saved thousands." },
    { name: "Priya M.", role: "Tiago EV Driver", text: "Booking a slot in advance saves me from waiting in long queues. The interface is stunning and so simple to use." },
    { name: "Amit K.", role: "MG ZS EV Owner", text: "I love how I can see exactly how much I'm saving compared to petrol. The rewards catalog is actually useful too!" },
    { name: "Sneha R.", role: "Ather 450X Rider", text: "Best app for EV owners in India hands down. Customer support is fantastic and the app never crashes." }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(s => (s + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const animClass = (id, base = "fadeUp") =>
    visible[id] ? `lp-${base} lp-visible` : `lp-${base}`;

  return (
    <div className="lp-root">
      <style>{landingCSS}</style>

      {/* ═══ NAVBAR ═══ */}
      <nav className={`lp-nav ${scrollY > 60 ? "lp-nav-solid" : ""}`}>
        <div className="lp-nav-inner">
          <div className="lp-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="lp-logo-icon"><BoltIcon style={{ fontSize: 22, color: "#fff" }} /></div>
            <span className="lp-logo-text">EV Saarthi</span>
          </div>
          <div className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#how">How It Works</a>
            <a href="#stats">Impact</a>
          </div>
          <div className="lp-nav-cta">
            <button className="lp-btn-ghost" onClick={() => window.location.href = `${ADMIN_URL}/staff-login`}>Staff Portal</button>
            <button className="lp-btn-primary" onClick={() => navigate("/login")}>
              Get Started <ArrowForwardIcon style={{ fontSize: 16 }} />
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="lp-hero">
        <div className="lp-hero-bg" />
        <div className="lp-hero-grid" style={{ transform: `translateY(${scrollY * 0.15}px)` }} />
        <div className="lp-hero-glow" />
        <div className="lp-hero-content">
          <div className="lp-hero-badge">🇮🇳 India's Smartest EV Companion</div>
          <h1 className="lp-hero-title">
            Drive <span className="lp-grad-text">Green</span>.<br />
            Save <span className="lp-gold-text">More</span>.<br />
            Earn Points.
          </h1>
          <p className="lp-hero-sub">
            Find nearby charging stations, book slots instantly, track your savings,
            and earn <strong>Green Points</strong> on every charge — all in one beautiful app.
          </p>
          <div className="lp-hero-btns">
            <button className="lp-btn-hero" onClick={() => navigate("/login")}>
              <BoltIcon style={{ fontSize: 20 }} /> Start Charging Free
            </button>
            <button className="lp-btn-hero-outline" onClick={() => navigate("/map")}>
              <EvStationIcon style={{ fontSize: 20 }} /> Explore Stations
            </button>
          </div>
          <div className="lp-hero-trust">
            <div className="lp-trust-item"><ShieldIcon style={{ fontSize: 14 }} /> Secure</div>
            <div className="lp-trust-dot" />
            <div className="lp-trust-item"><SpeedIcon style={{ fontSize: 14 }} /> Instant</div>
            <div className="lp-trust-dot" />
            <div className="lp-trust-item"><NatureIcon style={{ fontSize: 14 }} /> Eco-Friendly</div>
          </div>
        </div>
        <div className="lp-scroll-hint" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
          <ArrowDownIcon className="lp-bounce" />
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="lp-section">
        <div className="lp-container">
          <div id="feat-head" data-animate className={animClass("feat-head")}>
            <p className="lp-section-tag">Features</p>
            <h2 className="lp-section-title">Everything You Need for EV Charging</h2>
            <p className="lp-section-sub">From finding stations to earning rewards — we've got it all covered.</p>
          </div>
          <div className="lp-features-grid">
            {[
              { icon: <EvStationIcon />, title: "Find Stations", desc: "Locate nearby chargers on an interactive map with live availability updates.", color: "#16A34A", bg: "#DCFCE7" },
              { icon: <CalendarMonthIcon />, title: "Book Slots", desc: "Reserve your charging slot in advance — no waiting, no surprises.", color: "#3B82F6", bg: "#DBEAFE" },
              { icon: <EmojiEventsIcon />, title: "Earn Green Points", desc: "Get rewarded on every charge, referral, and review. Redeem for discounts.", color: "#EAB308", bg: "#FEF9C3" },
              { icon: <SavingsIcon />, title: "Track Savings", desc: "See exactly how much you're saving compared to petrol costs.", color: "#A855F7", bg: "#F3E8FF" },
              { icon: <ShieldIcon />, title: "Secure Payments", desc: "Razorpay-powered payments with full encryption and instant confirmations.", color: "#EF4444", bg: "#FEE2E2" },
              { icon: <NatureIcon />, title: "Go Carbon Neutral", desc: "Track your carbon offset and contribute to a greener future.", color: "#059669", bg: "#D1FAE5" },
            ].map((f, i) => (
              <div key={i} id={`feat-${i}`} data-animate className={`lp-feature-card ${animClass(`feat-${i}`)}`} style={{ animationDelay: `${i * 80}ms` }}>
                <div className="lp-feature-icon" style={{ background: f.bg, color: f.color }}>{f.icon}</div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how" className="lp-section lp-section-alt">
        <div className="lp-container">
          <div id="how-head" data-animate className={animClass("how-head")}>
            <p className="lp-section-tag">How It Works</p>
            <h2 className="lp-section-title">Charge in 3 Simple Steps</h2>
          </div>
          <div className="lp-steps">
            {[
              { num: "1", title: "Sign Up Free", desc: "Create your account with Google in seconds. Get 100 bonus Green Points instantly." },
              { num: "2", title: "Find & Book", desc: "Browse stations on the map, pick your time slot, and confirm with Razorpay." },
              { num: "3", title: "Charge & Earn", desc: "Plug in, charge up, earn Green Points. Leave a review for bonus rewards!" },
            ].map((s, i) => (
              <div key={i} id={`step-${i}`} data-animate className={`lp-step ${animClass(`step-${i}`)}`} style={{ animationDelay: `${i * 120}ms` }}>
                <div className="lp-step-num">{s.num}</div>
                <h3 className="lp-step-title">{s.title}</h3>
                <p className="lp-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section id="stats" className="lp-section lp-stats-section">
        <div className="lp-container">
          <div id="stats-head" data-animate className={animClass("stats-head")}>
            <p className="lp-section-tag" style={{ color: "#EAB308" }}>Our Impact</p>
            <h2 className="lp-section-title" style={{ color: "#fff" }}>Numbers That Speak</h2>
          </div>
          <div className="lp-stats-grid">
            {[
              { val: "500+", label: "Charging Stations", icon: <EvStationIcon /> },
              { val: "2,000+", label: "Happy Users", icon: <EmojiEventsIcon /> },
              { val: "₹0", label: "Platform Fee", icon: <SavingsIcon /> },
              { val: "5★", label: "User Rating", icon: <StarIcon /> },
            ].map((s, i) => (
              <div key={i} id={`stat-${i}`} data-animate className={`lp-stat ${animClass(`stat-${i}`)}`} style={{ animationDelay: `${i * 100}ms` }}>
                <div className="lp-stat-icon">{s.icon}</div>
                <div className="lp-stat-val">{s.val}</div>
                <div className="lp-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ REVIEWS CAROUSEL ═══ */}
      <section id="reviews" className="lp-section">
        <div className="lp-container">
          <div id="rev-head" data-animate className={animClass("rev-head")}>
            <p className="lp-section-tag">Testimonials</p>
            <h2 className="lp-section-title">Loved by EV Owners</h2>
            <p className="lp-section-sub">Don't just take our word for it. See what our community is saying.</p>
          </div>

          <div className="lp-carousel-wrap">
            <div className="lp-carousel-inner" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
              {testimonials.map((t, i) => (
                <div key={i} className="lp-carousel-slide">
                  <div className="lp-review-card">
                    <div className="lp-review-stars">
                      {[1, 2, 3, 4, 5].map(s => <StarIcon key={s} style={{ color: "#EAB308", fontSize: 20 }} />)}
                    </div>
                    <p className="lp-review-text">"{t.text}"</p>
                    <div className="lp-review-author">
                      <div className="lp-review-avatar">{t.name.charAt(0)}</div>
                      <div>
                        <div className="lp-review-name">{t.name}</div>
                        <div className="lp-review-role">{t.role}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="lp-carousel-dots">
              {testimonials.map((_, i) => (
                <div
                  key={i}
                  className={`lp-dot ${i === currentSlide ? "lp-dot-active" : ""}`}
                  onClick={() => setCurrentSlide(i)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="lp-section lp-cta-section">
        <div className="lp-container" style={{ textAlign: "center" }}>
          <div id="cta" data-animate className={animClass("cta")}>
            <h2 className="lp-cta-title">Ready to Drive Green?</h2>
            <p className="lp-cta-sub">Join thousands of EV owners saving money and earning rewards every day.</p>
            <div className="lp-hero-btns" style={{ justifyContent: "center", marginTop: 32 }}>
              <button className="lp-btn-hero" onClick={() => navigate("/login")}>
                <BoltIcon style={{ fontSize: 20 }} /> Get Started — It's Free
              </button>
              <button className="lp-btn-hero-outline" onClick={() => window.location.href = `${ADMIN_URL}/staff-login`}>
                Staff Portal Login →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-left">
            <div className="lp-logo">
              <div className="lp-logo-icon"><BoltIcon style={{ fontSize: 18, color: "#fff" }} /></div>
              <span className="lp-logo-text">EV Saarthi</span>
            </div>
            <p style={{ color: "#9CA3AF", fontSize: 13, marginTop: 8 }}>
              India's smartest EV companion.<br />In association with <strong style={{ color: "#16A34A" }}>ReUrja</strong>.
            </p>
          </div>
          <div className="lp-footer-links">
            <a href="#features">Features</a>
            <a href="#how">How It Works</a>
            <a href="#stats">Impact</a>
            <a href="/login">Sign In</a>
          </div>
          <div className="lp-footer-copy">
            © 2026 EV Saarthi. Free Forever <NatureIcon style={{ fontSize: 14, color: "#16A34A" }} />
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════ CSS ═══════════════════════ */
const landingCSS = `
  .lp-root { font-family: 'Inter','Segoe UI',system-ui,sans-serif; overflow-x:hidden; background:#fafafa; }

  /* Animations */
  .lp-fadeUp { opacity:0; transform:translateY(36px); transition:opacity 0.7s cubic-bezier(.16,1,.3,1), transform 0.7s cubic-bezier(.16,1,.3,1); }
  .lp-visible { opacity:1 !important; transform:translateY(0) !important; }

  @keyframes lpBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }
  .lp-bounce { animation:lpBounce 2s ease-in-out infinite; }

  @keyframes lpGlow { 0%{opacity:.4;transform:scale(1)} 50%{opacity:.7;transform:scale(1.05)} 100%{opacity:.4;transform:scale(1)} }
  @keyframes lpFloat { 0%{transform:translateY(0)} 50%{transform:translateY(-12px)} 100%{transform:translateY(0)} }

  /* NAV */
  .lp-nav { position:fixed;top:0;left:0;right:0;z-index:100;padding:16px 0;transition:all .3s; }
  .lp-nav-solid { background:rgba(255,255,255,.95);backdrop-filter:blur(20px);box-shadow:0 2px 24px rgba(0,0,0,.06);border-bottom:2px solid #EAB308; }
  .lp-nav-inner { max-width:1200px;margin:0 auto;padding:0 24px;display:flex;align-items:center;justify-content:space-between; }
  .lp-logo { display:flex;align-items:center;gap:10px;cursor:pointer; }
  .lp-logo-icon { width:36px;height:36px;background:#EAB308;border-radius:10px;display:flex;align-items:center;justify-content:center; }
  .lp-logo-text { font-size:20px;font-weight:900;color:#fff;transition:color .3s; }
  .lp-nav-solid .lp-logo-text { color:#1A1A1A; }
  .lp-nav-links { display:flex;gap:28px; }
  .lp-nav-links a { text-decoration:none;font-size:14px;font-weight:600;color:rgba(255,255,255,0.8);transition:color .2s; }
  .lp-nav-links a:hover { color:#16A34A; }
  .lp-nav-solid .lp-nav-links a { color:#555; }
  .lp-nav-cta { display:flex;gap:10px;align-items:center; }
  .lp-btn-ghost { background:none;border:2px solid rgba(255,255,255,0.3);border-radius:12px;padding:8px 18px;font-size:13px;font-weight:700;color:rgba(255,255,255,0.85);cursor:pointer;transition:all .2s;font-family:inherit; }
  .lp-btn-ghost:hover { border-color:#16A34A;color:#16A34A; }
  .lp-nav-solid .lp-btn-ghost { border-color:#E5E7EB;color:#555; }
  .lp-btn-primary { background:linear-gradient(135deg,#16A34A,#22c55e);border:none;border-radius:12px;padding:9px 20px;font-size:13px;font-weight:800;color:#fff;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .2s;font-family:inherit;box-shadow:0 4px 16px rgba(22,163,74,.25); }
  .lp-btn-primary:hover { transform:translateY(-2px);box-shadow:0 8px 24px rgba(22,163,74,.35); }

  /* HERO */
  .lp-hero { position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:120px 24px 80px; }
  .lp-hero-bg { position:absolute;inset:0;background:linear-gradient(135deg,#0a2e1c 0%,#0f3d28 30%,#134d32 60%,#1a6b41 100%); }
  .lp-hero-grid { position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.04) 1px,transparent 1px);background-size:40px 40px; }
  .lp-hero-glow { position:absolute;top:-200px;right:-200px;width:600px;height:600px;background:radial-gradient(circle,rgba(234,179,8,.15) 0%,transparent 70%);animation:lpGlow 6s ease-in-out infinite; }
  .lp-hero-content { position:relative;max-width:720px;text-align:center;z-index:2; }
  .lp-hero-badge { display:inline-block;background:rgba(234,179,8,.12);border:1px solid rgba(234,179,8,.25);color:#EAB308;font-size:13px;font-weight:700;padding:6px 18px;border-radius:100px;margin-bottom:28px;letter-spacing:.5px; }
  .lp-hero-title { font-size:clamp(38px,6vw,68px);font-weight:900;color:#fff;line-height:1.1;margin:0 0 24px;letter-spacing:-1.5px; }
  .lp-grad-text { background:linear-gradient(135deg,#22c55e,#16A34A);-webkit-background-clip:text;-webkit-text-fill-color:transparent; }
  .lp-gold-text { background:linear-gradient(135deg,#EAB308,#F59E0B);-webkit-background-clip:text;-webkit-text-fill-color:transparent; }
  .lp-hero-sub { font-size:18px;color:rgba(255,255,255,.7);line-height:1.7;margin-bottom:36px;max-width:560px;margin-left:auto;margin-right:auto; }
  .lp-hero-sub strong { color:#EAB308; }
  .lp-hero-btns { display:flex;gap:14px;justify-content:center;flex-wrap:wrap; }
  .lp-btn-hero { background:linear-gradient(135deg,#EAB308,#F59E0B);border:none;border-radius:16px;padding:16px 32px;font-size:16px;font-weight:900;color:#1A1A1A;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all .25s;font-family:inherit;box-shadow:0 8px 32px rgba(234,179,8,.3); }
  .lp-btn-hero:hover { transform:translateY(-3px);box-shadow:0 12px 40px rgba(234,179,8,.45); }
  .lp-btn-hero-outline { background:transparent;border:2px solid rgba(255,255,255,.25);border-radius:16px;padding:15px 32px;font-size:16px;font-weight:800;color:#fff;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all .25s;font-family:inherit; }
  .lp-btn-hero-outline:hover { border-color:#fff;background:rgba(255,255,255,.06); }
  .lp-hero-trust { display:flex;align-items:center;gap:12px;justify-content:center;margin-top:40px; }
  .lp-trust-item { display:flex;align-items:center;gap:5px;color:rgba(255,255,255,.45);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px; }
  .lp-trust-dot { width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.2); }
  .lp-scroll-hint { position:absolute;bottom:32px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,.35);cursor:pointer; }

  /* SECTIONS */
  .lp-section { padding:100px 24px; }
  .lp-section-alt { background:#f0fdf4; }
  .lp-container { max-width:1100px;margin:0 auto; }
  .lp-section-tag { font-size:13px;font-weight:800;color:#16A34A;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;text-align:center; }
  .lp-section-title { font-size:clamp(28px,4vw,42px);font-weight:900;color:#1A1A1A;text-align:center;margin:0 0 12px;letter-spacing:-0.5px; }
  .lp-section-sub { font-size:16px;color:#6B7280;text-align:center;max-width:520px;margin:0 auto 48px;line-height:1.6; }

  /* FEATURES */
  .lp-features-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:48px; }
  .lp-feature-card { background:#fff;border-radius:20px;padding:32px 28px;border:1px solid #f3f4f6;transition:all .3s;cursor:default; }
  .lp-feature-card:hover { transform:translateY(-6px);box-shadow:0 16px 48px rgba(0,0,0,.08);border-color:#e5e7eb; }
  .lp-feature-icon { width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;font-size:0; }
  .lp-feature-icon svg { font-size:28px !important; }
  .lp-feature-title { font-size:18px;font-weight:800;color:#1A1A1A;margin-bottom:8px; }
  .lp-feature-desc { font-size:14px;color:#6B7280;line-height:1.6; }

  /* STEPS */
  .lp-steps { display:flex;gap:32px;margin-top:48px;justify-content:center; }
  .lp-step { flex:1;max-width:320px;text-align:center;padding:36px 28px;background:#fff;border-radius:24px;border:1px solid #e5e7eb;transition:all .3s; }
  .lp-step:hover { transform:translateY(-4px);box-shadow:0 12px 40px rgba(0,0,0,.06); }
  .lp-step-num { width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#16A34A,#22c55e);color:#fff;font-size:22px;font-weight:900;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;box-shadow:0 8px 24px rgba(22,163,74,.2); }
  .lp-step-title { font-size:18px;font-weight:800;color:#1A1A1A;margin-bottom:8px; }
  .lp-step-desc { font-size:14px;color:#6B7280;line-height:1.6; }

  /* STATS */
  .lp-stats-section { background:linear-gradient(135deg,#0a2e1c,#134d32);padding:100px 24px; }
  .lp-stats-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-top:48px; }
  .lp-stat { text-align:center;padding:36px 20px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:24px;backdrop-filter:blur(10px);transition:all .3s; }
  .lp-stat:hover { background:rgba(255,255,255,.1);transform:translateY(-4px); }
  .lp-stat-icon { color:#EAB308;margin-bottom:12px; }
  .lp-stat-icon svg { font-size:32px !important; }
  .lp-stat-val { font-size:36px;font-weight:900;color:#fff;letter-spacing:-1px; }
  .lp-stat-label { font-size:13px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;margin-top:4px; }

  /* CAROUSEL */
  .lp-carousel-wrap { position:relative;max-width:800px;margin:0 auto;overflow:hidden;padding:20px 0; }
  .lp-carousel-inner { display:flex;transition:transform 0.6s cubic-bezier(0.25, 1, 0.5, 1); }
  .lp-carousel-slide { min-width:100%;padding:0 20px;box-sizing:border-box; }
  .lp-review-card { background:#fff;border-radius:24px;padding:40px;border:1px solid #f3f4f6;box-shadow:0 12px 32px rgba(0,0,0,.04);text-align:center; }
  .lp-review-stars { display:flex;justify-content:center;gap:4px;margin-bottom:20px; }
  .lp-review-text { font-size:18px;color:#374151;line-height:1.6;font-style:italic;margin-bottom:32px;font-weight:500; }
  .lp-review-author { display:flex;align-items:center;justify-content:center;gap:16px;text-align:left; }
  .lp-review-avatar { width:48px;height:48px;background:linear-gradient(135deg,#16A34A,#22c55e);border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800; }
  .lp-review-name { font-size:16px;font-weight:800;color:#1A1A1A; }
  .lp-review-role { font-size:13px;color:#6B7280;font-weight:500; }
  .lp-carousel-dots { display:flex;justify-content:center;gap:8px;margin-top:32px; }
  .lp-dot { width:10px;height:10px;border-radius:50%;background:#e5e7eb;cursor:pointer;transition:all 0.3s; }
  .lp-dot-active { background:#16A34A;transform:scale(1.3); }

  /* CTA */
  .lp-cta-section { background:#fff;padding:100px 24px; }
  .lp-cta-title { font-size:clamp(28px,4vw,44px);font-weight:900;color:#1A1A1A;margin:0 0 12px;letter-spacing:-0.5px; }
  .lp-cta-sub { font-size:17px;color:#6B7280;line-height:1.6;max-width:480px;margin:0 auto; }

  /* FOOTER */
  .lp-footer { background:#111;padding:48px 24px 32px; }
  .lp-footer-inner { max-width:1100px;margin:0 auto; }
  .lp-footer-left { margin-bottom:24px; }
  .lp-footer-links { display:flex;gap:24px;margin-bottom:24px;flex-wrap:wrap; }
  .lp-footer-links a { color:#9CA3AF;text-decoration:none;font-size:13px;font-weight:600;transition:color .2s; }
  .lp-footer-links a:hover { color:#16A34A; }
  .lp-footer-copy { color:#555;font-size:12px;display:flex;align-items:center;gap:4px;border-top:1px solid #222;padding-top:20px; }

  @media(max-width:768px){
    .lp-nav-links,.lp-btn-ghost{display:none;}
    .lp-features-grid{grid-template-columns:1fr;}
    .lp-steps{flex-direction:column;align-items:center;}
    .lp-stats-grid{grid-template-columns:repeat(2,1fr);}
    .lp-hero-title{font-size:36px;}
  }
`;
