/* ============================================================
   LEGRAND — Admin dashboard JS
   ============================================================ */
(function () {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // Toast helper
  function toast(msg, ok = true) {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);z-index:999;background:${ok ? '#0e4f38' : '#c0392b'};color:#fff;padding:.8rem 1.4rem;border-radius:999px;font-weight:600;box-shadow:0 12px 34px rgba(0,0,0,.3);animation:toastIn .4s cubic-bezier(.22,1,.36,1);`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .35s'; }, 2400);
    setTimeout(() => t.remove(), 2900);
  }
  window.LeGrandAdminToast = toast;

  // Confirm destructive actions
  $$('form[data-confirm]').forEach((f) => {
    f.addEventListener('submit', (e) => {
      if (!window.confirm(f.dataset.confirm)) e.preventDefault();
    });
  });

  // Mark enquiry read
  $$('.mark-read').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      await fetch(btn.href, { method: 'POST' });
      btn.closest('.enquiry-item')?.classList.add('is-read');
      btn.remove();
      toast('Marked as read');
      location.reload();
    });
  });

  // ---------------- Image upload preview ----------------
  const uploadInput = $('#image-upload');
  const previewZone = $('#upload-preview');
  if (uploadInput && previewZone) {
    uploadInput.addEventListener('change', () => {
      const files = [...uploadInput.files];
      previewZone.innerHTML = '';
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const div = document.createElement('div');
          div.className = 'thumb';
          div.innerHTML = `<img src="${ev.target.result}" alt=""><span class="thumb-x">✕</span>`;
          div.querySelector('.thumb-x').addEventListener('click', () => div.remove());
          previewZone.appendChild(div);
        };
        reader.readAsDataURL(file);
      });
    });
  }

  // Allow clicking the upload box
  const uploadBox = $('.upload-box');
  if (uploadBox && uploadInput) {
    uploadBox.addEventListener('click', () => uploadInput.click());
  }

  // Remove existing image (marks for deletion via hidden input)
  $$('.thumb .thumb-x[data-remove]').forEach((x) => {
    x.addEventListener('click', () => {
      const input = document.getElementById('removed-images');
      const img = x.dataset.remove;
      if (input) input.value = input.value ? `${input.value},${img}` : img;
      x.closest('.thumb').style.opacity = '0.35';
      x.closest('.thumb').style.pointerEvents = 'none';
    });
  });

  // Auto-dismiss notices
  $$('.notice').forEach((n) => {
    setTimeout(() => { n.style.transition = 'opacity .5s, transform .5s'; n.style.opacity = '0'; n.style.transform = 'translateY(-8px)'; }, 5000);
  });
})();
