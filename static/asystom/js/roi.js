(function(){
  var form = document.getElementById("roiForm");
  var out = document.getElementById("roiResult");
  if(!form || !out) return;
  form.addEventListener("submit", function(e){
    e.preventDefault();
    var fd = new FormData(form);
    var cph = parseFloat(fd.get("cost_per_hour")||0);
    var hpm = parseFloat(fd.get("hours_per_month")||0);
    var red = (parseFloat(fd.get("reduction_pct")||0)/100);
    var mc  = parseFloat(fd.get("maint_cost")||0);
    var mred= (parseFloat(fd.get("maint_reduction_pct")||0)/100);
    var downtime_savings = cph * hpm * red;
    var maint_savings = mc * mred;
    var monthly_roi = downtime_savings + maint_savings;
    out.innerHTML = "<strong>Estimated Monthly Savings:</strong> £" +
      monthly_roi.toLocaleString(undefined,{maximumFractionDigits:0}) +
      "<br><small>Downtime: £" + downtime_savings.toLocaleString(undefined,{maximumFractionDigits:0}) +
      "; Maintenance: £" + maint_savings.toLocaleString(undefined,{maximumFractionDigits:0}) + "</small>";
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "roi_calculated", monthly_roi: monthly_roi });
  });
})();
