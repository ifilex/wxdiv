# wxdiv

**Un motor de juegos en canvas puro, compatible con DIV Games Studio, sin WebGL, sin runtime, offline, y con IA generativa integrada.**

Hace 3D real sin ser 3D real. Corre en cualquier navegador desde 2010. Corre en Switch 1. Exporta a HTML5 en un solo archivo.

---

## ¿Qué es wxdiv?

wxdiv es un motor de juegos y editor visual inspirado en **DIV Games Studio** (1998), reimplementado desde cero con tecnología moderna pero manteniendo **100% de compatibilidad con la sintaxis y semántica de DIV**.

A diferencia de otros proyectos que mantienen un runtime (BennuGD, DivGO, Gemix), wxdiv **transpila directamente a HTML5 + JavaScript**. No hay intérprete, no hay VM, no hay servidor. El resultado es un `.html` autocontenido que se ejecuta en cualquier navegador, offline, sin dependencias.

Y encima, tiene un **Copiloto IA** (Gemini) que permite crear juegos describiéndolos en lenguaje natural. Sin programar. En segundos.

---

## Características principales

### Motor
- **Canvas 2D puro** — sin WebGL, sin shaders, sin GPU dedicada
- **Raycasting por columna** (MODE 8 clásico, rápido, retro)
- **Raycasting por píxel** (opcional, realista, para PC potentes)
- **Web Workers + Arrays tipados** para paralelizar el render
- **16 ms por frame** (60 FPS estables en PC, escalable en Switch 1)
- **Reflejos, sombras, luces, espejos, bruma** por ray tracing en software
- **MODE 7** (pseudo-3D plano) y **MODE 8** (raycasting con paredes)
- **MODE 9** (Quake II completo, experimental)
- **MD2** (Quake II) para modelos 3D animados
- **MD3** (Quake III) en desarrollo
- **Emboss, niebla, partículas, luces falsas** para atmósfera
- **Sintetizador ADSR** integrado para audio procedural (sin samples)

### Editor
- **Editor de código DIV** con sintaxis Pascal exacta
- **Editor de niveles MODE 8** con vista previa 3D en tiempo real
- **Editor de sprites** con paleta DIV de 16 colores y puntos de control
- **Sintetizador de sonidos** con osciladores y envolvente ADSR
- **Constructor Visual de Lógica** (No-Code → DIV)
- **Inspector de Procesos** en vivo (debugging real)
- **Copiloto IA** integrado (Gemini)
- **Precódigo reutilizable** — bloques que la IA ensambla sin generar todo desde cero

### IA
- **Gemini integrado** (API key propia del dev, guardada en localStorage)
- **Modelos seleccionables** (Flash, Pro, Lite, según necesidad)
- **Generación de código DIV** desde lenguaje natural
- **Corrección de errores de sintaxis** automática
- **Creación de procesos, enemigos, físicas, armas** por prompt
- **Precódigo + IA = pocos tokens** (la IA ensambla bloques existentes)

### Exportación
- **HTML5 standalone** — un solo `.html`, sin servidor, offline
- **ZIP completo** — código fuente DIV + assets + índice HTML
- **Componente React (.tsx)** — para embeber en apps web
- **Compilación cruzada** (a futuro, servicio separado):
  - `.exe` para Windows (Steam)
  - `.nds` para Nintendo
  - `.pkg` para PlayStation
  - `.appx` para Xbox
  - Android, iOS, Linux (a futuro)

---

## Filosofía

wxdiv no busca ser el motor más potente. Busca ser **el más accesible, el más terapéutico, y el más respetuoso con el usuario**. Cada límite es una decisión clínica, no técnica.

| Decisión | Por qué |
|---|---|
| **Canvas, no WebGL** | Compatibilidad total. Corre en Switch 1, en navegadores viejos, en cualquier cosa |
| **Baja fidelidad visual** | Baja estimulación sensorial. Ideal para uso terapéutico |
| **Offline, sin servidor** | Accesible desde cualquier dispositivo, sin fricción, sin registros |
| **Compatible con DIV** | Comunidad nostálgica activa. Base de usuarios existente. IA entrenada en código conocido |
| **Transpilación, no runtime** | Rendimiento nativo. Un solo HTML. Cero dependencias |
| **IA + precódigo** | Creación de juegos en segundos. Sin programar. Sin costos altos de tokens |
| **Open source (motor)** | Comunidad, contribuciones, transparencia |
| **Servicio comercial separado** | Sostenibilidad económica sin contaminar el open source |

---

## Uso terapéutico (WineBOX)

