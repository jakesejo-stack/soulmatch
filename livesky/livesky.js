const zodiacButtons = document.querySelectorAll('[data-search]');
const popup = document.getElementById('skyInfoPopup');
const closeBtn = document.getElementById('skyInfoClose');
const reopenBtn = document.getElementById('skyInfoReopen');

const info = document.createElement('div');
info.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:20;padding:10px 14px;border-radius:999px;background:rgba(0,0,0,.66);border:1px solid rgba(255,255,255,.18);color:white;font:700 12px Inter,sans-serif;letter-spacing:.05em;text-transform:uppercase;opacity:0;transition:.25s ease;pointer-events:none';
document.body.appendChild(info);

function toast(text){
  info.textContent=text;
  info.style.opacity='1';
  clearTimeout(window.__skyToast);
  window.__skyToast=setTimeout(()=>info.style.opacity='0',2200);
}

function closePopup(){
  popup?.classList.add('is-hidden');
  reopenBtn?.classList.add('is-visible');
}

function openPopup(){
  popup?.classList.remove('is-hidden');
  reopenBtn?.classList.remove('is-visible');
}

closeBtn?.addEventListener('click', closePopup);
closeBtn?.addEventListener('touchstart', (event) => {
  event.preventDefault();
  closePopup();
}, { passive:false });

// Tap the empty popup background to hide it; buttons inside still work.
popup?.addEventListener('click', (event) => {
  const interactive = event.target.closest('button, a, input, textarea, select');
  if (!interactive) closePopup();
});

reopenBtn?.addEventListener('click', openPopup);

zodiacButtons.forEach(btn=>{
  btn.addEventListener('click',(event)=>{
    event.stopPropagation();
    toast('Use Stellarium search: '+btn.dataset.search);
  });
});
