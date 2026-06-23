// ====== Endpoints & brand ======
const CSV_ENDPOINT = "https://api.hajjguider.com/csv-capture.php";
const SHEETS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbx04QsemFyIJrUblOpXNVSJj8R09GKUsSbvmI2DCvC0Kf_VsI1i8iRTTtxByGkB1hod/exec";
const EMAIL_ENDPOINT = "https://api.hajjguider.com/send-email.php";
const BRAND = "Asystom";

// ====== Form Handling ======
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("leadForm");
  if (!form) return;

  // Set up attribution
  setupAttribution();

  // Initialize phone input if available
  initializePhoneInput();

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
  const messageDiv = document.getElementById("formMessage");

  // Store original button state
  const originalText = submitBtn.textContent;
  const originalDisabled = submitBtn.disabled;

  // Update UI
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";
  messageDiv.innerHTML = "";
  messageDiv.className = "";

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
      messageDiv,
      "Thank you! We will contact you within 1 business day."
    );
    form.reset();

    // Track conversion
    trackConversion();
  } catch (error) {
    // Error handling
    showError(
      messageDiv,
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

  requiredFields.forEach((field) => {
    if (!field.value.trim()) {
      isValid = false;
      field.classList.add("invalid");
    } else {
      field.classList.remove("invalid");
    }

    // Email validation
    if (field.type === "email" && field.value.trim()) {
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value);
      if (!emailValid) {
        isValid = false;
        field.classList.add("invalid");
      }
    }
  });

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
