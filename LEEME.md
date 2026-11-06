# Escape from the Libyans

Juego retro en pixeles: manejás el auto con las flechas por un estacionamiento (la cámara lo sigue hasta llegar a los bordes), esquivás conos, canteros y misiles, y si llegás a 88 millas por hora viajás en el tiempo y ganás.

## Cómo subirlo a tu web

Subí la carpeta `88mph` completa a tu hosting (por FTP, el administrador de archivos del hosting, Netlify, GitHub Pages, etc.), respetando la estructura:

```
88mph/
├── index.html          ← la página del juego
├── css/style.css       ← estilos (HUD, carteles, velocímetro)
├── js/game.js          ← todo el juego; los AJUSTES están arriba de todo
├── js/fx.js            ← posiciones de rayos, fuego y explosión (generado, no hace falta tocarlo)
├── audio/              ← inicio, escape y final (versión 8-bit)
└── img/
    ├── velocimetro.png  ← fondo transparente
    ├── logo.png         ← abajo a la izquierda y en la pantalla de inicio
    ├── camioneta-doc.png ← estacionada en el centro (una sola vista)
    ├── teclado.png      ← las flechas debajo de PLAY
    ├── fx/              ← rayos (por pose), estelas de fuego, explosión y portal
    ├── doc/             ← 24 poses del Doc tirado (pose17 a pose24: boca arriba)
    ├── escenario/       ← árboles, canteros, cerco, puestos, contenedores (contenedor1-6) y conos (cono1-2)
    ├── auto/           ← 8 ángulos del auto
    └── camioneta/      ← 8 ángulos de la camioneta
```

Si la subís a la raíz, el juego queda en `tusitio.com/88mph/`. Si querés que sea la página principal, subí el *contenido* de la carpeta a la raíz.

También funciona abriendo `index.html` directo en la compu, con doble clic.

## Cambiar las imágenes

Reemplazá los PNG con los mismos nombres. Cada letra es hacia dónde mira el vehículo:

| Archivo | Mira hacia |
|---|---|
| `E.png` | derecha |
| `W.png` | izquierda |
| `N.png` | arriba (se ve de atrás) |
| `S.png` | abajo (se ve de frente) |
| `NE.png`, `NW.png`, `SE.png`, `SW.png` | diagonales |

Fondo transparente. El tamaño en píxeles del PNG es el tamaño en el juego: hoy el auto de costado mide unos 148 px de ancho y la camioneta 144. Las sombras quedan mejor en negro semitransparente, porque el piso es oscuro.

El piso, los conos, los árboles y los puestos usan pixeles dobles, la misma grilla que tu referencia de estacionamiento. El piso del estacionamiento no es una imagen: se dibuja con código al cargar (líneas, canteros, postes, manchas), así puede tener cualquier tamaño. Se ajusta en `CONFIG.mundo`.

## Ajustar la dificultad

Arriba de todo en `js/game.js` está `CONFIG`:

- `conos`: cantidad de conos.
- `arboles`, `canteros`, `cercos`, `puestos`, `contenedores`: cuántos de cada uno se reparten por el estacionamiento (cambian de lugar cada vez que se carga la página).
- `velocidadAuto`: cuánto más rinde el DeLorean que la camioneta (1.12 = 12% más).
- `aceleracionInicial`, `aceleracionPerdida`: qué tan fuerte arranca el auto y cuánto le cuesta más a medida que se acerca a 88.
- `zoom`: qué tan cerca se ve la escena (1 = más cerca; 0.85 = 15% más lejos).
- `camionetaVelMax`: qué tan rápido te persigue.
- `misilVelocidad`, `misilGiro`, `misilCadencia`: cuánto molestan los misiles.
- `pixelesPorMph`: velocidad general del juego (afecta auto y camioneta por igual).
- `vidas`, `misilDuracion`, `mundo` (tamaño del estacionamiento).

El tamaño del velocímetro y del logo se cambia en `css/style.css`, en la variable `--gauge`.

Las tipografías se cargan desde Google Fonts, así que hace falta internet para verlas; sin conexión usa una tipografía monoespaciada de reemplazo.

## Música

- `inicio-8bit` suena en la pantalla del logo, `escape-8bit` mientras jugás y `final-8bit` cuando escapás.
- Los navegadores no dejan sonar nada hasta que la persona toca la página. Si la música del inicio no arranca sola, empieza con el primer clic o la primera tecla.
