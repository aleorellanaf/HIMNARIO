import pdfplumber
import json
import re
import os

def extraer_letras_perfectas(json_nombre="canciones.json"):
    # 1. Rutas del proyecto
    ruta_base = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(ruta_base, "data")
    
    # Asegurar que exista la carpeta data/
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
        
    json_path = os.path.join(data_dir, json_nombre)
    
    # 2. Encontrar el PDF
    pdf_encontrado = None
    for archivo in os.listdir(ruta_base):
        if archivo.lower().endswith('.pdf'):
            pdf_encontrado = archivo
            break
            
    if not pdf_encontrado:
        print("❌ Error: No se encontró ningún archivo .pdf en la raíz.")
        return
        
    print(f"📖 Procesando: '{pdf_encontrado}'...")
    
    canciones = []
    
    # 3. Lógica de extracción
    # Esta expresión busca números al inicio de línea seguidos de un título
    # y usa el número como separador de canciones
    with pdfplumber.open(os.path.join(ruta_base, pdf_encontrado)) as pdf:
        texto_completo = ""
        for pagina in pdf.pages:
            texto_pag = pagina.extract_text()
            if texto_pag:
                texto_completo += texto_pag + "\n"

    # Regex para dividir por números de himno (asumiendo formato "1", "2", ... "385")
    # Busca un número al inicio de línea que sea seguido por texto
    partes = re.split(r'\n(\d{1,3})\n', texto_completo)
    
    # Saltamos la primera parte si está vacía
    i = 0
    while i < len(partes) - 1:
        i += 1
        num_str = partes[i]
        contenido = partes[i+1]
        
        numero = int(num_str)
        
        # Extraer título (primera línea del contenido)
        lineas = contenido.strip().split('\n')
        titulo = lineas[0].strip()
        
        # El resto es la letra
        letra = "\n".join(lineas[1:]).strip()
        
        # Categoría basada en tu regla de negocio
        categoria = "ALABANZAS" if numero >= 300 else "HIMNOS"
        
        canciones.append({
            "id": numero,
            "numero": numero,
            "titulo": titulo.title(),
            "categoria": categoria,
            "tipo": categoria.lower(),
            "letra": letra if letra else "Letra en preparación..."
        })
        i += 1

    # 4. Guardar archivo final
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(canciones, f, ensure_ascii=False, indent=2)
        
    print(f"✅ Éxito: {len(canciones)} canciones guardadas en 'data/{json_nombre}'")

if __name__ == "__main__":
    extraer_letras_perfectas()