// ====== Endpoints & brand (yours) ======
const CSV_ENDPOINT = "https://api.hajjguider.com/csv-capture.php";
const SHEETS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbx04QsemFyIJrUblOpXNVSJj8R09GKUsSbvmI2DCvC0Kf_VsI1i8iRTTtxByGkB1hod/exec";
const EMAIL_ENDPOINT = "https://api.hajjguider.com/send-email.php";
const BRAND = "Cygnas"; // for PHP templates / reporting

// ====== Small utils ======
const $ = (sel, root = document) => root.querySelector(sel);
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hasUrl = (v) => typeof v === "string" && /^https?:\/\//i.test(v);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function showErr(input, msg) {
  const el = input?.parentElement?.querySelector?.(".error");
  if (el) {
    el.textContent = msg || "";
    el.style.opacity = msg ? "1" : "0";
  }
  if (input) {
    input.classList.toggle("invalid", !!msg);
    input.setAttribute("aria-invalid", msg ? "true" : "false");
  }
}
function clearErr(input) {
  showErr(input, "");
}
function renderSuccessAfter(form, message) {
  const panel = document.createElement("div");
  panel.className = "form-success";
  panel.setAttribute("role", "status");
  panel.style.marginTop = "12px";
  panel.style.padding = "16px";
  panel.style.borderRadius = "8px";
  panel.style.background = "#ecfdf5";
  panel.style.border = "1px solid #86efac";
  panel.style.color = "#065f46";
  panel.textContent = message || "Thank you! We'll contact you shortly.";
  form.insertAdjacentElement("afterend", panel);
}
function getAttribution() {
  const url = new URL(location.href),
    qp = url.searchParams;
  const utm_source = qp.get("utm_source") || "";
  const utm_medium = qp.get("utm_medium") || "";
  const utm_campaign = qp.get("utm_campaign") || "";
  const utm_term = qp.get("utm_term") || "";
  const utm_content = qp.get("utm_content") || "";
  const referrer = document.referrer || "";
  let referrer_host = "";
  try {
    referrer_host = referrer ? new URL(referrer).hostname : "";
  } catch {}
  let source_channel = utm_source
    ? utm_source
    : /google\./i.test(referrer_host)
    ? "google"
    : /bing\./i.test(referrer_host)
    ? "bing"
    : /facebook\.|fb\.|instagram\.|t\.me|twitter\.com|x\.com/i.test(
        referrer_host
      )
    ? "social"
    : referrer_host
    ? "referral"
    : "direct";
  return {
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    referrer,
    referrer_host,
    source_channel,
    landing_page: location.href,
    user_agent: navigator.userAgent,
  };
}

// ====== Phone helpers (intl-tel-input optional) ======
const utilsReady = () => !!window.intlTelInputUtils;
async function validatePhone(iti, input, { wait = true } = {}) {
  const raw = (input?.value || "").trim();
  if (!raw) {
    return { ok: true, e164: "" }; // Empty is valid for optional field
  }
  if (iti && raw.startsWith("+")) {
    try {
      iti.setNumber(raw);
    } catch {}
  }
  if (wait && !utilsReady()) {
    for (let i = 0; i < 10 && !utilsReady(); i++) await sleep(100);
  }
  let e164 = raw;
  try {
    e164 = iti ? iti.getNumber() : raw;
  } catch {}
  let ok = false;
  if (iti && utilsReady()) {
    try {
      ok = iti.isValidNumber();
    } catch {}
  } else {
    ok = /^\+?\d{10,15}$/.test((e164 || "").replace(/\s+/g, ""));
  }
  return { ok, e164 };
}

