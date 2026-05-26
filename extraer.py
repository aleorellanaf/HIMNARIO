import pdfplumber
import json
import re
import os

def extraer_himnario_limpio(pdf_nombre="himnario_texto.pdf", json_nombre="data/canciones.json"):
    ruta_base = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(ruta_base, json_nombre)
    pdf_path = os.path.join(ruta_base, pdf_nombre)
    
    if not os.path.exists(os.path.dirname(json_path)):
        os.makedirs(os.path.dirname(json_path))

    canciones = []
    
    with pdfplumber.open(pdf_path) as pdf:
        # Unimos todo el texto para procesarlo mejor
        texto_completo = ""
        for pagina in pdf.pages:
            texto = pagina.extract_text()
            if texto:
                texto_completo += texto + "\n"

    # Regex mejorada: busca el número del himno al inicio de una línea, 
    # seguido por el título y la letra, hasta encontrar el siguiente número.
    # El patrón ignora los números que están dentro de la letra.
    
    # Esta técnica separa los himnos usando el número al inicio de página/sección
    # Patrón: número al principio de línea, seguido de título y letra
    partes = re.split(r'\n(\d{1,3})\s+', texto_completo)
    
    # Procesar, saltando el primer elemento que es basura antes del primer himno
    for i in range(1, len(partes), 2):
        try:
            numero = int(partes[i])
            contenido = partes[i+1].strip()
            
            lineas = contenido.split('\n')
            titulo = lineas[0].strip()
            letra = "\n".join(lineas[1:]).strip()
            
            # Filtro: Solo guardamos si realmente tenemos letra
            if len(letra) > 10: 
                categoria = "Alabanza" if numero >= 300 else "Himno"
                
                canciones.append({
                    "id": numero,
                    "numero": numero,
                    "titulo": titulo.title(),
                    "categoria": categoria,
                    "tipo": "himno" if categoria == "Himno" else "alabanza",
                    "letra": letra
                })
        except (ValueError, IndexError):
            continue

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(canciones, f, ensure_ascii=False, indent=2)
    
    print(f"✅ ¡Éxito! Himnario procesado: {len(canciones)} canciones extraídas.")

if __name__ == "__main__":
    extraer_himnario_limpio()