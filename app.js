// Variable para controlar el tamaño de letra (inicial 1.2rem)
let currentFontSize = 1.2;

function renderizar(lista) {
    const contenedor = document.getElementById('lista-canciones');
    contenedor.innerHTML = lista.map(c => `
        <div class="song-item">
            <div class="song-header" onclick="toggleLetra(this)">
                <span class="song-number">${c.numero}</span>
                <span class="song-title">${c.titulo}</span>
            </div>
            <div class="song-lyrics-container" style="font-size: ${currentFontSize}rem;">
                <pre>${c.letra}</pre>
                <div class="zoom-controls">
                    <button onclick="cambiarZoom(-0.1)">A-</button>
                    <button onclick="cambiarZoom(0.1)">A+</button>
                </div>
            </div>
        </div>
    `).join('');
}

function cambiarZoom(delta) {
    currentFontSize += delta;
    // Aplicamos el cambio a todos los contenedores abiertos
    document.querySelectorAll('.song-lyrics-container').forEach(el => {
        el.style.fontSize = `${currentFontSize}rem`;
    });
}