// ====== Apply to current (niche) form ======
document.addEventListener("DOMContentLoaded", () => {
  // Find the form: prefer #leadFormSingle but accept data-lead-form or first form with [data-cygnas-lead]
  const f =
    $("#leadFormSingle") ||
    $("[data-lead-form]") ||
    $("[data-cygnas-lead]") ||
    $("form#contact, form.lead-form");
  if (!f) return;

  // Field getters (robust across different name/id conventions)
  const name = $('input[name="name"]', f) || $("#name", f);
  const email = $('input[name="email"]', f) || $("#email", f);
  const phone =
    $('input[name="phone"]', f) || $("#phone", f) || $("#phoneSingle", f);
  const company = $('input[name="company"]', f) || $("#company", f);
  const industry = $('select[name="industry"]', f) || $("#industry", f);
  const notesEl = $('textarea[name="notes"]', f) || $("#notes", f);
  const pageUrlField = $("#page_url", f);

  if (pageUrlField) pageUrlField.value = window.location.href;

  // intl-tel-input if present
  let iti = null;
  if (window.intlTelInput && phone) {
    iti = window.intlTelInput(phone, {
      initialCountry: "gb",
      separateDialCode: true,
      nationalMode: true,
      formatOnDisplay: false,
      preferredCountries: ["gb", "ae", "sa", "pk"],
      utilsScript:
        "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.js",
    });
  }

  // Track phone field interaction state
  let phoneWasTouched = false;

  // Live validation (only present fields)
  name?.addEventListener("input", () =>
    showErr(
      name,
      (name.value || "").trim().length >= 2
        ? ""
        : "Name must be at least 2 characters"
    )
  );
  email?.addEventListener("input", () =>
    showErr(
      email,
      emailRe.test((email.value || "").trim())
        ? ""
        : "Please enter a valid email"
    )
  );

  // Phone validation - only show errors after user has interacted
  phone?.addEventListener("input", async () => {
    if (!phoneWasTouched) return; // Don't validate while typing before blur

    const rawValue = (phone.value || "").trim();

    // Clear error if field is empty
    if (!rawValue) {
      showErr(phone, "");
      return;
    }

    const { ok } = await validatePhone(iti, phone, { wait: false });
    showErr(phone, ok ? "" : "Please enter a valid phone number");
  });

  phone?.addEventListener("countrychange", async () => {
    if (!phoneWasTouched) return;

    const rawValue = (phone.value || "").trim();
    if (!rawValue) {
      showErr(phone, "");
      return;
    }

    const { ok } = await validatePhone(iti, phone, { wait: false });
    showErr(phone, ok ? "" : "Please enter a valid phone number");
  });

  // Mark phone as touched on blur
  phone?.addEventListener("blur", async () => {
    phoneWasTouched = true;

    const rawValue = (phone.value || "").trim();
    if (!rawValue) {
      showErr(phone, "");
      return;
    }

    const { ok } = await validatePhone(iti, phone, { wait: true });
    showErr(phone, ok ? "" : "Please enter a valid phone number");
  });

  // Submit
  f.addEventListener("submit", async (e) => {
    e.preventDefault();

    const errs = [];
    if (name && (name.value || "").trim().length < 2)
      errs.push([name, "Name must be at least 2 characters"]);
    if (email && !emailRe.test((email.value || "").trim()))
      errs.push([email, "Please enter a valid email"]);

    // Phone validation on submit - only validate if field has content
    let e164 = "";
    let phOK = true;
    if (phone) {
      const rawValue = (phone.value || "").trim();
      if (rawValue) {
        // Only validate if not empty
        const r = await validatePhone(iti, phone, { wait: true });
        e164 = r.e164;
        phOK = r.ok;
        if (!phOK) errs.push([phone, "Please enter a valid phone number"]);
      }
    }

    if (errs.length) {
      errs.forEach(([el, msg]) => showErr(el, msg));
      errs[0][0]?.focus();
      errs[0][0]?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    } else {
      [name, email, phone].forEach((el) => el && clearErr(el));
    }

    // Lock UI
    const btn = f.querySelector('button[type="submit"], .btn[type="submit"]');
    const btnTxt = btn?.textContent || "";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Submitting…";
    }

    // Normalize phone
    if (phone && iti && phone.value.trim()) {
      phone.value = e164;
    }

    // Attribution
    const attr = getAttribution();
    const notes = (notesEl?.value || "").trim();

    // Build payload (only include fields that exist)
    const fd = new FormData(f);
    if (phone && phone.value.trim()) fd.set("phone", phone.value); // normalized E.164 if iti used
    fd.append("brand", BRAND);
    fd.append("timestamp", new Date().toISOString());
    fd.append("source", location.hostname);
    fd.set("notes", notes);
    fd.set("page_url", window.location.href);
    // UTMs
    fd.append("utm_source", attr.utm_source);
    fd.append("utm_medium", attr.utm_medium);
    fd.append("utm_campaign", attr.utm_campaign);
    fd.append("utm_term", attr.utm_term);
    fd.append("utm_content", attr.utm_content);
    fd.append("referrer", attr.referrer);
    fd.append("referrer_host", attr.referrer_host);
    fd.append("source_channel", attr.source_channel);
    fd.append("landing_page", attr.landing_page);
    fd.append("user_agent", attr.user_agent);

    const payload = Object.fromEntries(fd.entries());

    // ===== CSV FIRST =====
    let csvOK = false;
    try {
      if (!hasUrl(CSV_ENDPOINT)) throw new Error("CSV endpoint missing");
      const r = await fetch(CSV_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        mode: "cors",
      });
      csvOK = r.ok;
    } catch (err) {
      console.error("CSV submit failed:", err);
      csvOK = false;
    }

    if (csvOK) {
      renderSuccessAfter(f, "Thanks! An engineer will contact you shortly.");
      f.style.display = "none";

      // Conversion event
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "generate_lead",
        formId: f.id || "leadFormSingle",
        pageUrl: window.location.href,
      });

      // Google Sheets (URL-encoded; flexible mapper)
      if (hasUrl(SHEETS_ENDPOINT) && SHEETS_ENDPOINT.includes("/exec")) {
        const sp = new URLSearchParams();
        sp.append("name", payload.name || "");
        sp.append("email", payload.email || "");
        const ph = payload.phone || "";
        sp.append("phone", ph);
        sp.append("fullPhoneNumberE164", ph);
        sp.append("company", payload.company || "");
        sp.append("industry", payload.industry || "");
        sp.append("notes", notes);
        sp.append("page_url", window.location.href);
        sp.append("timestamp", new Date().toISOString());
        sp.append("utm_source", attr.utm_source);
        sp.append("utm_medium", attr.utm_medium);
        sp.append("utm_campaign", attr.utm_campaign);
        sp.append("utm_term", attr.utm_term);
        sp.append("utm_content", attr.utm_content);
        void fetch(SHEETS_ENDPOINT, {
          method: "POST",
          body: sp,
          mode: "cors",
        }).catch(() => {});
      }

      // Email (JSON; brand + page info)
      if (hasUrl(EMAIL_ENDPOINT)) {
        const emailPayload = {
          brand: BRAND,
          name: payload.name || "",
          email: payload.email || "",
          phone: payload.phone || "",
          company: payload.company || "",
          industry: payload.industry || "",
          notes,
          pageUrl: window.location.href,
          referrer: attr.referrer,
          referrer_host: attr.referrer_host,
          source_channel: attr.source_channel,
          landing_page: attr.landing_page,
          user_agent: attr.user_agent,
        };
        void fetch(EMAIL_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailPayload),
          mode: "cors",
        }).catch(() => {});
      }
    } else {
      const alert = document.createElement("div");
      alert.className = "form-status error";
      alert.style.marginTop = "12px";
      alert.textContent = "Something went wrong. Please try again or call us.";
      f.insertAdjacentElement("afterend", alert);
    }

    if (btn) {
      btn.disabled = false;
      btn.textContent = btnTxt;
    }
  });
});
