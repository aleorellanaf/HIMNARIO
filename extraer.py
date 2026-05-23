import pdfplumber
import json
import re
import os

def extraer_letras_perfectas(json_nombre):
    # 1. Encontrar de forma dinámica la carpeta absoluta donde está este script
    ruta_base = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(ruta_base, json_nombre)
    
    # 2. Escanear automáticamente la carpeta para encontrar tu archivo PDF
    archivos_en_carpeta = os.listdir(ruta_base)
    pdf_encontrado = None
    
    for archivo in archivos_en_carpeta:
        if archivo.lower().endswith('.pdf'):
            pdf_encontrado = archivo
            break
            
    if not pdf_encontrado:
        print(f"❌ Error Crítico: No se encontró ningún archivo .pdf dentro de la carpeta:")
        print(f"   {ruta_base}")
        print("👉 Asegúrate de que el PDF que subiste esté guardado en esa misma carpeta.")
        return
        
    pdf_path = os.path.join(ruta_base, pdf_encontrado)
    print(f"📖 ¡Archivo detectado con éxito!: '{pdf_encontrado}'")
    print("⏳ Analizando estructura continua para indexar las 385 canciones...")
    
    texto_completo = ""
    with pdfplumber.open(pdf_path) as pdf:
        for pagina in pdf.pages:
            texto_pag = pagina.extract_text()
            if texto_pag:
                texto_completo += texto_pag + "\n"

    # REGEX QUIRÚRGICA: Busca "Número + Espacios/Saltos + Título en MAYÚSCULAS"
    # Captura de forma flexible sin importar si el número está al inicio de la línea o flotando
    patron_encabezado = re.compile(r'(?:^|\s)(\d+)[\s\n]+([A-ZÁÉÍÓÚÑ¿?¡!.,\s-]{3,})', re.DOTALL)
    
    matches = list(patron_encabezado.finditer(texto_completo))
    bloques_validos = []
    ultimo_num_registrado = 0
    
    # Fase 1: Mapear la secuencia numérica estricta del 1 al 385
    for match in matches:
        num_detectado = int(match.group(1))
        titulo_detectado = match.group(2).strip()
        
        # Filtros para ignorar la palabra CORO o falsos positivos altos
        if "CORO" in titulo_detectado or num_detectado > 390:
            continue
            
        # Lógica secuencial: descarta las estrofas ordinarias (1., 2.) porque no ascienden
        if num_detectado > ultimo_num_registrado:
            if ultimo_num_registrado == 0 or (num_detectado - ultimo_num_registrado) < 100:
                bloques_validos.append({
                    "numero": num_detectado,
                    "titulo": titulo_detectado,
                    "inicio_pos": match.start(),
                    "fin_encabezado_pos": match.end()
                })
                ultimo_num_registrado = num_detectado

    canciones = []
    total_himnos = len(bloques_validos)
    
    # Fase 2: Recortar de forma milimétrica la letra entre las coordenadas encontradas
    for i in range(total_himnos):
        himno_actual = bloques_validos[i]
        pos_inicio_letra = himno_actual["fin_encabezado_pos"]
        
        if i + 1 < total_himnos:
            pos_fin_letra = bloques_validos[i+1]["inicio_pos"]
        else:
            pos_fin_letra = len(texto_completo)
            
        fragmento_letra = texto_completo[pos_inicio_letra:pos_fin_letra]
        
        lineas_letra = []
        for linea in fragmento_letra.split("\n"):
            linea_limpia = linea.strip()
            
            # Limpiar el residuo del número del siguiente himno si quedó acoplado al final
            if i + 1 < total_himnos and linea_limpia == str(bloques_validos[i+1]["numero"]):
                break
                
            if not linea_limpia:
                if lineas_letra and lineas_letra[-1] != "":
                    lineas_letra.append("")
                continue
                
            if any(x in linea_limpia.upper() for x in ["HIMNARIO", "PÁGINA", "EDICIONES", "TEMUCO"]):
                continue
                
            lineas_letra.append(linea_limpia)
            
        letra_final = "\n".join(lineas_letra).strip()
        letra_final = re.sub(r'\n{3,}', '\n\n', letra_final)
        
        # Formatear estéticamente el título
        titulo_limpio = re.sub(r'\s+', ' ', himno_actual["titulo"]).strip()
        titulo_limpio = re.sub(r'^[\.\-\s…]+|[\.\-\s…]+$', '', titulo_limpio)
        
        categoria = "ALABANZAS" if himno_actual["numero"] >= 300 else "HIMNOS"
        
        canciones.append({
            "id": i + 1,
            "titulo": titulo_limpio.title(), 
            "numero": himno_actual["numero"],
            "tono": "Por definir",
            "categoria": categoria,
            "tipo": categoria.lower(),
            "letra": letra_final if letra_final else "Letra en preparación..."
        })

    # Guardar en canciones.json respetando UTF-8
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(canciones, f, ensure_ascii=False, indent=2)
        
    print(f"\n✅ ¡Proceso terminado con éxito! Se indexaron exactamente {len(canciones)} canciones reales en '{json_nombre}'.")

if __name__ == "__main__":
    # Ya no le pasamos el nombre del PDF; el script lo detectará solo
    extraer_letras_perfectas("canciones.json")