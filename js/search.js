/**
 * search.js — Módulo de Búsqueda Fuzzy
 * Himnario Digital IDS Lanín
 *
 * Implementa búsqueda inteligente que:
 * - Ignora tildes y diacríticos
 * - Tolera errores menores de escritura (distancia de Levenshtein)
 * - Busca en título, número y letra del himno
 * - Retorna resultados ordenados por relevancia
 */

'use strict';

// =============================================================================
// 1. NORMALIZACIÓN DE TEXTO
// =============================================================================

/**
 * Normaliza una cadena: minúsculas, sin tildes, sin caracteres especiales.
 * @param {string} str
 * @returns {string}
 */
export function normalizeText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')                          // Descomponer caracteres Unicode
    .replace(/[\u0300-\u036f]/g, '')           // Eliminar diacríticos (tildes, etc.)
    .replace(/[^a-z0-9\s]/g, ' ')             // Reemplazar caracteres especiales por espacio
    .replace(/\s+/g, ' ')                      // Colapsar espacios múltiples
    .trim();
}

/**
 * Resalta las coincidencias de búsqueda en un texto con etiquetas <mark>.
 * @param {string} text  — Texto original (con tildes)
 * @param {string} query — Término buscado
 * @returns {string}     — HTML con <mark> alrededor de coincidencias
 */
