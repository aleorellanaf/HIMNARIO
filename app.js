// 2. RENDERIZAR LAS CANCIONES
function renderizarCanciones() {
    if (!listaCanciones) return;
    listaCanciones.innerHTML = '';
    
    // Siempre ordenados correlativamente por ID o Número de Himno
    canciones.sort((a, b) => a.id - b.id);

    const termino = searchInput ? searchInput.value.toLowerCase().trim() : '';

    canciones.forEach(cancion => {
        // 1. CORREGIDO: Filtro por botones mapeado a la propiedad 'categoria' de Python
        // Pasa a minúsculas para evitar problemas con "Himnos" vs "himnos"
        const categoriaCancion = cancion.categoria ? cancion.categoria.toLowerCase() : '';
        
        if (filtroTipoActual !== 'todos') {
            if (filtroTipoActual === 'himnos' && !categoriaCancion.includes('himno')) return;
            if (filtroTipoActual === 'alabanzas' && !categoriaCancion.includes('alabanza')) return;
        }

        // 2. CORREGIDO: Filtro del motor de búsqueda adaptado a las claves de Python
        const coincideId = cancion.id.toString() === termino || cancion.numero.toString() === termino;
        const coincideTitulo = cancion.titulo.toLowerCase().includes(termino);
        const coincideLetra = cancion.letra.toLowerCase().includes(termino);
        const coincideNota = cancion.tono ? cancion.tono.toLowerCase().includes(termino) : false;

        if (termino !== '' && !coincideId && !coincideTitulo && !coincideLetra && !coincideNota) {
            return;
        }

        // Crear elemento en la lista
        const li = document.createElement('li');
        // Mantenemos la clase dinámica usando la categoría
        li.className = `song-item type-${categoriaCancion}`;
        
        // 3. CORREGIDO: Reemplazados .tipo por .categoria, y .nota por .tono
        li.innerHTML = `
            <div class="song-header" onclick="toggleLetra(${cancion.id})">
                <div class="song-info">
                    <span class="song-number">#${cancion.numero}</span>
                    <span class="song-title">${cancion.titulo}</span>
                    <span class="badge-tag">${cancion.categoria.toUpperCase()}</span>
                </div>
                ${cancion.tono && cancion.tono !== 'Por definir' ? `<span class="music-note">${cancion.tono}</span>` : ''}
            </div>
            <div id="lyrics-${cancion.id}" class="song-lyrics-container" style="display: none;">
                ${cancion.letra.replace(/\n/g, '<br>')}
            </div>
        `;
        listaCanciones.appendChild(li);
    });
}