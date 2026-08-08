# George Array Portfolio — Guía De Proyecto

Documento de contexto para futuras modificaciones humanas o realizadas por
IA. Describe qué hace cada elemento y dónde se cambia.

## Stack

- React 18 + TypeScript.
- Vite 5.
- React Three Fiber + Three.js.
- `@react-three/drei` para `Html` y utilidades R3F.
- Framer Motion para transiciones HTML.
- CSS propio.

Comandos:

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run preview
```

## Cambios Recientes: Estabilidad Móvil

La versión móvil conserva la composición y la animación del cilindro, pero
reduce de forma selectiva las capas HTML que debe componer el navegador.
Esto evita artefactos gráficos, fuentes de reserva y parpadeos en Chrome y
Brave para Android.

- En pantallas de hasta `720px`, `App.tsx` usa un `dpr` de `1`. En escritorio
  mantiene el rango `dpr={[1, 2]}`.
- `Scene.tsx` calcula la columna frontal según la rotación real del cilindro y
  clasifica cada celda en tres estados (`visible` / `buffer` / `hidden`) según
  la distancia al frente. Hay cinco columnas visibles (`≤2`) y dos columnas
  buffer a cada lado (`3-4`).
- En **desktop**, todas las celdas `visible` y `buffer` mantienen su `<Html>`
  montado. Los nodos 3D existen en los tres estados.
- En **mobile** (≤720px), las celdas en `buffer` **no montan** el subtree
  `<Html>` (drei `<Html transform>` escribe un `matrix3d(...)` a un wrapper
  interno cada frame, y 20 cards haciendo eso a 60fps satura el compositor
  de Android). Cuando la tarjeta entra al arco visible, el `<Html>` se monta
  con `decoding="async"` y la imagen se decodifica desde la caché de
  `useImageProgress` en un único frame, sin pop perceptible. Resultado: 25
  tarjetas HTML en mobile (vs. 45 con buffer).
- `PhotoNode` también recibe un `isMobile` y, tras terminar la intro,
  omite su `useFrame` para tarjetas en buffer. Eso evita las escrituras de
  `opacity` y `--photo-brightness` que de otro modo se aplicarían a capas
  ocultas.
- El CSS mobile (`.photo-hit`) añade `will-change: transform` y
  `contain: paint` dentro de `@media (max-width: 720px)` para que el
  compositor de Android trate cada tarjeta como una capa aislada y no
  re-rasterice vecinos cuando una sola cambia. **No** se aplican en
  escritorio para no afectar su pipeline de paint.
- Las fuentes originales son locales: `public/fonts/grenze-gotisch-latin.woff2`
  y `public/fonts/unifraktur-cook-latin.woff2`. `main.css` las declara con
  `@font-face`; no reintroducir enlaces a Google Fonts en `index.html`.

Para comprobar este comportamiento, probar a `390 × 844px`, esperar a que
termine el loader y dejar girar el cilindro. Las fotografías deben entrar y
salir de cuadro sin destellos ni sustitución de tipografía.

## Arquitectura

```text
src/
├─ App.tsx                         # raíz, tema, vistas, Canvas
├─ main.tsx                        # entrada React
├─ types.ts                        # Theme: dark | light
├─ components/
│  ├─ Scene.tsx                    # composición de la escena
│  ├─ CylinderRig.tsx              # cilindro, entrada y rotación
│  ├─ PhotoNode.tsx                # tarjeta individual
│  ├─ CameraRig.tsx                # cámara fija en el centro
│  ├─ ReactiveBackdrop.tsx         # halo estático detrás
│  ├─ Brand.tsx                    # George Array
│  ├─ Loader.tsx                   # carga inicial
│  ├─ CursorLens.tsx               # cursor circular invertido
│  ├─ FloatingMenu.tsx              # menú y tema
│  ├─ MusicToggle.tsx              # play/pausa
│  └─ GallerySection.tsx            # galería 2D
├─ data/photos.ts                  # catálogo de imágenes
├─ hooks/useImageProgress.ts       # progreso de assets
├─ utils/layout.ts                 # posiciones del cilindro
├─ assets/photos/                  # imágenes locales
└─ styles/main.css                 # toda la interfaz HTML
public/
└─ fonts/                           # tipografías góticas autocontenidas
```

## App.tsx

Controla:

- `focusedIndex`: imagen focal o `null`.
- `view`: `'home' | 'gallery'`.
- `theme`: `'dark' | 'light'`, persistido en `localStorage`.
- Loader y pausa del Canvas.
- Transición entre cilindro y galería.

El Canvas usa `frameloop="always"` en home y `frameloop="demand"` en Gallery
para congelar el fondo y reducir consumo.

## Cilindro

### Scene.tsx

Orquesta luces, tarjetas, halo, selección y retorno de imágenes.

Configuración focal:

```ts
const FOCAL_SCALE = 1.8;
```

Al seleccionar una imagen se renderiza como tarjeta focal delante del
cilindro. Al cerrar, la misma imagen vuelve a una única celda frontal.

### CylinderRig.tsx

Responsable de:

- Rotación automática.
- Control por rueda.
- Pausa al abrir Gallery.
- Entrada inicial y su pulso radial.
- Conservación del ángulo al volver desde Gallery.

Variables:

```ts
const INTRO_DURATION = 2.4;
const FINAL_ROTATION_SPEED = 0.16;
```

La rotación del cilindro es global. No añadir rotaciones independientes a
`PhotoNode`, porque eso provoca que las imágenes giren sobre su propio eje.

### layout.ts

Geometría actual:

```ts
FOCAL_POSITION = [0, 0, -23]
MOBILE_FOCAL_POSITION = [0, 0, -31]
CYLINDER_COLUMNS = 28
radius = 26 (desktop) / 30 (mobile)
```

En `Scene.tsx`:

```ts
const cylinderCount = Math.max(
  isMobile ? cylinderColumns * 5 : cylinderColumns * 4,
  photos.length
);
```

Esto crea 28 columnas y 4 filas en escritorio, 32 columnas y 5 filas en
móvil. Si faltan imágenes, se reutilizan de manera determinista para cerrar
el cilindro.

Aunque el cilindro tenga hasta 160 nodos, solo se mantienen tarjetas HTML
montadas en el arco cercano a la cámara. Las constantes en `Scene.tsx`
controlan el alcance:

```ts
const MOBILE_VISIBLE_COLUMN_RADIUS = 2;  // 5 columnas visibles
const MOBILE_BUFFER_COLUMN_RADIUS = 4;   // 2 columnas buffer por lado
```

El resto de los nodos continúa actualizándose en 3D. En mobile las tarjetas
buffer no montan su `<Html>` (ver sección "Cambios Recientes"); en desktop
sí lo mantienen.

Para cambiar la distribución:

- Radio: `radius` en `generateCylinderLayout`.
- Columnas: `CYLINDER_COLUMNS`.
- Filas: `cylinderCount / CYLINDER_COLUMNS`.
- Espaciado vertical: `rowGap`.
- Orden de entrada: `createCylinderIntroRanks`.
- Arco visible móvil: `MOBILE_VISIBLE_COLUMN_RADIUS`.
- Buffer móvil: `MOBILE_BUFFER_COLUMN_RADIUS`.

## PhotoNode.tsx

Cada tarjeta se posiciona con Three.js, pero la imagen se dibuja como HTML
mediante `drei/Html`. Esto evita problemas de texturas WebGL y CORS.

Características:

- Proporción 4:5.
- Tamaño base actual: `224 × 280px`.
- Zona de captura fija `.photo-hit`.
- `<img>` con `decoding="async"` (no `loading="lazy"`, porque las tarjetas
  buffer deben poder decodificar antes de entrar en el arco visible).
- Hover visual sin cambiar la zona de captura.
- Click para abrir la tarjeta focal.
- Retorno a una sola celda frontal.
- Iluminación CSS calculada según la lámpara. La opacidad de la tarjeta y
  los valores de `--photo-brightness` / `--photo-lamp-glow` se actualizan
  cada frame; no reintroducir throttles globales porque producen un desfase
  visible entre la rotación y la luz.
- La prop `visibilityState` (`'visible' | 'buffer' | 'hidden'`) controla solo
  el subtree `Html`: `hidden` lo desmonta, `buffer` lo mantiene oculto
  mediante `visibility:hidden` (sin re-paint) y `visible` lo muestra. El
  grupo 3D permanece montado en los tres estados. Usar este mecanismo para
  ocultar contenido fuera de cámara sin reiniciar la animación del grupo.

Cambiar tamaño:

```ts
const CARD_WIDTH = 224;
const CARD_HEIGHT = 280;
```

No escalar el grupo 3D durante hover. Usar `.photo-card--hovered`, porque
escalar el grupo cambia la zona de captura y puede producir vibración.

## Entrada Inicial

La entrada se sincroniza con el loader:

- El cilindro queda oculto mientras cargan las imágenes.
- Las tarjetas se revelan desde el centro hacia los bordes mediante un pulso.
- El orden comienza en las 6 tarjetas centrales.
- Las tarjetas posteriores aparecen progresivamente.
- La rotación global comienza suavemente desde el primer frame.

Para cambiar la entrada, tocar únicamente:

- `INTRO_DURATION` en `CylinderRig.tsx`.
- `FINAL_ROTATION_SPEED` en `CylinderRig.tsx`.
- `cinematicEase` y `waveStart` en `PhotoNode.tsx`.

## Iluminación Y Fondo

### ReactiveBackdrop.tsx

Es un halo fijo centrado detrás del cilindro.

- No escucha el mouse.
- No usa `useFrame`.
- Consume un único plano con shader.
- Cambia de intensidad según tema.

Valores actuales:

```ts
dark: 0.14
light: 0.07
```

Los `uniforms` se crean con `useMemo` para que su identidad sea estable
entre renders; el cambio de tema muta los valores en `useEffect`. Esto
evita que R3F recompile el programa del shader al alternar entre dark y
light.

### Lámpara

Está en `Scene.tsx`:

```tsx
<pointLight
  position={[0, 12, -4]}
  color="#fff1d4"
  intensity={24}
  distance={28}
  decay={2}
