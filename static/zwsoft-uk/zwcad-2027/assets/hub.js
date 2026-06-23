(function () {
  var ENDPOINT =
    "https://script.google.com/macros/s/AKfycbyoH33HyuAAPcGtj7GEUS-0DxZDTW5RZQlPZtuoQcANZkEfhMvxID9_grfBEkrck1s4/exec";
  var LEGACY_SOURCE = "EN_vsACAD";
  var HUB_SOURCE = "zwcad_2027_hub";
  var lastLeadSource = "";

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function esc(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setHidden(form, name, value) {
    var input = form.querySelector('[name="' + name + '"]');
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      form.appendChild(input);
    }
    input.value = value || "";
  }

  function initialLeadSource(fallback) {
    try {
      var qp = new URLSearchParams(location.search);
      return qp.get("lead_source") || qp.get("from") || fallback || "";
    } catch (_) {
      return fallback || "";
    }
  }

  function navActive() {
    var path = location.pathname.replace(/index\.html$/, "");
    if (!path.endsWith("/")) path += "/";
    document.querySelectorAll(".zw27-hublinks a").forEach(function (link) {
      var href = new URL(link.getAttribute("href"), location.origin).pathname;
      href = href.replace(/index\.html$/, "");
      if (!href.endsWith("/")) href += "/";
      if (href === path) link.setAttribute("aria-current", "page");
    });
  }

  function formTemplate(opts) {
    var title = esc(opts.title || "Talk to Cygnas about ZWCAD 2027");
    var intro = esc(
      opts.intro ||
        "Share a few details and the Cygnas team will help with trial access, pricing, migration, or a technical demo."
    );
    var source = esc(opts.source || "zwcad_2027_hub");
    return (
      '<div class="zw27-lead-form">' +
      "<h3>" +
      title +
      "</h3>" +
      "<p>" +
      intro +
      "</p>" +
      '<form class="zw27-form" data-zw27-form action="' +
      ENDPOINT +
      '" method="POST" target="zwcad2027SubmitFrame">' +
      '<div class="zw27-form-grid">' +
      '<div class="zw27-field"><label for="zw27-first-name">First name</label><input id="zw27-first-name" name="first_name" autocomplete="given-name" required></div>' +
      '<div class="zw27-field"><label for="zw27-last-name">Last name</label><input id="zw27-last-name" name="last_name" autocomplete="family-name" required></div>' +
      '<div class="zw27-field"><label for="zw27-email">Work email</label><input id="zw27-email" name="email" type="email" autocomplete="email" required></div>' +
      '<div class="zw27-field"><label for="zw27-phone">Phone</label><input id="zw27-phone" class="phone" name="phone" type="tel" autocomplete="tel" required></div>' +
      '<div class="zw27-field"><label for="zw27-company">Company</label><input id="zw27-company" name="company" autocomplete="organization" required></div>' +
      '<div class="zw27-field"><label for="zw27-country">Country</label><select id="zw27-country" name="country" required><option value="">Select country</option><option value="United Kingdom">United Kingdom</option><option value="Ireland">Ireland</option><option value="Germany">Germany</option><option value="France">France</option><option value="Netherlands">Netherlands</option><option value="Italy">Italy</option><option value="Spain">Spain</option><option value="Other">Other</option></select></div>' +
      '<div class="zw27-field"><label for="zw27-industry">Industry</label><select id="zw27-industry" name="industry" required><option value="">Select industry</option><option>AEC / BIM</option><option>Construction / contractor</option><option>MEP engineering</option><option>Manufacturing</option><option>Plant / power / process</option><option>Surveying / GIS</option><option>Education</option><option>Other</option></select></div>' +
      '<div class="zw27-field"><label for="zw27-request">What do you need?</label><select id="zw27-request" name="request_type" required><option value="">Select request</option><option>30-day trial or beta download</option><option>Pricing or licence advice</option><option>Migration from AutoCAD or BricsCAD</option><option>Technical demo</option><option>Upgrade from older ZWCAD</option></select></div>' +
      '<div class="zw27-field zw27-field-full"><label for="zw27-message">Project note</label><textarea id="zw27-message" name="message" placeholder="Tell us about your CAD users, current tools, or deadline."></textarea></div>' +
      "</div>" +
      '<label class="zw27-consent"><input type="checkbox" name="policy" value="Y" required><span>By submitting this form you agree to the <a href="/privacy-policy.html" target="_blank" rel="noopener">Cygnas privacy policy</a> and would like to receive ZWSOFT product updates.</span></label>' +
      '<input type="text" name="website" tabindex="-1" autocomplete="off" style="display:none">' +
      '<input type="hidden" name="source" value="' +
      LEGACY_SOURCE +
      '">' +
      '<input type="hidden" name="campaign_source" value="' +
      HUB_SOURCE +
      '">' +
      '<input type="hidden" name="from" value="' +
      source +
      '">' +
      '<input type="hidden" name="product" value="ZWCAD 2027">' +
      '<input type="hidden" name="interested_product" value="ZWCAD 2027">' +
      '<input type="hidden" name="interest_level" value="">' +
      '<button class="zw27-btn zw27-btn-accent" type="submit">Request ZWCAD 2027 help</button>' +
      '<div class="zw27-form-status" role="status" aria-live="polite"></div>' +
      "</form>" +
      '<iframe name="zwcad2027SubmitFrame" title="ZWCAD 2027 form submission" hidden></iframe>' +
      "</div>"
    );
  }

  function addContext(form) {
    var first = (form.querySelector('[name="first_name"]') || {}).value || "";
    var last = (form.querySelector('[name="last_name"]') || {}).value || "";
    var phone = (form.querySelector('[name="phone"]') || {}).value || "";
    var requestType = (form.querySelector('[name="request_type"]') || {}).value || "";
    setHidden(form, "name", [first.trim(), last.trim()].filter(Boolean).join(" "));
    setHidden(form, "phone_raw", phone.trim());
    setHidden(form, "numonly", phone.replace(/\D/g, ""));
    setHidden(form, "phone_e164", "");
    setHidden(form, "country_code", "");
    setHidden(form, "interested_product", "ZWCAD 2027");
    setHidden(form, "lead_request_type", requestType);
    setHidden(form, "source", LEGACY_SOURCE);
    setHidden(form, "campaign_source", HUB_SOURCE);
    setHidden(form, "page_url", location.href);
    setHidden(form, "referrer", document.referrer || "");
    setHidden(form, "user_agent", navigator.userAgent || "");
    setHidden(form, "_ajax", "1");
    if (lastLeadSource) setHidden(form, "from", lastLeadSource);

    try {
      var qp = new URLSearchParams(location.search);
      ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(function (key) {
        if (qp.has(key)) setHidden(form, key, qp.get(key));
      });
    } catch (_) {}
  }

  function bindForm(form) {
    form.addEventListener(
      "submit",
      function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();

        if (!form.checkValidity()) {
          form.reportValidity();
          return false;
        }

        var status = form.querySelector(".zw27-form-status");
        var submit = form.querySelector('button[type="submit"]');
        addContext(form);
        form.action = ENDPOINT;
        form.method = "POST";
        form.target = "zwcad2027SubmitFrame";

        if (submit) {
          submit.dataset.originalText = submit.dataset.originalText || submit.textContent;
          submit.disabled = true;
          submit.textContent = "Submitting...";
        }
        if (status) status.textContent = "Sending your request...";

        var done = false;
        function finish() {
          if (done) return;
          done = true;
          if (status) status.textContent = "Thanks. Cygnas will be in touch shortly.";
          form.reset();
          if (submit) {
            submit.disabled = false;
            submit.textContent = submit.dataset.originalText || "Request ZWCAD 2027 help";
          }
        }

        var frame = document.querySelector('iframe[name="zwcad2027SubmitFrame"]');
        if (frame) frame.onload = finish;
        window.setTimeout(finish, 2200);
        HTMLFormElement.prototype.submit.call(form);
        return false;
      },
      true
    );
  }

  function bootForms() {
    document.querySelectorAll("[data-zw27-lead-form]").forEach(function (slot) {
      var slotSource = initialLeadSource(slot.getAttribute("data-source"));
      lastLeadSource = slotSource || lastLeadSource;
      slot.innerHTML = formTemplate({
        title: slot.getAttribute("data-title"),
        intro: slot.getAttribute("data-intro"),
        source: slotSource,
      });
      var form = slot.querySelector("form");
      if (form) bindForm(form);
    });
  }

  function bindLeadSource() {
    document.addEventListener("click", function (event) {
      var trigger = event.target.closest("[data-lead-source]");
      if (!trigger) return;
      lastLeadSource = trigger.getAttribute("data-lead-source") || "";
      document.querySelectorAll('form[data-zw27-form] input[name="from"]').forEach(function (input) {
        input.value = lastLeadSource;
      });
    });
  }

  ready(function () {
    navActive();
    bootForms();
    bindLeadSource();
  });
})();
