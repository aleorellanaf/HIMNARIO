/**
 * renderer.js — Módulo de Renderizado
 * Himnario Digital IDS Lanín
 *
 * Responsable de:
 * - Generar el HTML de las tarjetas de himnos
 * - Renderizar la letra del himno en el modal
 * - Actualizar la UI de favoritos
 * - Gestionar los filtros de categoría
 */

'use strict';

import { highlightMatches, escapeHtml } from './search.js';
import { isFavorite } from './storage.js';

// =============================================================================
// 1. RENDERIZADO DE TARJETAS
// =============================================================================

/**
 * Genera el HTML de una tarjeta de himno.
 * @param {Object} hymn    — Objeto himno
 * @param {string} query   — Query de búsqueda actual (para highlight)
 * @returns {string}       — HTML de la tarjeta
 */
export function renderHymnCard(hymn, query = '') {
  const isFav = isFavorite(hymn.id);
  const numStr = String(hymn.numero || '').padStart(3, '0');

  // Título con highlight
  const titleHtml = query
    ? highlightMatches(hymn.titulo || '', query)
    : escapeHtml(hymn.titulo || '');

  // Extracto de la letra (primeras 2 líneas)
  const excerpt = getExcerpt(hymn.letra || '', query);

  return `
    <article
      class="hymn-card${isFav ? ' is-favorite' : ''}"
      role="listitem"
      data-id="${hymn.id}"
      data-numero="${hymn.numero}"
      tabindex="0"
      aria-label="Himno ${numStr}: ${escapeHtml(hymn.titulo || '')}"
    >
      <div class="hymn-card__header">
        <div class="hymn-card__number" aria-hidden="true">${numStr}</div>
        <button
          class="hymn-card__favorite${isFav ? ' active' : ''}"
          data-id="${hymn.id}"
          aria-label="${isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}"
          aria-pressed="${isFav}"
          title="${isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}"
        >
          <svg viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>

      <div class="hymn-card__body">
        <h3 class="hymn-card__title">${titleHtml}</h3>
        <span class="hymn-card__category">${escapeHtml(hymn.categoria || '')}</span>
        ${excerpt ? `<p class="hymn-card__excerpt">${excerpt}</p>` : ''}
      </div>

      <div class="hymn-card__footer">
        <svg class="hymn-card__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </article>
  `;
}

/**
 * Genera un extracto de la letra del himno.
 * @param {string} lyrics  — Letra completa
 * @param {string} query   — Query para highlight
 * @returns {string}       — HTML del extracto
 */
function getExcerpt(lyrics, query) {
  if (!lyrics) return '';

  const lines = lyrics
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) return '';

  // Si hay query, intentar mostrar la línea que contiene la coincidencia
  if (query) {
    const { normalizeText } = window.__searchUtils || {};
    // Buscar la primera línea que contenga el query
    const normalQ = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const matchLine = lines.find(line => {
      const normalL = line.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalL.includes(normalQ);
    });

    if (matchLine) {
      return highlightMatches(matchLine, query);
    }
  }

  // Por defecto: primeras 2 líneas
  const excerpt = lines.slice(0, 2).join(' · ');
  return escapeHtml(excerpt);
}

// =============================================================================
// 2. RENDERIZADO DE LA LETRA EN EL MODAL
// =============================================================================

/**
 * Formatea y renderiza la letra del himno en el modal.
 * Detecta estrofas, coros y estructura.
 * @param {string} lyrics — Letra cruda del himno
 * @returns {string}      — HTML formateado
 */
