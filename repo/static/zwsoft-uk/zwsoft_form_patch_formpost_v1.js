/* zwsoft_form_patch_formpost_v1.js
 * Fixes "Network error" by avoiding fetch/CORS. Uses classic form POST to Google Apps Script.
 * - Unbinds original handlers
 * - Computes E.164 phone (intlTelInput/jQuery/CSS dial code fallback)
 * - Adds hidden inputs: phone (E.164), phone_raw, page_url, referrer, user_agent, utm_*
 * - Points action to ENDPOINT and lets the browser submit normally.
 */
(function () {
  var ENDPOINT =
    "https://script.google.com/macros/s/AKfycbyoH33HyuAAPcGtj7GEUS-0DxZDTW5RZQlPZtuoQcANZkEfhMvxID9_grfBEkrck1s4/exec"; // <-- paste your /exec URL
  var DEFAULT_COUNTRY_CODE = ""; // optional fallback, e.g., "+92"

  function getE164(form, input) {
    if (!input) return "";
    var raw = (input.value || "").trim();
    var e164 = "";

    try {
      if (
        window.intlTelInputGlobals &&
        typeof window.intlTelInputGlobals.getInstance === "function"
      ) {
        var inst = window.intlTelInputGlobals.getInstance(input);
        if (inst && typeof inst.getNumber === "function")
          e164 = inst.getNumber();
      }
    } catch (_) {}

    try {
      if (
        !e164 &&
        window.jQuery &&
        jQuery.fn &&
        typeof jQuery.fn.intlTelInput === "function"
      ) {
        var n = jQuery(input).intlTelInput("getNumber");
        if (n) e164 = n;
      }
    } catch (_) {}

    try {
      if (!e164) {
        var wrapper = input.closest(".iti") || form;
        var dialEl = wrapper
          ? wrapper.querySelector(".iti__selected-dial-code")
          : null;
        var dial = dialEl ? dialEl.textContent.replace(/\s/g, "") : "";
        if (!dial && DEFAULT_COUNTRY_CODE) dial = DEFAULT_COUNTRY_CODE;
        if (dial) {
          var local = raw.replace(/^[0\-\s\(\)]+/g, "");
          if (local.startsWith("0")) local = local.slice(1);
          e164 = dial + local;
        }
      }
    } catch (_) {}

    e164 = (e164 || "").replace(/[\s\-\(\)]/g, "");
    return e164 || raw;
  }

  function ensureHidden(form, name, value) {
    var el = form.querySelector('input[name="' + name + '"]');
    if (!el) {
      el = document.createElement("input");
      el.type = "hidden";
      el.name = name;
      form.appendChild(el);
    }
    el.value = value;
  }

  function setup(form) {
    if (!form) return;
    if (window.jQuery) {
      try {
        jQuery(form).off("submit");
      } catch (e) {}
    }

    form.addEventListener(
      "submit",
      function (e) {
        // DO NOT preventDefault: we want a classic POST submission
        // But stop other handlers registered earlier
        e.stopImmediatePropagation();

        var phoneEl = form.querySelector(".phone");
        var e164 = getE164(form, phoneEl);
        var raw = phoneEl ? (phoneEl.value || "").trim() : "";
        ensureHidden(form, "phone", e164);
        ensureHidden(form, "phone_raw", raw);

        // context + UTM
        ensureHidden(form, "page_url", location.href);
        ensureHidden(form, "referrer", document.referrer || "");
        ensureHidden(form, "user_agent", navigator.userAgent || "");
        try {
          var qp = new URLSearchParams(location.search);
          [
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_term",
            "utm_content",
          ].forEach(function (k) {
            if (qp.has(k)) ensureHidden(form, k, qp.get(k));
          });
        } catch (_) {}

        // Set destination and method
        form.action = ENDPOINT;
        form.method = "POST";
      },
      { capture: true }
    );
  }

  setup(document.getElementById("leadForm"));
  setup(document.getElementById("leadform"));
})();
