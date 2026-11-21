// Catalogue filtering: search, category, type, material and date sort.
// All products are rendered in the HTML (crawlable); this script only hides/reorders them.
// Filter state is kept in the URL (?q=&cat=&type=&mat=&sort=) so filtered views can be shared.
(() => {
  const grid = document.getElementById('grid');
  const form = document.getElementById('filters');
  if (!grid || !form) return;
  const $ = (id) => document.getElementById(id);
  const cards = [...grid.querySelectorAll('.card')];
  const q = $('f-q'), cat = $('f-cat'), type = $('f-type'), sort = $('f-sort');
  const mats = [...form.querySelectorAll('input[name="mat"]')];
  const count = $('f-count'), empty = $('f-empty');

  const params = new URLSearchParams(location.search);
  if (q && params.has('q')) q.value = params.get('q');
  if (cat && params.has('cat')) cat.value = params.get('cat');
  if (type && params.has('type')) type.value = params.get('type');
  if (sort && params.has('sort')) sort.value = params.get('sort');
  const pm = (params.get('mat') || '').split(',');
  mats.forEach((m) => { m.checked = pm.includes(m.value); });

  function apply() {
    const term = (q ? q.value : '').trim().toLowerCase();
    const c = cat ? cat.value : '';
    const t = type ? type.value : '';
    const m = mats.filter((x) => x.checked).map((x) => x.value);
    const s = sort ? sort.value : 'new';
    let n = 0;
    cards.forEach((el) => {
      const d = el.dataset;
      const ok = (!term || term.split(/\s+/).every((w) => d.search.includes(w)))
        && (!c || d.cat === c)
        && (!t || d.type === t)
        && (!m.length || m.some((v) => d.mat.split('|').includes(v)));
      el.hidden = !ok;
      if (ok) n++;
    });
    cards
      .slice()
      .sort((a, b) => (s === 'az' ? a.dataset.name.localeCompare(b.dataset.name)
        : s === 'old' ? a.dataset.added.localeCompare(b.dataset.added)
        : b.dataset.added.localeCompare(a.dataset.added)))
      .forEach((el) => grid.appendChild(el));
    count.textContent = `${n} product${n === 1 ? '' : 's'}`;
    empty.hidden = n > 0;

    const p = new URLSearchParams();
    if (term) p.set('q', term);
    if (c) p.set('cat', c);
    if (t) p.set('type', t);
    if (m.length) p.set('mat', m.join(','));
    if (s !== 'new') p.set('sort', s);
    const qs = p.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  }

  form.addEventListener('input', apply);
  form.addEventListener('change', apply);
  form.addEventListener('submit', (e) => { e.preventDefault(); apply(); });
  form.addEventListener('reset', () => setTimeout(apply));
  apply();
})();
