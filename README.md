# Mi carta de Navidad 2026

Una carta de Navidad convertida en experiencia web: un árbol 3D que se va encendiendo, nieve, una cabaña con las luces prendidas y, sobre todo, un mensaje de agradecimiento para mi familia. Al final hay unas sugerencias de regalo "completamente opcionales".

**Sitio:** https://pipeagudelo3.github.io/mi-carta-de-navidad-2026/

## Qué incluye

- **Escena 3D continua** (Three.js): árbol con luces, estrella, regalos, bosque, cabaña, luna, nieve y partículas doradas. La cámara viaja por la escena a medida que se avanza en la lectura.
- **Seis capítulos**: bienvenida, lo que ya tengo (esferas con mensajes), agradecimiento (camino de estrellas), gratitud de todos los días, lista de deseos y sugerencias de regalo, más el cierre.
- **Interacciones**: esferas que revelan mensajes, deseos que encienden luces del árbol, regalos que se abren en 3D, medidor de necesidad frente a ganas, «Fondo para Europa», pantalón que se convierte en pantaloneta, Departamento de justificación de regalos, contador «Mi carta», confeti y mensajes ocultos (toca los regalos y la estrella del árbol).
- **Controles**: interruptor de nieve y música opcional, apagada al inicio.

## Tecnologías

Vite · TypeScript · Three.js · GSAP (ScrollTrigger) · HTML y CSS. Tipografías autoalojadas con Fontsource (Cormorant Garamond, Manrope y Great Vibes, todas con licencia SIL Open Font License).

Es un sitio 100 % estático: sin servidor, sin base de datos, sin formularios y sin servicios de pago ni de analítica.

## Desarrollo

Requiere Node.js 20 o superior.

```bash
npm install      # instalar dependencias
npm run dev      # servidor de desarrollo
npm run build    # revisar tipos y compilar en dist/
npm run preview  # servir la versión compilada
```

Parámetros útiles para probar:

- `?nowebgl` fuerza la alternativa visual sin WebGL.
- `?og` oculta los controles (así se tomó la imagen de vista previa `public/og.jpg`).

## Estructura

```
index.html                 Todo el texto de la carta y las etiquetas para compartir
src/
  main.ts                  Arranque, scroll → cámara, abrir la carta, controles
  content.ts               Contenido editable: esferas, deseos, regalos, chistes
  state.ts                 Estado de «Mi carta»
  scene/
    world.ts               Render, cámara por capítulos, interacción, rendimiento adaptativo
    tree.ts                Árbol, luces instanciadas, estrella
    environment.ts         Cielo, estrellas, luna, nieve del suelo, pinos, cabaña, constelación
    particles.ts           Nieve y partículas doradas (shaders)
    gifts.ts               Regalos bajo el árbol
    textures.ts            Texturas generadas por código
  ui/
    interactions.ts        Esferas, deseos, regalos, departamento, resumen de la carta
    confetti.ts            Confeti en canvas 2D
    toast.ts               Mensajes breves
  audio/music.ts           Música sintetizada con Web Audio
  styles/main.css          Estilos
public/                    Ícono e imagen de vista previa
.github/workflows/         Despliegue automático a GitHub Pages
```

Para cambiar textos de los capítulos se edita `index.html`; para esferas, deseos, regalos y mensajes de humor, `src/content.ts`.

## Rendimiento y accesibilidad

- La escena 3D se descarga aparte, después del primer pintado. No hay modelos ni texturas externas: toda la geometría se genera por código.
- Luces, esferas y pinos usan instancias; la nieve y las partículas se animan en la GPU.
- Si el dispositivo va lento, se reducen automáticamente la resolución y la cantidad de nieve. El render se pausa cuando la pestaña no está visible.
- Sin WebGL (o si falla), se muestra una versión ilustrada con CSS y SVG, y la carta completa sigue funcionando.
- Con «reducir movimiento» activado en el sistema: sin nieve por defecto, sin confeti, sin recorridos de cámara y con los textos visibles de inmediato.
- Botones reales, navegables con teclado, con estados anunciados para lectores de pantalla.

## Música

La melodía es «Noche de paz» (Franz Xaver Gruber, 1818), una obra en dominio público. No se usa ninguna grabación: el sonido de caja de música se genera en el navegador con Web Audio, por lo que no hay archivos de audio ni licencias de terceros.

## Despliegue

Cada `push` a `main` ejecuta `.github/workflows/deploy.yml`, que compila el proyecto y lo publica en GitHub Pages. En el repositorio, *Settings → Pages → Source* debe estar en **GitHub Actions**.

Si el repositorio cambia de nombre o de dueño, hay que actualizar las URL absolutas de `og:url`, `og:image` y `twitter:image` en `index.html`, porque WhatsApp las necesita completas para mostrar la vista previa.
