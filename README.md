# George Array — Photography Portfolio

Consulta [`AI_GUIDE.md`](AI_GUIDE.md) para conocer la arquitectura, las
responsabilidades de cada componente y las variables visuales modificables.

An immersive **3D cloud of suspended photographs** for a photography
portfolio. Built with React 18, React Three Fiber, Three.js and Framer
Motion, bundled with Vite, deployable as static files on any VPS.

## ✦ Concept

- A pure-white canvas.
- 26 photographs floating in 3D space, distributed in an oblate torus
  around a central focal image.
- The focal photo is larger, faces the camera, and gently breathes.
- Around it, secondary cards sway with per-photo phase offsets.
- Mouse movement = camera parallax (depth illusion).
- Scroll wheel = slow camera yaw around the focal axis.
- Clicking any photo makes it the new focal — its position, rotation
  and scale smoothly interpolate to the centre.
- After 7s of inactivity the focal photo auto-rotates through the set.
  Click to pin one for 12s.

The visible UI is reduced to the photographer's name (top-left), a
subtle "01 / 26" counter (bottom-right) and a single italic hint.

## ✦ Tech stack

| Layer              | Tool                                    |
| ------------------ | --------------------------------------- |
| React UI           | React 18.3 + functional components     |
| 3D                 | React Three Fiber 8 + drei              |
| Renderer           | Three.js (r169)                         |
| Animations (HTML)  | Framer Motion 11                        |
| Animations (3D)    | `useFrame` + `THREE.MathUtils.damp`     |
| Language           | TypeScript 5 (strict)                   |
| Bundler            | Vite 5                                  |
| Deployment         | Static (`dist/`) on any Nginx host      |

## ✦ Project structure

```
.
├─ public/                       # static, copied verbatim to dist/
│  ├─ favicon.svg
│  └─ robots.txt
├─ src/                          # Vite root
│  ├─ index.html                 # HTML shell with #root
│  ├─ main.tsx                   # React entry
│  ├─ App.tsx                    # <Canvas> + HTML overlays
│  ├─ vite-env.d.ts              # Vite ambient types
│  ├─ components/
│  │  ├─ Scene.tsx               # 3D scene composition + focal logic
│  │  ├─ PhotoNode.tsx           # one photo card (damped motion)
│  │  ├─ CameraRig.tsx           # parallax + wheel yaw
│  │  ├─ FocalTitle.tsx          # HTML caption under focal photo
│  │  ├─ Brand.tsx               # top-left brand mark
│  │  ├─ Hint.tsx                # bottom hint
│  │  ├─ Counter.tsx             # bottom-right "01 / 26"
│  │  └─ Loader.tsx              # initial loader with progress bar
│  ├─ data/
│  │  └─ photos.ts               # photo data + Photo interface
│  ├─ utils/
│  │  ├─ layout.ts               # cloud position generator
│  │  └─ random.ts               # mulberry32 seeded PRNG
│  └─ styles/
│     └─ main.css                # base + typography + HTML overlays
├─ deploy/                       # VPS deploy helper files
│  ├─ nginx.conf                 # nginx server block
│  ├─ deploy.sh                  # build + rsync + reload
│  └─ README.md                  # step-by-step VPS guide
├─ tsconfig.json
├─ vite.config.ts
├─ package.json
└─ README.md
```

## ✦ Quick start

> Requirements: Node.js ≥ 18.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # produces ./dist
npm run preview    # serves ./dist on :4173
npm run typecheck  # tsc --noEmit only
```

## ✦ Bundle (gzipped)

| Chunk       | Gzip     | Notes                            |
| ----------- | -------- | -------------------------------- |
| `index.html` | 0.9 kB  |                                  |
| `style.css` | 1.1 kB   |                                  |
| `index.js`  | 4.9 kB   | Scene + photo logic              |
| `react`    | 4.5 kB   | React 18 + ReactDOM              |
| `motion`   | 37.7 kB  | Framer Motion                    |
| `r3f`      | 88.9 kB  | R3F + drei                       |
| `three`    | 176 kB   | Three.js core                    |

Total ≈ **314 kB gzipped** for the app, **plus** the 26 photographs
loaded on demand from the Unsplash CDN.

> The `three.js` chunk is split into its own file via
> `manualChunks` (see `vite.config.ts`) so it can be cached
> aggressively across deployments.

## ✦ How it works

### Cloud layout (`src/utils/layout.ts`)
A deterministic seeded mulberry32 distributes 26 photo cards around a
slightly oblate torus (`ringR ∈ [3.8, 7.2]`, vertical jitter ±3.5). The
same seed produces the same layout on every reload.

### PhotoNode (`src/components/PhotoNode.tsx`)
Every photo is a single `<Image>` (drei's `<Image>` is a `Plane` with
a texture). A `useFrame` loop damps the photo's `position`, `rotation`
and `scale` toward their **target** values, layered with low-amplitude
sinusoidal floating. When the photo becomes focal, its target values
change — the same component smoothly interpolates between them.

### CameraRig (`src/components/CameraRig.tsx`)
- Mouse position → camera XYZ offset (parallax).
- Wheel events → accumulating yaw, camera orbits the focal point.
- All damped so the motion is buttery.

### Focal cycling
- After 7 seconds, the next photo becomes the focal one.
- Clicking any photo pins the auto-rotation for 12 seconds.

### Performance
- `dpr={[1, 2]}` caps retina overdraw.
- `frameloop="always"` for buttery 60 FPS.
- `THREE.MathUtils.damp` (frame-rate independent) for all easing.
- Fog blends distant photos into the white background, saving
  pixel-fill and reinforcing depth.

## ✦ Customising

### Replace the photographs
Edit `src/data/photos.ts`. Each entry:

```ts
{
  src: 'https://your-cdn.example.com/01.jpg',
  alt: 'Accessible description',
  title: 'Vesper',              // optional
  year: '2024',                 // optional
  location: 'Studio'            // optional
}
```

For better performance host your own JPEGs. Drop them into
`src/assets/photos/` and import them — Vite will hash and bundle:

```ts
import photo01 from '../assets/photos/01.jpg';
export const photos = [{ src: photo01, alt: '...', title: '...' }, ...];
```

### Tweak the focal/cloud layout
All magic numbers live at the top of `src/components/Scene.tsx`
(`FOCAL_SCALE`, `FOCAL_CYCLE_MS`, ...) and the layout generator at the
top of `src/utils/layout.ts`.

### Adjust the cloud density
Pass a different `seed` to `generateCloudLayout()` in
`src/components/Scene.tsx` to completely reshuffle the cloud — same
seed reproduces the same cloud.

## ✦ Deploying to a VPS

See [`deploy/README.md`](deploy/README.md). Short version:

```bash
npm ci
npm run build
VPS_HOST=deploy@yourdomain.com ./deploy/deploy.sh
```

Don't forget to substitute `example.com` with your real domain in
`deploy/nginx.conf` before the first deployment.

## ✦ Browser support

Modern Chrome, Edge, Firefox, Safari (last 2 versions). WebGL 2 is
required; the page gracefully hides behind a `<noscript>` for users
who disabled JavaScript.

## ✦ License

Proprietary — © Elena Voss. See `LICENSE`.
