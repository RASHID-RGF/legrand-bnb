/* ============================================================
   LEGRAND — Properties page JS (live search, view toggle, map)
   ============================================================ */
(function () {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const grid = $('.grid-cards');
  if (!grid) return;

  // Escape user/admin-provided text before injecting into innerHTML
  const esc = (s) =>
    String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const state = {
    q: new URLSearchParams(location.search),
    view: localStorage.getItem('legrand-props-view') || 'grid',
    map: false,
  };

  // ---------------- View toggle ----------------
  function setView(v) {
    state.view = v;
    localStorage.setItem('legrand-props-view', v);
    $$('.view-toggle button').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
    grid.classList.toggle('list-view', v === 'list');
    const cards = $$('.property-card', grid);
    cards.forEach((c) => c.classList.remove('reveal'));
  }
  $$('.view-toggle button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  setView(state.view);

  // ---------------- Live fetch ----------------
  async function fetchProps(params) {
    const url = '/api/properties?' + new URLSearchParams(params).toString();
    const res = await fetch(url);
    const data = await res.json();
    return data;
  }

  function renderResults(list) {
    const countEl = $('.result-count b');
    if (countEl) countEl.textContent = list.length;

    if (!list.length) {
      grid.innerHTML =
        '<div class="empty-state" style="grid-column:1/-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 21l-4.35-4.35"/><circle cx="10.5" cy="10.5" r="7.5"/><path d="M8 10.5h5"/></svg><h3>No properties found</h3><p>Try adjusting your filters or search term.</p></div>';
      return;
    }

    const cardTpl = (p) => `
      <article class="property-card reveal visible" data-id="${esc(p.id)}">
        <div class="card-media">
          <a href="/properties/${esc(p.slug)}">
            <img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">
          </a>
          ${p.featured ? '<span class="card-ribbon">✦ Featured</span>' : ''}
          ${p.category ? `<span class="card-category">${esc(p.category)}</span>` : ''}
          <button class="fav-btn ${window.LeGrandFavs.has(p.id) ? 'active' : ''}" data-id="${esc(p.id)}" aria-label="Toggle favorite">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
        <div class="card-body">
          <div class="card-location"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${esc(p.location)}, ${esc(p.subCounty)}</div>
          <h3><a href="/properties/${esc(p.slug)}">${esc(p.title)}</a></h3>
          <div class="card-meta">
            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l1.5-5h15L21 9"/><path d="M3 9h18v12H3z"/><path d="M3 13h18"/><path d="M8 9V5"/><path d="M16 9V5"/></svg>${p.bedrooms} bd</span>
            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12h16v8H4z"/><path d="M7 12V7a5 5 0 0 1 10 0v5"/></svg>${p.bathrooms} ba</span>
            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>${p.guests}</span>
            ${p.rating ? `<span class="rating"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>${p.rating}</span>` : ''}
          </div>
          <div class="card-foot">
            <div class="card-price"><b>KSh ${Number(p.pricePerNight).toLocaleString()}</b> <span>/ night</span></div>
            <a href="/properties/${esc(p.slug)}" class="btn btn-ghost btn-sm">View <span>→</span></a>
          </div>
        </div>
      </article>`;

    grid.innerHTML = list.map(cardTpl).join('');
    $$('.fav-btn', grid).forEach((btn) => btn.classList.toggle('active', window.LeGrandFavs.has(btn.dataset.id)));
  }

  function collectParams() {
    const params = {};
    if (state.q.get('q')) params.q = state.q.get('q');
    if (state.q.get('location') && state.q.get('location') !== 'all') params.location = state.q.get('location');
    if (state.q.get('type') && state.q.get('type') !== 'all') params.type = state.q.get('type');
    if (state.q.get('category') && state.q.get('category') !== 'all') params.category = state.q.get('category');
    if (state.q.get('min')) params.min = state.q.get('min');
    if (state.q.get('max')) params.max = state.q.get('max');
    if (state.q.get('bedrooms') && state.q.get('bedrooms') !== 'any') params.bedrooms = state.q.get('bedrooms');
    if (state.q.get('amenity') && state.q.get('amenity') !== 'all') params.amenity = state.q.get('amenity');
    return params;
  }

  function updateUI() {
    const params = collectParams();
    fetchProps(params).then((data) => {
      renderResults(data.properties);
      renderMap(data.properties);
    });
  }

  // ---------------- Map ----------------
  let map = null;
  let markers = [];
  function ensureMap() {
    if (map) return;
    const el = $('#map');
    if (!el || typeof L === 'undefined') return;
    map = L.map(el).setView([0.061, 34.288], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);
  }

  function renderMap(properties) {
    if (!state.map) return;
    ensureMap();
    if (!map) return;
    markers.forEach((m) => map.removeLayer(m));
    markers = [];
    const withCoords = properties.filter((p) => p.lat && p.lng);
    withCoords.forEach((p) => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:#0e4f38;color:#fff;border:2px solid #d4af37;border-radius:50%;width:48px;height:48px;display:grid;place-items:center;font-weight:800;font-size:11px;line-height:1;box-shadow:0 4px 14px rgba(0,0,0,.35)">KSh ${(Number(p.pricePerNight) / 1000).toFixed(1).replace(/\.0$/, '')}k</div>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        iconAnchor: [17, 17],
      });
      const m = L.marker([p.lat, p.lng], { icon }).addTo(map);
      m.bindPopup(
        `<div class="map-pop"><a href="/properties/${esc(p.slug)}"><img src="${esc(p.image)}" alt=""></a><b>${esc(p.title)}</b><span class="mp-price">KSh ${Number(p.pricePerNight).toLocaleString()}/night</span><small>${esc(p.location)}, ${esc(p.subCounty)}</small></div>`
      );
      markers.push(m);
    });
    if (withCoords.length) {
      const bounds = L.featureGroup(markers).getBounds();
      if (withCoords.length > 1) map.fitBounds(bounds.pad(0.25));
    }
  }

  // ---------------- Map toggle ----------------
  const mapBtn = $('[data-map-toggle]');
  const mapPanel = $('.map-panel');
  if (mapBtn && mapPanel) {
    mapBtn.addEventListener('click', () => {
      state.map = !state.map;
      mapPanel.classList.toggle('show', state.map);
      mapBtn.classList.toggle('active', state.map);
      mapBtn.innerHTML = state.map
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg> Grid View'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 6v6l18 6 3-3-18-6V3z"/><path d="M1 12l3 3"/></svg> Map View';
      if (state.map) updateUI();
    });
  }

  // ---------------- Sort select ----------------
  const sortSel = $('.sort-select');
  if (sortSel) {
    sortSel.addEventListener('change', () => {
      state.q.set('sort', sortSel.value);
      location.search = state.q.toString();
    });
  }

  // ---------------- Filter panel selects ----------------
  const filterEls = $$('.filter-panel select, .filter-panel input[type="number"]');
  filterEls.forEach((el) => {
    el.addEventListener('change', () => {
      const key = el.dataset.key;
      const val = el.value;
      if (!val || val === 'all' || val === 'any') state.q.delete(key);
      else state.q.set(key, val);
      // Reset to page 1 feel: live update
      updateUI();
      history.replaceState(null, '', location.pathname + (state.q.toString() ? '?' + state.q.toString() : ''));
    });
  });

  // Amenity chips (single-select)
  $$('.chip[data-key]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.key;
      const val = chip.dataset.value;
      const isActive = chip.classList.contains('active');
      $$('.chip[data-key]').forEach((c) => c.classList.remove('active'));
      if (isActive) {
        state.q.delete(key);
      } else {
        chip.classList.add('active');
        state.q.set(key, val);
      }
      updateUI();
      history.replaceState(null, '', location.pathname + (state.q.toString() ? '?' + state.q.toString() : ''));
    });
  });

  // ---------------- Search input (debounced live search) ----------------
  const searchInput = $('[data-live-search]');
  if (searchInput) {
    let timer;
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const v = searchInput.value.trim();
        if (v) state.q.set('q', v);
        else state.q.delete('q');
        updateUI();
        history.replaceState(null, '', location.pathname + (state.q.toString() ? '?' + state.q.toString() : ''));
      }, 350);
    });
  }

  // ---------------- Reset ----------------
  $$('.filter-reset').forEach((btn) =>
    btn.addEventListener('click', () => (location.href = '/properties'))
  );
})();
