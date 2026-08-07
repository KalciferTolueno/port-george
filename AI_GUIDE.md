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
const INTRO_DURATION = 1.6;
const FINAL_ROTATION_SPEED = 0.16;
```

La rotación del cilindro es global. No añadir rotaciones independientes a
`PhotoNode`, porque eso provoca que las imágenes giren sobre su propio eje.

### layout.ts

Geometría actual:

```ts
FOCAL_POSITION = [0, 0, -23]
CYLINDER_COLUMNS = 28
radius = 26
```

En `Scene.tsx`:

```ts
const cylinderCount = Math.max(112, photos.length);
```

Esto crea 28 columnas y 4 filas. Si faltan imágenes, se reutilizan de manera
determinista para cerrar el cilindro.

Para cambiar la distribución:

- Radio: `radius` en `generateCylinderLayout`.
- Columnas: `CYLINDER_COLUMNS`.
- Filas: `cylinderCount / CYLINDER_COLUMNS`.
- Espaciado vertical: `rowGap`.
- Orden de entrada: `createCylinderIntroRanks`.

## PhotoNode.tsx

Cada tarjeta se posiciona con Three.js, pero la imagen se dibuja como HTML
mediante `drei/Html`. Esto evita problemas de texturas WebGL y CORS.

Características:

- Proporción 4:5.
- Tamaño base actual: `224 × 280px`.
- Zona de captura fija `.photo-hit`.
- Hover visual sin cambiar la zona de captura.
- Click para abrir la tarjeta focal.
- Retorno a una sola celda frontal.
- Iluminación CSS calculada según la lámpara.

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

## Cámara

`CameraRig.tsx` mantiene la cámara fija en el centro del cilindro.

El mouse no cambia la cámara. Solo afecta hover, click, cursor y no debe
volver a conectarse a la posición de la cámara sin una decisión explícita.

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

### Brand.tsx

George Array está centrado, flota suavemente y sube al seleccionar una foto.

Tamaño actual:

```css
font-size: clamp(38px, 5.5vw, 82px);
```

La fuente es `UnifrakturCook` y usa borde blanco con
`mix-blend-mode: difference`.

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

- Mantener `dpr={[1, 2]}`.
- Mantener Gallery con `frameloop="demand"`.
- No añadir loops `useFrame` a capas estáticas.
- No animar la iluminación de todas las tarjetas en cada frame.
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
