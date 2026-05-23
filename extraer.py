import pdfplumber
import json
import re

def extraer_letras_completas(pdf_path, json_path):
    print("📖 Abriendo el cuerpo completo del himnario con filtro de mayúsculas...")
    
    canciones = []
    id_actual = 1
    
    # Captura un número al inicio y el resto de la línea
    patron_inicio = re.compile(r'^(\d+)\.?\s+(.+)$')
    
    himno_actual = None
    lineas_letra_acumuladas = []
    
    with pdfplumber.open(pdf_path) as pdf:
        # Procesamos desde la página 3 (índice real del libro)
        for num_pag, pagina in enumerate(pdf.pages[2:], start=3):
            texto = pagina.extract_text()
            if not texto:
                continue
                
            lineas = texto.split('\n')
            
            for linea in lineas:
                linea_limpia = linea.strip()
                if not linea_limpia:
                    if himno_actual and lineas_letra_acumuladas and lineas_letra_acumuladas[-1] != "":
                        lineas_letra_acumuladas.append("")
                    continue
                
                # Filtros de seguridad para saltar encabezados de páginas
                if any(x in linea_limpia.upper() for x in ["I N D I C E", "ÍNDICE", "HIMNARIO", "PÁGINA"]):
                    continue
                
                match = patron_inicio.match(linea_limpia)
                
                # CONDICIÓN CLAVE: Es un himno nuevo SOLO si tiene número Y el título está en MAYÚSCULAS
                if match and match.group(2).strip().isupper() and len(match.group(2).strip()) > 3:
                    
                    # Guardamos el himno anterior antes de pasar al siguiente
                    if himno_actual:
                        letra_final = "\n".join(lineas_letra_acumuladas).strip()
                        # Limpiamos saltos dobles repetidos al final
                        letra_final = re.sub(r'\n{3,}', '\n\n', letra_final)
                        himno_actual["letra"] = letra_final if letra_final else "Letra en preparación..."
                        canciones.append(himno_actual)
                        id_actual += 1
                        lineas_letra_acumuladas = []
                    
                    numero = match.group(1).strip()
                    titulo = match.group(2).strip()
                    
                    # Limpieza fina de caracteres raros
                    titulo = re.sub(r'^[\.\-\s]+', '', titulo)
                    titulo = re.sub(r'[\.\-\s…]+$', '', titulo)
                    
                    # Clasificación por rangos oficiales
                    if int(numero) <= 100 and id_actual > 250:
                        categoria = "ALABANZAS"
                    else:
                        categoria = "HIMNOS"
                        
                    himno_actual = {
                        "id": id_actual,
                        "titulo": titulo.capitalize(), # Guardamos estético (Ej: "Vivo por cristo")
                        "numero": numero,
                        "tono": "Por definir",
                        "categoria": categoria,
                        "tipo": categoria.lower(),
                        "letra": ""
                    }
                else:
                    # Si no cumple el filtro estricto de mayúsculas, es una estrofa de la letra
                    if himno_actual:
                        lineas_letra_acumuladas.append(linea_limpia)
                        
        # Guardamos el último de la lista
        if himno_actual:
            letra_final = "\n".join(lineas_letra_acumuladas).strip()
            letra_final = re.sub(r'\n{3,}', '\n\n', letra_final)
            himno_actual["letra"] = letra_final if letra_final else "Letra en preparación..."
            canciones.append(himno_actual)

    # 💾 Guardamos la base de datos pulida
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(canciones, f, ensure_ascii=False, indent=2)
        
    print(f"\n✅ ¡Filtro inteligente aplicado! Se cargaron exactamente {len(canciones)} canciones limpias con sus estrofas agrupadas.")

if __name__ == "__main__":
    extraer_letras_completas("himnario.pdf", "canciones.json")