export function renderLyrics(lyrics) {
  if (!lyrics || lyrics.trim() === '') {
    return '<p class="no-lyrics">Letra no disponible.</p>';
  }

  const lines = lyrics.split('\n');
  let html = '';
  let stanzaCount = 0;
  let inStanza = false;
  let currentStanzaLines = [];

  const CHORUS_PATTERNS = /^(coro|estribillo|chorus|refr[aá]n)\s*:?\s*$/i;
  const BRIDGE_PATTERNS = /^(puente|bridge|interludio)\s*:?\s*$/i;

  function flushStanza() {
    if (currentStanzaLines.length === 0) return;
    stanzaCount++;
    html += `<div class="stanza">`;
    html += `<span class="stanza-number">Estrofa ${stanzaCount}</span>`;
    for (const line of currentStanzaLines) {
      html += `<span class="line">${escapeHtml(line)}</span>`;
    }
    html += `</div>`;
    currentStanzaLines = [];
    inStanza = false;
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    // Línea vacía: separador de bloque
    if (line === '') {
      if (inStanza) flushStanza();
      i++;
      continue;
    }

    // Detectar etiqueta de coro
    if (CHORUS_PATTERNS.test(line)) {
      if (inStanza) flushStanza();

      // Recolectar líneas del coro hasta línea vacía
      const chorusLines = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '') {
        chorusLines.push(lines[i].trim());
        i++;
      }

      if (chorusLines.length > 0) {
        html += `<div class="chorus">`;
        html += `<span class="chorus-label">Coro</span>`;
        for (const cl of chorusLines) {
          html += `<span class="line">${escapeHtml(cl)}</span>`;
        }
        html += `</div>`;
      }
      continue;
    }

    // Detectar etiqueta de puente
    if (BRIDGE_PATTERNS.test(line)) {
      if (inStanza) flushStanza();

      const bridgeLines = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '') {
        bridgeLines.push(lines[i].trim());
        i++;
      }

      if (bridgeLines.length > 0) {
        html += `<div class="chorus">`;
        html += `<span class="chorus-label">Puente</span>`;
        for (const bl of bridgeLines) {
          html += `<span class="line">${escapeHtml(bl)}</span>`;
        }
        html += `</div>`;
      }
      continue;
    }

    // Línea normal: parte de una estrofa
    inStanza = true;
    currentStanzaLines.push(line);
    i++;
  }

  // Vaciar última estrofa pendiente
  if (inStanza && currentStanzaLines.length > 0) {
    flushStanza();
  }

  // Si no se detectó estructura, renderizar como texto plano formateado
  if (html === '') {
    html = `<div class="stanza">`;
    for (const line of lines) {
      if (line.trim() === '') {
        html += `<span class="line-empty"></span>`;
      } else {
        html += `<span class="line">${escapeHtml(line.trim())}</span>`;
      }
    }
    html += `</div>`;
  }

  return html;
}

// =============================================================================
// 3. RENDERIZADO DE FILTROS DE CATEGORÍA
// =============================================================================

/**
 * Genera los chips de filtro de categoría.
 * @param {string[]} categories  — Lista de categorías
 * @param {string}   active      — Categoría activa
 * @returns {string}             — HTML de los chips
 */
export function renderCategoryFilters(categories, active = 'all') {
  const chips = [
    `<button class="filter-chip${active === 'all' ? ' active' : ''}" data-category="all">Todos</button>`,
    ...categories.map(cat => `
      <button
        class="filter-chip${active === cat ? ' active' : ''}"
        data-category="${escapeHtml(cat)}"
      >${escapeHtml(cat)}</button>
    `),
  ];
  return chips.join('');
}

// =============================================================================
// 4. ACTUALIZACIÓN DE ESTADO DE FAVORITO EN TARJETA
// =============================================================================

/**
 * Actualiza visualmente el estado de favorito de una tarjeta en el DOM.
 * @param {number}  hymnId — ID del himno
 * @param {boolean} isFav  — Nuevo estado
 */
export function updateCardFavoriteState(hymnId, isFav) {
  const card = document.querySelector(`.hymn-card[data-id="${hymnId}"]`);
  if (!card) return;

  const btn = card.querySelector('.hymn-card__favorite');
  const svg = btn?.querySelector('svg');

  if (isFav) {
    card.classList.add('is-favorite');
    btn?.classList.add('active');
    btn?.setAttribute('aria-label', 'Quitar de favoritos');
    btn?.setAttribute('aria-pressed', 'true');
    if (svg) svg.setAttribute('fill', 'currentColor');
  } else {
    card.classList.remove('is-favorite');
    btn?.classList.remove('active');
    btn?.setAttribute('aria-label', 'Agregar a favoritos');
    btn?.setAttribute('aria-pressed', 'false');
    if (svg) svg.setAttribute('fill', 'none');
  }

  // Animación de latido
  btn?.classList.remove('animate-heartbeat');
  void btn?.offsetWidth; // Forzar reflow
  btn?.classList.add('animate-heartbeat');
  btn?.addEventListener('animationend', () => {
    btn.classList.remove('animate-heartbeat');
  }, { once: true });
}

// =============================================================================
// 5. TARJETAS SKELETON (estado de carga)
// =============================================================================

/**
 * Genera N tarjetas skeleton para el estado de carga.
 * @param {number} count — Cantidad de skeletons
 * @returns {string}     — HTML
 */
export function renderSkeletonCards(count = 12) {
  return Array.from({ length: count }, () => `
    <div class="hymn-card hymn-card--skeleton" aria-hidden="true">
      <div class="hymn-card__header">
        <div class="hymn-card__number skeleton"></div>
      </div>
      <div class="hymn-card__body">
        <div class="hymn-card__title skeleton" style="height:1em;width:65%"></div>
        <div class="hymn-card__category skeleton" style="height:0.75em;width:40%;margin-top:6px"></div>
      </div>
    </div>
  `).join('');
}
