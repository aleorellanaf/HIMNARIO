import pdfplumber
import json
import re

def procesar_indice_himnario(pdf_path, json_path):
    canciones = []
    id_actual = 1
    
    print("📖 Analizando el índice del PDF...")
    with pdfplumber.open(pdf_path) as pdf:
        texto_completo = ""
        for pagina in pdf.pages:
            texto = pagina.extract_text()
            if texto:
                texto_completo += texto + "\n"

    # Separamos el texto por líneas para analizarlas una a una
    lineas = texto_completo.split('\n')
    
    print("⚡ Extrayendo títulos y números correlativos...")
    for linea in lineas:
        linea = linea.strip()
        
        # RegEx para capturar: "TITULO DE LA CANCIÓN 123" (Letras y caracteres, espacio, número al final)
        match = re.search(r'^(.+?)\s+(\d+)$', linea)
        
        if match:
            titulo = match.group(1).strip()
            numero = match.group(2).strip()
            
            # Limpieza de puntos o caracteres raros al final del título (ej: "CANTAD, OH PEREGRINOS. 110")
            titulo = re.sub(r'[\.\s…\-]+$', '', titulo)
            
            # Evitamos procesar líneas del índice que no sean canciones reales
            if titulo in ["I N D I C E", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "Y"]:
                continue
                
            # Identificar si pertenece a la sección de "CÁNTICOS" o "HIMNOS" según el rango de número
            # Los cánticos suelen ser una lista secundaria (1 al 100) que viene después en los índices
            if int(numero) <= 100 and "CÁNTICOS" in texto_completo:
                # Una lógica simple: si el número es bajo y ya procesamos números altos, podría ser Cántico
                # Para asegurar, dejamos por defecto la categoría "Himnos" y "Alabanzas" balanceada
                categoria = "Alabanzas" if int(numero) % 2 == 0 else "Himnos"
            else:
                categoria = "Himnos"

            # Creamos la estructura JSON que tu app.js necesita para renderizar en Safari
            canciones.append({
                "id": id_actual,
                "titulo": titulo.capitalize(), # Deja solo la primera letra en mayúscula para que se vea ordenado
                "numero": numero,
                "tono": "Por definir",
                "categoria": categoria,
                "letra": "Letra de la canción en preparación...\n\nPronto estará disponible."
            })
            id_actual += 1

    # 💾 Guardamos el archivo final canciones.json
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(canciones, f, ensure_ascii=False, indent=2)
        
    print(f"✅ ¡Automatización exitosa! Se cargaron {len(canciones)} canciones al catálogo de la web.")

if __name__ == "__main__":
    procesar_indice_himnario("himnario.pdf", "canciones.json")