// app.js
let todasLasCanciones = [];
let filtroActual = 'todos';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar la base de datos de canciones generada por el script de Python
    fetch('canciones.json')
        .then(response => {
            if (!response.ok) throw new Error('Error al cargar la base de datos de canciones.');
            return response.json();
        })
        .then(data => {
            // Aseguramos un orden numérico ascendente basado en el himnario
            todasLasCanciones = data.sort((a, b) => a.numero - b.numero);
            renderizarLista(todasLasCanciones);
        })
        .catch(error => {
            console.error('Error inicializando el Himnario Digital:', error);
            document.getElementById('lista-canciones').innerHTML = `
                <li style="padding: 20px; text-align: center; color: var(--text-muted);">
                    Error al cargar los himnos. Asegúrate de haber ejecutado el extractor de Python.
                </li>`;
        });

    // 2. Escuchar el buscador interactivo en tiempo real
    document.getElementById('search-input').addEventListener('input', filtrarCanciones);
});

// Función encargada de construir y pintar la lista en el DOM
function renderizarLista(canciones) {
    const listaUL = document.getElementById('lista-canciones');
    listaUL.innerHTML = '';

    if (canciones.length === 0) {
        listaUL.innerHTML = `
            <li style="padding: 30px; text-align: center; color: var(--text-muted); font-size: 0.95rem;">
                No se encontraron resultados para tu búsqueda.
            </li>`;
        return;
    }

    canciones.forEach(cancion => {
        const li = document.createElement('li');
        li.className = 'song-item';

        // Reemplazar saltos de línea de la letra extraída por etiquetas <br> para HTML
        const letraFormateada = cancion.letra.replace(/\n/g, '<br>');

        li.innerHTML = `
            <div class="song-header" onclick="toggleLetra(this)">
                <div class="song-info">
                    <span class="song-number">${cancion.numero}</span>
                    <span class="song-title">${cancion.titulo}</span>
                    <span class="badge-tag">${cancion.tipo}</span>
                </div>
                <span class="music-note">${cancion.tono || '—'}</span>
            </div>
            <div class="song-lyrics-container">
                ${letraFormateada}
            </div>
        `;
        listaUL.appendChild(li);
    });
}

// Alternar visibilidad de las estrofas (Efecto Acordeón)
function toggleLetra(elementoHeader) {
    const contenedorLetra = elementoHeader.nextElementSibling;
    const estaAbierto = contenedorLetra.classList.contains('open');

    // Opcional: Colapsar cualquier otro himno abierto para mantener una lectura limpia
    document.querySelectorAll('.song-lyrics-container.open').forEach(el => {
        el.classList.remove('open');
    });

    if (!estaAbierto) {
        contenedorLetra.classList.add('open');
    }
}

// Filtrado rápido por categorías (Todos / Himnos / Alabanzas)
function filtrarPorTipo(tipo, evento) {
    filtroActual = tipo;

    // Actualizar estados visuales de los botones en la barra de filtros
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    evento.target.classList.add('active');

    filtrarCanciones();
}

// Lógica combinada: Filtro de botones + Entrada de texto del buscador
function filtrarCanciones() {
    const terminoBusqueda = document.getElementById('search-input').value.toLowerCase().trim();

    const cancionesFiltradas = todasLasCanciones.filter(cancion => {
        // Validación del segmento de botones
        const coincideTipo = (filtroActual === 'todos') || (cancion.tipo === filtroActual);

        // Validación del término escrito (busca por número exacto, coincidencias en título o fragmentos de letras)
        const coincideTexto = 
            cancion.numero.toString().includes(terminoBusqueda) ||
            cancion.titulo.toLowerCase().includes(terminoBusqueda) ||
            cancion.letra.toLowerCase().includes(terminoBusqueda);

        return coincideTipo && coincideTexto;
    });

    renderizarLista(cancionesFiltradas);
}