/**
 * storage.js — Módulo de Almacenamiento Local
 * Himnario Digital IDS Lanín
 *
 * Gestiona la persistencia en localStorage:
 * - Favoritos (Set de IDs)
 * - Preferencias de UI (tamaño de fuente, vista)
 * - Última posición de lectura
 */

'use strict';

// =============================================================================
// 1. CLAVES DE ALMACENAMIENTO
// =============================================================================

const KEYS = {
  FAVORITES:   'ids_lanin_favorites_v1',
  FONT_SIZE:   'ids_lanin_font_size_v1',
  VIEW_MODE:   'ids_lanin_view_mode_v1',
  LAST_HYMN:   'ids_lanin_last_hymn_v1',
  LAST_FILTER: 'ids_lanin_last_filter_v1',
};

// Valores por defecto
const DEFAULTS = {
  FONT_SIZE:   16,
  VIEW_MODE:   'grid',
  LAST_HYMN:   null,
  LAST_FILTER: 'all',
};

// Límites
const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 26;
const FONT_SIZE_STEP = 2;

// =============================================================================
// 2. UTILIDADES DE ACCESO SEGURO
// =============================================================================

/**
 * Lee un valor del localStorage de forma segura.
 * @param {string} key
 * @param {*} fallback — Valor por defecto si no existe o hay error
 * @returns {*}
 */
function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Guarda un valor en localStorage de forma segura.
 * @param {string} key
 * @param {*} value
 * @returns {boolean} — true si se guardó correctamente
 */
function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    // localStorage puede estar lleno o bloqueado en modo privado
    console.warn('[Storage] No se pudo guardar en localStorage:', e.message);
    return false;
  }
}

// =============================================================================
// 3. MÓDULO DE FAVORITOS
// =============================================================================

/**
 * Obtiene el Set de IDs favoritos.
 * @returns {Set<number>}
 */
export function getFavorites() {
  const arr = safeGet(KEYS.FAVORITES, []);
  return new Set(Array.isArray(arr) ? arr.map(Number) : []);
}

/**
 * Guarda el Set de favoritos en localStorage.
 * @param {Set<number>} favSet
 */
function saveFavorites(favSet) {
  safeSet(KEYS.FAVORITES, Array.from(favSet));
}

/**
 * Verifica si un himno es favorito.
 * @param {number} hymnId
 * @returns {boolean}
 */
export function isFavorite(hymnId) {
  return getFavorites().has(Number(hymnId));
}

/**
 * Agrega un himno a favoritos.
 * @param {number} hymnId
 * @returns {boolean} — true si se agregó (no estaba antes)
 */
export function addFavorite(hymnId) {
  const favs = getFavorites();
  const id = Number(hymnId);
  if (favs.has(id)) return false;
  favs.add(id);
  saveFavorites(favs);
  return true;
}

/**
 * Elimina un himno de favoritos.
 * @param {number} hymnId
 * @returns {boolean} — true si se eliminó
 */
export function removeFavorite(hymnId) {
  const favs = getFavorites();
  const id = Number(hymnId);
  if (!favs.has(id)) return false;
  favs.delete(id);
  saveFavorites(favs);
  return true;
}

/**
 * Alterna el estado de favorito de un himno.
 * @param {number} hymnId
 * @returns {{ added: boolean, count: number }}
 */
export function toggleFavorite(hymnId) {
  const favs = getFavorites();
  const id = Number(hymnId);
  let added;

  if (favs.has(id)) {
    favs.delete(id);
    added = false;
  } else {
    favs.add(id);
    added = true;
  }

  saveFavorites(favs);
  return { added, count: favs.size };
}

/**
 * Obtiene la cantidad de favoritos.
 * @returns {number}
 */
export function getFavoritesCount() {
  return getFavorites().size;
}

/**
 * Filtra un arreglo de himnos retornando solo los favoritos.
 * @param {Object[]} hymns
 * @returns {Object[]}
 */
export function getFavoriteHymns(hymns) {
  const favs = getFavorites();
  return hymns.filter(h => favs.has(Number(h.id)));
}

// =============================================================================
// 4. PREFERENCIAS DE FUENTE
// =============================================================================

/**
 * Obtiene el tamaño de fuente actual para el modo lectura.
 * @returns {number} — Tamaño en px
 */
export function getFontSize() {
  const size = safeGet(KEYS.FONT_SIZE, DEFAULTS.FONT_SIZE);
  return Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, Number(size)));
}

/**
 * Guarda el tamaño de fuente.
 * @param {number} size
 * @returns {number} — Tamaño guardado (con límites aplicados)
 */
export function setFontSize(size) {
  const clamped = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, Number(size)));
  safeSet(KEYS.FONT_SIZE, clamped);
  return clamped;
}

/**
 * Incrementa el tamaño de fuente.
 * @returns {number} — Nuevo tamaño
 */
export function increaseFontSize() {
  return setFontSize(getFontSize() + FONT_SIZE_STEP);
}

/**
 * Decrementa el tamaño de fuente.
 * @returns {number} — Nuevo tamaño
 */
export function decreaseFontSize() {
  return setFontSize(getFontSize() - FONT_SIZE_STEP);
}

/**
 * Verifica si se puede aumentar más la fuente.
 * @returns {boolean}
 */
export function canIncreaseFontSize() {
  return getFontSize() < FONT_SIZE_MAX;
}

/**
 * Verifica si se puede reducir más la fuente.
 * @returns {boolean}
 */
export function canDecreaseFontSize() {
  return getFontSize() > FONT_SIZE_MIN;
}

// =============================================================================
// 5. PREFERENCIAS DE VISTA
// =============================================================================

/**
 * Obtiene el modo de vista actual ('grid' o 'list').
 * @returns {'grid'|'list'}
 */
export function getViewMode() {
  const mode = safeGet(KEYS.VIEW_MODE, DEFAULTS.VIEW_MODE);
  return mode === 'list' ? 'list' : 'grid';
}

/**
 * Guarda el modo de vista.
 * @param {'grid'|'list'} mode
 */
export function setViewMode(mode) {
  safeSet(KEYS.VIEW_MODE, mode === 'list' ? 'list' : 'grid');
}

// =============================================================================
// 6. ÚLTIMO HIMNO VISTO
// =============================================================================

/**
 * Guarda el ID del último himno visto.
 * @param {number} hymnId
 */
export function setLastHymn(hymnId) {
  safeSet(KEYS.LAST_HYMN, Number(hymnId));
}

/**
 * Obtiene el ID del último himno visto.
 * @returns {number|null}
 */
export function getLastHymn() {
  return safeGet(KEYS.LAST_HYMN, DEFAULTS.LAST_HYMN);
}

// =============================================================================
// 7. ÚLTIMO FILTRO ACTIVO
// =============================================================================

/**
 * Guarda el último filtro de categoría activo.
 * @param {string} category
 */
export function setLastFilter(category) {
  safeSet(KEYS.LAST_FILTER, category || 'all');
}

/**
 * Obtiene el último filtro de categoría activo.
 * @returns {string}
 */
export function getLastFilter() {
  return safeGet(KEYS.LAST_FILTER, DEFAULTS.LAST_FILTER);
}

// =============================================================================
// 8. EXPORTAR CONSTANTES ÚTILES
// =============================================================================

export const FONT_LIMITS = {
  MIN: FONT_SIZE_MIN,
  MAX: FONT_SIZE_MAX,
  STEP: FONT_SIZE_STEP,
};
