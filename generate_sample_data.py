"""
Genera un canciones.json de muestra con 20 himnos representativos.
El usuario debe reemplazar este archivo con su base de datos real de 385 himnos.
"""
import json
import os

SAMPLE_HYMNS = [
    {
        "id": 1,
        "numero": 1,
        "titulo": "Santo, Santo, Santo",
        "categoria": "Adoración",
        "letra": "Santo, Santo, Santo\nSeñor Omnipotente\nSiempre el labio mío\nLoores te dará\n\nSanto, Santo, Santo\nTe adoro reverente\nDios en tres personas\nBendita Trinidad\n\nCoro\nSanto, Santo, Santo\nSeñor Omnipotente\nToda la creación\nTe alaba sin cesar"
    },
    {
        "id": 2,
        "numero": 2,
        "titulo": "Cuán Grande es Él",
        "categoria": "Adoración",
        "letra": "Señor mi Dios\nAl contemplar los cielos\nEl firmamento y las estrellas mil\nAl oír tu voz\nEn los potentes truenos\nY ver brillar el sol en su cenit\n\nCoro\nEntonces prorrumpe mi alma en canción\nCuán grande es Él\nCuán grande es Él\nEntonces prorrumpe mi alma en canción\nCuán grande es Él\nCuán grande es Él\n\nCuando recuerdo\nQue por mí en la cruz\nQuiso sufrir y morir el Unigénito\nY al meditar\nEn tan sublime amor\nUn canto nuevo surge en mi ser"
    },
    {
        "id": 3,
        "numero": 3,
        "titulo": "A Dios el Padre Celestial",
        "categoria": "Alabanza",
        "letra": "A Dios el Padre celestial\nAl Hijo nuestro Redentor\nAl eternal Consolador\nUnidos todos alabad\n\nAl Padre que en los cielos está\nAl Hijo que nos redimió\nAl Santo Espíritu de amor\nLoor eterno tributad"
    },
    {
        "id": 4,
        "numero": 4,
        "titulo": "Sublime Gracia",
        "categoria": "Salvación",
        "letra": "Sublime gracia del Señor\nQue a un infeliz salvó\nFui ciego mas hoy veo yo\nPerdido y Él me halló\n\nSu gracia me enseñó a temer\nMis dudas ahuyentó\nOh cuán precioso fue a mi ser\nCuando Él me transformó\n\nCoro\nCuando en Sión por siglos mil\nBrillando esté cual sol\nYo cantaré por siempre allí\nSu amor que me salvó"
    },
    {
        "id": 5,
        "numero": 5,
        "titulo": "Firmes y Adelante",
        "categoria": "Militante",
        "letra": "Firmes y adelante\nHuestes de la fe\nSin temor alguno\nQue Jesús nos ve\n\nJefe soberano\nCristo al frente va\nY la regia enseña\nTrémola ya\n\nCoro\nFirmes y adelante\nHuestes de la fe\nSin temor alguno\nQue Jesús nos ve"
    },
    {
        "id": 6,
        "numero": 6,
        "titulo": "Oh Jesús Yo He Prometido",
        "categoria": "Consagración",
        "letra": "Oh Jesús yo he prometido\nServirte con amor\nSé mi fuerza y mi escudo\nMi Maestro y Señor\n\nNo temeré la lucha\nSi Tú estás junto a mí\nNi me perderé en el camino\nSi Tú guías mis pies\n\nOh Jesús Tú has prometido\nA todos los que van\nEn pos de Ti que donde Tú estés\nEstarán también"
    },
    {
        "id": 7,
        "numero": 7,
        "titulo": "Castillo Fuerte es Nuestro Dios",
        "categoria": "Confianza",
        "letra": "Castillo fuerte es nuestro Dios\nDefensa y buen escudo\nCon su poder nos librará\nEn este trance agudo\n\nCon furia y con afán\nAcósanos Satán\nPor armas deja ver\nAstucia y gran poder\nCual él no hay en la tierra\n\nNuestro valor es nada aquí\nCon él todo es perdido\nMas por nosotros pugnará\nDe Dios el escogido"
    },
    {
        "id": 8,
        "numero": 8,
        "titulo": "Hay un Lugar Donde Quiero Estar",
        "categoria": "Oración",
        "letra": "Hay un lugar donde quiero estar\nPostrado a los pies de Jesús\nDonde pueda adorar y alabar\nY sentir su presencia y su luz\n\nCoro\nA tus pies Señor\nMe postro hoy\nEn adoración\nA ti me doy\nTu presencia es lo que anhelo\nTu amor es lo que busco\nA tus pies Señor"
    },
    {
        "id": 9,
        "numero": 9,
        "titulo": "Cuando Allá se Pase Lista",
        "categoria": "Esperanza",
        "letra": "Cuando la trompeta suene\nEn aquel día final\nY que el alba eterna rompa\nEn la mañana sin igual\nCuando los salvados reinen\nEn aquel glorioso día\nY se pase lista\nYo estaré allí\n\nCoro\nCuando allá se pase lista\nCuando allá se pase lista\nCuando allá se pase lista\nA mi nombre yo feliz responderé"
    },
    {
        "id": 10,
        "numero": 10,
        "titulo": "Jesús es mi Rey Soberano",
        "categoria": "Alabanza",
        "letra": "Jesús es mi Rey soberano\nMi gozo es cantar su loor\nEs Rey y me ve como hermano\nEs Rey y me llama su amor\n\nDejando su trono de gloria\nMe vino a sacar de la escoria\nY yo soy feliz\nY yo soy feliz por eso\n\nCoro\nJesús es mi Rey soberano\nMi gozo es cantar su loor\nEs Rey y me ve como hermano\nEs Rey y me llama su amor"
    },
    {
        "id": 11,
        "numero": 11,
        "titulo": "Maravillosa Gracia",
        "categoria": "Salvación",
        "letra": "Maravillosa gracia de nuestro amante Dios\nGracia que excede todo pecado y culpa mía\nYo busqué muchas riquezas\nLas que el mundo no puede dar\nSe encontró en el manantial de la gracia de Dios\n\nCoro\nGracia gracia gracia de Dios\nGracia gracia gracia de Dios\nGracia que es más grande que todo mi pecado\nGracia maravillosa de Dios"
    },
    {
        "id": 12,
        "numero": 12,
        "titulo": "El Amor de Dios",
        "categoria": "Amor de Dios",
        "letra": "El amor de Dios es maravilloso\nTan grande que no puede medirse\nAlto como los cielos\nProfundo como el mar\nEterno como la eternidad\n\nCoro\nOh el amor de Dios\nCuán grande cuán puro\nCuán profundo cuán alto\nCuán ancho cuán largo\nEl amor de Dios"
    },
    {
        "id": 13,
        "numero": 13,
        "titulo": "Dios os Guarde",
        "categoria": "Despedida",
        "letra": "Dios os guarde\nDios os guarde\nHasta que nos reunamos\nEn sus brazos os reciba\nDios os guarde\n\nHasta que nos reunamos\nHasta que nos reunamos\nEn sus brazos os reciba\nDios os guarde"
    },
    {
        "id": 14,
        "numero": 14,
        "titulo": "Yo Tengo Gozo en Mi Alma",
        "categoria": "Gozo",
        "letra": "Yo tengo gozo en mi alma hoy\nGozo en mi alma hoy\nGozo en mi alma hoy\nDesde que Cristo entró\n\nTengo paz en mi alma hoy\nPaz en mi alma hoy\nPaz en mi alma hoy\nDesde que Cristo entró\n\nTengo amor en mi alma hoy\nAmor en mi alma hoy\nAmor en mi alma hoy\nDesde que Cristo entró"
    },
    {
        "id": 15,
        "numero": 15,
        "titulo": "Cerca de Ti Señor",
        "categoria": "Oración",
        "letra": "Cerca de Ti Señor\nCerca de Ti\nAunque sea una cruz\nLo que me haga ir\n\nAun así mi canto será\nCerca de Ti Señor\nCerca de Ti\n\nComo viajero solo\nEn la noche oscura\nSueño y veo el cielo\nLleno de hermosura\n\nY en mi sueño escucho\nVoces que me dicen\nCerca de Ti Señor\nCerca de Ti"
    },
    {
        "id": 16,
        "numero": 16,
        "titulo": "Hay Poder en Cristo",
        "categoria": "Evangelismo",
        "letra": "¿Quieres ser salvo de toda maldad?\nHay poder en Cristo\n¿Quieres vivir y gozar de la paz?\nHay poder en Cristo\n\nCoro\nHay poder poder\nDon de lo alto\nHay poder poder\nEn Jesús\nHay poder poder\nDon de lo alto\nEn la sangre de Jesús"
    },
    {
        "id": 17,
        "numero": 17,
        "titulo": "Bendito el Nombre del Señor",
        "categoria": "Alabanza",
        "letra": "Bendito el nombre del Señor\nBendito el nombre del Señor\nBendito el nombre del Señor\nAhora y para siempre\n\nDigno de alabanza\nDigno de alabanza\nDigno de alabanza\nAhora y para siempre"
    },
    {
        "id": 18,
        "numero": 18,
        "titulo": "Sé Tú Mi Visión",
        "categoria": "Consagración",
        "letra": "Sé Tú mi visión oh Señor de mi ser\nNada hay en la tierra que pueda querer\nSé Tú mi sabiduría mi tesoro mejor\nSé Tú mi mejor pensamiento de día y de noche\n\nSé Tú mi escudo mi espada en la lid\nSé Tú mi dignidad Tú mi deleite\nSé Tú mi alma morada mi alta torre también\nSé Tú mi armadura mi fortaleza también"
    },
    {
        "id": 19,
        "numero": 19,
        "titulo": "Alabad al Señor",
        "categoria": "Adoración",
        "letra": "Alabad al Señor\nAlabad al Señor\nAlabad al Señor\nTodas las naciones\n\nAlabad al Señor\nAlabad al Señor\nAlabad al Señor\nTodos los pueblos\n\nPorque grande es su misericordia\nY su verdad permanece para siempre\nAlabad al Señor"
    },
    {
        "id": 20,
        "numero": 20,
        "titulo": "Camina Pueblo de Dios",
        "categoria": "Militante",
        "letra": "Camina pueblo de Dios\nCamina pueblo de Dios\nNueva aurora ya se anuncia\nEl día llega por fin\n\nCamina pueblo de Dios\nCamina pueblo de Dios\nCamina pueblo de Dios\n\nMira allá en el Calvario\nEn la cruz el Redentor\nMuere ya por tus culpas\nPor amor a ti y a mí"
    },
]

