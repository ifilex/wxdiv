import { BlockCategory, BlockInstance, AppInventorComponent, MediaAsset } from "./types";

export interface CategoryInfo {
  id: BlockCategory;
  name: string;
  color: string;
  darkColor: string;
  icon?: string;
}

export const MIT_CATEGORIES: CategoryInfo[] = [
  { id: "Control", name: "Control", color: "#e59b20", darkColor: "#b8750d" },
  { id: "Logic", name: "Logic", color: "#5da048", darkColor: "#427830" },
  { id: "Math", name: "Math", color: "#3f71c4", darkColor: "#2a5499" },
  { id: "Text", name: "Text", color: "#c44078", darkColor: "#9c2a5a" },
  { id: "Lists", name: "Lists", color: "#49a6cb", darkColor: "#2f7b99" },
  { id: "Dictionaries", name: "Dictionaries", color: "#455a64", darkColor: "#263238" },
  { id: "Colors", name: "Colors", color: "#8492a6", darkColor: "#57606f" },
  { id: "Variables", name: "Variables", color: "#d35400", darkColor: "#a04000" },
  { id: "Procedures", name: "Procedures", color: "#7b3da1", darkColor: "#592778" },
];

export const DEFAULT_COMPONENTS: AppInventorComponent[] = [
  {
    id: "Screen1",
    name: "Screen1",
    type: "Screen",
    icon: "📱",
    properties: { Title: "Screen1", BackgroundColor: "#ffffff" },
    events: ["Initialize", "TouchDown", "BackPressed", "GameLoop", "ErrorOccurred", "PermissionGranted"],
    methods: ["ShowAlert", "OpenAnotherScreen", "CloseScreen", "AskForPermission"],
    setters: ["Title", "BackgroundColor", "ScreenOrientation", "Scrollable", "AboutScreen"],
    getters: ["Title", "BackgroundColor", "Width", "Height", "ScreenOrientation"],
  },
  {
    id: "Canvas1",
    name: "Canvas1",
    type: "Canvas",
    icon: "🎨",
    properties: { Width: 640, Height: 480, BackgroundColor: "#000000" },
    events: ["TouchDown", "Dragged", "Flung", "TouchUp"],
    methods: ["DrawCircle", "DrawLine", "DrawText", "GetBackgroundPixelColor", "Clear", "Save"],
    setters: ["Width", "Height", "PaintColor", "LineWidth", "BackgroundColor", "BackgroundImage"],
    getters: ["Width", "Height", "PaintColor", "BackgroundColor"],
  },
  {
    id: "Player1",
    name: "Player1",
    type: "Player",
    icon: "🚀",
    properties: { X: 320, Y: 400, Speed: 6, Enabled: true, Graph: 1 },
    events: ["CollidedWith", "EdgeReached", "NoLongerCollidingWith"],
    methods: ["MoveTo", "Bounce", "PointToPoint"],
    setters: ["X", "Y", "Speed", "Heading", "Enabled", "Graph", "Visible", "Z"],
    getters: ["X", "Y", "Width", "Height", "Speed", "Heading", "Enabled", "Visible"],
  },
  {
    id: "Exit",
    name: "Exit",
    type: "Enemy",
    icon: "🚩",
    properties: { X: 580, Y: 40, Enabled: true, Visible: true, Graph: 2 },
    events: ["CollidedWith", "EdgeReached"],
    methods: ["MoveTo", "PointInDirection", "Bounce"],
    setters: ["X", "Y", "Enabled", "Visible", "Picture", "Width", "Height"],
    getters: ["X", "Y", "Enabled", "Visible", "Width", "Height"],
  },
  {
    id: "Random_maze",
    name: "Random_maze",
    type: "Enemy",
    icon: "🧱",
    properties: { WallColor: "#333333", Enabled: true, Visible: true, Complexity: 10 },
    events: ["CollidedWith", "MazeGenerated"],
    methods: ["GenerateMaze", "ResetMaze", "SetWallTile", "ClearWalls"],
    setters: ["WallColor", "Enabled", "Visible", "Complexity", "GridSize"],
    getters: ["WallColor", "Enabled", "Visible", "Complexity"],
  },
  {
    id: "Time_showing",
    name: "Time_showing",
    type: "Clock",
    icon: "⏱️",
    properties: { TimerInterval: 1000, TimerEnabled: true },
    events: ["Timer"],
    methods: ["Now"],
    setters: ["TimerInterval", "TimerEnabled"],
    getters: ["TimerInterval", "TimerEnabled"],
  },
  {
    id: "Sound1",
    name: "Sound1",
    type: "Sound",
    icon: "🔊",
    properties: { MinimumInterval: 200 },
    events: [],
    methods: ["Play", "Vibrate"],
    setters: ["Source"],
    getters: ["Source"],
  },
];

