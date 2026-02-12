// Fix header size: compute CSS var so spacing aligns everywhere
function setHeaderVar(){
  const header = document.getElementById('header');
  const h = header ? header.offsetHeight : 120;
  document.documentElement.style.setProperty('--header-h', h + 'px');
}
window.addEventListener('load', setHeaderVar);
window.addEventListener('resize', setHeaderVar);

// Sticky header style
const headerEl = document.getElementById('header');
if (headerEl) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) headerEl.classList.add('scrolled');
    else headerEl.classList.remove('scrolled');
  });
}

// Mobile menu
const hamburger=document.getElementById('hamburger');
const navLinks=document.getElementById('navLinks');
if (hamburger && navLinks) {
  function closeMenu(){
    hamburger.classList.remove('active');
    navLinks.classList.remove('active');
    document.body.classList.remove('noscroll');
  }
  function toggleMenu(){
    const isActive = navLinks.classList.toggle('active');
    hamburger.classList.toggle('active', isActive);
    document.body.classList.toggle('noscroll', isActive);
  }
  hamburger.addEventListener('click', toggleMenu);
  document.querySelectorAll('#navLinks a').forEach(a=>a.addEventListener('click', closeMenu));
  window.addEventListener('keydown', (e)=>{ if (e.key==='Escape') closeMenu(); });
}

// Smooth scroll with dynamic offset
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e){
    const target=document.querySelector(this.getAttribute('href'));
    if(!target) return; e.preventDefault();
    const headerH=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'))||120;
    const rect=target.getBoundingClientRect();
    const scrollTop=window.pageYOffset || document.documentElement.scrollTop;
    const top=rect.top + scrollTop - (headerH + 12);
    window.scrollTo({ top, behavior:'smooth' });
  });
});

// Google Sheets submission
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwLSOeJG8SN1ifQyQ_fTqBzzXi4P7wXvhOURQltcqRhB6vO4tTYMQrRzXrV1Xux-FWJ/exec';
const contactForm=document.getElementById('contactForm');
if (contactForm) {
  const submitBtn=document.getElementById('submitBtn');
  const formMessage=document.getElementById('formMessage');
  contactForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (submitBtn) { submitBtn.disabled=true; submitBtn.innerHTML='<i class="ti ti-loader-2"></i> Sending...'; }
    const data=Object.fromEntries(new FormData(contactForm));
    try{
      const res=await fetch(SCRIPT_URL,{method:'POST',body:JSON.stringify(data),headers:{'Content-Type':'text/plain'}});
      const result=await res.json();
      if(result.result==='success'){
        if (formMessage) {
          formMessage.className='form-message success'; formMessage.style.display='block';
          formMessage.textContent='Thank you! Your message has been sent successfully. We\'ll get back to you within 24 hours.';
        }
        contactForm.reset();
        window.dataLayer=window.dataLayer||[]; window.dataLayer.push({event:'leadFormSubmission',formId:'cygnasLeadForm'});
      }else{ throw new Error('Submission failed'); }
    }catch(err){
      if (formMessage) {
        formMessage.className='form-message error'; formMessage.style.display='block';
        formMessage.textContent='Sorry, there was an error sending your message. Please try again or email us directly.';
      }
    }finally{
      if (submitBtn) { submitBtn.disabled=false; submitBtn.innerHTML='<i class="ti ti-send"></i> Send Message'; }
      if (formMessage) { setTimeout(()=>{ formMessage.style.display='none'; }, 5000); }
    }
  });
}

// Interactive hero canvas (nodes + linking lines, mouse reactive)
(function(){
  const canvas = document.getElementById('heroMesh');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, dpr, nodes=[], mouse={x:-9999,y:-9999};
  const maxDist = 140;
  const nodeCount = window.matchMedia('(max-width: 768px)').matches ? 45 : 90;

  function resize(){
    dpr = window.devicePixelRatio || 1;
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function init(){
    nodes = [];
    for (let i=0;i<nodeCount;i++){
      nodes.push({
        x: Math.random()*w,
        y: Math.random()*h,
        vx: (Math.random()-0.5)*0.6,
        vy: (Math.random()-0.5)*0.6,
        r: 1.2 + Math.random()*2.2
      });
    }
  }

  function step(){
    ctx.clearRect(0,0,w,h);
    // parallax gradient background
    const grd = ctx.createLinearGradient(0,0,w,h);
    grd.addColorStop(0,'rgba(59,130,246,0.15)');
    grd.addColorStop(1,'rgba(6,182,212,0.05)');
    ctx.fillStyle = grd;
    ctx.fillRect(0,0,w,h);

    // update & draw nodes
    for (let i=0;i<nodes.length;i++){
      const n = nodes[i];
      // mouse repulsion
      const dx = n.x - mouse.x, dy = n.y - mouse.y, md = Math.hypot(dx,dy);
      if (md < 120){
        const force = (120 - md)/120;
        n.vx += (dx/md||0)*force*0.6;
        n.vy += (dy/md||0)*force*0.6;
      }
      n.x += n.vx; n.y += n.vy;
      // bounce
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;

      // draw node
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(156, 209, 255, 0.9)';
      ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(96,165,250,0.6)';
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // draw connections
    ctx.lineWidth = 1;
    for (let i=0;i<nodes.length;i++){
      for (let j=i+1;j<nodes.length;j++){
        const a = nodes[i], b = nodes[j];
        const dx = a.x-b.x, dy = a.y-b.y;
        const dist = Math.hypot(dx,dy);
        if (dist < maxDist){
          const alpha = 1 - (dist/maxDist);
          ctx.strokeStyle = `rgba(147,197,253,${0.35*alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
      }
    }
    requestAnimationFrame(step);
  }

  function onMove(e){
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }
  function onLeave(){
    mouse.x = -9999; mouse.y = -9999;
  }

  resize(); init(); step();
  window.addEventListener('resize', ()=>{ resize(); init(); setHeaderVar(); });
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseleave', onLeave);
})();;