wxdiv es el motor detrás de **[WineBOX Cognitive](https://winebox.cloud)**, una plataforma clínica gratuita de estimulación neurocognitiva.

- **210+ juegos** ya en producción
- **Todos hechos con wxdiv**
- **Todos offline, HTML5, sin servidor**
- **Todos gratuitos, sin registro**
- **Todos con baja estimulación visual** (Protocolo Calma)
- **Todos accesibles desde cualquier dispositivo**

WineBOX incluye:
- **Aura IA** — acompañamiento terapéutico 24/7
- **Protocolo Calma** — ejercicios de respiración guiada
- **Consola WineBOX** — 210+ juegos de entrenamiento cognitivo
- **Grupos gratuitos** — encuentros mensuales de estimulación

---

## Estado del proyecto

### ✅ Funcionando
- Motor de raycasting (columna y píxel)
- Editor de niveles con render en tiempo real
- Editor de sprites, sonidos, lógica visual
- Copiloto IA con Gemini
- Exportación HTML5 standalone y ZIP
- 210+ juegos en producción (WineBOX)
- Compatibilidad con Switch 1
- Reflejos, sombras, luces, bruma
- MD2 animado en runtime

### 🚧 En desarrollo
- MD2 animado en editor de niveles
- MD3 (modelos por partes, esqueletal)
- Compilación cruzada (EXE, NDS, etc.)
- Ayuda y documentación completa
- Apertura del código fuente

### 🔮 Futuro
- Compilación cruzada multiplataforma
- Soporte comercial (Steam, Nintendo, PS, Xbox)
- Comunidad de devs contribuyendo
- Primeros juegos comerciales hechos con wxdiv

---

## Cómo empezar

### Opción 1: Usar wxdiv en WineBOX
1. Abrí [winebox.cloud](https://winebox.cloud)
2. Probá los juegos existentes
3. Usá el editor y el Copiloto IA para crear tu propio juego
4. Exportá a HTML5 y compartilo

### Opción 2: Crear juegos desde el editor
1. Abrí el editor de wxdiv
2. Configurá tu API key de Gemini (Ajustes IA)
3. Describile al Copiloto lo que querés hacer
4. Ajustá el código generado
5. Exportá a HTML5
6. Listo — un `.html` jugable, offline

### Opción 3: Programar directamente en DIV
1. Escribí código DIV clásico (100% compatible)
2. Usá el editor de niveles, sprites, sonidos
3. Exportá y probá

---

## Compatibilidad DIV

wxdiv mantiene **100% de compatibilidad** con la sintaxis y semántica de DIV Games Studio:

- `PROGRAM`, `GLOBAL`, `LOCAL`, `BEGIN`, `END`
- `PROCESS`, `LOOP`, `FRAME`
- `set_mode`, `load_fpg`, `load_pal`, `put_screen`
- `collision`, `signal`, `let_me_alone`
- `graph`, `x`, `y`, `angle`, `size`, `flags`
- Todos los comandos clásicos de DIV

Un dev de DIV puede abrir wxdiv y **empezar a programar al instante**, sin curva de aprendizaje.

---

## Modelo comercial

**El motor es open source. El servicio de compilación cruzada es de pago.**

- **HTML5** → gratis, ilimitado
- **ZIP** → gratis, ilimitado
- **EXE / NDS / PS / Xbox** → $1 por binario generado
- **Sin suscripción. Sin regalías. Sin compartir ingresos.**

Los devs que publican en WineBOX (gratis, HTML5) no pagan nada.
Los devs que quieren vender en Steam o Nintendo pagan $1 por plataforma.
Ese ingreso sostiene el proyecto y mantiene WineBOX gratuito.

---

## Contribuir

wxdiv es un proyecto en crecimiento. Si querés contribuir:

- **Probá los juegos** en WineBOX y mandá feedback
- **Creá juegos** con el editor y compartilos
- **Reportá bugs** cuando los encuentres
- **Sugerí features** para el motor o el editor
- **Traducí la documentación** a otros idiomas
- **Compartí el proyecto** con quien le pueda interesar

El código estará disponible públicamente cuando la documentación esté lista.

---

## Licencia

**Motor:** Open source (licencia por definir)
**Servicio de compilación cruzada:** Comercial
**Juegos de WineBOX:** Gratuitos, sin registro

---

## Agradecimientos

- **DIV Games Studio** (Hammer Technologies, 1998) — la inspiración original
- **DivGO** (Joseba Bikuña) — referencia técnica para compatibilidad DIV
- **Hexen** (Raven Software, 1995) — referencia para sectores y scripting
- **GZDoom** — referencia para renderizado por software y optimizaciones
- **Quake II / Quake III** — formatos MD2 y MD3
- **id Software** — por inventar todo esto

---

## Links

- **WineBOX Cognitive:** [winebox.clinic](https://winebox.clinic)
- **Documentación:** (próximamente)
- **Repositorio:** (próximamente)
- **Comunidad:** (próximamente)

---

**wxdiv — Un motor. Un código. Todos los targets.**
**Hecho en Argentina, desde cero, con canvas puro.**

## Para correr localmente:

**Requisitos:**  Node.js

1. Instale las dependencias:
   `npm install`
2. Lance la app:
   `npm run dev`
