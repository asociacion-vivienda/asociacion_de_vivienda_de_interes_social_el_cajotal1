# CJ Constructores LTDA — Sitio web oficial

Sitio estático (HTML + CSS + JS mínimo) de **CJ Constructores LTDA**, constructora
de vivienda de interés social con más de 27 años de trayectoria en Norte de
Santander, Colombia.

- 🎨 Diseño moderno con cards, blueprint SVG y mapa interactivo
- 🌗 Tema **claro / oscuro** con toggle (CSS puro, sin JS para el switch)
- 📱 100 % responsivo (desktop, tablet, móvil)
- 🗂️ **Galería dinámica**: clasifica fotos por carpeta de barrio automáticamente
- 🚀 Listo para **GitHub Pages** con deploy automatizado

---

## 📁 Estructura del proyecto

```
.
├── index.html                  # Una sola página, todas las secciones
├── styles.css                  # Estilos (tokens + dark/light + responsive)
├── script.js                   # Galería dinámica + accesibilidad del mapa
├── generate_manifest.py        # Genera img/barrios/manifest.json
├── README.md                   # Este archivo
├── .nojekyll                   # Evita que GitHub Pages procese con Jekyll
├── .gitignore
├── .github/
│   └── workflows/
│       └── deploy.yml          # Deploy automático a GitHub Pages
├── docs/
│   └── WEB CAJOTAL 2026.docx   # Documento fuente de la historia
└── img/
    └── barrios/                # Fotos agrupadas por barrio
        ├── manifest.json       # Generado automáticamente (NO editar a mano)
        ├── Brisas de Belen/
        │   └── brisas-01.jpeg
        ├── El Cajotal/
        │   ├── cajotal-01.jpeg
        │   ├── cajotal-02.jpeg
        │   └── cajotal-03.jpeg
        ├── Morichal/
        ├── Nuestro Equipo/
        └── Villa Celmira/
```

---

## 🖼️ Cómo agregar fotos (el flujo que pediste)

1. **Crea una carpeta** dentro de `img/barrios/` con el nombre del barrio
   (puede tener tildes y espacios: `Villa Celmira`, `Isabel Celis Yáñez`, etc.).
2. **Pega las imágenes** dentro. Formatos soportados: `.jpg`, `.jpeg`, `.png`,
   `.webp`, `.avif`, `.gif`, `.svg`.
3. **Sube los cambios** a GitHub:

   ```bash
   git add img/barrios/
   git commit -m "Agrega fotos del barrio X"
   git push
   ```

4. El **GitHub Action** regenera el `manifest.json` y publica el sitio.
   Las fotos aparecen clasificadas en la galería, con el nombre del barrio
   como título.

> No necesitas editar HTML, CSS ni JS. El código lee el manifest y se
> acomoda solo.

---

## 💻 Probar en local

### Opción A · Con Python (recomendado)

Requiere **Python 3.9+**.

```bash
# 1) Regenera el manifest (si agregaste fotos nuevas)
python generate_manifest.py

# 2) Levanta un servidor estático en el puerto 5500
python -m http.server 5500
```

Abre <http://localhost:5500> en tu navegador.

> 💡 Si sirves con `python -m http.server` el sitio funciona **incluso sin
> manifest**, porque el script cae a _directory listing_ como respaldo.

### Opción B · Con VS Code

Instala la extensión **Live Server** y haz clic derecho sobre `index.html` →
_Open with Live Server_. Recuerda regenerar el manifest (`python
generate_manifest.py`) cada vez que agregues fotos.

---

## 🚀 Desplegar en GitHub Pages

### 1. Crea el repositorio

```bash
cd "C:\Users\SASAGA\Downloads\AISC"
git init
git add .
git commit -m "Sitio inicial CJ Constructores"
git branch -M main
git remote add origin https://github.com/<TU-USUARIO>/<NOMBRE-REPO>.git
git push -u origin main
```

### 2. Activa GitHub Pages con Actions

En el repositorio, ve a **Settings → Pages** y en **Source** selecciona:

> **GitHub Actions**

_(no uses "Deploy from a branch", la usa el propio Action)._

### 3. El Action se ejecuta solo

Cada `git push` a `main` dispara el workflow `.github/workflows/deploy.yml`
que:

1. Ejecuta `python generate_manifest.py` en la máquina de CI.
2. Empaqueta todo el sitio como artefacto.
3. Publica a GitHub Pages.

La primera vez tarda ~1 minuto. Verás la URL final en **Settings → Pages**,
con forma de:

```
https://<TU-USUARIO>.github.io/<NOMBRE-REPO>/
```

### 4. Forzar un redeploy manual

En la pestaña **Actions** del repo, selecciona _Deploy to GitHub Pages_ y haz
clic en **Run workflow**. Útil si editas fotos desde la web de GitHub sin
push explícito.

---

## 🧠 Cómo funciona la galería dinámica

El sitio intenta tres estrategias en orden:

1. **Fetch `img/barrios/manifest.json`** (lo que usa GitHub Pages).
2. Si no hay manifest, intenta **directory listing** contra el servidor
   (funciona con `python -m http.server` en local).
3. Si ambos fallan, muestra un estado vacío con instrucciones.

El manifest tiene esta forma:

```json
{
  "generated_by": "generate_manifest.py",
  "version": 1,
  "total_barrios": 5,
  "total_photos": 8,
  "barrios": {
    "Brisas de Belen": ["brisas-01.jpeg"],
    "El Cajotal": ["cajotal-01.jpeg", "cajotal-02.jpeg", "cajotal-03.jpeg"]
  }
}
```

---

## ❓ FAQ

**¿Puedo usar un dominio propio?**
Sí. En **Settings → Pages** agrega tu dominio. Necesitarás configurar un CNAME
en tu proveedor DNS apuntando a `<TU-USUARIO>.github.io`.

**¿Puedo cambiar el nombre de los barrios?**
Sí. Renombra la carpeta dentro de `img/barrios/`, haz push y el manifest se
regenera en el deploy.

**¿El toggle de tema recuerda mi preferencia?**
Actualmente no (es un checkbox CSS puro). Si quieres persistencia, se puede
agregar en 5 líneas de JS usando `localStorage`.

**¿Y si no quiero subir el `.docx`?**
Añádelo a `.gitignore`. No lo usa el sitio en producción.

---

## 🛡️ Licencia

© 2026 CJ Constructores LTDA. Todos los derechos reservados.
Código del sitio disponible para uso interno y promocional de la empresa.
