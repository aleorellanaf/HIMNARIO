let canciones = [];
let filtroTipoActual = 'todos';

// Elementos del DOM
const listaCanciones = document.getElementById('lista-canciones');
const searchInput = document.getElementById('search-input');

// 1. CARGAR DATOS DESDE EL ARCHIVO JSON
async function cargarHimnario() {
    try {
        const respuesta = await fetch('canciones.json');
        canciones = await respuesta.json();
        renderizarCanciones();
    } catch (error) {
        console.error("Error al cargar el archivo canciones.json:", error);
        if (listaCanciones) {
            listaCanciones.innerHTML = `<li class="error-msg" style="padding: 20px; color: #e53e3e; text-align: center;">Error al cargar el himnario. Asegúrate de que canciones.json exista.</li>`;
        }
    }
}

// 2. RENDERIZAR LAS CANCIONES
function renderizarCanciones() {
    if (!listaCanciones) return;
    listaCanciones.innerHTML = '';
    
    // Siempre ordenados correlativamente por ID
    canciones.sort((a, b) => a.id - b.id);

    const termino = searchInput ? searchInput.value.toLowerCase().trim() : '';

    canciones.forEach(cancion => {
        // Filtro por botones (Todos / Himno / Alabanza)
        if (filtroTipoActual !== 'todos' && cancion.tipo !== filtroTipoActual) {
            return;
        }

        // Filtro por motor de búsqueda
        const coincideId = cancion.id.toString() === termino;
        const coincideTitulo = cancion.titulo.toLowerCase().includes(termino);
        const coincideLetra = cancion.letra.toLowerCase().includes(termino);
        const coincideNota = cancion.nota ? cancion.nota.toLowerCase().includes(termino) : false;

        if (termino !== '' && !coincideId && !coincideTitulo && !coincideLetra && !coincideNota) {
            return;
        }

        // Crear elemento en la lista
        const li = document.createElement('li');
        li.className = `song-item type-${cancion.tipo}`;
        
        li.innerHTML = `
            <div class="song-header" onclick="toggleLetra(${cancion.id})">
                <div class="song-info">
                    <span class="song-number">#${cancion.id}</span>
                    <span class="song-title">${cancion.titulo}</span>
                    <span class="badge-tag">${cancion.subtipo || cancion.tipo}</span>
                </div>
                ${cancion.nota ? `<span class="music-note">${cancion.nota}</span>` : ''}
            </div>
            <div id="lyrics-${cancion.id}" class="song-lyrics-container" style="display: none;">
                ${cancion.letra.replace(/\n/g, '<br>')}
            </div>
        `;
        listaCanciones.appendChild(li);
    });
}

// 3. EVENTOS DE FILTRADO Y BÚSQUEDA
if (searchInput) {
    searchInput.addEventListener('input', renderizarCanciones);
}

// Corregido pasándole el parámetro 'e' del evento explícitamente
window.filtrarPorTipo = function(tipo, e) {
    filtroTipoActual = tipo;
    
    // Manejo visual de botones activos
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

// Inicializar la app
cargarHimnario();