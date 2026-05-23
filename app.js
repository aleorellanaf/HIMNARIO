let todasLasCanciones = [];
let filtroActual = 'todos';

document.addEventListener('DOMContentLoaded', () => {
    fetch('canciones.json')
        .then(response => {
            if (!response.ok) throw new Error('No se pudo leer el archivo canciones.json');
            return response.json();
        })
        .then(data => {
            todasLasCanciones = data.sort((a, b) => a.numero - b.numero);
            renderizarLista(todasLasCanciones);
        })
        .catch(error => {
            console.error('Error cargando el himnario:', error);
            document.getElementById('lista-canciones').innerHTML = `
                <li style="padding: 30px; text-align: center; color: var(--text-muted);">
                    Error al cargar los cantos. Revisa tu archivo canciones.json.
                </li>`;
        });

    document.getElementById('search-input').addEventListener('input', filtrarCanciones);
});

function renderizarLista(canciones) {
    const listaUL = document.getElementById('lista-canciones');
    listaUL.innerHTML = '';

    if (canciones.length === 0) {
        listaUL.innerHTML = `<li style="padding: 30px; text-align: center; color: var(--text-muted);">No se encontraron resultados</li>`;
        return;
    }

    canciones.forEach(cancion => {
        const li = document.createElement('li');
        li.className = 'song-item';

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
                ${cancion.letra}
            </div>
        `;
        listaUL.appendChild(li);
    });
}

function toggleLetra(elementoHeader) {
    const contenedorLetra = elementoHeader.nextElementSibling;
    const estaAbierto = contenedorLetra.classList.contains('open');

    document.querySelectorAll('.song-lyrics-container.open').forEach(el => {
        el.classList.remove('open');
    });

    if (!estaAbierto) {
        contenedorLetra.classList.add('open');
    }
}

function filtrarPorTipo(tipo, evento) {
    filtroActual = tipo;
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    evento.target.classList.add('active');
    filtrarCanciones();
}

function filtrarCanciones() {
    const termino = document.getElementById('search-input').value.toLowerCase().trim();

    const cancionesFiltradas = todasLasCanciones.filter(cancion => {
        const coincideTipo = (filtroActual === 'todos') || (cancion.tipo === filtroActual);
        const coincideTexto = 
            cancion.numero.toString().includes(termino) ||
            cancion.titulo.toLowerCase().includes(termino) ||
            cancion.letra.toLowerCase().includes(termino);

        return coincideTipo && coincideTexto;
    });

    renderizarLista(cancionesFiltradas);
}