export const DEFAULT_MEDIA_ASSETS: MediaAsset[] = [
  { name: "exit.png", type: "image" },
  { name: "maze.png", type: "image" },
  { name: "maze2.png", type: "image" },
  { name: "player.png", type: "image" },
  { name: "coin.wav", type: "sound" },
  { name: "laser.wav", type: "sound" },
];

/**
 * Pre-crea un grafo inicial de bloques basado en la captura del usuario (MazeGame_2C_07)
 */
export function getInitialAppInventorBlocks(): BlockInstance[] {
  return [
    // 1. Procedimiento touch_colour
    {
      id: "proc_touch_colour",
      type: "procedure_defnoreturn",
      category: "Procedures",
      shape: "procedure",
      color: "#7b3da1",
      title: "to touch_colour",
      x: 520,
      y: 60,
      inputs: [
        { id: "body", name: "do", type: "statement", connectedBlockId: "eval_bg_color" }
      ],
      fields: { name: "touch_colour" },
    },
    {
      id: "eval_bg_color",
      type: "evaluate_ignore_result",
      category: "Control",
      shape: "c-block",
      color: "#e59b20",
      title: "evaluate but ignore result",
      x: 540,
      y: 110,
      inputs: [
        { id: "expr", name: "expression", type: "value", connectedBlockId: "call_get_bg_pixel" }
      ],
      fields: {},
      parentSlotId: "body",
    },
    {
      id: "call_get_bg_pixel",
      type: "component_call",
      category: "ComponentCall",
      shape: "value",
      color: "#7b3da1",
      title: "call Canvas1 . GetBackgroundPixelColor",
      x: 680,
      y: 110,
      componentName: "Canvas1",
      methodName: "GetBackgroundPixelColor",
      inputs: [
        { id: "x", name: "x", type: "value", defaultValue: "Player1.X" },
        { id: "y", name: "y", type: "value", defaultValue: "Player1.Y" }
      ],
      fields: {},
    },

    // 2. Evento when Canvas1.TouchDown (x, y) do
    {
      id: "evt_touchdown",
      type: "component_event",
      category: "ComponentEvent",
      shape: "hat",
      color: "#caa128",
      title: "when Canvas1 . TouchDown",
      subtitle: "x , y",
      x: 180,
      y: 420,
      componentName: "Canvas1",
      eventName: "TouchDown",
      inputs: [
        { id: "do_slot", name: "do", type: "statement", connectedBlockId: "if_touch_direction" }
      ],
      fields: {},
    },
    {
      id: "if_touch_direction",
      type: "control_if",
      category: "Control",
      shape: "c-block",
      color: "#e59b20",
      title: "if",
      x: 200,
      y: 480,
      inputs: [
        { id: "test", name: "test", type: "value", defaultValue: "get x > Player1.X" },
        { id: "then", name: "then", type: "statement", connectedBlockId: "call_move_right" },
        { id: "else", name: "else", type: "statement", connectedBlockId: "call_move_left" }
      ],
      fields: {},
      parentSlotId: "do_slot",
    },
    {
      id: "call_move_right",
      type: "component_call",
      category: "ComponentCall",
      shape: "command",
      color: "#7b3da1",
      title: "call move_right",
      x: 220,
      y: 540,
      componentName: "Player1",
      methodName: "move_right",
      inputs: [
        { id: "step", name: "step", type: "value", defaultValue: 10 }
      ],
      fields: {},
      parentSlotId: "then",
    },
    {
      id: "call_move_left",
      type: "component_call",
      category: "ComponentCall",
      shape: "command",
      color: "#7b3da1",
      title: "call move_left",
      x: 220,
      y: 600,
      componentName: "Player1",
      methodName: "move_left",
      inputs: [
        { id: "step", name: "step", type: "value", defaultValue: 10 }
      ],
      fields: {},
      parentSlotId: "else",
    },

    // 3. Procedimiento move_right (step)
    {
      id: "proc_move_right",
      type: "procedure_defnoreturn",
      category: "Procedures",
      shape: "procedure",
      color: "#7b3da1",
      title: "to move_right (step)",
      x: 420,
      y: 530,
      inputs: [
        { id: "body", name: "do", type: "statement", connectedBlockId: "init_hit_wall" }
      ],
      fields: { name: "move_right", param: "step" },
    },
    {
      id: "init_hit_wall",
      type: "variables_init_local",
      category: "Variables",
      shape: "c-block",
      color: "#d35400",
      title: "initialize local hit_wall to false",
      x: 440,
      y: 580,
      inputs: [
        { id: "in_slot", name: "in", type: "statement", connectedBlockId: "while_move_right" }
      ],
      fields: { varName: "hit_wall", initialVal: "false" },
      parentSlotId: "body",
    },
    {
      id: "while_move_right",
      type: "control_while",
      category: "Control",
      shape: "c-block",
      color: "#e59b20",
      title: "while test not get hit_wall",
      x: 460,
      y: 630,
      inputs: [
        { id: "do_slot", name: "do", type: "statement", connectedBlockId: "player_move_step" }
      ],
      fields: {},
      parentSlotId: "in_slot",
    },
    {
      id: "player_move_step",
      type: "component_call",
      category: "ComponentCall",
      shape: "command",
      color: "#7b3da1",
      title: "call Player1 . MoveTo",
      x: 480,
      y: 680,
      componentName: "Player1",
      methodName: "MoveTo",
      inputs: [
        { id: "x", name: "x", type: "value", defaultValue: "Player1.X + get step" },
        { id: "y", name: "y", type: "value", defaultValue: "Player1.Y" }
      ],
      fields: {},
      parentSlotId: "do_slot",
    },

    // 4. Evento Player1.CollidedWith (other)
    {
      id: "evt_collided",
      type: "component_event",
      category: "ComponentEvent",
      shape: "hat",
      color: "#caa128",
      title: "when Player1 . CollidedWith",
      subtitle: "other",
      x: 180,
      y: 730,
      componentName: "Player1",
      eventName: "CollidedWith",
      inputs: [
        { id: "do_slot", name: "do", type: "statement", connectedBlockId: "if_collided_exit" }
      ],
      fields: {},
    },
    {
      id: "if_collided_exit",
      type: "control_if",
      category: "Control",
      shape: "c-block",
      color: "#e59b20",
      title: "if get other = Exit",
      x: 200,
      y: 790,
      inputs: [
        { id: "then", name: "then", type: "statement", connectedBlockId: "set_player_disabled" }
      ],
      fields: {},
      parentSlotId: "do_slot",
    },
    {
      id: "set_player_disabled",
      type: "component_set",
      category: "ComponentSetter",
      shape: "command",
      color: "#367732",
      title: "set Player1 . Enabled to false",
      x: 220,
      y: 840,
      componentName: "Player1",
      propertyName: "Enabled",
      inputs: [],
      fields: { value: "false" },
      parentSlotId: "then",
      nextBlockId: "call_end_dialog",
    },
    {
      id: "call_end_dialog",
      type: "component_call",
      category: "ComponentCall",
      shape: "command",
      color: "#c44078",
      title: "call End_game . ShowChooseDialog",
      x: 220,
      y: 890,
      componentName: "End_game",
      methodName: "ShowChooseDialog",
      inputs: [
        { id: "msg", name: "message", type: "value", defaultValue: "'You win!'" },
        { id: "title", name: "title", type: "value", defaultValue: "'Game over'" },
        { id: "btn1", name: "button1Text", type: "value", defaultValue: "'Quit'" },
        { id: "btn2", name: "button2Text", type: "value", defaultValue: "'Play again'" }
      ],
      fields: {},
    },

    // 5. Procedimiento move_down
    {
      id: "proc_move_down",
      type: "procedure_defnoreturn",
      category: "Procedures",
      shape: "procedure",
      color: "#7b3da1",
      title: "to move_down (step)",
      x: 720,
      y: 510,
      inputs: [
        { id: "body", name: "do", type: "statement" }
      ],
      fields: { name: "move_down", param: "step" },
    },

    // 6. Evento when Screen1 . Initialize
    {
      id: "evt_screen1_init",
      type: "component_event",
      category: "ComponentEvent",
      shape: "hat",
      color: "#caa128",
      title: "when Screen1 . Initialize",
      subtitle: "do",
      x: 180,
      y: 60,
      componentName: "Screen1",
      eventName: "Initialize",
      inputs: [
        { id: "do_slot", name: "do", type: "statement", connectedBlockId: "call_gen_maze" }
      ],
      fields: {},
    },
    {
      id: "call_gen_maze",
      type: "component_call",
      category: "ComponentCall",
      shape: "command",
      color: "#7b3da1",
      title: "call Random_maze . GenerateMaze",
      x: 200,
      y: 110,
      componentName: "Random_maze",
      methodName: "GenerateMaze",
      inputs: [],
      fields: {},
      parentSlotId: "do_slot",
      nextBlockId: "set_screen_title",
    },
    {
      id: "set_screen_title",
      type: "component_set",
      category: "ComponentSetter",
      shape: "command",
      color: "#367732",
      title: "set Screen1 . Title to",
      x: 200,
      y: 160,
      componentName: "Screen1",
      propertyName: "Title",
      inputs: [{ id: "val", name: "to", type: "value", defaultValue: "'Maze Game 2C'" }],
      fields: { value: "Maze Game 2C" },
      parentSlotId: "do_slot",
      nextBlockId: "call_player_start",
    },
    {
      id: "call_player_start",
      type: "component_call",
      category: "ComponentCall",
      shape: "command",
      color: "#7b3da1",
      title: "call Player1 . MoveTo",
      x: 200,
      y: 210,
      componentName: "Player1",
      methodName: "MoveTo",
      inputs: [
        { id: "x", name: "x", type: "value", defaultValue: 40 },
        { id: "y", name: "y", type: "value", defaultValue: 400 }
      ],
      fields: {},
      parentSlotId: "do_slot",
    },

    // 7. Evento when Exit . CollidedWith
    {
      id: "evt_exit_collided",
      type: "component_event",
      category: "ComponentEvent",
      shape: "hat",
      color: "#caa128",
      title: "when Exit . CollidedWith",
      subtitle: "other",
      x: 520,
      y: 280,
      componentName: "Exit",
      eventName: "CollidedWith",
      inputs: [
        { id: "do_slot", name: "do", type: "statement", connectedBlockId: "call_exit_win" }
      ],
      fields: {},
    },
    {
      id: "call_exit_win",
      type: "component_call",
      category: "ComponentCall",
      shape: "command",
      color: "#7b3da1",
      title: "call Screen1 . ShowAlert",
      x: 540,
      y: 330,
      componentName: "Screen1",
      methodName: "ShowAlert",
      inputs: [
        { id: "notice", name: "notice", type: "value", defaultValue: "'¡Has llegado a la meta EXIT! Nivel superado'" }
      ],
      fields: {},
      parentSlotId: "do_slot",
      nextBlockId: "set_exit_disabled",
    },
    {
      id: "set_exit_disabled",
      type: "component_set",
      category: "ComponentSetter",
      shape: "command",
      color: "#367732",
      title: "set Exit . Enabled to false",
      x: 540,
      y: 380,
      componentName: "Exit",
      propertyName: "Enabled",
      inputs: [],
      fields: { value: "false" },
      parentSlotId: "do_slot",
    },

    // 8. Evento when Random_maze . CollidedWith
    {
      id: "evt_maze_collided",
      type: "component_event",
      category: "ComponentEvent",
      shape: "hat",
      color: "#caa128",
      title: "when Random_maze . CollidedWith",
      subtitle: "other",
      x: 720,
      y: 60,
      componentName: "Random_maze",
      eventName: "CollidedWith",
      inputs: [
        { id: "do_slot", name: "do", type: "statement", connectedBlockId: "call_player_bounce" }
      ],
      fields: {},
    },
    {
      id: "call_player_bounce",
      type: "component_call",
      category: "ComponentCall",
      shape: "command",
      color: "#7b3da1",
      title: "call Player1 . Bounce",
      x: 740,
      y: 110,
      componentName: "Player1",
      methodName: "Bounce",
      inputs: [
        { id: "edge", name: "edge", type: "value", defaultValue: -1 }
      ],
      fields: {},
      parentSlotId: "do_slot",
      nextBlockId: "call_sound_hit",
    },
    {
      id: "call_sound_hit",
      type: "component_call",
      category: "ComponentCall",
      shape: "command",
      color: "#7b3da1",
      title: "call Sound1 . Play",
      x: 740,
      y: 160,
      componentName: "Sound1",
      methodName: "Play",
      inputs: [],
      fields: {},
      parentSlotId: "do_slot",
    },

    // 9. Declaración de Texto (STRING para motor DIV)
    {
      id: "init_global_text_msg",
      type: "variables_text_init",
      category: "Text",
      shape: "command",
      color: "#c44078",
      title: "initialize global mensaje_bienvenida to",
      subtitle: '"¡Bienvenido al Laberinto DIV!"',
      x: 940,
      y: 60,
      varName: "mensaje_bienvenida",
      dataStructureType: "text",
      fields: { text: "¡Bienvenido al Laberinto DIV!", value: '"¡Bienvenido al Laberinto DIV!"' },
      inlineValues: [{ label: "str", value: '"¡Bienvenido al Laberinto DIV!"', color: "#c44078" }],
      inputs: [],
    },

    // 10. Declaración de Lista (ARRAY para motor DIV)
    {
      id: "init_global_items_list",
      type: "variables_list_init",
      category: "Lists",
      shape: "command",
      color: "#49a6cb",
      title: "initialize global inventario_items to",
      subtitle: "[Llave_Azul, Pocion_Vida, Mapa_3D]",
      x: 940,
      y: 120,
      varName: "inventario_items",
      dataStructureType: "list",
      listItems: ["Llave_Azul", "Pocion_Vida", "Mapa_3D"],
      fields: { items: ["Llave_Azul", "Pocion_Vida", "Mapa_3D"], value: '["Llave_Azul", "Pocion_Vida", "Mapa_3D"]' },
      inlineValues: [{ label: "list[3]", value: "Llave_Azul, Pocion_Vida...", color: "#49a6cb" }],
      inputs: [],
    },

    // 11. Declaración de Diccionario (STRUCT para motor DIV)
    {
      id: "init_global_dict_stats",
      type: "variables_dict_init",
      category: "Dictionaries",
      shape: "command",
      color: "#455a64",
      title: "initialize global stats_jugador to",
      subtitle: "{hp: 100, velocidad: 6}",
      x: 940,
      y: 180,
      varName: "stats_jugador",
      dataStructureType: "dictionary",
      dictPairs: [
        { key: "hp", value: "100" },
        { key: "velocidad", value: "6" },
      ],
      fields: {
        pairs: [
          { key: "hp", value: "100" },
          { key: "velocidad", value: "6" },
        ],
        value: "{hp: 100, velocidad: 6}",
      },
      inlineValues: [{ label: "dict", value: "hp: 100, velocidad: 6", color: "#455a64" }],
      inputs: [],
    },

    // 12. Declaración de Color (RGB nativo para motor DIV)
    {
      id: "init_global_color_fondo",
      type: "variables_color_init",
      category: "Colors",
      shape: "command",
      color: "#8492a6",
      title: "initialize global color_laberinto to",
      subtitle: "rgb(12, 18, 32)",
      x: 940,
      y: 240,
      varName: "color_laberinto",
      dataStructureType: "color",
      colorHex: "#0c1220",
      colorRgb: { r: 12, g: 18, b: 32 },
      fields: { color: "#0c1220", value: "rgb(12, 18, 32)" },
      inlineValues: [{ label: "rgb", value: "12,18,32", color: "#0c1220" }],
      inputs: [],
    },
  ];
}