/>
```

La lámpara afecta a las tarjetas mediante las variables CSS:

```css
--photo-brightness
--photo-lamp-glow
```

### Viñeteo

La viñeta de cámara está en `.camera-vignette`.

Variables:

```css
--camera-vignette-soft
--camera-vignette-mid
--camera-vignette-edge
```

El modo claro utiliza aproximadamente la mitad de opacidad que el modo
oscuro.

La capa `.focus-lens-blur` (que aparece al abrir una foto focal) usa
`backdrop-filter: blur(2px) saturate(0.82)`. No elevar este valor: cada
frame de la animación fuerza re-rasterización del canvas WebGL detrás.

## Cámara

`CameraRig.tsx` mantiene la cámara fija en el centro del cilindro.

El mouse no cambia la cámara. Solo afecta hover, click, cursor y no debe
volver a conectarse a la posición de la cámara sin una decisión explícita.

El frame loop hace early-return cuando la cámara ya está en el objetivo
(epsilon `1e-6`) y el breakpoint de viewport no ha cambiado. Sólo se vuelve
a ejecutar `lookAt` cuando cambia el ancho o el primer frame.

## GallerySection.tsx

La galería 2D se abre desde `FloatingMenu`.

- Transición circular desde el centro.
- Grid de imágenes 4:5.
- Scroll interno.
- Fondo translúcido y desenfocado.
- Cilindro visible detrás con opacidad reducida.
- El cilindro y el Canvas se pausan mientras está abierta.
- El fondo desenfocado usa una capa fija para no desaparecer durante scroll.

No eliminar `position: fixed`, `100vw`, `100dvh` ni la capa
`.gallery-view__backdrop`.

## Menú Y Tema

### FloatingMenu.tsx

Contiene:

- Cruz gótica flotante.
- Enlace Gallery.
- Enlaces About y Contact preparados para futuras secciones.
- Cambio de modo claro/oscuro.

El menú no usa bordes ni cristal difuminado. Usa `mix-blend-mode: difference`.

### CursorLens.tsx

Cursor circular de inversión de colores.

Configuración actual:

```css
width: 21px;
height: 21px;
mix-blend-mode: difference;
```

El cursor del sistema se oculta en escritorio y se restaura en dispositivos
táctiles.

En `App.tsx` el componente se monta sólo cuando `useCompactViewport()` es
`false`. Esto evita registrar listeners `pointermove` (que con
`will-change: transform` fuerzan re-rasterización del canvas) en cualquier
viewport ≤720px. El `@media (pointer: coarse)` de `main.css` se mantiene
como defensa adicional.

### Brand.tsx

George Array está centrado, flota suavemente y sube al seleccionar una foto.

Tamaño actual:

```css
font-size: clamp(38px, 5.5vw, 82px);
```

La fuente es `UnifrakturCook` y usa borde blanco con
`mix-blend-mode: difference`.

El desplazamiento vertical al enfocar se hace con `transform: translateY()`
dentro de un `motion.div`, no animando `top`. Esto evita el layout-shift
(reflow) que se produce dentro de `.main-layer`, que envuelve el `Canvas`.

## Música

`MusicToggle.tsx` busca:

```text
public/audio/track.mp3
```

El botón de play/pausa comparte el estilo de la cruz gótica. Al pasar el
mouse aparece un mini reproductor a su derecha.

## Imágenes

Las imágenes actuales están en:

```text
src/assets/photos/01.jpg ... 40.jpg
```

El catálogo está en `src/data/photos.ts` y usa imports locales con `?url`.

No utilizar rutas absolutas de Windows en código fuente.

## Reglas De Rendimiento

- En móvil mantener `dpr={1}` y en escritorio `dpr={[1, 2]}` mediante
  `useCompactViewport` en `App.tsx`.
- Mantener `visibilityState` para ocultar tarjetas: `buffer` (`visibility:hidden`)
  o `hidden` (unmount del `<Html>`). No usar `return null` dentro del `map`
  de `Scene.tsx` para filtrar tarjetas, porque desmonta el grupo 3D y
  reinicia su animación.
- Mantener el `visibilityState` de la tarjeta de retorno a `'visible'`
  aunque caiga en el rango de buffer: el cilindro y `mobileFrontColumn`
  están desfasados un frame durante el cierre del focal.
- No cargar las fuentes desde un tercero; deben permanecer en `public/fonts/`.
- Mantener Gallery con `frameloop="demand"`.
- No añadir loops `useFrame` a capas estáticas.
- La opacidad y las variables CSS de iluminación de cada tarjeta se
  actualizan cada frame; no reintroducir throttles globales ni filtros tipo
  `% N === 0` en el frame loop.
- `CameraRig` debe hacer early-return cuando la cámara está en el objetivo;
  no ejecutar `lookAt` cada frame si la posición y el breakpoint no han
  cambiado.
- Los `uniforms` de `ReactiveBackdrop` deben permanecer estables
  (`useMemo`) para no forzar recompilación del shader al cambiar tema.
- El `CursorLens` se monta sólo en viewport no compacto; no añadir
  condicionales dentro del propio componente, dejar el control en `App.tsx`.
- Mantener la zona de captura independiente del escalado visual.
- Después de cualquier cambio ejecutar:

```bash
npm run typecheck
npm run build
```

## Preguntas Para Cambiar El Proyecto

- “Cambia la profundidad del cilindro” → `radius`, `FOCAL_POSITION` y `CameraRig`.
- “Cambia columnas y filas” → `CYLINDER_COLUMNS` y `cylinderCount`.
- “Haz las fotos más grandes” → `CARD_WIDTH`, `CARD_HEIGHT` o `FOCAL_SCALE`.
- “Haz la entrada más lenta” → `INTRO_DURATION`.
- “Cambia la intensidad de la viñeta” → `--camera-vignette-*`.
- “Cambia la luz superior” → `pointLight` y cálculo CSS de `PhotoNode`.
- “Cambia la transición Gallery” → `GallerySection.tsx` y `clipPath`.
