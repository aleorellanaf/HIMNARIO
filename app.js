let baseCanciones = [];
let categoriaActual = 'todas';

async function cargarDatos() {
    const res = await fetch('./canciones.json');
    baseCanciones = await res.json();
    renderizar(baseCanciones);
    actualizarContador();
}

function cambiarSeccion(id, btn) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (btn) btn.classList.add('active');
}

function filtrar() {
    const term = document.getElementById('search-input').value.toLowerCase();
    const filtradas = baseCanciones.filter(c => {
        const matchCat = categoriaActual === 'todas' || c.tipo === categoriaActual;
        const matchTerm = c.titulo.toLowerCase().includes(term) || c.numero.toString().includes(term);
        return matchCat && matchTerm;
    });
    renderizar(filtradas);
}

function filtrarCategoria(cat, btn) {
    categoriaActual = cat;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    filtrar();
}

function renderizar(lista) {
    const cont = document.getElementById('lista-canciones');
    cont.innerHTML = lista.map(c => `
        <li class="song-item">
            <div class="song-header" onclick="this.nextElementSibling.classList.toggle('open')">
                <span>${c.numero} - ${c.titulo}</span>
            </div>
            <div class="song-lyrics"><pre>${c.letra}</pre></div>
        </li>
    `).join('');
}

function actualizarContador() {
    const h = baseCanciones.filter(c => c.tipo === 'himnos').length;
    const a = baseCanciones.filter(c => c.tipo === 'alabanzas').length;
    document.getElementById('hero-subtitle').innerText = `${h} Himnos · ${a} Alabanzas`;
}

cargarDatos();