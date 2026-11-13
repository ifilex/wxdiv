import React, { useState, useMemo } from "react";
import {
  X,
  Search,
  BookOpen,
  Code2,
  Copy,
  Check,
  PlusCircle,
  Sparkles,
  Layers,
  Terminal,
  Cpu,
  Monitor,
  Flame,
  Volume2,
  Gamepad2,
  FileCode,
} from "lucide-react";
import { DivSuggestion } from "../engine/divKeywords";

interface DivLexiconModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertCode?: (snippet: string) => void;
}

export type LexiconCategory =
  | "all"
  | "control"
  | "graphics"
  | "3d"
  | "audio"
  | "input"
  | "collision"
  | "text"
  | "variables"
  | "visual_mdi";

export interface LexiconItem extends DivSuggestion {
  category: LexiconCategory;
  categoryLabel: string;
}

export const COMPLETE_DIV_LEXICON: LexiconItem[] = [
  // =========================================================================
  // 1. ESTRUCTURAS DE CONTROL & PROCESO
  // =========================================================================
  {
    name: "PROGRAM",
    type: "keyword",
    category: "control",
    categoryLabel: "Estructuras & Proceso",
    description: "Declara el nombre y punto de entrada principal del videojuego en DIV Games Studio. Inicializa la máquina de estados y el bucle principal de ejecución.",
    syntax: "PROGRAM mi_videojuego;\nGLOBAL\n  // Declaración de variables globales sin END\nBEGIN\n  set_mode(m640x480);\n  set_fps(60);\n  screen_color(rgb(10, 15, 30));\n  jugador(320, 240);\n  LOOP\n    FRAME;\n  END\nEND",
  },
  {
    name: "PROCESS",
    type: "keyword",
    category: "control",
    categoryLabel: "Estructuras & Proceso",
    description: "Define un proceso concorrente independiente. Cada proceso en DIV se ejecuta como un micro-hilo a 60 FPS con sus propias variables locales (x, y, graph, file, angle, size, etc.).",
    syntax: "PROCESS enemigo(x, y)\nPRIVATE\n  salud = 100;\n  velocidad = 2;\nBEGIN\n  file = 0;\n  graph = 2;\n  LOOP\n    x += velocidad;\n    IF (x > 600 || x < 40) velocidad = -velocidad; END\n    FRAME;\n  END\nEND",
  },
  {
    name: "FRAME",
    type: "keyword",
    category: "control",
    categoryLabel: "Estructuras & Proceso",
    description: "Cede el control del proceso actual al motor gráfico por un fotograma (1/60s). Si se indica un valor porcentual, por ejemplo FRAME(50), avanza una fracción del fotograma.",
    syntax: "FRAME;\n// o avance fraccional:\nFRAME(50);",
  },
  {
    name: "BEGIN",
    type: "keyword",
    category: "control",
    categoryLabel: "Estructuras & Proceso",
    description: "Delimita el inicio del bloque ejecutable de un PROGRAM, PROCESS o función en el compilador DIV.",
    syntax: "BEGIN\n  // Bloque ejecutable de instrucciones\nEND",
  },
  {
    name: "END",
    type: "keyword",
    category: "control",
    categoryLabel: "Estructuras & Proceso",
    description: "Cierra bloques de código (BEGIN..END, IF..END, LOOP..END, WHILE..END, FOR..END, SWITCH..END). Nota: La sección GLOBAL es la única que NO lleva END.",
    syntax: "IF (salud <= 0)\n  signal(id, s_kill);\nEND",
  },
  {
    name: "GLOBAL",
    type: "keyword",
    category: "control",
    categoryLabel: "Estructuras & Proceso",
    description: "Declara variables accesibles globalmente por todos los procesos del juego. IMPORTANTE: En la sintaxis estricta de DIV Games Studio, el bloque GLOBAL nunca lleva END.",
    syntax: "GLOBAL\n  puntuacion = 0;\n  nivel = 1;\n  fpg_principal = 0;\n  fnt_hud = 0;\n\nPROGRAM mi_juego;\nBEGIN\n  // ...\nEND",
  },
  {
    name: "LOCAL",
    type: "keyword",
    category: "control",
    categoryLabel: "Estructuras & Proceso",
    description: "Define variables locales personalizadas que se añadirán a TODOS los procesos existentes en la jerarquía del motor.",
    syntax: "LOCAL\n  int energia_escudo = 100;\n  int bando = 1;",
  },
  {
    name: "PRIVATE",
    type: "keyword",
    category: "control",
    categoryLabel: "Estructuras & Proceso",
    description: "Define variables exclusivas y privadas para las instancias del proceso actual. No son visibles desde otros procesos salvo acceso por puntero/id.",
    syntax: "PROCESS nave_espacial(x, y)\nPRIVATE\n  cadencia = 15;\n  temporizador = 0;\nBEGIN\n  // ...\nEND",
  },
  {
    name: "LOOP",
    type: "keyword",
    category: "control",
    categoryLabel: "Estructuras & Proceso",
    description: "Bucle infinito tradicional de los procesos de DIV Games Studio. Requiere al menos una llamada a FRAME en su interior para evitar bucles bloqueantes.",
    syntax: "LOOP\n  // Lógica por fotograma\n  x += 1;\n  FRAME;\nEND",
  },
  {
    name: "WHILE",
    type: "keyword",
    category: "control",
    categoryLabel: "Estructuras & Proceso",
    description: "Bucle condicional mientras la condición evaluada sea verdadera (distinta de cero).",
    syntax: "WHILE (salud > 0)\n  x += 2;\n  FRAME;\nEND",
  },
  {
    name: "FOR",
    type: "keyword",
    category: "control",
    categoryLabel: "Estructuras & Proceso",
    description: "Estructura de bucle numérico con inicialización, límite e incremento.",
    syntax: "FOR (i = 0; i < 10; i++)\n  disparo(x + i * 16, y);\nEND",
  },
  {
    name: "REPEAT",
    type: "keyword",
    category: "control",
    categoryLabel: "Estructuras & Proceso",
    description: "Bucle que ejecuta el bloque al menos una vez hasta que la condición especificada en UNTIL sea verdadera.",
    syntax: "REPEAT\n  y -= 4;\n  FRAME;\nUNTIL (y < 20);",
  },
  {
    name: "IF",
    type: "keyword",
    category: "control",
    categoryLabel: "Estructuras & Proceso",
    description: "Estructura condicional fundamental. Permite bifurcar la lógica en función de una expresión booleana.",
    syntax: "IF (key(_space))\n  disparar_laser();\nELSE\n  recargar();\nEND",
  },
  {
    name: "SWITCH",
    type: "keyword",
    category: "control",
    categoryLabel: "Estructuras & Proceso",
    description: "Selector múltiple por casos de valor discreto o constante.",
    syntax: "SWITCH (estado)\n  CASE 0: quieto(); END\n  CASE 1: caminar(); END\n  DEFAULT: alerta(); END\nEND",
  },
  {
    name: "RETURN",
    type: "keyword",
    category: "control",
    categoryLabel: "Estructuras & Proceso",
    description: "Finaliza la ejecución del proceso o función retornando un valor numérico o puntero al llamador.",
    syntax: "RETURN puntuacion * multiplicador;",
  },
  {
    name: "CLONE",
    type: "keyword",
    category: "control",
    categoryLabel: "Estructuras & Proceso",
    description: "Duplica exactamente el estado, variables locales y punto de ejecución del proceso actual.",
    syntax: "id_copia = CLONE;",
  },

  // =========================================================================
  // 2. GRÁFICOS & PANTALLA 2D
  // =========================================================================
  {
    name: "set_mode",
    type: "function",
    category: "graphics",
    categoryLabel: "Gráficos & Pantalla",
    description: "Establece la resolución de vídeo virtual del juego: m320x200 (Retro DOS VGA), m640x480 (DIV Estándar) o m800x600 (SVGA).",
    syntax: "set_mode(m640x480);",
  },
  {
    name: "set_fps",
    type: "function",
    category: "graphics",
    categoryLabel: "Gráficos & Pantalla",
    description: "Fija la tasa de refresco por segundo del motor (típicamente 60 FPS o 30 FPS en ordenadores antiguos).",
    syntax: "set_fps(60);",
  },
  {
    name: "load_fpg",
    type: "function",
    category: "graphics",
    categoryLabel: "Gráficos & Pantalla",
    description: "Carga en memoria un paquete de gráficos FPG (File Package of Graphics) y devuelve su identificador entero.",
    syntax: "fpg_id = load_fpg(\"sprites.fpg\");",
  },
  {
    name: "unload_fpg",
    type: "function",
    category: "graphics",
    categoryLabel: "Gráficos & Pantalla",
    description: "Libera de memoria la librería FPG especificada para optimizar recursos.",
    syntax: "unload_fpg(fpg_id);",
  },
  {
    name: "load_map",
    type: "function",
    category: "graphics",
    categoryLabel: "Gráficos & Pantalla",
    description: "Carga un archivo gráfico individual .MAP de DIV Games Studio y lo registra en la librería activa.",
    syntax: "map_id = load_map(\"fondo.map\");",
  },
  {
    name: "put_screen",
    type: "function",
    category: "graphics",
    categoryLabel: "Gráficos & Pantalla",
    description: "Establece una imagen de fondo fija a pantalla completa desde la librería FPG y número de gráfico indicados.",
    syntax: "put_screen(fpg_id, 100);",
  },
  {
    name: "clear_screen",
    type: "function",
    category: "graphics",
    categoryLabel: "Gráficos & Pantalla",
    description: "Borra el contenido del lienzo de pantalla restaurando el color de fondo.",
    syntax: "clear_screen();",
  },
  {
    name: "screen_color",
    type: "function",
    category: "graphics",
    categoryLabel: "Gráficos & Pantalla",
    description: "Cambia el color de limpieza del fondo de la pantalla mediante un valor RGB o índice de paleta.",
    syntax: "screen_color(rgb(15, 23, 42));",
  },
  {
    name: "fade",
    type: "function",
    category: "graphics",
    categoryLabel: "Gráficos & Pantalla",
    description: "Realiza una transición de fundido gradual de la paleta hacia el brillo y velocidad indicados.",
    syntax: "fade(0, 0, 0, 16); // Fundido a negro a velocidad 16",
  },
  {
    name: "fade_on",
    type: "function",
    category: "graphics",
    categoryLabel: "Gráficos & Pantalla",
    description: "Aclara la pantalla progresivamente restaurando los colores normales de la paleta.",
    syntax: "fade_on();",
  },
  {
    name: "fade_off",
    type: "function",
    category: "graphics",
    categoryLabel: "Gráficos & Pantalla",
    description: "Oscurece la pantalla completamente a negro para cambios de escena o finales de fase.",
    syntax: "fade_off();",
  },
  {
    name: "start_scroll",
    type: "function",
    category: "graphics",
    categoryLabel: "Gráficos & Pantalla",
    description: "Inicia un plano de scroll multicapa con velocidad diferencial, cámara de seguimiento y wrap automático.",
    syntax: "start_scroll(0, fpg_id, mapa_fondo, mapa_primer_plano, 0, 0);",
  },
  {
    name: "stop_scroll",
    type: "function",
    category: "graphics",
    categoryLabel: "Gráficos & Pantalla",
    description: "Detiene y destruye el plano de scroll indicado devolviendo la vista estándar.",
    syntax: "stop_scroll(0);",
  },
  {
    name: "draw_box",
    type: "function",
    category: "graphics",
    categoryLabel: "Gráficos & Pantalla",
    description: "Dibuja un rectángulo coloreado en las coordenadas de pantalla indicadas.",
    syntax: "draw_box(20, 20, 200, 60, \"#3b82f6\");",
  },
  {
    name: "draw_line",
    type: "function",
    category: "graphics",
    categoryLabel: "Gráficos & Pantalla",
    description: "Traza una línea continua entre dos puntos (x1, y1) y (x2, y2) con el color especificado.",
    syntax: "draw_line(0, 0, 640, 480, \"#f43f5e\");",
  },
  {
    name: "draw_circle",
    type: "function",
    category: "graphics",
    categoryLabel: "Gráficos & Pantalla",
    description: "Dibuja un círculo relleno o de contorno con centro en (x, y) y radio especificado.",
    syntax: "draw_circle(320, 240, 48, \"#10b981\");",
  },

  // =========================================================================
  // 3. MODO 8 (3D RAYCASTER & VÓXEL) Y MODO 7
  // =========================================================================
  {
    name: "start_mode8",
    type: "function",
    category: "3d",
    categoryLabel: "Modo 8 3D",
    description: "Inicia el motor 3D Raycasting / Sectores Modo 8 (estilo Wolfenstein 3D / DOOM / Catacomb) con aceleración por hardware y minimapa.",
    syntax: "start_mode8(0, 0, 25, 0, 0, 0);\n// Parámetros: archivo FPG, mapa base, altura cámara, niebla, luz, sombreado",
  },
  {
    name: "stop_mode8",
    type: "function",
    category: "3d",
    categoryLabel: "Modo 8 3D",
    description: "Detiene el motor de renderizado 3D Modo 8 y restaura el modo de dibujo 2D tradicional.",
    syntax: "stop_mode8();",
  },
  {
    name: "m8_set_camera",
    type: "function",
    category: "3d",
    categoryLabel: "Modo 8 3D",
    description: "Posiciona la cámara de primera persona en las coordenadas (x, y, z), ángulo en grados e inclinación de cabeceo (pitch).",
    syntax: "m8_set_camera(jugador.x, jugador.y, 32, jugador.angle, jugador.pitch);",
  },
  {
    name: "m8_spawn_enemy",
    type: "function",
    category: "3d",
    categoryLabel: "Modo 8 3D",
    description: "Engendra un monstruo o entidad 3D en el laberinto con sprites rotacionales, IA de persecución y colisión volumétrica.",
    syntax: "m8_spawn_enemy(\"imp_demon\", 256, 384, 100);",
  },
  {
    name: "m8_spawn_object",
    type: "function",
    category: "3d",
    categoryLabel: "Modo 8 3D",
    description: "Coloca un objeto 3D decorativo (antorcha, barril, columna gótica, ítem recogible) en el mundo de la mazmorra.",
    syntax: "m8_spawn_object(\"torch_gothic\", 192, 192);",
  },
  {
    name: "m8_open_door",
    type: "function",
    category: "3d",
    categoryLabel: "Modo 8 3D",
    description: "Abre o activa una puerta corrediza en el laberinto 3D en las coordenadas de celda especificadas.",
    syntax: "m8_open_door(sector_x, sector_y);",
  },
  {
    name: "m8_set_fog",
    type: "function",
    category: "3d",
    categoryLabel: "Modo 8 3D",
    description: "Configura la densidad de niebla atmosférica y la distancia máxima de visibilidad en el espacio tridimensional.",
    syntax: "m8_set_fog(color_rgb, distancia_corte);",
  },
  {
    name: "start_mode7",
    type: "function",
    category: "3d",
    categoryLabel: "Modo 7 3D",
    description: "Inicia el motor de perspectiva 3D plana Modo 7 (estilo Super Mario Kart o F-Zero de SNES) con karts y horizonte dinámico.",
    syntax: "start_mode7(0, fpg_circuito, mapa_pista, 0, 0, 0);",
  },
  {
    name: "stop_mode7",
    type: "function",
    category: "3d",
    categoryLabel: "Modo 7 3D",
    description: "Detiene el plano Modo 7 y libera las tablas de escalado afín.",
    syntax: "stop_mode7();",
  },

  // =========================================================================
  // 4. SONIDO & AUDIO
  // =========================================================================
  {
    name: "sound",
    type: "function",
    category: "audio",
    categoryLabel: "Sonido & Música",
    description: "Reproduce un efecto de sonido WAV en el canal indicado con volumen (0-128) y frecuencia (pitch).",
    syntax: "sound(id_sonido, 128, 256);",
  },
  {
    name: "stop_sound",
    type: "function",
    category: "audio",
    categoryLabel: "Sonido & Música",
    description: "Detiene inmediatamente un sonido en reproducción o todos los canales activos si se pasa 0.",
    syntax: "stop_sound(canal_id);",
  },
  {
    name: "load_wav",
    type: "function",
    category: "audio",
    categoryLabel: "Sonido & Música",
    description: "Carga un archivo de audio digital .WAV y devuelve su ID numérico para uso con sound().",
    syntax: "snd_laser = load_wav(\"laser.wav\");",
  },
  {
    name: "load_song",
    type: "function",
    category: "audio",
    categoryLabel: "Sonido & Música",
    description: "Carga un archivo de música instrumental (MOD, S3M, XM, MIDI o MP3) en memoria.",
    syntax: "musica_nivel = load_song(\"nivel1.mod\");",
  },
  {
    name: "song",
    type: "function",
    category: "audio",
    categoryLabel: "Sonido & Música",
    description: "Inicia la reproducción en bucle de la música de fondo cargada previamente.",
    syntax: "song(musica_nivel);",
  },
  {
    name: "stop_song",
    type: "function",
    category: "audio",
    categoryLabel: "Sonido & Música",
    description: "Pausa o detiene la canción que está sonando actualmente.",
    syntax: "stop_song();",
  },
  {
    name: "set_volume",
    type: "function",
    category: "audio",
    categoryLabel: "Sonido & Música",
    description: "Ajusta el volumen maestro general de los efectos de sonido y de la música (rango 0 a 128).",
    syntax: "set_volume(96);",
  },

  // =========================================================================
  // 5. ENTRADA, TECLADO, RATÓN & TOUCH
  // =========================================================================
  {
    name: "key",
    type: "function",
    category: "input",
    categoryLabel: "Entrada & Teclado",
    description: "Comprueba el estado de pulsación de una tecla física o virtual. Devuelve 1 (true) si la tecla está presionada.",
    syntax: "IF (key(_left))  x -= velocidad; END\nIF (key(_right)) x += velocidad; END",
  },
  {
    name: "mouse.x",
    type: "variable",
    category: "input",
    categoryLabel: "Entrada & Ratón",
    description: "Coordenada horizontal X absoluta del puntero del ratón o toque táctil en el lienzo.",
    syntax: "write_int(0, 10, 10, 0, &mouse.x);",
  },
  {
    name: "mouse.y",
    type: "variable",
    category: "input",
    categoryLabel: "Entrada & Ratón",
    description: "Coordenada vertical Y absoluta del cursor del ratón o dedo sobre la pantalla.",
    syntax: "write_int(0, 10, 30, 0, &mouse.y);",
  },
  {
    name: "mouse.left",
    type: "variable",
    category: "input",
    categoryLabel: "Entrada & Ratón",
    description: "Estado del botón izquierdo del ratón o toque táctil primario (1 si está pulsado, 0 si está libre).",
    syntax: "IF (mouse.left)\n  disparar_en(mouse.x, mouse.y);\nEND",
  },
  {
    name: "mouse.right",
    type: "variable",
    category: "input",
    categoryLabel: "Entrada & Ratón",
    description: "Estado del botón derecho del ratón o toque secundario sostenido.",
    syntax: "IF (mouse.right) activar_zoom(); END",
  },
  {
    name: "_space",
    type: "constant",
    category: "input",
    categoryLabel: "Constantes Tecla",
    description: "Código de tecla para la Barra Espaciadora en key().",
    syntax: "IF (key(_space)) salto(); END",
  },
  {
    name: "_enter",
    type: "constant",
    category: "input",
    categoryLabel: "Constantes Tecla",
    description: "Código de tecla para la tecla Intro / Enter.",
    syntax: "IF (key(_enter)) aceptar(); END",
  },
  {
    name: "_esc",
    type: "constant",
    category: "input",
    categoryLabel: "Constantes Tecla",
    description: "Código de tecla para la tecla Escape (Salir / Menú de Pausa).",
    syntax: "IF (key(_esc)) pausar_juego(); END",
  },
  {
    name: "_up",
    type: "constant",
    category: "input",
    categoryLabel: "Constantes Tecla",
    description: "Código de tecla para la Flecha Arriba del teclado.",
    syntax: "IF (key(_up)) y -= 4; END",
  },
  {
    name: "_down",
    type: "constant",
    category: "input",
    categoryLabel: "Constantes Tecla",
    description: "Código de tecla para la Flecha Abajo del teclado.",
    syntax: "IF (key(_down)) y += 4; END",
  },
  {
    name: "_left",
    type: "constant",
    category: "input",
    categoryLabel: "Constantes Tecla",
    description: "Código de tecla para la Flecha Izquierda del teclado.",
    syntax: "IF (key(_left)) x -= 4; END",
  },
  {
    name: "_right",
    type: "constant",
    category: "input",
    categoryLabel: "Constantes Tecla",
    description: "Código de tecla para la Flecha Derecha del teclado.",
    syntax: "IF (key(_right)) x += 4; END",
  },

  // =========================================================================
  // 6. FÍSICA, COLISIONES & TRIGONOMETRÍA
  // =========================================================================
  {
    name: "collision",
    type: "function",
    category: "collision",
    categoryLabel: "Física & Colisiones",
    description: "Detecta colisión pixel-perfect o por bounding-box entre el proceso actual y otro proceso específico o tipo de proceso.",
    syntax: "id_impacto = collision(type enemigo);\nIF (id_impacto)\n  signal(id_impacto, s_kill);\n  explosion(x, y);\nEND",
  },
  {
    name: "get_dist",
    type: "function",
    category: "collision",
    categoryLabel: "Física & Colisiones",
    description: "Calcula la distancia euclídea entre el proceso actual y otro proceso referenciado por su ID.",
    syntax: "distancia = get_dist(id_objetivo);",
  },
  {
    name: "get_dist2d",
    type: "function",
    category: "collision",
    categoryLabel: "Física & Colisiones",
    description: "Calcula la distancia entre dos pares de coordenadas (x1, y1) y (x2, y2).",
    syntax: "d = get_dist2d(x1, y1, x2, y2);",
  },
  {
    name: "get_angle",
    type: "function",
    category: "collision",
    categoryLabel: "Física & Colisiones",
    description: "Obtiene el ángulo en milésimas de grado hacia otro proceso objetivo (ideal para torretas y misiles guiados).",
    syntax: "angle = get_angle(id_enemigo);",
  },
  {
    name: "near_angle",
    type: "function",
    category: "collision",
    categoryLabel: "Física & Colisiones",
    description: "Aproxima suavemente un ángulo hacia otro ángulo objetivo con una velocidad de giro máxima.",
    syntax: "angle = near_angle(angle, angulo_deseado, 2000);",
  },
  {
    name: "advance",
    type: "function",
    category: "collision",
    categoryLabel: "Física & Colisiones",
    description: "Desplaza al proceso en la dirección indicada por su variable local 'angle' una distancia dada.",
    syntax: "advance(velocidad);",
  },
  {
    name: "rand",
    type: "function",
    category: "collision",
    categoryLabel: "Física & Colisiones",
    description: "Genera un número entero aleatorio comprendido entre el valor mínimo y el valor máximo inclusivos.",
    syntax: "numero = rand(1, 6);",
  },

  // =========================================================================
  // 7. TEXTO, FUENTES FNT & FORMATO
  // =========================================================================
  {
    name: "write",
    type: "function",
    category: "text",
    categoryLabel: "Texto & Fuentes",
    description: "Imprime una cadena de texto estática en pantalla con la fuente FNT indicada, coordenadas y alineación (0=izq, 1=centrado, 2=der).",
    syntax: "write(fnt_id, 320, 240, 1, \"¡FIN DEL JUEGO!\");",
  },
  {
    name: "write_int",
    type: "function",
    category: "text",
    categoryLabel: "Texto & Fuentes",
    description: "Imprime un número entero reactivo vinculado por referencia (&variable) que se actualiza automáticamente cada fotograma.",
    syntax: "write_int(fnt_id, 100, 20, 0, &puntuacion);",
  },
  {
    name: "write_float",
    type: "function",
    category: "text",
    categoryLabel: "Texto & Fuentes",
    description: "Imprime un número con decimales vinculado dinámicamente por referencia (&variable).",
    syntax: "write_float(fnt_id, 100, 45, 0, &velocidad_kmh);",
  },
  {
    name: "load_fnt",
    type: "function",
    category: "text",
    categoryLabel: "Texto & Fuentes",
    description: "Carga en memoria una tipografía rasterizada .FNT de DIV Games Studio y retorna su ID numérico.",
    syntax: "fnt_retro = load_fnt(\"arcade.fnt\");",
  },
  {
    name: "delete_text",
    type: "function",
    category: "text",
    categoryLabel: "Texto & Fuentes",
    description: "Elimina de pantalla un texto reactivo creado previamente con write() o write_int().",
    syntax: "delete_text(id_texto);",
  },

  // =========================================================================
  // 8. VARIABLES LOCALES DE PROCESO
  // =========================================================================
  {
    name: "x",
    type: "variable",
    category: "variables",
    categoryLabel: "Variables Locales",
    description: "Posición horizontal del proceso en coordenadas del mundo o de la pantalla.",
    syntax: "x = 320;",
  },
  {
    name: "y",
    type: "variable",
    category: "variables",
    categoryLabel: "Variables Locales",
    description: "Posición vertical del proceso en coordenadas de pantalla.",
    syntax: "y = 240;",
  },
  {
    name: "z",
    type: "variable",
    category: "variables",
    categoryLabel: "Variables Locales",
    description: "Profundidad de dibujado Z-order. Procesos con Z menor se dibujan encima de procesos con Z mayor.",
    syntax: "z = -10; // Dibujado encima de la capa base",
  },
  {
    name: "graph",
    type: "variable",
    category: "variables",
    categoryLabel: "Variables Locales",
    description: "Número del gráfico (sprite) que representa visualmente al proceso dentro de su archivo FPG asignado.",
    syntax: "graph = 100;",
  },
  {
    name: "file",
    type: "variable",
    category: "variables",
    categoryLabel: "Variables Locales",
    description: "Identificador del fichero FPG de donde el proceso extrae su gráfico asignado en 'graph'. 0 indica librería por defecto.",
    syntax: "file = fpg_personajes;",
  },
  {
    name: "flags",
    type: "variable",
    category: "variables",
    categoryLabel: "Variables Locales",
    description: "Modificadores de renderizado: 0=normal, 1=espejo horizontal, 2=espejo vertical, 4=semitransparente.",
    syntax: "flags = 1; // Volteo horizontal",
  },
  {
    name: "size",
    type: "variable",
    category: "variables",
    categoryLabel: "Variables Locales",
    description: "Escala porcentual del sprite (100 = tamaño original, 200 = doble, 50 = mitad).",
    syntax: "size = 150; // 150% de tamaño",
  },
  {
    name: "angle",
    type: "variable",
    category: "variables",
    categoryLabel: "Variables Locales",
    description: "Ángulo de rotación del proceso en milésimas de grado (de 0 a 360000).",
    syntax: "angle += 2000; // Rotación continua",
  },
  {
    name: "id",
    type: "variable",
    category: "variables",
    categoryLabel: "Variables Locales",
    description: "Identificador numérico único de la instancia del proceso actual (puntero de instancia).",
    syntax: "mi_id = id;",
  },
  {
    name: "father",
    type: "variable",
    category: "variables",
    categoryLabel: "Variables Locales",
    description: "ID del proceso padre que engendró o llamó al proceso actual.",
    syntax: "signal(father, s_kill);",
  },
  {
    name: "signal",
    type: "function",
    category: "variables",
    categoryLabel: "Señales & Hilos",
    description: "Envía una señal de control de ciclo de vida a un proceso (s_kill, s_sleep, s_freeze, s_wakeup).",
    syntax: "signal(id_objetivo, s_kill);",
  },

  // =========================================================================
  // 9. VISUAL MDI ENGINE (UI REACTIVA, FORMULARIOS & STORES)
  // =========================================================================
  {
    name: "STORE",
    type: "keyword",
    category: "visual_mdi",
    categoryLabel: "Visual MDI Engine",
    description: "Declara un almacén de estado reactivo persistente para aplicaciones y formularios del Visual MDI Engine.",
    syntax: "STORE user_store\n  usuario: string = \"Invitado\"\n  puntos: int = 100\n  activo: bool = true\nEND",
  },
  {
    name: "draw_button",
    type: "function",
    category: "visual_mdi",
    categoryLabel: "Visual MDI Engine",
    description: "Renderiza un botón interactivo 3D del Visual MDI Engine con estilos clásicos y respuesta táctil/clic.",
    syntax: "draw_button(x, y, ancho, alto, \"Guardar Cambios\", btn_guardar_click);",
  },
  {
    name: "draw_input",
    type: "function",
    category: "visual_mdi",
    categoryLabel: "Visual MDI Engine",
    description: "Crea una caja de texto interactiva reactiva con soporte de edición, foco de teclado y placeholder.",
    syntax: "draw_input(x, y, ancho, alto, variable_texto, 0, \"Introduce tu nombre...\");",
  },
  {
    name: "draw_checkbox",
    type: "function",
    category: "visual_mdi",
    categoryLabel: "Visual MDI Engine",
    description: "Dibuja una casilla de verificación reactiva de encendido/apagado estilo Windows 3.1 / Visual MDI.",
    syntax: "draw_checkbox(x, y, ancho, alto, \"Recordar sesión\", valor_booleano, on_toggle);",
  },
  {
    name: "draw_table",
    type: "function",
    category: "visual_mdi",
    categoryLabel: "Visual MDI Engine",
    description: "Dibuja una cuadrícula de datos (Data Grid) reactiva con cabeceras de columnas y celdas estructuradas.",
    syntax: "draw_table(x, y, ancho, alto, \"ID,NOMBRE,PRECIO\", \"1,Espada,150|2,Escudo,80\");",
  },
  {
    name: "sqlite_query",
    type: "function",
    category: "visual_mdi",
    categoryLabel: "Visual MDI Engine",
    description: "Ejecuta una consulta SQL en la base de datos relacional local en memoria o con persistencia JSON.",
    syntax: "sqlite_query(\"INSERT INTO usuarios VALUES ('Admin', 100);\");",
  },
  {
    name: "save_json",
    type: "function",
    category: "visual_mdi",
    categoryLabel: "Visual MDI Engine",
    description: "Guarda un objeto o estado estructurado en el almacenamiento local persistente (localStorage / IndexedDB).",
    syntax: "save_json(\"app_datos\", &mi_estructura);",
  },
  {
    name: "load_json",
    type: "function",
    category: "visual_mdi",
    categoryLabel: "Visual MDI Engine",
    description: "Recupera un archivo o estado estructurado persistido previamente.",
    syntax: "load_json(\"app_datos\", &mi_estructura);",
  },
];

