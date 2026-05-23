import pdfplumber
import json
import re

def extraer_letras_completas(pdf_path, json_path):
    print("📖 Abriendo el cuerpo completo del himnario...")
    
    canciones = []
    id_actual = 1
    
    # Captura un número al inicio, un punto/espacio opcional y el título
    patron_inicio = re.compile(r'^(\d+)[.\-\s]+(.*)$')
    
    himno_actual = None
    lineas_letra_acumuladas = []
    
    with pdfplumber.open(pdf_path) as pdf:
        for num_pag, pagina in enumerate(pdf.pages, start=1):
            texto = pagina.extract_text()
            if not texto:
                continue
                
            lineas = texto.split('\n')
            
            # Control estricto de parada: Si entramos a las páginas finales de índices de títulos
            if any(idx in texto.upper() for idx in ["ÍNDICE ALFABÉTICO", "INDICE GENERAL", "INDICE ALFABETICO"]):
                print(f"🛑 Índice detectado en la página {num_pag}. Finalizando extracción.")
                break
            
            for linea in lineas:
                linea_limpia = linea.strip()
                
                # Gestión de líneas vacías para separar estrofas de forma limpia
                if not linea_limpia:
                    if himno_actual and lineas_letra_acumuladas and lineas_letra_acumuladas[-1] != "":
                        lineas_letra_acumuladas.append("")
                    continue
                
                # Filtros de seguridad para omitir encabezados o metadatos de imprenta
                if linea_limpia.isdigit() or any(x in linea_limpia.upper() for x in ["I N D I C E", "ÍNDICE", "HIMNARIO", "PÁGINA", "EDICIONES", "TEMUCO"]):
                    continue
                
                match = patron_inicio.match(linea_limpia)
                
                # CONDICIÓN MEJORADA PARA NUEVO HIMNO
                es_nuevo_himno = False
                if match:
                    posible_titulo = match.group(2).strip()
                    # Quitamos todo lo que no sean letras para validar si es un título principal en mayúsculas
                    solo_letras = re.sub(r'[^a-zA-ZÁÉÍÓÚÑ]', '', posible_titulo)
                    
                    # En tu PDF los títulos vienen completamente en mayúsculas (ej: "SUBLIME GRACIA")
                    if solo_letras.isupper() and len(solo_letras) >= 2:
                        es_nuevo_himno = True
                
                if es_nuevo_himno:
                    # Guardar el himno anterior antes de iniciar el nuevo
                    if himno_actual:
                        letra_final = "\n".join(lineas_letra_acumuladas).strip()
                        letra_final = re.sub(r'\n{3,}', '\n\n', letra_final) # Evita saltos de línea triples
                        himno_actual["letra"] = letra_final if letra_final else "Letra en preparación..."
                        canciones.append(himno_actual)
                        id_actual += 1
                        lineas_letra_acumuladas = []
                    
                    numero = match.group(1).strip()
                    titulo = match.group(2).strip()
                    
                    # Limpieza profunda de caracteres huérfanos del formateo del PDF
                    titulo = re.sub(r'^[\.\-\s…]+', '', titulo)
                    titulo = re.sub(r'[\.\-\s…]+$', '', titulo)
                    
                    # Clasificación: En este himnario los coros/alabanzas suelen pasar del número 300 o reiniciar
                    # Adaptamos la lógica de categorías
                    num_int = int(numero)
                    if num_int >= 300:
                        categoria = "ALABANZAS"
                    else:
                        categoria = "HIMNOS"
                        
                    himno_actual = {
                        "id": id_actual,
                        "titulo": titulo.title(), # Convierte "SUBLIME GRACIA" a "Sublime Gracia"
                        "numero": num_int,
                        "tono": "Por definir",
                        "categoria": categoria,
                        "tipo": categoria.lower(),
                        "letra": ""
                    }
                else:
                    # Si no cumple el patrón de título, es el cuerpo de la letra
                    if himno_actual:
                        # Evitar registrar números de página sueltos al final que coincidan con el número del himno
                        if linea_limpia == str(himno_actual["numero"]):
                            continue
                        lineas_letra_acumuladas.append(linea_limpia)
                        
        # No olvidar guardar el último del búfer al salir del bucle
        if himno_actual:
            letra_final = "\n".join(lineas_letra_acumuladas).strip()
            letra_final = re.sub(r'\n{3,}', '\n\n', letra_final)
            himno_actual["letra"] = letra_final if letra_final else "Letra en preparación..."
            canciones.append(himno_actual)

    # Guardar el JSON en UTF-8 nativo para que reconozca tildes y eñes en la web
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(canciones, f, ensure_ascii=False, indent=2)
        
    print(f"\n✅ ¡Proceso terminado! Se procesaron {len(canciones)} canciones correctamente en '{json_path}'.")

if __name__ == "__main__":
    extraer_letras_completas("himnario.pdf", "canciones.json")