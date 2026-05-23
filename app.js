let canciones = [];
let filtroTipoActual = 'todos';

const listaCanciones = document.getElementById('lista-canciones');
const searchInput = document.getElementById('search-input');

// 1. CARGAR DATOS
async function cargarHimnario() {
    try {
        const respuesta = await fetch('canciones.json');
        canciones = await respuesta.json();
        renderizarCanciones();
    } catch (error) {
        console.error("Error al cargar el archivo canciones.json:", error);
        if (listaCanciones) {
            listaCanciones.innerHTML = `<li style="padding: 20px; color: #ef4444; text-align: center; font-size: 0.9rem;">Error al cargar el himnario. Asegúrate de servir el proyecto desde un servidor o GitHub Pages.</li>`;
        }
    }
}

// 2. RENDERIZAR INTERFAZ
function renderizarCanciones() {
    if (!listaCanciones) return;
    listaCanciones.innerHTML = '';
    
    canciones.sort((a, b) => a.id - b.id);
    const termino = searchInput ? searchInput.value.toLowerCase().trim() : '';

    canciones.forEach(cancion => {
        const categoriaCancion = cancion.categoria ? cancion.categoria.toLowerCase() : 'himnos';
        
        // Filtros superiores
        if (filtroTipoActual !== 'todos') {
            if (filtroTipoActual === 'himnos' && !categoriaCancion.includes('himno')) return;
            if (filtroTipoActual === 'alabanzas' && !categoriaCancion.includes('alabanza')) return;
        }

        // Filtros del buscador
        const coincideId = cancion.id.toString() === termino || (cancion.numero && cancion.numero.toString() === termino);
        const coincideTitulo = cancion.titulo ? cancion.titulo.toLowerCase().includes(termino) : false;
        const coincideLetra = cancion.letra ? cancion.letra.toLowerCase().includes(termino) : false;
        const coincideNota = cancion.tono ? cancion.tono.toLowerCase().includes(termino) : false;

        if (termino !== '' && !coincideId && !coincideTitulo && !coincideLetra && !coincideNota) {
            return;
        }

        const li = document.createElement('li');
        li.className = `song-item type-${categoriaCancion}`;
        
        li.innerHTML = `
            <div class="song-header" onclick="toggleLetra(${cancion.id})">
                <div class="song-info">
                    <span class="song-number">#${cancion.numero || cancion.id}</span>
                    <span class="song-title">${cancion.titulo || 'Sin título'}</span>
                    <span class="badge-tag">${(cancion.categoria || 'HIMNOS').toUpperCase()}</span>
                </div>
                ${cancion.tono && cancion.tono !== 'Por definir' ? `<span class="music-note">${cancion.tono}</span>` : ''}
            </div>
            <div id="lyrics-${cancion.id}" class="song-lyrics-container" style="display: none;">
                ${cancion.letra ? cancion.letra.replace(/\n/g, '<br>') : 'Letra no disponible.'}
            </div>
        `;
        listaCanciones.appendChild(li);
    });
}

// 3. LISTENERS Y EVENTOS
if (searchInput) {
    searchInput.addEventListener('input', renderizarCanciones);
}

window.filtrarPorTipo = function(tipo, e) {
    filtroTipoActual = tipo.toLowerCase();
    
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    const botonActivo = e ? e.target : window.event.target;
    if (botonActivo) {
        botonActivo.classList.add('active');
    }
    renderizarCanciones();
};

window.toggleLetra = function(id) {
    const contenedor = document.getElementById(`lyrics-${id}`);
    if (contenedor) {
        contenedor.style.display = contenedor.style.display === 'none' ? 'block' : 'none';
    }
};

cargarHimnario();