/* asystom lead form fallback: bypass CORS by classic POST to Google Apps Script via hidden iframe */
(function(){
  var SHEETS_ENDPOINT = "https://script.google.com/macros/s/AKfycbx04QsemFyIJrUblOpXNVSJj8R09GKUsSbvmI2DCvC0Kf_VsI1i8iRTTtxByGkB1hod/exec";

  function toParams(form){
    var fd = new FormData(form);
    // Add timestamp + brand + source (align with site conventions)
    if (!fd.has("timestamp")) fd.set("timestamp", new Date().toISOString());
    if (!fd.has("brand")) fd.set("brand", "Asystom");
    if (!fd.has("source")) fd.set("source", location.hostname || "cygnas.co.uk");

    // Prefer E.164 phone if intl-tel-input present
    try {
      var phoneEl = form.querySelector('#phone');
      if (phoneEl && window.iti && typeof window.iti.getNumber === 'function') {
        var e164 = window.iti.getNumber();
        if (e164) fd.set('phone', e164);
      }
    } catch(_){}

    var params = new URLSearchParams();
    fd.forEach(function(v,k){ params.append(k, v); });
    return params;
  }

  function classicPost(params){
    // Hidden iframe target to avoid navigation
    var iframeName = 'lf_iframe_' + Math.random().toString(36).slice(2);
    var iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    var f = document.createElement('form');
    f.action = SHEETS_ENDPOINT;
    f.method = 'POST';
    f.target = iframeName;
    f.style.display = 'none';

    params.forEach(function(v,k){
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = k;
      input.value = v;
      f.appendChild(input);
    });

    document.body.appendChild(f);
    return new Promise(function(resolve){
      var done = false;
      function cleanup(){ if (f.parentNode) f.parentNode.removeChild(f); if (iframe.parentNode) iframe.parentNode.removeChild(iframe); }
      iframe.addEventListener('load', function(){ if (done) return; done = true; cleanup(); resolve(true); });
      setTimeout(function(){ if (done) return; done = true; cleanup(); resolve(true); }, 1200);
      try { f.submit(); } catch(_) { done = true; cleanup(); resolve(false); }
    });
  }

  function findForm(){
    return document.getElementById('leadForm') || document.getElementById('professionalLeadForm') || document.getElementById('supportForm');
  }

  function findMessageBox(form){
    return document.getElementById('formMessage') || document.getElementById('professionalFormMessage') || document.getElementById('supportMessage');
  }

  function enhance(){
    var form = findForm();
    if (!form) return;

    form.addEventListener('submit', function(e){
      // Capture-phase handler in fallback ensures we run before other listeners
    }, true);

    form.addEventListener('submit', function(e){
      // Prevent other JS (which may use fetch and hit CORS)
      e.preventDefault();
      e.stopImmediatePropagation();

      var submitBtn = form.querySelector('button[type="submit"]');
      var msg = findMessageBox(form);
      if (!msg) {
        msg = document.createElement('div');
        msg.id = 'formMessage';
        form.appendChild(msg);
      }
      var origText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }
      msg.className = '';
      msg.textContent = '';

      var params = toParams(form);
      classicPost(params).then(function(){
        msg.className = 'form-success';
        msg.style.display = 'block';
        msg.textContent = "Thank you! We will contact you within 1 business day.";
        try { form.reset(); } catch(_){ }
      }).catch(function(){
        msg.className = 'form-error';
        msg.style.display = 'block';
        msg.textContent = 'Submission failed. Please try again.';
      }).finally(function(){
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origText || 'Submit'; }
      });
    }, { capture: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhance);
  } else {
    enhance();
  }
})();
