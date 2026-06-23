// Endpoints (reuse your existing infra)
const CSV_ENDPOINT = "https://api.hajjguider.com/csv-capture.php";
const SHEETS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbx04QsemFyIJrUblOpXNVSJj8R09GKUsSbvmI2DCvC0Kf_VsI1i8iRTTtxByGkB1hod/exec";
const EMAIL_ENDPOINT = "https://api.hajjguider.com/send-email.php";
const BRAND = "Cygnas-Support";

const $ = (s, r = document) => r.querySelector(s);
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hasUrl = (v) => typeof v === "string" && /^https?:\/\//i.test(v);
function showErr(input, msg) {
  const el = input?.parentElement?.querySelector?.(".error");
  if (el) {
    el.textContent = msg || "";
  }
  if (input) {
    input.classList.toggle("invalid", !!msg);
  }
}
function clearErr(input) {
  showErr(input, "");
}
function getAttribution() {
  const u = new URL(location.href),
    qp = u.searchParams,
    ref = document.referrer || "";
  let host = "";
  try {
    host = ref ? new URL(ref).hostname : "";
  } catch {}
  const src =
    qp.get("utm_source") ||
    (/google\./i.test(host)
      ? "google"
      : /bing\./i.test(host)
      ? "bing"
      : host
      ? "referral"
      : "direct");
  return {
    utm_source: qp.get("utm_source") || "",
    utm_medium: qp.get("utm_medium") || "",
    utm_campaign: qp.get("utm_campaign") || "",
    utm_term: qp.get("utm_term") || "",
    utm_content: qp.get("utm_content") || "",
    referrer: ref,
    referrer_host: host,
    source_channel: src,
    landing_page: location.href,
    user_agent: navigator.userAgent,
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const f = $("#supportForm");
  if (!f) return;
  const name = $('input[name="name"]', f),
    email = $('input[name="email"]', f),
    phone = $('input[name="phone"]', f),
    company = $('input[name="company"]', f),
    category = $('select[name="category"]', f),
    priority = $('select[name="priority"]', f),
    subject = $('input[name="subject"]', f),
    details = $('textarea[name="details"]', f);

  $("#page_url", f).value = window.location.href;

  // Optional intl-tel-input
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

  // Live validation
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
      emailRe.test((email.value || "").trim()) ? "" : "Enter a valid email"
    )
  );
  category?.addEventListener("change", () => clearErr(category));
  priority?.addEventListener("change", () => clearErr(priority));
  subject?.addEventListener("input", () => clearErr(subject));
  details?.addEventListener("input", () => clearErr(details));

  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errs = [];
    if (!name || (name.value || "").trim().length < 2)
      errs.push([name, "Name must be at least 2 characters"]);
    if (!email || !emailRe.test((email.value || "").trim()))
      errs.push([email, "Enter a valid email"]);
    if (!category || !category.value)
      errs.push([category, "Select a category"]);
    if (!priority || !priority.value)
      errs.push([priority, "Select a priority"]);
    if (!subject || !(subject.value || "").trim())
      errs.push([subject, "Enter a subject"]);
    if (!details || !(details.value || "").trim())
      errs.push([details, "Add some details"]);

    if (errs.length) {
      errs.forEach(([el, msg]) => showErr(el, msg));
      errs[0][0]?.focus();
      return;
    }
    [name, email, phone, category, priority, subject, details].forEach(
      (el) => el && clearErr(el)
    );

    const btn = f.querySelector('button[type="submit"]'),
      btntxt = btn?.textContent || "";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Submitting…";
    }

    // Normalize phone
    if (iti && phone) {
      try {
        phone.value = iti.getNumber();
      } catch {}
    }

    // Build payload
    const fd = new FormData(f);
    fd.append("brand", BRAND);
    fd.append("timestamp", new Date().toISOString());
    fd.append("source", location.hostname);
    const attr = getAttribution();
    for (const [k, v] of Object.entries(attr)) fd.append(k, v);

    const payload = Object.fromEntries(fd.entries());

    // 1) CSV (blocking; controls success UI)
    let csvOK = false;
    try {
      const r = await fetch(CSV_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        mode: "cors",
      });
      csvOK = r.ok;
    } catch (e) {
      csvOK = false;
    }

    if (csvOK) {
      // Success UI
      const panel = document.createElement("div");
      panel.className = "form-success";
      panel.textContent =
        "Thanks! Your ticket has been received. We’ll be in touch shortly.";
      f.insertAdjacentElement("afterend", panel);
      f.style.display = "none";

      // 2) Sheets (fire-and-forget)
      if (hasUrl(SHEETS_ENDPOINT) && SHEETS_ENDPOINT.includes("/exec")) {
        const sp = new URLSearchParams();
        sp.append("type", "support");
        sp.append("name", payload.name || "");
        sp.append("email", payload.email || "");
        sp.append("phone", payload.phone || "");
        sp.append("company", payload.company || "");
        sp.append("category", payload.category || "");
        sp.append("priority", payload.priority || "");
        sp.append("subject", payload.subject || "");
        sp.append("details", payload.details || "");
        sp.append("page_url", payload.page_url || location.href);
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

      // 3) Email (fire-and-forget)
      if (hasUrl(EMAIL_ENDPOINT)) {
        const emailPayload = {
          brand: BRAND,
          type: "support",
          name: payload.name || "",
          email: payload.email || "",
          phone: payload.phone || "",
          company: payload.company || "",
          category: payload.category || "",
          priority: payload.priority || "",
          subject: payload.subject || "",
          details: payload.details || "",
          pageUrl: location.href,
          ...attr,
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
      alert.textContent =
        "Something went wrong. Please try again or email support@cygnas.co.uk.";
      f.insertAdjacentElement("afterend", alert);
    }

    if (btn) {
      btn.disabled = false;
      btn.textContent = btntxt;
    }
  });
});
