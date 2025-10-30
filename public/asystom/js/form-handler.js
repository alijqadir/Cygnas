// ====== Endpoints & brand ======
const CSV_ENDPOINT = "https://api.hajjguider.com/csv-capture.php";
const SHEETS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbx04QsemFyIJrUblOpXNVSJj8R09GKUsSbvmI2DCvC0Kf_VsI1i8iRTTtxByGkB1hod/exec";
const EMAIL_ENDPOINT = "https://api.hajjguider.com/send-email.php";
const BRAND = "Asystom";

// ====== Small utils ======
const $ = (sel, root = document) => root.querySelector(sel);
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hasUrl = (v) => typeof v === "string" && /^https?:\/\//i.test(v);

function showErr(input, msg) {
  // Create or find error element
  let errorEl = input.parentElement.querySelector(".error-message");
  if (!errorEl) {
    errorEl = document.createElement("div");
    errorEl.className = "error-message";
    input.parentElement.appendChild(errorEl);
  }

  errorEl.textContent = msg || "";
  errorEl.style.display = msg ? "block" : "none";

  if (input) {
    input.classList.toggle("invalid", !!msg);
    input.setAttribute("aria-invalid", msg ? "true" : "false");
  }
}

function clearErr(input) {
  showErr(input, "");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Insert a success panel *outside* the form so it remains visible
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
  panel.textContent =
    message || "Thank you! We'll contact you within 1 business day.";
  form.insertAdjacentElement("afterend", panel);
}

// ====== Attribution (UTMs / referrer) ======
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

// ====== Phone helpers (intl-tel-input) ======
const utilsReady = () => !!window.intlTelInputUtils;
async function validatePhone(iti, input, { wait = true } = {}) {
  const raw = (input?.value || "").trim();
  // Empty is valid for optional field
  if (!raw) {
    return { ok: true, e164: "" };
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
    // For industrial forms, also accept basic phone validation
    if (!ok) {
      ok = /^\+?[\d\s\-\(\)]{10,}$/.test(raw);
    }
  } else {
    ok = /^\+?[\d\s\-\(\)]{10,}$/.test(raw);
  }
  return { ok, e164 };
}

// ====== Enhanced Validation Logic ======
function setupFieldValidation(field, validationFn, options = {}) {
  const {
    validateOnInput = true,
    validateOnBlur = true,
    validateOnChange = false,
    required = true,
  } = options;

  let wasTouched = false;

  if (validateOnInput && field) {
    field.addEventListener("input", () => {
      if (!wasTouched && !required) return;
      validationFn(field);
    });
  }

  if (validateOnBlur && field) {
    field.addEventListener("blur", () => {
      wasTouched = true;
      validationFn(field);
    });
  }

  if (validateOnChange && field) {
    field.addEventListener("change", () => {
      if (!wasTouched && !required) return;
      validationFn(field);
    });
  }

  return {
    markTouched: () => {
      wasTouched = true;
    },
    validate: () => validationFn(field, { force: true }),
  };
}

