import React, { useState, useMemo } from "react";
import {
  X,
  Search,
  BookOpen,
  Copy,
  Check,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Compass,
  Lightbulb,
} from "lucide-react";
import { DivSuggestion } from "../engine/divKeywords";

interface DivLexiconModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertCode?: (snippet: string) => void;
  onInsertSnippet?: (snippet: string) => void;
  onOpenGuide?: () => void;
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

const LEXICON_CATEGORIES: { id: LexiconCategory; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "control", label: "Estructuras" },
  { id: "graphics", label: "Gráficos 2D" },
  { id: "3d", label: "Modo 8 (3D)" },
  { id: "audio", label: "Sonido" },
  { id: "input", label: "Entrada / Touch" },
  { id: "collision", label: "Física" },
  { id: "text", label: "Texto" },
  { id: "variables", label: "Variables" },
  { id: "visual_mdi", label: "Apps Visuales" },
];

export const DivLexiconModal: React.FC<DivLexiconModalProps> = ({
  isOpen,
  onClose,
  onInsertCode,
  onInsertSnippet,
  onOpenGuide,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<LexiconCategory>("all");
  const [selectedItem, setSelectedItem] = useState<LexiconItem | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const insertHandler = onInsertCode || onInsertSnippet;

  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return COMPLETE_DIV_LEXICON.filter((item) => {
      if (activeCategory !== "all" && item.category !== activeCategory) {
        return false;
      }
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
  const activeIndex = activeDoc
    ? filteredList.findIndex((i) => i.name === activeDoc.name)
    : -1;

  const handleSelectItem = (item: LexiconItem) => {
    setSelectedItem(item);
    setMobileView("detail");
  };

  const handleStepItem = (delta: number) => {
    if (filteredList.length === 0) return;
    const nextIdx =
      activeIndex === -1
        ? 0
        : (activeIndex + delta + filteredList.length) % filteredList.length;
    setSelectedItem(filteredList[nextIdx]);
  };

  const handleCopyCode = (text: string, id: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[20000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-[2px] select-none font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="div-lexicon-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-5xl h-[94dvh] sm:h-[88vh] bg-white border border-[#E2E8F0] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#111827]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Sheet Handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-0.5 bg-white flex-shrink-0">
          <span className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="px-4 sm:px-6 py-3 bg-white border-b border-[#E2E8F0] flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#7C2D48] text-white flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="div-lexicon-title"
                className="font-bold text-sm sm:text-base text-[#111827] truncate"
              >
                Manual DIV Games Studio
              </h2>
              <p className="text-[11px] sm:text-xs text-[#6B7280] truncate">
                {filteredList.length} comandos disponibles · Toca cualquiera para ver su ejemplo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {onOpenGuide && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenGuide();
                }}
                className="min-h-[40px] px-2.5 sm:px-3 rounded-xl border border-[#F3D0DC] bg-[#FDF2F5] hover:bg-[#FCE7EE] text-[#7C2D48] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                title="Abrir Guía Paso a Paso"
              >
                <Compass className="w-4 h-4" />
                <span className="hidden sm:inline">Guía Paso a Paso</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 rounded-xl hover:bg-slate-100 flex items-center justify-center text-[#4B5563] hover:text-[#111827] transition-colors cursor-pointer"
              aria-label="Cerrar manual"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Categories (Hidden on Mobile while viewing Detail for maximum reading space) */}
        <div
          className={`${
            mobileView === "detail" ? "hidden md:block" : "block"
          } bg-[#F7F8FA] border-b border-[#E2E8F0] flex-shrink-0`}
        >
          <div className="px-4 sm:px-6 pt-3 pb-2 flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#7C2D48] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setMobileView("list");
                }}
                placeholder="Buscar comando, función o variable..."
                className="w-full min-h-[42px] pl-9 pr-8 py-2 rounded-xl bg-white border border-[#CBD5E1] focus:border-[#7C2D48] focus:outline-none text-xs sm:text-sm text-[#111827] placeholder-[#6B7280]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg text-[#6B7280] hover:text-[#111827] flex items-center justify-center cursor-pointer"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-[#6B7280]">
              <span>
                Mostrando <strong className="text-[#111827] tabular-nums">{filteredList.length}</strong> de {COMPLETE_DIV_LEXICON.length}
              </span>
            </div>
          </div>

          <div className="px-4 sm:px-6 pb-2.5 flex items-center gap-1.5 overflow-x-auto">
            {LEXICON_CATEGORIES.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setMobileView("list");
                  }}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? "bg-[#7C2D48] text-white shadow-2xs"
                      : "bg-white text-[#4B5563] border border-[#E2E8F0] hover:text-[#111827]"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Master-Detail Workspace */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Left Column (Mobile List / Desktop Master Sidebar) */}
          <div
            className={`${
              mobileView === "list" ? "flex" : "hidden md:flex"
            } flex-col w-full md:w-72 lg:w-80 border-r border-[#E2E8F0] bg-[#F7F8FA] overflow-y-auto flex-shrink-0 divide-y divide-[#E2E8F0]`}
          >
            {filteredList.map((item) => {
              const isSelected = activeDoc?.name === item.name;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleSelectItem(item)}
                  className={`w-full min-h-[60px] px-4 py-3 text-left transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? "bg-[#FDF2F5] text-[#111827]"
                      : "bg-white/60 hover:bg-white text-[#374151]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono font-bold text-xs sm:text-sm truncate ${
                          isSelected ? "text-[#7C2D48]" : "text-[#111827]"
                        }`}
                      >
                        {item.name}
                      </span>
                      <span className="text-[11px] text-[#6B7280] flex-shrink-0">
                        · {item.type === "keyword" ? "Estructura" : item.type === "function" ? "Función" : item.type === "constant" ? "Tecla" : "Variable"}
                      </span>
                    </div>
                    <p className="text-xs text-[#4B5563] line-clamp-2 leading-relaxed mt-0.5">
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 flex-shrink-0 ${
                      isSelected ? "text-[#7C2D48]" : "text-[#9CA3AF]"
                    }`}
                  />
                </button>
              );
            })}

            {filteredList.length === 0 && (
              <div className="p-8 text-center text-[#6B7280] text-xs space-y-2">
                <p>No se encontraron comandos con &ldquo;{searchQuery}&rdquo;.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("all");
                  }}
                  className="min-h-[40px] px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-[#7C2D48] font-semibold cursor-pointer"
                >
                  Ver todo el manual
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Detailed Documentation */}
          <div
            className={`${
              mobileView === "detail" ? "flex" : "hidden md:flex"
            } flex-1 min-w-0 bg-white flex-col overflow-hidden`}
          >
            {/* Mobile Back & Step Header */}
            <div className="md:hidden px-3 py-2 bg-[#F7F8FA] border-b border-[#E2E8F0] flex items-center justify-between gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setMobileView("list")}
                className="min-h-[40px] px-2.5 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-xs font-semibold text-[#111827] flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-[#7C2D48]" />
                <span>Lista ({filteredList.length})</span>
              </button>

              {filteredList.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleStepItem(-1)}
                    className="w-10 h-10 rounded-lg bg-white border border-[#E2E8F0] text-[#374151] flex items-center justify-center cursor-pointer"
                    aria-label="Comando anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-medium text-[#6B7280] px-1.5 tabular-nums">
                    {activeIndex + 1}/{filteredList.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStepItem(1)}
                    className="w-10 h-10 rounded-lg bg-white border border-[#E2E8F0] text-[#374151] flex items-center justify-center cursor-pointer"
                    aria-label="Siguiente comando"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {activeDoc ? (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
                  {/* Title & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#E2E8F0] pb-4">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#7C2D48]">
                        {activeDoc.categoryLabel || activeDoc.type} ·{" "}
                        {activeDoc.type === "keyword"
                          ? "Palabra clave"
                          : activeDoc.type === "function"
                            ? "Función"
                            : activeDoc.type === "constant"
                              ? "Constante"
                              : "Variable"}
                      </div>
                      <h3 className="font-mono font-extrabold text-xl sm:text-2xl text-[#111827] mt-0.5 break-all">
                        {activeDoc.name}
                      </h3>
                    </div>

                    {insertHandler && activeDoc.syntax && (
                      <button
                        type="button"
                        onClick={() => {
                          insertHandler(activeDoc.syntax || activeDoc.name);
                          onClose();
                        }}
                        className="hidden sm:inline-flex min-h-[42px] px-4 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white font-semibold text-xs items-center gap-1.5 shadow-xs transition-colors flex-shrink-0 cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Insertar en Editor</span>
                      </button>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                      ¿Para qué sirve?
                    </h4>
                    <div className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] text-xs sm:text-sm leading-relaxed text-[#374151]">
                      {activeDoc.description}
                    </div>
                  </div>

                  {/* Syntax & Code Snippet */}
                  {activeDoc.syntax && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                          Ejemplo listo para usar
                        </h4>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(activeDoc.syntax!, activeDoc.name)}
                          className="min-h-[36px] px-3 py-1 rounded-lg bg-[#F7F8FA] hover:bg-slate-100 border border-[#E2E8F0] text-[#374151] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {copiedId === activeDoc.name ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#2F6F4E]" />
                              <span className="text-[#2F6F4E]">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>

                      <pre className="p-3.5 sm:p-4 rounded-xl bg-[#0F172A] text-slate-100 font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed">
                        {activeDoc.syntax}
                      </pre>
                    </div>
                  )}

                  {/* Beginner Friendly Note */}
                  <div className="p-3.5 rounded-xl bg-[#FDF2F5] border border-[#F3D0DC] text-xs text-[#374151] space-y-1">
                    <div className="font-bold text-[#7C2D48] flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 flex-shrink-0" />
                      <span>Consejo rápido de sintaxis DIV</span>
                    </div>
                    <p className="leading-relaxed">
                      En DIV Games Studio, el bloque <code className="font-mono font-semibold text-[#111827]">GLOBAL</code> nunca lleva <code className="font-mono font-semibold text-[#111827]">END</code>. Cada <code className="font-mono font-semibold text-[#111827]">PROCESS</code> funciona en paralelo a 60 FPS llamando a <code className="font-mono font-semibold text-[#111827]">FRAME;</code> dentro de su bucle <code className="font-mono font-semibold text-[#111827]">LOOP</code>.
                    </p>
                  </div>
                </div>

                {/* Sticky Mobile Thumb Action Bar / Desktop Shortcut Footer */}
                <div className="px-4 sm:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#F7F8FA] border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 flex-shrink-0">
                  <div className="hidden md:flex items-center gap-3 text-[11px] font-mono text-[#6B7280]">
                    <span><kbd className="px-1.5 py-0.5 bg-white rounded border border-[#E2E8F0] text-[#111827]">F5</kbd> Probar</span>
                    <span><kbd className="px-1.5 py-0.5 bg-white rounded border border-[#E2E8F0] text-[#111827]">F7</kbd> Código</span>
                    <span><kbd className="px-1.5 py-0.5 bg-white rounded border border-[#E2E8F0] text-[#111827]">Ctrl+N</kbd> Nuevo</span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {activeDoc.syntax && (
                      <button
                        type="button"
                        onClick={() => handleCopyCode(activeDoc.syntax!, activeDoc.name)}
                        className="sm:hidden min-h-[44px] flex-1 px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs font-semibold text-[#111827] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {copiedId === activeDoc.name ? (
                          <>
                            <Check className="w-4 h-4 text-[#2F6F4E]" />
                            <span className="text-[#2F6F4E]">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    )}
                    {insertHandler && activeDoc.syntax && (
                      <button
                        type="button"
                        onClick={() => {
                          insertHandler(activeDoc.syntax || activeDoc.name);
                          onClose();
                        }}
                        className="sm:hidden min-h-[44px] flex-1 px-3 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Insertar en Editor</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className="hidden sm:inline-flex min-h-[40px] px-4 py-2 bg-white hover:bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#111827] cursor-pointer"
                    >
                      Cerrar Manual
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#6B7280] text-xs">
                Selecciona un comando de la lista para ver su explicación y ejemplo.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
