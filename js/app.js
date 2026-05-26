/**
 * app.js — Módulo Principal de la Aplicación
 * Himnario Digital IDS Lanín
 *
 * Orquesta todos los módulos y gestiona:
 * - Carga de datos (canciones.json)
 * - Estado global de la aplicación
 * - Paginación virtual (renderizado por lotes)
 * - Modal de lectura
 * - Eventos de UI
 * - Registro del Service Worker
 */

'use strict';

import {
  searchHymns,
  filterByCategory,
  extractCategories,
  normalizeText,
} from './search.js';

import {
  getFavorites,
  getFavoriteHymns,
  toggleFavorite,
  isFavorite,
  getFavoritesCount,
  getFontSize,
  setFontSize,
  increaseFontSize,
  decreaseFontSize,
  canIncreaseFontSize,
  canDecreaseFontSize,
  getViewMode,
  setViewMode,
  setLastHymn,
  getLastHymn,
  setLastFilter,
  getLastFilter,
  FONT_LIMITS,
} from './storage.js';

import {
  renderHymnCard,
  renderLyrics,
  renderCategoryFilters,
  updateCardFavoriteState,
  renderSkeletonCards,
} from './renderer.js';

// =============================================================================
// 1. ESTADO GLOBAL DE LA APLICACIÓN
// =============================================================================

const AppState = {
  /** @type {Object[]} Todos los himnos cargados */
  allHymns: [],

  /** @type {Object[]} Himnos actualmente visibles (filtrados/buscados) */
  filteredHymns: [],

  /** @type {string} Query de búsqueda actual */
  searchQuery: '',

  /** @type {string} Categoría activa */
  activeCategory: 'all',

  /** @type {boolean} Si se está mostrando solo favoritos */
  showingFavorites: false,

  /** @type {string[]} Categorías únicas */
  categories: [],

  /** @type {number} Índice del himno abierto en el modal */
  currentHymnIndex: -1,

  /** @type {number} Cuántos himnos se han renderizado (paginación) */
  renderedCount: 0,

  /** @type {boolean} Si hay más himnos por cargar */
  hasMore: false,

  /** @type {boolean} Si la app está cargando */
  isLoading: true,

  /** @type {'grid'|'list'} Modo de vista */
  viewMode: 'grid',
};

// Configuración de paginación
const PAGE_SIZE = 30; // Himnos por lote

// =============================================================================
// 2. REFERENCIAS A ELEMENTOS DEL DOM
// =============================================================================

const DOM = {
  // Búsqueda
  searchInput:    () => document.getElementById('search-input'),
  searchClear:    () => document.getElementById('search-clear'),
  filterBar:      () => document.getElementById('filter-bar'),
  resultsCount:   () => document.getElementById('results-count'),

  // Grilla
  hymnsGrid:      () => document.getElementById('hymns-grid'),
  loadingState:   () => document.getElementById('loading-state'),
  emptyState:     () => document.getElementById('empty-state'),
  emptyMessage:   () => document.getElementById('empty-message'),
  clearSearch:    () => document.getElementById('btn-clear-search'),
  sentinel:       () => document.getElementById('pagination-sentinel'),

  // Modal
  modalOverlay:   () => document.getElementById('modal-overlay'),
  modal:          () => document.getElementById('modal'),
  modalNumber:    () => document.getElementById('modal-hymn-number'),
  modalCategory:  () => document.getElementById('modal-hymn-category'),
  modalTitle:     () => document.getElementById('modal-hymn-title'),
  modalLyrics:    () => document.getElementById('hymn-lyrics'),
  modalPosition:  () => document.getElementById('modal-position'),
  btnPrev:        () => document.getElementById('btn-prev-hymn'),
  btnNext:        () => document.getElementById('btn-next-hymn'),
  btnClose:       () => document.getElementById('btn-close-modal'),
  btnFavoriteModal: () => document.getElementById('btn-modal-favorite'),
  btnShare:       () => document.getElementById('btn-share'),
  fontDecrease:   () => document.getElementById('btn-font-decrease'),
  fontIncrease:   () => document.getElementById('btn-font-increase'),
  fontLabel:      () => document.getElementById('font-size-label'),

  // Navbar
  btnToggleView:      () => document.getElementById('btn-toggle-view'),
  btnToggleFavorites: () => document.getElementById('btn-toggle-favorites-view'),
  favoritesCount:     () => document.getElementById('favorites-count'),
  iconGrid:           () => document.querySelector('.icon-grid'),
  iconList:           () => document.querySelector('.icon-list'),

  // Misc
  scrollTopBtn:   () => document.getElementById('scroll-top-btn'),
  toastContainer: () => document.getElementById('toast-container'),
};

