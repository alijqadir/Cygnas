/* form-to-sheets.js
 * Drop-in script: captures the first form on the page (or any with [data-sheets])
 * and posts to a Google Apps Script Web App endpoint that writes to a Google Sheet.
 * Replace ENDPOINT with your deployed Web App URL.
 */
(function () {
  var ENDPOINT =
    "https://script.google.com/macros/s/AKfycbyoH33HyuAAPcGtj7GEUS-0DxZDTW5RZQlPZtuoQcANZkEfhMvxID9_grfBEkrck1s4/exec"; // <-- replace
  var THANK_YOU_URL = "/zwsoft-europe/thank-you.html"; // <-- adjust path if needed
  var USE_AJAX = true; // set to false to use normal POST + redirect

  function findForm() {
    var f = document.querySelector(
      "form[data-sheets], form#lead, form[action], form"
    );
    return f || null;
  }

  function addHidden(f, name, value) {
    var input = f.querySelector('input[name="' + name + '"]');
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      f.appendChild(input);
    }
    input.value = value;
  }

  function handleSubmit(e) {
    var f = e.currentTarget;
    if (!USE_AJAX) {
      // Use normal POST: point form action to ENDPOINT and let Apps Script redirect to THANK_YOU_URL
      f.action = ENDPOINT;
      f.method = "POST";
      return true;
    }
    // AJAX: intercept, post via fetch, then inline thank-you or redirect
    e.preventDefault();
    var fd = new FormData(f);

    // Honeypot (optional): ignore if filled
    var hp = (fd.get("website") || fd.get("honeypot") || "").toString().trim();
    if (hp.length > 0) {
      // quietly "succeed"
      window.location.assign(THANK_YOU_URL);
      return;
    }

    // Context fields
    fd.set("page_url", window.location.href);
    fd.set("referrer", document.referrer || "");
    fd.set("user_agent", navigator.userAgent || "");

    // UTM capture
    try {
      var params = new URLSearchParams(window.location.search);
      [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
      ].forEach(function (k) {
        if (params.has(k)) fd.set(k, params.get(k));
      });
    } catch (err) {}

    // Mark as AJAX to get JSON
    fd.set("_ajax", "1");

    fetch(ENDPOINT, { method: "POST", body: fd })
      .then(function (res) {
        var ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) return res.json();
        return { ok: res.ok };
      })
      .then(function (data) {
        if (data && data.ok) {
          // Redirect to thank-you or replace form
          try {
            window.location.assign(THANK_YOU_URL);
          } catch (e) {
            f.outerHTML =
              '<div class="form-thanks" style="margin-top:12px;color:#0a0;">Thanks! We’ll get back to you shortly.</div>';
          }
        } else {
          alert("Submission failed. Please try again.");
        }
      })
      .catch(function () {
        alert("Network error. Please try again.");
      });
  }

  function boot() {
    var f = findForm();
    if (!f) return;
    // Ensure common name attributes exist (non-destructive)
    var map = [
      [
        'input[type="text"][name="name"], input[name="fullname"], input[placeholder*="Name" i]',
        "name",
      ],
      [
        'input[type="email"], input[name="email"], input[placeholder*="Email" i]',
        "email",
      ],
      ['input[name="company"], input[placeholder*="Company" i]', "company"],
      [
        'input[type="tel"], input[name="phone"], input[placeholder*="Phone" i]',
        "phone",
      ],
      [
        'textarea[name="message"], textarea[placeholder*="Message" i], textarea',
        "message",
      ],
    ];
    map.forEach(function (pair) {
      try {
        var sel = pair[0],
          targetName = pair[1];
        var el = f.querySelector(sel);
        if (el && !el.name) el.setAttribute("name", targetName);
      } catch (err) {}
    });

    // Add hidden fields
    addHidden(f, "page_url", "");
    addHidden(f, "referrer", "");
    addHidden(f, "user_agent", "");
    addHidden(f, "_ajax", "1");
    // honeypot
    var hp = f.querySelector('input[name="website"], input[name="honeypot"]');
    if (!hp) {
      hp = document.createElement("input");
      hp.type = "text";
      hp.name = "website";
      hp.autocomplete = "off";
      hp.tabIndex = -1;
      hp.style.display = "none";
      f.appendChild(hp);
    }

    f.addEventListener("submit", handleSubmit);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
