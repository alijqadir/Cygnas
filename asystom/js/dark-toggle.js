
// Dark mode toggle. Call window.toggleTheme() from a button.
// Persists preference in localStorage("theme": "dark"|"light")
(function(){
  var key = "theme";
  function apply(mode){
    if(!mode){ document.documentElement.removeAttribute("data-theme"); return; }
    document.documentElement.setAttribute("data-theme", mode);
  }
  var saved = localStorage.getItem(key);
  if(saved){ apply(saved); }
  window.toggleTheme = function(){
    var cur = document.documentElement.getAttribute("data-theme");
    var next = (cur === "dark") ? "light" : "dark";
    apply(next);
    localStorage.setItem(key, next);
  };
})();