// =============================================================================
// 3. CARGA DE DATOS
// =============================================================================

/**
 * Carga el archivo canciones.json y lo almacena en AppState.
 */
async function loadHymns() {
  try {
    const response = await fetch('./data/canciones.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    // Normalizar estructura: aceptar array directo o { himnos: [] }
    const hymns = Array.isArray(data) ? data : (data.himnos || data.canciones || []);

    if (hymns.length === 0) throw new Error('El archivo no contiene himnos.');

    // Ordenar por número
    hymns.sort((a, b) => (a.numero || 0) - (b.numero || 0));

    AppState.allHymns = hymns;
    AppState.categories = extractCategories(hymns);

    return hymns;
  } catch (error) {
    console.error('[App] Error cargando himnos:', error);
    throw error;
  }
}

// =============================================================================
// 4. FILTRADO Y BÚSQUEDA
// =============================================================================

/**
 * Aplica los filtros actuales y actualiza la vista.
 * @param {boolean} resetScroll — Si debe hacer scroll al inicio
 */
function applyFilters(resetScroll = true) {
  let hymns = AppState.allHymns;

  // Filtro de favoritos
  if (AppState.showingFavorites) {
    hymns = getFavoriteHymns(hymns);
  }

  // Filtro por categoría
  if (AppState.activeCategory !== 'all') {
    hymns = filterByCategory(hymns, AppState.activeCategory);
  }

  // Búsqueda fuzzy
  if (AppState.searchQuery.trim()) {
    hymns = searchHymns(hymns, AppState.searchQuery);
  }

  AppState.filteredHymns = hymns;
  AppState.renderedCount = 0;
  AppState.hasMore = hymns.length > PAGE_SIZE;

  // Actualizar contador de resultados
  updateResultsCount(hymns.length);

  // Renderizar primer lote
  renderNextBatch(true);

  if (resetScroll) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/**
 * Actualiza el texto del contador de resultados.
 * @param {number} count
 */
function updateResultsCount(count) {
  const el = DOM.resultsCount();
  if (!el) return;

  if (AppState.showingFavorites) {
    el.textContent = count === 0
      ? 'Sin favoritos guardados'
      : `${count} himno${count !== 1 ? 's' : ''} en favoritos`;
  } else if (AppState.searchQuery.trim()) {
    el.textContent = count === 0
      ? 'Sin resultados'
      : `${count} resultado${count !== 1 ? 's' : ''} encontrado${count !== 1 ? 's' : ''}`;
  } else {
    el.textContent = `${count} himno${count !== 1 ? 's' : ''}`;
  }
}

// =============================================================================
// 5. RENDERIZADO POR LOTES (Paginación Virtual)
// =============================================================================

/**
 * Renderiza el siguiente lote de himnos.
 * @param {boolean} replace — Si reemplaza el contenido o agrega al final
 */
function renderNextBatch(replace = false) {
  const grid = DOM.hymnsGrid();
  const emptyState = DOM.emptyState();
  const loadingState = DOM.loadingState();

  if (!grid) return;

  // Ocultar estado de carga
  loadingState?.classList.add('hidden');

  const hymns = AppState.filteredHymns;

  // Sin resultados
  if (hymns.length === 0) {
    grid.innerHTML = '';
    emptyState?.classList.remove('hidden');

    const msg = DOM.emptyMessage();
    if (msg) {
      if (AppState.showingFavorites) {
        msg.textContent = 'Aún no tienes himnos favoritos. Toca el corazón en cualquier himno para guardarlo.';
      } else if (AppState.searchQuery) {
        msg.textContent = `No se encontraron himnos para "${AppState.searchQuery}".`;
      } else {
        msg.textContent = 'No hay himnos en esta categoría.';
      }
    }
    return;
  }

  emptyState?.classList.add('hidden');

  const start = AppState.renderedCount;
  const end   = Math.min(start + PAGE_SIZE, hymns.length);
  const batch = hymns.slice(start, end);

  const html = batch
    .map(h => renderHymnCard(h, AppState.searchQuery))
    .join('');

  if (replace) {
    grid.innerHTML = html;
    grid.classList.toggle('is-filtering', true);
    requestAnimationFrame(() => grid.classList.remove('is-filtering'));
  } else {
    grid.insertAdjacentHTML('beforeend', html);
  }

  AppState.renderedCount = end;
  AppState.hasMore = end < hymns.length;
}

// =============================================================================
// 6. MODAL DE LECTURA
// =============================================================================

/**
 * Abre el modal con el himno en el índice dado.
 * @param {number} index — Índice en AppState.filteredHymns
 * @param {string} direction — 'next' | 'prev' | '' (para animación)
 */
function openModal(index, direction = '') {
  const hymn = AppState.filteredHymns[index];
  if (!hymn) return;

  AppState.currentHymnIndex = index;
  setLastHymn(hymn.id);

  const overlay  = DOM.modalOverlay();
  const numEl    = DOM.modalNumber();
  const catEl    = DOM.modalCategory();
  const titleEl  = DOM.modalTitle();
  const lyricsEl = DOM.modalLyrics();
  const posEl    = DOM.modalPosition();
  const btnFav   = DOM.btnFavoriteModal();

  if (!overlay) return;

  // Actualizar contenido
  const numStr = String(hymn.numero || '').padStart(3, '0');
  if (numEl)   numEl.textContent   = `#${numStr}`;
  if (catEl)   catEl.textContent   = hymn.categoria || '';
  if (titleEl) titleEl.textContent = hymn.titulo || '';
  if (posEl)   posEl.textContent   = `${index + 1} / ${AppState.filteredHymns.length}`;

  // Renderizar letra con animación de dirección
  if (lyricsEl) {
    lyricsEl.classList.remove('transitioning', 'transitioning-prev');
    void lyricsEl.offsetWidth; // Reflow

    lyricsEl.innerHTML = renderLyrics(hymn.letra || '');

    if (direction === 'next') {
      lyricsEl.classList.add('transitioning');
    } else if (direction === 'prev') {
      lyricsEl.classList.add('transitioning-prev');
    }
  }

  // Aplicar tamaño de fuente guardado
  applyFontSize(getFontSize());

  // Estado del botón favorito
  updateModalFavoriteButton(hymn.id);

  // Navegación
  updateModalNavigation(index);

  // Abrir overlay
  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden', 'false');

  // Foco accesible
  setTimeout(() => {
    DOM.btnClose()?.focus();
  }, 350);

  // Scroll al inicio de la letra
  DOM.modal()?.querySelector('.modal__body')?.scrollTo({ top: 0, behavior: 'instant' });

  // Bloquear scroll del body
  document.body.style.overflow = 'hidden';
}

/**
 * Cierra el modal.
 */
function closeModal() {
  const overlay = DOM.modalOverlay();
  if (!overlay) return;

  overlay.classList.remove('is-open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  AppState.currentHymnIndex = -1;
}

/**
 * Navega al himno anterior o siguiente en el modal.
 * @param {'prev'|'next'} direction
 */
function navigateModal(direction) {
  const total = AppState.filteredHymns.length;
  if (total === 0) return;

  let newIndex = AppState.currentHymnIndex;

  if (direction === 'next') {
    newIndex = (newIndex + 1) % total;
  } else {
    newIndex = (newIndex - 1 + total) % total;
  }

  openModal(newIndex, direction);
}

/**
 * Actualiza el estado visual del botón de favorito en el modal.
 * @param {number} hymnId
 */
function updateModalFavoriteButton(hymnId) {
  const btn = DOM.btnFavoriteModal();
  if (!btn) return;

  const fav = isFavorite(hymnId);
  const svg = btn.querySelector('svg');

  btn.classList.toggle('active', fav);
  btn.setAttribute('aria-label', fav ? 'Quitar de favoritos' : 'Agregar a favoritos');
  if (svg) {
    svg.setAttribute('fill', fav ? 'currentColor' : 'none');
  }
}

/**
 * Actualiza el estado habilitado/deshabilitado de los botones de navegación.
 * @param {number} index
 */
function updateModalNavigation(index) {
  const total = AppState.filteredHymns.length;
  const btnPrev = DOM.btnPrev();
  const btnNext = DOM.btnNext();

  // En modo circular no se deshabilitan, pero se puede ajustar
  if (btnPrev) btnPrev.disabled = false;
  if (btnNext) btnNext.disabled = false;
}

// =============================================================================
// 7. TAMAÑO DE FUENTE
// =============================================================================

/**
 * Aplica el tamaño de fuente al modal y actualiza la etiqueta.
 * @param {number} size
 */
function applyFontSize(size) {
  const lyricsEl = DOM.modalLyrics();
  const label    = DOM.fontLabel();
  const btnDec   = DOM.fontDecrease();
  const btnInc   = DOM.fontIncrease();

  if (lyricsEl) {
    lyricsEl.style.setProperty('--reading-font-size', `${size}px`);
    lyricsEl.style.fontSize = `${size}px`;
  }

  if (label) label.textContent = `${size}px`;

  if (btnDec) btnDec.disabled = !canDecreaseFontSize();
  if (btnInc) btnInc.disabled = !canIncreaseFontSize();
}

// =============================================================================
// 8. SISTEMA DE TOASTS
// =============================================================================

/**
 * Muestra una notificación toast.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration — ms
 */
function showToast(message, type = 'info', duration = 2800) {
  const container = DOM.toastContainer();
  if (!container) return;

  const icons = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
  container.appendChild(toast);

  // Auto-remover
  setTimeout(() => {
    toast.classList.add('toast--out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

// =============================================================================
// 9. ACTUALIZACIÓN DEL BADGE DE FAVORITOS
// =============================================================================

/**
 * Actualiza el badge del contador de favoritos en el navbar.
 */
function updateFavoritesCount() {
  const badge = DOM.favoritesCount();
  if (!badge) return;

  const count = getFavoritesCount();
  badge.textContent = count > 99 ? '99+' : String(count);

  if (count === 0) {
    badge.classList.add('hidden');
  } else {
    badge.classList.remove('hidden');
    badge.classList.add('updated');
    badge.addEventListener('animationend', () => badge.classList.remove('updated'), { once: true });
  }
}

// =============================================================================
// 10. MANEJO DE FAVORITO (desde tarjeta o modal)
// =============================================================================

/**
 * Alterna el favorito de un himno y actualiza la UI.
 * @param {number} hymnId
 */
function handleToggleFavorite(hymnId) {
  const { added, count } = toggleFavorite(hymnId);

  // Actualizar tarjeta en el grid
  updateCardFavoriteState(hymnId, added);

  // Actualizar botón del modal si está abierto
  const currentHymn = AppState.filteredHymns[AppState.currentHymnIndex];
  if (currentHymn && currentHymn.id === hymnId) {
    updateModalFavoriteButton(hymnId);
  }

  // Actualizar badge
  updateFavoritesCount();

  // Toast
  const hymn = AppState.allHymns.find(h => h.id === hymnId);
  const title = hymn?.titulo || 'Himno';
  showToast(
    added ? `"${title}" agregado a favoritos` : `"${title}" eliminado de favoritos`,
    added ? 'success' : 'info'
  );

  // Si estamos en vista de favoritos, re-filtrar
  if (AppState.showingFavorites) {
    applyFilters(false);
  }
}

// =============================================================================
// 11. COMPARTIR HIMNO
// =============================================================================

/**
 * Comparte el himno actual usando la Web Share API o copia al portapapeles.
 */
async function shareCurrentHymn() {
  const hymn = AppState.filteredHymns[AppState.currentHymnIndex];
  if (!hymn) return;

  const shareData = {
    title: `Himno #${hymn.numero}: ${hymn.titulo}`,
    text: `${hymn.titulo}\n\n${(hymn.letra || '').slice(0, 200)}…`,
    url: window.location.href,
  };

  try {
    if (navigator.share && navigator.canShare?.(shareData)) {
      await navigator.share(shareData);
    } else {
      // Fallback: copiar al portapapeles
      const text = `${hymn.titulo}\n\n${hymn.letra || ''}`;
      await navigator.clipboard.writeText(text);
      showToast('Letra copiada al portapapeles', 'success');
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      showToast('No se pudo compartir el himno', 'error');
    }
  }
}

// =============================================================================
// 12. INTERSECTION OBSERVER (carga infinita)
// =============================================================================

/**
 * Configura el Intersection Observer para la carga infinita.
 */
function setupInfiniteScroll() {
  const sentinel = DOM.sentinel();
  if (!sentinel) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && AppState.hasMore) {
        renderNextBatch(false);
      }
    },
    { rootMargin: '200px' }
  );

  observer.observe(sentinel);
}

// =============================================================================
// 13. SCROLL TO TOP
// =============================================================================

function setupScrollToTop() {
  const btn = DOM.scrollTopBtn();
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      btn.classList.remove('hidden');
    } else {
      btn.classList.add('hidden');
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// =============================================================================
// 14. REGISTRO DEL SERVICE WORKER
// =============================================================================

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register('./sw.js', {
      scope: './',
    });
    console.log('[SW] Registrado:', registration.scope);

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showToast('Nueva versión disponible. Recarga para actualizar.', 'info', 6000);
        }
      });
    });
  } catch (error) {
    console.warn('[SW] Error al registrar:', error);
  }
}