// ====== Init ======
document.addEventListener("DOMContentLoaded", () => {
  const f = $("#leadForm");
  if (!f) return;

  // Set up attribution
  const params = new URLSearchParams(window.location.search);
  function setVal(name, val) {
    const el = document.querySelector(`[name="${name}"]`);
    if (el) el.value = val || "";
  }
  [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
  ].forEach(function (k) {
    setVal(k, params.get(k));
  });
  setVal("landing_url", window.location.href);
  setVal("referrer", document.referrer);

  // intl-tel-input
  let iti = null;
  if (window.intlTelInput && $("#phone")) {
    iti = window.intlTelInput($("#phone"), {
      initialCountry: "gb",
      separateDialCode: true,
      preferredCountries: ["gb", "ie", "de", "fr", "nl"],
      utilsScript:
        "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.js",
    });
  }

  // Fields
  const name = $('input[name="name"]', f);
  const email = $('input[name="email"]', f);
  const phone = $("#phone", f);
  const company = $('input[name="company"]', f);
  const country = $('select[name="country"]', f);
  const industry = $('select[name="industry"]', f);
  const assets = $('input[name="assets"]', f);
  const message = $('textarea[name="message"]', f);

  // Enhanced validation handlers
  const validateName = (field) => {
    const value = (field.value || "").trim();
    if (!value) {
      showErr(field, "Name is required");
    } else if (value.length < 2) {
      showErr(field, "Name must be at least 2 characters");
    } else {
      clearErr(field);
    }
  };

  const validateEmail = (field) => {
    const value = (field.value || "").trim();
    if (!value) {
      showErr(field, "Email is required");
    } else if (!emailRe.test(value)) {
      showErr(field, "Please enter a valid email address");
    } else {
      clearErr(field);
    }
  };

  const validateCompany = (field) => {
    const value = (field.value || "").trim();
    if (!value) {
      showErr(field, "Company is required");
    } else if (value.length < 2) {
      showErr(field, "Company name must be at least 2 characters");
    } else {
      clearErr(field);
    }
  };

  const validateCountry = (field) => {
    if (!field.value) {
      showErr(field, "Please select your country");
    } else {
      clearErr(field);
    }
  };

  const validateIndustry = (field) => {
    if (!field.value) {
      showErr(field, "Please select your industry");
    } else {
      clearErr(field);
    }
  };

  const validateAssets = (field) => {
    const value = (field.value || "").trim();
    if (value === "") {
      clearErr(field); // Assets is optional
    } else {
      const n = Number(value);
      if (isNaN(n) || n < 1) {
        showErr(field, "Number of assets must be 1 or more");
      } else {
        clearErr(field);
      }
    }
  };

  const validatePhoneField = async (field, options = {}) => {
    const value = (field.value || "").trim();
    if (!value) {
      clearErr(field); // Phone is optional
      return { ok: true, e164: "" };
    }

    const { ok, e164 } = await validatePhone(iti, field, {
      wait: !options.immediate,
    });
    showErr(field, ok ? "" : "Please enter a valid phone number");
    return { ok, e164 };
  };

  // Setup enhanced validation for all fields
  const nameValidator = setupFieldValidation(name, validateName, {
    validateOnInput: true,
    validateOnBlur: true,
    required: true,
  });

  const emailValidator = setupFieldValidation(email, validateEmail, {
    validateOnInput: true,
    validateOnBlur: true,
    required: true,
  });

  const companyValidator = setupFieldValidation(company, validateCompany, {
    validateOnInput: true,
    validateOnBlur: true,
    required: true,
  });

  const countryValidator = setupFieldValidation(country, validateCountry, {
    validateOnInput: false,
    validateOnBlur: true,
    validateOnChange: true,
    required: true,
  });

  const industryValidator = setupFieldValidation(industry, validateIndustry, {
    validateOnInput: false,
    validateOnBlur: true,
    validateOnChange: true,
    required: true,
  });

  const assetsValidator = setupFieldValidation(assets, validateAssets, {
    validateOnInput: true,
    validateOnBlur: true,
    required: false, // Assets is optional
  });

  // Special handling for phone with async validation
  let phoneWasTouched = false;

  phone?.addEventListener("input", async () => {
    if (!phoneWasTouched) return;
    await validatePhoneField(phone, { immediate: false });
  });

  phone?.addEventListener("countrychange", async () => {
    if (!phoneWasTouched) return;
    await validatePhoneField(phone, { immediate: false });
  });

  phone?.addEventListener("blur", async () => {
    phoneWasTouched = true;
    await validatePhoneField(phone, { immediate: true });
  });

  // Submit with comprehensive validation
  f.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Mark all fields as touched and validate
    nameValidator.markTouched();
    emailValidator.markTouched();
    companyValidator.markTouched();
    countryValidator.markTouched();
    industryValidator.markTouched();
    assetsValidator.markTouched();
    phoneWasTouched = true;

    // Run synchronous validations first
    validateName(name);
    validateEmail(email);
    validateCompany(company);
    validateCountry(country);
    validateIndustry(industry);
    validateAssets(assets);

    // Run async phone validation
    const phoneResult = await validatePhoneField(phone, { immediate: true });

    // Check for any errors
    const errorFields = f.querySelectorAll(".invalid");
    if (errorFields.length > 0) {
      const firstError = errorFields[0];
      firstError.focus();
      firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Lock UI
    const btn = f.querySelector('button[type="submit"]');
    const btnTxt = btn?.textContent || "";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Submitting…";
    }

    // Normalize phone E.164 only if field has content
    let e164 = "";
    if (phone && phone.value.trim()) {
      e164 = phoneResult.e164;
      phone.value = e164;
    }

    // Attribution
    const attr = getAttribution();

    // Notes (optional)
    const notes = (message?.value || "").trim();

    // Base payload (for CSV + base for others)
    const fd = new FormData(f);
    if (phone && phone.value.trim()) fd.set("phone", phone.value); // normalized E.164
    fd.append("brand", BRAND); // explicit brand hint
    fd.append("timestamp", new Date().toISOString());
    fd.append("source", location.hostname);

    // Add notes if provided
    if (notes) {
      fd.set("message", notes);
      fd.set("notes", notes);
    }

    // attribution
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

    // Ensure page_url exists for Sheets
    fd.set("page_url", window.location.href);

    const payload = Object.fromEntries(fd.entries());

    // ===== CSV FIRST (show success immediately on 200) =====
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
      // SUCCESS PANEL (outside the form so it stays visible)
      renderSuccessAfter(
        f,
        "Thank you! We'll contact you within 1 business day to schedule your site survey."
      );
      f.style.display = "none";

      // Conversion tracking
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "generate_lead",
        formId: "leadForm",
        pageUrl: window.location.href,
      });

      // Sheets (URL-encoded)
      if (hasUrl(SHEETS_ENDPOINT) && SHEETS_ENDPOINT.includes("/exec")) {
        const sp = new URLSearchParams();

        // Map fields for sheets
        sp.append("name", payload.name || "");
        sp.append("email", payload.email || "");
        const ph = payload.phone || "";
        sp.append("phone", ph);
        sp.append("company", payload.company || "");
        sp.append("country", payload.country || "");
        sp.append("industry", payload.industry || "");
        sp.append("assets", payload.assets || "");
        sp.append("message", payload.message || "");
        sp.append("notes", payload.notes || "");

        // URLs/referrer
        const pageURL = window.location.href;
        sp.append("page_url", pageURL);
        sp.append("referrer", attr.referrer);

        // timestamp
        sp.append("timestamp", new Date().toISOString());

        // UTMs
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

      // Email (JSON)
      if (hasUrl(EMAIL_ENDPOINT)) {
        const emailPayload = {
          brand: BRAND,
          name: payload.name || "",
          email: payload.email || "",
          phone: payload.phone || "",
          company: payload.company || "",
          country: payload.country || "",
          industry: payload.industry || "",
          assets: payload.assets || "",
          message: payload.message || "",
          notes: payload.notes || "",
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
      // Show error (keep form visible so user can retry)
      const msg = "Something went wrong. Please try again or call us directly.";
      const alert = document.createElement("div");
      alert.className = "form-error";
      alert.style.marginTop = "12px";
      alert.textContent = msg;
      f.insertAdjacentElement("afterend", alert);
    }

    if (btn) {
      btn.disabled = false;
      btn.textContent = btnTxt;
    }
  });
});
