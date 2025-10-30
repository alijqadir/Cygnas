// Professional form handling with backend integration
const CSV_ENDPOINT = "https://api.hajjguider.com/csv-capture.php";
const SHEETS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbx04QsemFyIJrUblOpXNVSJj8R09GKUsSbvmI2DCvC0Kf_VsI1i8iRTTtxByGkB1hod/exec";
const EMAIL_ENDPOINT = "https://api.hajjguider.com/send-email.php";
const BRAND = "Asystom";

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("professionalLeadForm");
  if (!form) return;

  // Attribution stitching
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

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    const messageDiv = document.getElementById("professionalFormMessage");

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
    messageDiv.innerHTML = "";
    messageDiv.className = "";

    // Validate required fields
    const requiredFields = form.querySelectorAll("[required]");
    let valid = true;
    requiredFields.forEach((field) => {
      if (!field.value.trim()) {
        valid = false;
        field.style.borderColor = "var(--danger)";
      } else {
        field.style.borderColor = "";
      }
    });

    if (!valid) {
      messageDiv.innerHTML = "Please fill in all required fields";
      messageDiv.className = "form-error";
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }

    // Prepare form data
    const formData = new FormData(form);
    formData.append("timestamp", new Date().toISOString());
    formData.append("source", "cygnas.co.uk");
    formData.append("brand", BRAND);

    const payload = Object.fromEntries(formData.entries());

    try {
      // Send to CSV endpoint
      const csvResponse = await fetch(CSV_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (csvResponse.ok) {
        messageDiv.innerHTML =
          "Thank you! We will contact you within 1 business day to schedule your assessment.";
        messageDiv.className = "form-success";
        form.reset();

        // Track conversion
        if (window.dataLayer) {
          window.dataLayer.push({
            event: "generate_lead",
            form_type: "professional_lead",
          });
        }

        // Send to additional endpoints
        try {
          // Google Sheets
          const sheetsParams = new URLSearchParams();
          Object.keys(payload).forEach((key) => {
            sheetsParams.append(key, payload[key]);
          });
          fetch(SHEETS_ENDPOINT, {
            method: "POST",
            body: sheetsParams,
          }).catch(() => {});

          // Email
          fetch(EMAIL_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }).catch(() => {});
        } catch (secondaryError) {
          console.log("Secondary endpoints may have failed");
        }
      } else {
        throw new Error("CSV endpoint failed");
      }
    } catch (error) {
      console.error("Form submission error:", error);
      messageDiv.innerHTML =
        "Sorry, there was an error submitting your form. Please try again or contact us directly.";
      messageDiv.className = "form-error";
    }

    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  });
});