// =============================================================================
// 15. INICIALIZACIÓN DE EVENTOS
// =============================================================================

function setupEvents() {
  // --- Búsqueda ---
  let searchDebounce;
  DOM.searchInput()?.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    const query = e.target.value;
    AppState.searchQuery = query;

    // Mostrar/ocultar botón limpiar
    DOM.searchClear()?.classList.toggle('hidden', query.length === 0);

    searchDebounce = setTimeout(() => {
      applyFilters();
    }, 280);
  });

  DOM.searchClear()?.addEventListener('click', () => {
    const input = DOM.searchInput();
    if (input) input.value = '';
    AppState.searchQuery = '';
    DOM.searchClear()?.classList.add('hidden');
    applyFilters();
    input?.focus();
  });

  DOM.clearSearch()?.addEventListener('click', () => {
    const input = DOM.searchInput();
    if (input) input.value = '';
    AppState.searchQuery = '';
    DOM.searchClear()?.classList.add('hidden');
    applyFilters();
  });

  // --- Filtros de categoría ---
  DOM.filterBar()?.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;

    const category = chip.dataset.category;
    AppState.activeCategory = category;
    setLastFilter(category);

    // Actualizar chips activos
    DOM.filterBar()?.querySelectorAll('.filter-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.category === category);
    });

    applyFilters();
  });

  // --- Grilla: clic en tarjeta o favorito ---
  DOM.hymnsGrid()?.addEventListener('click', (e) => {
    // Clic en botón favorito
    const favBtn = e.target.closest('.hymn-card__favorite');
    if (favBtn) {
      e.stopPropagation();
      const id = Number(favBtn.dataset.id);
      handleToggleFavorite(id);
      return;
    }

    // Clic en tarjeta
    const card = e.target.closest('.hymn-card');
    if (card) {
      const id = Number(card.dataset.id);
      const index = AppState.filteredHymns.findIndex(h => h.id === id);
      if (index !== -1) openModal(index);
    }
  });

  // Teclado en tarjeta
  DOM.hymnsGrid()?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.hymn-card');
      if (card) {
        e.preventDefault();
        const id = Number(card.dataset.id);
        const index = AppState.filteredHymns.findIndex(h => h.id === id);
        if (index !== -1) openModal(index);
      }
    }
  });

  // --- Modal ---
  DOM.btnClose()?.addEventListener('click', closeModal);

  DOM.modalOverlay()?.addEventListener('click', (e) => {
    if (e.target === DOM.modalOverlay()) closeModal();
  });

  DOM.btnPrev()?.addEventListener('click', () => navigateModal('prev'));
  DOM.btnNext()?.addEventListener('click', () => navigateModal('next'));

  // Favorito en modal
  DOM.btnFavoriteModal()?.addEventListener('click', () => {
    const hymn = AppState.filteredHymns[AppState.currentHymnIndex];
    if (hymn) handleToggleFavorite(hymn.id);
  });

  // Compartir
  DOM.btnShare()?.addEventListener('click', shareCurrentHymn);

  // Tamaño de fuente
  DOM.fontDecrease()?.addEventListener('click', () => {
    const newSize = decreaseFontSize();
    applyFontSize(newSize);
  });

  DOM.fontIncrease()?.addEventListener('click', () => {
    const newSize = increaseFontSize();
    applyFontSize(newSize);
  });

  // Teclado en modal
  document.addEventListener('keydown', (e) => {
    const isOpen = DOM.modalOverlay()?.classList.contains('is-open');
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        closeModal();
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        navigateModal('next');
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        navigateModal('prev');
        break;
    }
  });

  // Swipe táctil en el modal
  setupModalSwipe();

  // --- Toggle vista grid/lista ---
  DOM.btnToggleView()?.addEventListener('click', () => {
    const newMode = AppState.viewMode === 'grid' ? 'list' : 'grid';
    AppState.viewMode = newMode;
    setViewMode(newMode);
    applyViewMode(newMode);
  });

  // --- Toggle favoritos ---
  DOM.btnToggleFavorites()?.addEventListener('click', () => {
    AppState.showingFavorites = !AppState.showingFavorites;
    DOM.btnToggleFavorites()?.classList.toggle('active', AppState.showingFavorites);
    applyFilters();
  });
}

