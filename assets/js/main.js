// Seatory Furniture: site-wide behaviour (~1 KB). Everything works without JS except the menu toggle,
// gallery swapping, project filters and the WhatsApp enquiry form.
(() => {
  // Mobile menu
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('open', open);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('open')) { toggle.click(); toggle.focus(); }
    });
  }

  // Product gallery: thumbnails swap the main image
  document.querySelectorAll('[data-gallery]').forEach((g) => {
    const main = g.querySelector('.gallery-main img');
    g.querySelectorAll('.thumbs button').forEach((btn) => {
      btn.addEventListener('click', () => {
        main.src = btn.querySelector('img').src;
        main.alt = btn.dataset.alt;
        g.querySelectorAll('.thumbs button').forEach((b) => b.removeAttribute('aria-current'));
        btn.setAttribute('aria-current', 'true');
      });
    });
  });

  // Finished-looks filter
  const projects = document.getElementById('projects');
  if (projects) {
    const btns = document.querySelectorAll('[data-filter]');
    btns.forEach((btn) => btn.addEventListener('click', () => {
      const k = btn.dataset.filter;
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      projects.querySelectorAll('.project').forEach((p) => { p.hidden = !!k && p.dataset.kind !== k; });
    }));
  }

  // Enquiry form → opens WhatsApp with a pre-filled message (no backend, nothing stored)
  const form = document.getElementById('enquiry');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = new FormData(form);
      const text = [
        'Hi Seatory Furniture, new enquiry from the website:',
        `Name: ${d.get('name')}`,
        `Phone: ${d.get('phone')}`,
        d.get('area') ? `Area: ${d.get('area')}` : '',
        `Interested in: ${d.get('interest')}`,
        d.get('message') ? `Message: ${d.get('message')}` : '',
      ].filter(Boolean).join('\n');
      window.open(`https://wa.me/${form.dataset.wa}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    });
  }
})();