# Agregar himnos de relleno hasta llegar a 30 para la muestra
CATEGORIES = ["Adoración", "Alabanza", "Salvación", "Consagración", "Oración",
              "Esperanza", "Gozo", "Confianza", "Evangelismo", "Militante",
              "Amor de Dios", "Despedida"]

for i in range(21, 31):
    cat = CATEGORIES[(i - 1) % len(CATEGORIES)]
    SAMPLE_HYMNS.append({
        "id": i,
        "numero": i,
        "titulo": f"Himno de Muestra {i}",
        "categoria": cat,
        "letra": f"Este es el himno número {i}\nDe la categoría {cat}\n\nCoro\nAlabemos al Señor\nCon todo el corazón\nEn este himno {i}\nDe la congregación\n\nSegunda estrofa del himno {i}\nQue nos llena de alegría\nY nos guía en el camino\nDe la vida cada día"
    })

output_path = os.path.join(os.path.dirname(__file__), "data", "canciones.json")
os.makedirs(os.path.dirname(output_path), exist_ok=True)

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(SAMPLE_HYMNS, f, ensure_ascii=False, indent=2)

print(f"✅ canciones.json generado con {len(SAMPLE_HYMNS)} himnos de muestra.")
print(f"   Ruta: {output_path}")
print()
print("⚠️  IMPORTANTE: Reemplaza este archivo con tu base de datos real de 385 himnos.")
print("   El formato esperado es un array JSON con los campos:")
print('   { "id": number, "numero": number, "titulo": string, "categoria": string, "letra": string }')