/**
 * Configura el swipe táctil para navegar en el modal.
 */
function setupModalSwipe() {
  const modal = DOM.modal();
  if (!modal) return;

  let startX = 0;
  let startY = 0;

  modal.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  modal.addEventListener('touchend', (e) => {
    const deltaX = e.changedTouches[0].clientX - startX;
    const deltaY = e.changedTouches[0].clientY - startY;

    // Solo swipe horizontal
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 60) {
      if (deltaX < 0) {
        navigateModal('next');
      } else {
        navigateModal('prev');
      }
    }
  }, { passive: true });
}

/**
 * Aplica el modo de vista (grid/lista) al DOM.
 * @param {'grid'|'list'} mode
 */
function applyViewMode(mode) {
  const grid = DOM.hymnsGrid();
  const iconGrid = DOM.iconGrid();
  const iconList = DOM.iconList();

  grid?.classList.toggle('view-list', mode === 'list');

  if (mode === 'list') {
    iconGrid?.classList.add('hidden');
    iconList?.classList.remove('hidden');
  } else {
    iconGrid?.classList.remove('hidden');
    iconList?.classList.add('hidden');
  }
}

// =============================================================================
// 16. INICIALIZACIÓN DE FILTROS DE CATEGORÍA
// =============================================================================

function initCategoryFilters() {
  const filterBar = DOM.filterBar();
  if (!filterBar) return;

  const lastFilter = getLastFilter();
  AppState.activeCategory = lastFilter;

  filterBar.innerHTML = renderCategoryFilters(AppState.categories, lastFilter);
}

