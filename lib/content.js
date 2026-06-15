// The content template for ONE form. Every form a user creates starts
// from this shape and is stored (per form) in lib/forms.js. The public
// form page and the CMS editor both read/write this structure.
export const DEFAULT_CONTENT = {
  brand: {
    name: "True You Medical Aesthetic",
    doctor: "Dr. Thang Tran, MD · San Jose, CA",
    initials: "TY",
    wordmarkA: "TRUE",
    wordmarkB: "YOU",
    tagline: "Medical Aesthetic",
  },

  // Theme & fonts — changing these restyles the whole UI live.
  theme: {
    gold: "#c9a84c",
    bg: "#0a0a0a",
    card: "#1a1a1a",
    bodyFont: "'Inter', system-ui, sans-serif",
    displayFont: "'Playfair Display', Georgia, serif",
    serifFont: "'Cormorant Garamond', Georgia, serif",
  },

  // Header / confirmation profile photo (data URL or hosted URL).
  photo: "",

  // Clickable link boxes (editable in the CMS "Links" tab).
  links: {
    hipaaUrl: "https://www.hhs.gov/hipaa/for-individuals/index.html",
    addressText: "969 Story Rd · San Jose CA",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=969+Story+Rd+San+Jose+CA",
    scheduleUrl: "https://example.com/book-your-appointment",
    fbPolicyUrl: "https://www.facebook.com/about/privacy",
    privacyPolicyUrl: "https://example.com/privacy",
  },

  screens: {
    intro: {
      eyebrow: "Hormone Health Evaluation",
      title: "Your body may be telling you something worth listening to.",
      subtitle:
        "Answer 3 quick questions to help us understand your symptoms and goals. Your responses are confidential and reviewed by Dr. Tran personally.",
      checklist: [
        "Detailed bloodwork — 40+ hormone markers",
        "Lab and symptom review with Dr. Tran",
        "Personalized treatment plan based on your results",
      ],
      price: "250",
      priceNote: "Credited toward first month of treatment if you proceed.",
      button: "ANSWER 3 QUICK QUESTIONS",
      disclaimer:
        "This is not a diagnostic tool. This form does not replace a consultation or medical advice.",
      hipaaText: "HIPAA-compliant · Secure form",
    },
    q1: {
      progressLabel: "Question 1 of 3",
      title:
        "Have you explored bioidentical hormone replacement therapy (BHRT) before?",
      subtitle: "No prior experience needed — just helps us prepare for your visit.",
      options: [
        "Yes, I've looked into it or tried it before",
        "No, this would be my first time exploring this",
      ],
      button: "Continue",
    },
    q2: {
      progressLabel: "Question 2 of 3",
      title:
        "Would you like our care coordinator to call you to walk through the evaluation process?",
      subtitle: "A quick 5-minute call — no pressure, just information.",
      options: ["Yes, a call would be helpful", "No thanks, I'll schedule directly"],
      button: "CONTINUE",
    },
    q3: {
      eyebrow: "Question 3 of 3",
      title: "Anything you'd like Dr. Tran's team to know before your visit?",
      subtitle: "Optional — but it helps us prepare.",
      placeholder:
        "e.g. health history, specific concerns, questions about the process...",
      button: "CONTINUE",
      skip: "Skip this step",
    },
    contact: {
      eyebrow: "Almost There",
      title: "Where should we send your appointment details?",
      subtitle: "Our team will reach out to confirm your $250 evaluation slot.",
      nameLabel: "Full Name",
      phoneLabel: "Phone Number",
      emailLabel: "Email Address",
      button: "REVIEW AND SUBMIT",
    },
    privacy: {
      eyebrow: "Privacy Review",
      title: "How your information is used",
      cardLabel: "Data and Privacy",
      cardText:
        "By submitting, you agree to share your information with Dr. Thang Tran — True You Medical Aesthetic, who will use it to contact you about your evaluation.",
      fbLinkText: "View Facebook Data Policy",
      privacyLinkText: "Visit True You Medical Aesthetic's Privacy Policy",
      button: "SUBMIT MY INFORMATION",
    },
    confirm: {
      title: "You're all set.",
      subtitle:
        "Thank you for your interest in the True You Hormone Health Evaluation. Click below to choose your appointment time with Dr. Tran.",
      steps: [
        "Detailed bloodwork drawn at our San Jose clinic",
        "Lab and symptom review with Dr. Tran MD",
        "Personalized plan based on your actual results",
      ],
      button: "SCHEDULE MY APPOINTMENT",
      hipaaText: "HIPAA-COMPLIANT",
      addressText: "969 Story Rd, San Jose, CA 95113",
    },
  },
};

// Deep-merge saved values over defaults so adding new fields later
// never breaks an existing saved form.
export function mergeDeep(base, override) {
  if (Array.isArray(base)) return override !== undefined ? override : base;
  if (base && typeof base === "object") {
    const out = { ...base };
    for (const k of Object.keys(base)) {
      if (override && k in override) out[k] = mergeDeep(base[k], override[k]);
    }
    // keep any extra keys the override added
    if (override) for (const k of Object.keys(override)) if (!(k in out)) out[k] = override[k];
    return out;
  }
  return override !== undefined ? override : base;
}