export function highlightMatches(text, query) {
  if (!query || !text) return escapeHtml(text);

  const normalizedQuery = normalizeText(query);
  const words = normalizedQuery.split(' ').filter(w => w.length > 1);

  if (words.length === 0) return escapeHtml(text);

  // Construir regex que ignore tildes usando mapeo de caracteres
  const pattern = words
    .map(word => buildAccentInsensitivePattern(word))
    .join('|');

  try {
    const regex = new RegExp(`(${pattern})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  } catch {
    return escapeHtml(text);
  }
}

/**
 * Construye un patrón regex que acepta caracteres con y sin tildes.
 * @param {string} word — Palabra normalizada
 * @returns {string}    — Patrón regex
 */
function buildAccentInsensitivePattern(word) {
  const accentMap = {
    a: '[aáàäâã]',
    e: '[eéèëê]',
    i: '[iíìïî]',
    o: '[oóòöôõ]',
    u: '[uúùüû]',
    n: '[nñ]',
  };

  return word
    .split('')
    .map(char => accentMap[char] || escapeRegex(char))
    .join('');
}

/**
 * Escapa caracteres especiales de regex.
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Escapa caracteres HTML para prevenir XSS.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// =============================================================================
// 2. ALGORITMO DE DISTANCIA DE LEVENSHTEIN (fuzzy)
// =============================================================================

/**
 * Calcula la distancia de Levenshtein entre dos cadenas.
 * Optimizado con programación dinámica (una sola fila).
 * @param {string} a
 * @param {string} b
 * @returns {number} — Distancia (0 = idéntico)
 */
function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Limitar longitud para performance
  const maxLen = 32;
  if (a.length > maxLen) a = a.slice(0, maxLen);
  if (b.length > maxLen) b = b.slice(0, maxLen);

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val = a[i - 1] === b[j - 1]
        ? row[j - 1]
        : 1 + Math.min(prev, row[j], row[j - 1]);
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }

  return row[b.length];
}

/**
 * Determina si una palabra del query hace match fuzzy con una palabra del texto.
 * @param {string} queryWord  — Palabra del query (normalizada)
 * @param {string} textWord   — Palabra del texto (normalizada)
 * @returns {boolean}
 */
function fuzzyWordMatch(queryWord, textWord) {
  if (textWord.includes(queryWord)) return true;

  // Tolerancia según longitud de la palabra
  const tolerance = queryWord.length <= 3 ? 0
    : queryWord.length <= 5 ? 1
    : queryWord.length <= 8 ? 2
    : 2;

  if (tolerance === 0) return textWord === queryWord;

  const dist = levenshteinDistance(queryWord, textWord);
  return dist <= tolerance;
}

// =============================================================================
// 3. MOTOR DE BÚSQUEDA PRINCIPAL
// =============================================================================

/**
 * Calcula la puntuación de relevancia de un himno para un query dado.
 * Mayor puntuación = más relevante.
 *
 * @param {Object} hymn    — Objeto himno {id, titulo, numero, categoria, letra}
 * @param {string} query   — Término de búsqueda normalizado
 * @param {string[]} words — Palabras del query
 * @returns {number}       — Puntuación (0 = no coincide)
 */
function scoreHymn(hymn, query, words) {
  const normalTitle    = normalizeText(hymn.titulo || '');
  const normalCategory = normalizeText(hymn.categoria || '');
  const normalLyrics   = normalizeText(hymn.letra || '');
  const numStr         = String(hymn.numero || '').padStart(3, '0');

  let score = 0;

  // --- Coincidencia exacta por número ---
  if (numStr === query || String(hymn.numero) === query) {
    return 1000; // Máxima prioridad
  }

  // --- Coincidencia exacta en título ---
  if (normalTitle === query) {
    score += 500;
  } else if (normalTitle.startsWith(query)) {
    score += 300;
  } else if (normalTitle.includes(query)) {
    score += 200;
  }

  // --- Coincidencia exacta en categoría ---
  if (normalCategory.includes(query)) {
    score += 50;
  }

  // --- Coincidencia por palabras individuales ---
  const titleWords   = normalTitle.split(' ').filter(Boolean);
  const lyricsWords  = normalLyrics.split(' ').filter(Boolean);

  let wordMatchCount = 0;
  let allWordsMatch  = true;

  for (const queryWord of words) {
    if (queryWord.length < 2) continue;

    let wordFound = false;

    // Buscar en título (mayor peso)
    for (const tw of titleWords) {
      if (fuzzyWordMatch(queryWord, tw)) {
        score += tw === queryWord ? 80 : 50; // Exacto vs fuzzy
        wordFound = true;
        break;
      }
    }

    // Buscar en letra (menor peso)
    if (!wordFound) {
      for (const lw of lyricsWords) {
        if (fuzzyWordMatch(queryWord, lw)) {
          score += lw === queryWord ? 20 : 10;
          wordFound = true;
          break;
        }
      }
    }

    if (wordFound) {
      wordMatchCount++;
    } else {
      allWordsMatch = false;
    }
  }

  // Bonus si todas las palabras coinciden
  if (allWordsMatch && words.length > 1) {
    score += 100;
  }

  // Penalizar si ninguna palabra coincide
  if (wordMatchCount === 0 && words.length > 0) {
    return 0;
  }

  return score;
}

/**
 * Filtra y ordena un arreglo de himnos según el query de búsqueda.
 *
 * @param {Object[]} hymns  — Arreglo completo de himnos
 * @param {string}   query  — Término de búsqueda (crudo, del input)
 * @returns {Object[]}      — Himnos filtrados y ordenados por relevancia
 */
export function searchHymns(hymns, query) {
  if (!query || query.trim().length === 0) {
    return hymns; // Sin filtro: devolver todos
  }

  const normalizedQuery = normalizeText(query);
  const words = normalizedQuery.split(' ').filter(w => w.length >= 2);

  if (normalizedQuery.length === 0) return hymns;

  // Calcular puntuación para cada himno
  const scored = hymns
    .map(hymn => ({
      hymn,
      score: scoreHymn(hymn, normalizedQuery, words),
    }))
    .filter(({ score }) => score > 0);

  // Ordenar por puntuación descendente, luego por número
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.hymn.numero || 0) - (b.hymn.numero || 0);
  });

  return scored.map(({ hymn }) => hymn);
}

/**
 * Filtra himnos por categoría.
 * @param {Object[]} hymns    — Arreglo de himnos
 * @param {string}   category — Categoría a filtrar ('all' para todas)
 * @returns {Object[]}
 */
export function filterByCategory(hymns, category) {
  if (!category || category === 'all') return hymns;
  return hymns.filter(h =>
    normalizeText(h.categoria || '') === normalizeText(category)
  );
}

/**
 * Extrae las categorías únicas de un arreglo de himnos.
 * @param {Object[]} hymns
 * @returns {string[]} — Categorías ordenadas alfabéticamente
 */
export function extractCategories(hymns) {
  const set = new Set();
  for (const h of hymns) {
    if (h.categoria) set.add(h.categoria.trim());
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
}
