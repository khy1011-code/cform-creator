import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getFormBySlug } from "../lib/forms";
import { applyTheme } from "../lib/applyTheme";
import { saveLead } from "../lib/leads";
import { Wordmark } from "../components/Logo";

const CheckIcon = () => (
  <div className="check-icon">
    <svg viewBox="0 0 16 16" fill="none">
      <polyline points="3,8 6.5,12 13,4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

function BackBar({ onBack }) {
  return (
    <div className="back-row">
      <button className="back-btn" onClick={onBack} aria-label="Go back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>
    </div>
  );
}

function Progress({ pct, label }) {
  return (
    <div className="progress-wrap">
      <div className="progress-bar"><div className="progress-fill" style={{ width: pct + "%" }} /></div>
      <span className="progress-pct">{label || pct + "%"}</span>
    </div>
  );
}

export default function PublicForm() {
  const router = useRouter();
  const { slug } = router.query;

  const [state, setState] = useState("loading"); // loading | ready | notfound
  const [form, setForm] = useState(null);
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({ q1: 0, q2: 0, notes: "" });
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    getFormBySlug(slug).then((f) => {
      if (!f) { setState("notfound"); return; }
      setForm(f);
      applyTheme(f.data.theme);
      setState("ready");
    });
  }, [slug]);

  if (state === "loading") {
    return <div className="ty-shell"><div className="app" /></div>;
  }
  if (state === "notfound") {
    return (
      <div className="ty-shell">
        <Head><title>Form unavailable</title></Head>
        <div className="app">
          <div className="screen-body" style={{ justifyContent: "center", textAlign: "center", minHeight: "100vh" }}>
            <h2 className="screen-title" style={{ marginTop: 0 }}>This form isn’t available.</h2>
            <p className="screen-subtitle">The link may be incorrect or the form may have been removed.</p>
          </div>
        </div>
      </div>
    );
  }

  const content = form.data;
  const s = content.screens;
  const go = (n) => { setStep(n); const app = document.querySelector(".app"); if (app) app.scrollTop = 0; };

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await saveLead({
        form_slug: form.slug,
        form_title: form.title,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        answers: {
          [s.q1.title]: s.q1.options[answers.q1] ?? "",
          [s.q2.title]: s.q2.options[answers.q2] ?? "",
          "Notes": answers.notes || "",
        },
      });
      go(7);
    } catch (e) {
      alert("Sorry, something went wrong saving your details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const contactValid = contact.name.trim() && contact.email.trim() && contact.phone.trim();

  return (
    <>
      <Head>
        <title>{content.brand.name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="ty-shell">
        <div className="app">
          {/* SCREEN 1: INTRO */}
          {step === 1 && (
            <div className="screen">
              <div className="header-badge">
                <div className="badge-circle">
                  {content.photo ? <img src={content.photo} alt="Profile" /> : content.brand.initials}
                </div>
                <div className="badge-info">
                  <div className="badge-name">{content.brand.name}</div>
                  <div className="badge-detail">{content.brand.doctor}</div>
                </div>
              </div>
              <div style={{ height: 4, background: "linear-gradient(90deg, var(--gold) 8%, #222 8%)", margin: "16px 0 0" }} />
              <div className="screen-body" style={{ paddingTop: 0 }}>
                <div className="eyebrow">{s.intro.eyebrow}</div>
                <h1 className="screen-title-lg">{s.intro.title}</h1>
                <p className="screen-subtitle">{s.intro.subtitle}</p>
                <div className="checklist-card">
                  {s.intro.checklist.map((item, i) => (
                    <div className="check-item" key={i}><CheckIcon /><div className="check-text">{item}</div></div>
                  ))}
                </div>
                <div className="price-block">
                  <div className="price-amount"><sup>$</sup>{s.intro.price}</div>
                  <div className="price-note">{s.intro.priceNote}</div>
                </div>
                <button className="btn-gold" onClick={() => go(2)}>{s.intro.button}</button>
                <div className="disclaimer">{s.intro.disclaimer}</div>
                <button className="hipaa-row" style={{ marginTop: 16 }} onClick={() => window.open(content.links.hipaaUrl, "_blank")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                  {s.intro.hipaaText}
                </button>
                <a className="clinic-address" href={content.links.mapsUrl} target="_blank" rel="noreferrer">{content.links.addressText}</a>
              </div>
            </div>
          )}

          {/* SCREEN 2: Q1 */}
          {step === 2 && (
            <div className="screen">
              <div className="header header-sm"><Wordmark brand={content.brand} photo={content.photo} /></div>
              <BackBar onBack={() => go(1)} />
              <Progress pct={25} label={s.q1.progressLabel} />
              <div className="screen-body">
                <h2 className="screen-title">{s.q1.title}</h2>
                <p className="screen-subtitle">{s.q1.subtitle}</p>
                <div className="options-wrap">
                  {s.q1.options.map((opt, i) => (
                    <button key={i} className={"option-btn" + (answers.q1 === i ? " selected" : "")} onClick={() => setAnswers({ ...answers, q1: i })}>
                      <div className="radio-ring"><div className="radio-dot" /></div>
                      <div className="option-label">{opt}</div>
                    </button>
                  ))}
                </div>
                <button className="btn-gold" onClick={() => go(3)}>{s.q1.button}</button>
              </div>
            </div>
          )}

          {/* SCREEN 3: Q2 */}
          {step === 3 && (
            <div className="screen">
              <div className="header header-sm"><Wordmark brand={content.brand} photo={content.photo} /></div>
              <BackBar onBack={() => go(2)} />
              <Progress pct={50} />
              <div className="screen-body">
                <div className="eyebrow" style={{ marginTop: 18 }}>{s.q2.progressLabel}</div>
                <h2 className="screen-title-gold">{s.q2.title}</h2>
                <p className="screen-subtitle">{s.q2.subtitle}</p>
                <div className="options-wrap">
                  {s.q2.options.map((opt, i) => (
                    <button key={i} className={"option-btn" + (answers.q2 === i ? " selected" : "")} onClick={() => setAnswers({ ...answers, q2: i })}>
                      <div className="radio-ring"><div className="radio-dot" /></div>
                      <div className="option-label">{opt}</div>
                    </button>
                  ))}
                </div>
                <button className="btn-gold" onClick={() => go(4)}>{s.q2.button}</button>
              </div>
            </div>
          )}

          {/* SCREEN 4: Q3 NOTES */}
          {step === 4 && (
            <div className="screen">
              <div className="header header-sm"><Wordmark brand={content.brand} photo={content.photo} /></div>
              <BackBar onBack={() => go(3)} />
              <Progress pct={75} />
              <div className="screen-body">
                <div className="eyebrow" style={{ marginTop: 18 }}>{s.q3.eyebrow}</div>
                <h2 className="screen-title">{s.q3.title}</h2>
                <p className="screen-subtitle" style={{ fontStyle: "italic" }}>{s.q3.subtitle}</p>
                <textarea className="textarea-field" placeholder={s.q3.placeholder} value={answers.notes} onChange={(e) => setAnswers({ ...answers, notes: e.target.value })} />
                <button className="btn-gold" onClick={() => go(5)}>{s.q3.button}</button>
                <button className="btn-ghost" onClick={() => go(5)}>{s.q3.skip}</button>
              </div>
            </div>
          )}

          {/* SCREEN 5: CONTACT */}
          {step === 5 && (
            <div className="screen">
              <div className="header header-sm"><Wordmark brand={content.brand} photo={content.photo} /></div>
              <BackBar onBack={() => go(4)} />
              <Progress pct={85} />
              <div className="screen-body">
                <div className="eyebrow" style={{ marginTop: 18 }}>{s.contact.eyebrow}</div>
                <h2 className="screen-title">{s.contact.title}</h2>
                <p className="screen-subtitle">{s.contact.subtitle}</p>
                <div className="field-group">
                  <label className="field-label">{s.contact.nameLabel}</label>
                  <input className="field-input" type="text" placeholder="Your full name" autoComplete="name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
                </div>
                <div className="field-group">
                  <label className="field-label">{s.contact.phoneLabel}</label>
                  <input className="field-input" type="tel" placeholder="(000) 000-0000" autoComplete="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                </div>
                <div className="field-group">
                  <label className="field-label">{s.contact.emailLabel}</label>
                  <input className="field-input" type="email" placeholder="you@email.com" autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                </div>
                <button className="btn-gold" disabled={!contactValid} onClick={() => go(6)}>{s.contact.button}</button>
              </div>
            </div>
          )}

          {/* SCREEN 6: PRIVACY */}
          {step === 6 && (
            <div className="screen">
              <div className="header header-sm"><Wordmark brand={content.brand} photo={content.photo} /></div>
              <BackBar onBack={() => go(5)} />
              <Progress pct={95} />
              <div className="screen-body">
                <div className="eyebrow" style={{ marginTop: 18 }}>{s.privacy.eyebrow}</div>
                <h2 className="screen-title-lg">{s.privacy.title}</h2>
                <div className="privacy-card">
                  <div className="privacy-card-label">{s.privacy.cardLabel}</div>
                  <p className="privacy-card-text">{s.privacy.cardText}</p>
                </div>
                <div className="privacy-links">
                  <a className="privacy-link" href={content.links.fbPolicyUrl} target="_blank" rel="noreferrer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><path d="M12 8v4m0 4h.01" /></svg>
                    {s.privacy.fbLinkText}
                  </a>
                  <a className="privacy-link" href={content.links.privacyPolicyUrl} target="_blank" rel="noreferrer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    {s.privacy.privacyLinkText}
                  </a>
                </div>
                <button className="btn-gold" disabled={submitting} onClick={handleSubmit}>
                  {submitting ? "SUBMITTING…" : s.privacy.button}
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 7: CONFIRMATION */}
          {step === 7 && (
            <div className="screen">
              <div className="header" style={{ justifyContent: "center", paddingTop: 36 }}>
                <Wordmark brand={content.brand} photo={content.photo} />
              </div>
              <div className="screen-body" style={{ alignItems: "center", textAlign: "center" }}>
                <div className="confirm-monogram">
                  {content.photo ? <img src={content.photo} alt="Profile" /> : <div className="confirm-monogram-inner">{content.brand.initials}</div>}
                </div>
                <h1 className="confirm-title">{s.confirm.title}</h1>
                <p className="confirm-subtitle">{s.confirm.subtitle}</p>
                <div className="steps-card" style={{ textAlign: "left", width: "100%" }}>
                  {s.confirm.steps.map((stp, i) => (
                    <div className="step-item" key={i}><div className="step-num">{i + 1}</div><div className="step-text">{stp}</div></div>
                  ))}
                </div>
                <button className="btn-gold" style={{ width: "100%" }} onClick={() => window.open(content.links.scheduleUrl, "_blank")}>
                  {s.confirm.button}
                </button>
                <button className="hipaa-row" style={{ marginTop: 20 }} onClick={() => window.open(content.links.hipaaUrl, "_blank")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                  {s.confirm.hipaaText}
                </button>
                <a className="clinic-address" href={content.links.mapsUrl} target="_blank" rel="noreferrer">{s.confirm.addressText}</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