export const DivLexiconModal: React.FC<DivLexiconModalProps> = ({
  isOpen,
  onClose,
  onInsertCode,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<LexiconCategory>("all");
  const [selectedItem, setSelectedItem] = useState<LexiconItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filtered list
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return COMPLETE_DIV_LEXICON.filter((item) => {
      // Category match
      if (activeCategory !== "all" && item.category !== activeCategory) {
        return false;
      }

      // Query match
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.syntax && item.syntax.toLowerCase().includes(q)) ||
        (item.categoryLabel && item.categoryLabel.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, activeCategory]);

  const activeDoc = selectedItem || filteredList[0] || null;

  const handleCopyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in select-none font-sans">
      <div className="w-full max-w-5xl h-[88vh] bg-[#0c1222] border border-cyan-500/50 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="h-12 bg-gradient-to-r from-slate-900 via-[#101b38] to-slate-900 border-b border-cyan-500/40 px-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-sm tracking-wide text-cyan-200">
              Manual Oficial de Léxico DIV Games Studio & Visual MDI Engine
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-mono">
              v3.0 PRO
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Categories Bar */}
        <div className="bg-[#0f172a] border-b border-slate-800 px-4 py-2.5 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between flex-shrink-0">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar comando, función, proceso o variable..."
              className="w-full pl-9 pr-3 py-1.5 rounded bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none text-xs text-slate-200 placeholder-slate-500 font-mono"
            />
          </div>

          {/* Quick Stats */}
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <span>Resultados: <strong className="text-cyan-300">{filteredList.length}</strong></span>
            <span>•</span>
            <span>Léxico DIV verificado</span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="bg-[#090d1a] border-b border-slate-800 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto flex-shrink-0 text-xs">
          {[
            { id: "all", label: "Todo el Léxico" },
            { id: "control", label: "Estructuras & Control" },
            { id: "graphics", label: "Gráficos & 2D" },
            { id: "3d", label: "Modo 8 (3D Raycaster)" },
            { id: "audio", label: "Sonido & Música" },
            { id: "input", label: "Entrada & Teclado" },
            { id: "collision", label: "Física & Colisiones" },
            { id: "text", label: "Texto & Fuentes FNT" },
            { id: "variables", label: "Variables Locales" },
            { id: "visual_mdi", label: "Visual MDI Engine" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as LexiconCategory)}
              className={`px-2.5 py-1 rounded text-[11px] whitespace-nowrap transition-colors font-medium ${
                activeCategory === cat.id
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "bg-slate-800/80 hover:bg-slate-700 text-slate-300"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Main 2-Column Split: List vs Documentation Detail */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Command List */}
          <div className="w-72 sm:w-80 border-r border-slate-800 bg-[#090f1e] overflow-y-auto flex-shrink-0 divide-y divide-slate-800/60">
            {filteredList.map((item) => {
              const isSelected = activeDoc?.name === item.name;
              return (
                <div
                  key={item.name}
                  onClick={() => setSelectedItem(item)}
                  className={`p-2.5 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-cyan-950/70 border-l-4 border-cyan-400 text-white"
                      : "hover:bg-slate-800/50 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-mono font-bold text-xs text-cyan-300">
                      {item.name}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                        item.type === "keyword"
                          ? "bg-purple-950 text-purple-300 border border-purple-800/60"
                          : item.type === "function"
                          ? "bg-sky-950 text-sky-300 border border-sky-800/60"
                          : "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                      }`}
                    >
                      {item.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}

            {filteredList.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-xs">
                No se encontraron comandos con "{searchQuery}".
              </div>
            )}
          </div>

          {/* Right Column: Detailed Documentation Card */}
          <div className="flex-1 bg-[#0b1020] p-4 sm:p-6 overflow-y-auto flex flex-col justify-between">
            {activeDoc ? (
              <div className="space-y-4">
                {/* Title & Category Badge */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="font-mono font-black text-xl text-cyan-300">
                        {activeDoc.name}
                      </h1>
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                        {activeDoc.categoryLabel || activeDoc.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Instrucción nativa del compilador DIV Games Studio y motor Visual MDI Engine
                    </p>
                  </div>

                  {onInsertCode && activeDoc.syntax && (
                    <button
                      onClick={() => {
                        onInsertCode(activeDoc.syntax || activeDoc.name);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all"
                      title="Insertar este código en el editor"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Insertar en Editor</span>
                    </button>
                  )}
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Descripción & Funcionamiento:
                  </h3>
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs leading-relaxed text-slate-200">
                    {activeDoc.description}
                  </div>
                </div>

                {/* Syntax & Code Snippet */}
                {activeDoc.syntax && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Sintaxis & Ejemplo de Código DIV:
                      </h3>
                      <button
                        onClick={() => handleCopyCode(activeDoc.syntax!, activeDoc.name)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 font-mono transition-colors"
                      >
                        {copiedId === activeDoc.name ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="p-3.5 rounded-lg bg-[#070b14] border border-cyan-900/40 text-cyan-200 font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed shadow-inner">
                      {activeDoc.syntax}
                    </pre>
                  </div>
                )}

                {/* Quick Reference Notes */}
                <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-700/30 text-amber-200/90 text-xs">
                  <div className="font-bold flex items-center gap-1 mb-1">
                    <span>💡 Nota Técnica DIV Games Studio:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-300/80">
                    En DIV Games Studio, los bloques <code className="font-mono bg-black/40 px-1 py-0.5 rounded">GLOBAL</code> no llevan <code className="font-mono bg-black/40 px-1 py-0.5 rounded">END</code>. Cada <code className="font-mono bg-black/40 px-1 py-0.5 rounded">PROCESS</code> se ejecuta de forma pseudo-multitarea a 60 FPS llamando a <code className="font-mono bg-black/40 px-1 py-0.5 rounded">FRAME;</code> en su bucle <code className="font-mono bg-black/40 px-1 py-0.5 rounded">LOOP</code>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs">
                Selecciona un elemento de la lista para ver su documentación completa.
              </div>
            )}

            {/* Footer with Shortcut Cheat Sheet */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
              <div className="flex items-center gap-3">
                <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">F5</kbd> Iniciar</span>
                <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">F7</kbd> Código</span>
                <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">Shift+F7</kbd> Diseñador Visual</span>
                <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">Ctrl+N</kbd> Nuevo</span>
              </div>
              <button
                onClick={onClose}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-sans"
              >
                Cerrar Manual
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