// =============================================================================
// 17. MANEJO DE PARÁMETROS DE URL
// =============================================================================

function handleUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');

  if (view === 'favorites') {
    AppState.showingFavorites = true;
    DOM.btnToggleFavorites()?.classList.add('active');
  } else if (view === 'search') {
    setTimeout(() => DOM.searchInput()?.focus(), 500);
  }
}

// =============================================================================
// 18. PUNTO DE ENTRADA PRINCIPAL
// =============================================================================

async function init() {
  console.log('[App] Iniciando Himnario Digital IDS Lanín…');

  // Restaurar modo de vista
  AppState.viewMode = getViewMode();
  applyViewMode(AppState.viewMode);

  // Mostrar skeletons mientras carga
  const grid = DOM.hymnsGrid();
  if (grid) {
    grid.innerHTML = renderSkeletonCards(12);
    DOM.loadingState()?.classList.add('hidden');
  }

  try {
    // Cargar himnos
    await loadHymns();

    // Inicializar filtros
    initCategoryFilters();

    // Manejar parámetros de URL
    handleUrlParams();

    // Aplicar filtros iniciales
    applyFilters(false);

    // Actualizar badge de favoritos
    updateFavoritesCount();

    // Configurar eventos
    setupEvents();

    // Configurar scroll infinito
    setupInfiniteScroll();

    // Configurar scroll to top
    setupScrollToTop();

    // Registrar Service Worker
    registerServiceWorker();

    console.log(`[App] ${AppState.allHymns.length} himnos cargados correctamente.`);

  } catch (error) {
    console.error('[App] Error de inicialización:', error);

    // Mostrar estado de error
    if (grid) grid.innerHTML = '';
    const emptyState = DOM.emptyState();
    const emptyMsg   = DOM.emptyMessage();
    DOM.loadingState()?.classList.add('hidden');
    emptyState?.classList.remove('hidden');
    if (emptyMsg) {
      emptyMsg.textContent = 'Error al cargar el himnario. Verifica que el archivo canciones.json esté disponible.';
    }
  }
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
