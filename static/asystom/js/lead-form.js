// ====== Endpoints & brand ======
const CSV_ENDPOINT = "https://api.hajjguider.com/csv-capture.php";
const SHEETS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbxVI2npxiPQkDyhvxhMAxhR0ZoIJpjiB3kZkePtfaee4NfYieUfLliiJN3MWnFvq7sC/exec";
const EMAIL_ENDPOINT = "https://api.hajjguider.com/send-email.php";
const BRAND = "Asystom";

window.__asystomLeadForm = window.__asystomLeadForm || { ready: false };

let messageDiv = null;

// ====== Form Handling ======
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("leadForm");
  if (!form) return;

  messageDiv = ensureMessageBox(form);

  window.__asystomLeadForm.ready = true;
  window.__asystomLeadForm.form = form;
  window.__asystomLeadForm.validate = function () {
    return validateForm(form);
  };

  // Set up attribution
  setupAttribution();

  // Initialize phone input if available
  initializePhoneInput();

  attachFieldListeners(form);

  // Form submission handler
  form.addEventListener("submit", handleFormSubmit);
});

function setupAttribution() {
  const params = new URLSearchParams(window.location.search);

  function setVal(name, val) {
    const el = document.querySelector(`[name="${name}"]`);
    if (el) el.value = val || "";
  }

  // Set UTM parameters
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
}

function initializePhoneInput() {
  const phoneInput = document.getElementById("phone");
  if (phoneInput && window.intlTelInput) {
    window.iti = window.intlTelInput(phoneInput, {
      initialCountry: "gb",
      separateDialCode: true,
      preferredCountries: ["gb", "ie", "de", "fr", "nl"],
      utilsScript:
        "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.js",
    });
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const msgBox = messageDiv || ensureMessageBox(form);

  // Store original button state
  const originalText = submitBtn.textContent;
  const originalDisabled = submitBtn.disabled;

  // Update UI
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";
  if (msgBox) {
    msgBox.innerHTML = "";
    msgBox.className = "form-message";
    msgBox.style.display = "none";
  }

  try {
    // Validate form
    if (!validateForm(form)) {
      throw new Error("Please fill in all required fields correctly");
    }

    // Prepare form data
    const formData = prepareFormData(form);

    // Submit to backend
    await submitToBackend(formData);

    // Success
    showSuccess(
      msgBox,
      "Thank you! We will contact you within 1 business day."
    );
    form.reset();

    // Track conversion
    trackConversion();
  } catch (error) {
    // Error handling
    showError(
      msgBox,
      error.message || "Something went wrong. Please try again."
    );
  } finally {
    // Restore button state
    submitBtn.disabled = originalDisabled;
    submitBtn.textContent = originalText;
  }
}

function validateForm(form) {
  const requiredFields = form.querySelectorAll("[required]");
  let isValid = true;
  let firstInvalid = null;

  requiredFields.forEach((field) => {
    const rawValue = field.value != null ? field.value : "";
    const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
    let errorMessage = "";

    if (!value) {
      errorMessage = "This field is required.";
    } else if (field.type === "email") {
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if (!emailValid) {
        errorMessage = "Enter a valid business email.";
      }
    } else if (field.name === "phone") {
      const phoneValid = /^\+?[0-9()\-\s]{7,20}$/.test(value);
      if (!phoneValid) {
        errorMessage = "Enter a valid phone number.";
      }
    }

    if (errorMessage) {
      isValid = false;
      if (!firstInvalid) firstInvalid = field;
      setFieldError(field, errorMessage);
    } else {
      clearFieldError(field);
    }
  });

  if (!isValid && firstInvalid) {
    firstInvalid.focus({ preventScroll: false });
  }

  return isValid;
}

function prepareFormData(form) {
  const formData = new FormData(form);

  // Add timestamp and brand
  formData.append("timestamp", new Date().toISOString());
  formData.append("brand", BRAND);
  formData.append("source", "cygnas.co.uk");

  // Format phone number if international input is used
  if (window.iti) {
    const phoneNumber = window.iti.getNumber();
    if (phoneNumber) {
      formData.set("phone", phoneNumber);
    }
  }

  return Object.fromEntries(formData.entries());
}

async function submitToBackend(payload) {
  // Send to CSV endpoint (primary)
  const csvResponse = await fetch(CSV_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!csvResponse.ok) {
    throw new Error("Failed to submit form");
  }

  // Send to additional endpoints (fire and forget)
  submitToAdditionalEndpoints(payload);

  return true;
}

function submitToAdditionalEndpoints(payload) {
  // Google Sheets
  try {
    const sheetsParams = new URLSearchParams();
    Object.keys(payload).forEach((key) => {
      sheetsParams.append(key, payload[key]);
    });

    fetch(SHEETS_ENDPOINT, {
      method: "POST",
      body: sheetsParams,
    }).catch(() => {
      /* Ignore errors for secondary endpoints */
    });
  } catch (e) {}

  // Email
  try {
    fetch(EMAIL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {
      /* Ignore errors for secondary endpoints */
    });
  } catch (e) {}
}

function ensureMessageBox(form) {
  let box =
    document.getElementById("formMessage") ||
    form.querySelector(".form-message");
  if (!box) {
    box = document.createElement("div");
    box.id = "formMessage";
    box.className = "form-message";
    box.style.display = "none";
    form.appendChild(box);
  }
  return box;
}

function getErrorContainer(field) {
  return field.closest("label") || field.parentElement || field;
}

function setFieldError(field, message) {
  field.classList.add("invalid");
  field.setAttribute("aria-invalid", "true");
  const container = getErrorContainer(field);
  if (!container) return;
  let msg = container.querySelector(".error-message");
  if (!msg) {
    msg = document.createElement("div");
    msg.className = "error-message";
    container.appendChild(msg);
  }
  msg.textContent = message;
  msg.style.display = "block";
}

function clearFieldError(field) {
  field.classList.remove("invalid");
  field.removeAttribute("aria-invalid");
  const container = getErrorContainer(field);
  if (!container) return;
  const msg = container.querySelector(".error-message");
  if (msg) {
    msg.textContent = "";
    msg.style.display = "none";
  }
}

function attachFieldListeners(form) {
  form
    .querySelectorAll("input, select, textarea")
    .forEach(function (field) {
      const handler = function () {
        if (field.classList.contains("invalid")) {
          const rawValue = field.value != null ? field.value : "";
          const value =
            typeof rawValue === "string" ? rawValue.trim() : rawValue;
          if (!value) return;
          if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
            return;
          if (
            field.name === "phone" &&
            !/^\+?[0-9()\-\s]{7,20}$/.test(value)
          )
            return;
          clearFieldError(field);
        }
      };
      field.addEventListener("input", handler);
      field.addEventListener("change", handler);
    });
}

function showSuccess(messageDiv, text) {
  messageDiv.innerHTML = text;
  messageDiv.className = "form-success";
  messageDiv.style.display = "block";
}

function showError(messageDiv, text) {
  messageDiv.innerHTML = text;
  messageDiv.className = "form-error";
  messageDiv.style.display = "block";
}

function trackConversion() {
  // Google Analytics
  if (window.dataLayer) {
    window.dataLayer.push({
      event: "generate_lead",
      form_type: "contact_form",
    });
  }

  // Facebook Pixel
  if (window.fbq) {
    window.fbq("track", "Lead");
  }
}
