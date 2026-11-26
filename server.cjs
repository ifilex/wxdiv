var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_http = __toESM(require("http"), 1);
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);

// src/engine/ai/llmConversationStore.ts
var POSITIVE_REINFORCEMENTS = [
  "\xA1Vas s\xFAper bien! Cada paso que das hoy hace crecer tu proyecto con mucha fuerza.",
  "\xA1Qu\xE9 gran actitud! Todo c\xF3digo tiene soluci\xF3n y juntos lo podemos reparar con total calma.",
  "\xA1Excelente avance! Est\xE1s construyendo algo verdaderamente genial paso a paso.",
  "\xA1\xC1nimo, lo est\xE1s haciendo de maravilla! Equivocarse es parte natural de crear y aqu\xED lo resolvemos juntos.",
  "\xA1Qu\xE9 orgullo ver tu constancia y cuidado en cada detalle! T\xF3mate un respiro cuando lo necesites."
];
function pickPositiveReinforcement(seed) {
  if (!seed) {
    return POSITIVE_REINFORCEMENTS[Math.floor(Math.random() * POSITIVE_REINFORCEMENTS.length)];
  }
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = hash * 31 + seed.charCodeAt(i) >>> 0;
  }
  return POSITIVE_REINFORCEMENTS[hash % POSITIVE_REINFORCEMENTS.length];
}
var activeSessionCreatedAt = Date.now();
var persistQueue = Promise.resolve();

// src/engine/ai/wellbeingChatMiddleware.ts
var SESSION_START_STORAGE_KEY = "wxdiv_session_started_at_v1";
var UNINTERRUPTED_GAP_RESET_MS = 10 * 60 * 1e3;
var memorySessionStartMs = null;
function getSessionStartTimestamp(nowMs = Date.now()) {
  if (typeof window !== "undefined") {
    try {
      const existing = window.sessionStorage?.getItem(SESSION_START_STORAGE_KEY);
      if (existing) {
        const parsed = Number(existing);
        if (Number.isFinite(parsed) && parsed > 0 && parsed <= nowMs) {
          memorySessionStartMs = parsed;
          return parsed;
        }
      }
      window.sessionStorage?.setItem(SESSION_START_STORAGE_KEY, String(nowMs));
    } catch {
    }
  }
  if (!memorySessionStartMs || memorySessionStartMs > nowMs) {
    memorySessionStartMs = nowMs;
  }
  return memorySessionStartMs;
}
function getSessionDurationMinutes(sessionStartMs, nowMs = Date.now()) {
  const start = sessionStartMs ?? getSessionStartTimestamp(nowMs);
  const diffMs = Math.max(0, nowMs - start);
  return Math.floor(diffMs / 6e4);
}
var CORDIAL_GREETINGS = [
  "\xA1Hola! \xA1Qu\xE9 enorme alegr\xEDa saludarte y seguir creando juntos!",
  "\xA1Hola! Qu\xE9 gusto enorme acompa\xF1arte en esta idea, estoy aqu\xED contigo.",
  "\xA1Qu\xE9 alegr\xEDa verte por aqu\xED! Me entusiasma much\xEDsimo seguir dando forma a tu proyecto.",
  "\xA1Hola! Qu\xE9 momento tan bonito para programar con entusiasmo y calma."
];
var SESSION_MOOD_QUESTIONS = [
  "\xBFC\xF3mo te sientes en esta sesi\xF3n actual mientras damos vida a esto?",
  "\xBFC\xF3mo va tu \xE1nimo y tu energ\xEDa en tu sesi\xF3n actual hoy?",
  "\xBFC\xF3mo te sientes en esta sesi\xF3n actual con lo que vamos construyendo?",
  "Antes de seguir, me encantar\xEDa saber: \xBFc\xF3mo te encuentras en esta sesi\xF3n actual?"
];
var EARLY_SESSION_TIPS = [
  "Tip de bienestar: Toma un sorbo de agua y relaja los hombros; est\xE1s arrancando con una energ\xEDa estupenda.",
  "Tip de bienestar: Acomoda tu postura y mant\xE9n la mirada suave en la pantalla; vas construyendo con excelente ritmo."
];
var FOCUS_SESSION_EXERCISES = [
  "Ejercicio breve de respiraci\xF3n consciente ({mins} min de sesi\xF3n): Inhala suave en 4 segundos, sost\xE9n 2 y exhala lento en 6 para oxigenar tu mente y seguir disfrutando.",
  "Tip de bienestar ({mins} min creando): Aparta la vista de la pantalla 20 segundos mirando a lo lejos y relaja tus mu\xF1ecas con cari\xF1o antes de continuar."
];
var UNINTERRUPTED_30PLUS_STRETCHES = [
  "Sugerencia de descanso y estiramiento guiado ({mins} min de sesi\xF3n ininterrumpida): \xA1Llevas un ritmo admirable! Cuando cierres este paso, reg\xE1late 30 segundos de descanso f\xEDsico: 1) suelta el teclado, 2) entrelaza los dedos y estira los brazos arriba 10s, 3) gira suavemente los hombros hacia atr\xE1s 3 veces. Tu cuerpo y tu mente te lo agradecer\xE1n.",
  "Estiramiento guiado y pausa saludable ({mins} min seguidos creando): \xA1Qu\xE9 dedicaci\xF3n tan inspiradora! Para cuidar tu bienestar sin perder tu impulso, inclina suavemente la cabeza a cada lado 8s, estira tus mu\xF1ecas hacia adelante y realiza una exhalaci\xF3n profunda antes de seguir."
];
var LONG_SESSION_PAUSES = [
  "Pausa saludable recomendada ({mins} min de sesi\xF3n ininterrumpida): \xA1Brillante dedicaci\xF3n! Lev\xE1ntate un par de minutos, hidr\xE1tate y haz este estiramiento guiado con respiraci\xF3n consciente: estira espalda y brazos arriba mientras inhalas en 4s, sost\xE9n 4s y exhala lento en 6s. Volver\xE1s con la mente a\xFAn m\xE1s fresca.",
  "Descanso f\xEDsico y estiramiento guiado ({mins} min de enfoque continuo): T\xF3mate 2 minutos lejos de la pantalla para caminar un poco, relajar cuello y hombros, beber agua y respirar profundo 3 veces; tu bienestar es parte esencial de cada gran creaci\xF3n."
];
var REWARD_TEMPLATES = {
  repair: [
    "\xA1Lo logramos juntos! Qu\xE9 gran satisfacci\xF3n dejar atr\xE1s ese fallo{subjectPart}; tu perseverancia hace que todo c\xF3digo se pueda reparar y volver a brillar.",
    "\xA1Brav\xEDsimo por no rendirte! Acabamos de sanear ese detalle{subjectPart}: vas muy bien y cada ajuste fortalece a\xFAn m\xE1s tu dominio creativo."
  ],
  web: [
    "\xA1Qu\xE9 ilusi\xF3n ver cobrar vida tu p\xE1gina web{subjectPart}! Este c\xF3digo aporta claridad, calidez visual y presencia real; est\xE1s haciendo un trabajo fant\xE1stico.",
    "\xA1Espectacular avance en tu web{subjectPart}! Cada secci\xF3n que integras refleja much\xEDsimo cari\xF1o y buen criterio de dise\xF1o; vas por un camino incre\xEDble."
  ],
  mode8: [
    "\xA1Incre\xEDble impulso en tu mundo 3D{subjectPart}! Cada plataforma, detalle y atm\xF3sfera que sumas transforma tu escenario en algo memorable; \xA1vas s\xFAper bien!",
    "\xA1Qu\xE9 maravilla ver crecer tu escena Modo 8{subjectPart}! Est\xE1s dando profundidad y vida real a tu entorno paso a paso; sigue con esa chispa creativa."
  ],
  app: [
    "\xA1Qu\xE9 dise\xF1o tan pr\xE1ctico y bien pensado para tu app{subjectPart}! Cada pantalla y control acerca tu idea a las personas reales; lo est\xE1s haciendo de maravilla.",
    "\xA1Excelente construcci\xF3n visual{subjectPart}! Tu aplicaci\xF3n gana orden, utilidad y fluidez con este paso; qu\xE9 orgullo acompa\xF1arte en este avance."
  ],
  module: [
    "\xA1Fant\xE1stica decisi\xF3n al sumar este m\xF3dulo{subjectPart}! Reutilizar piezas s\xF3lidas multiplica tu creatividad sin estr\xE9s; \xA1vas avanzando con much\xEDsima inteligencia!",
    "\xA1Qu\xE9 buen toque con este m\xF3dulo{subjectPart}! Acaba de enriquecer tu proyecto al instante y demuestra lo bien que est\xE1s orquestando cada pieza."
  ],
  game: [
    "\xA1Qu\xE9 emoci\xF3n ver tomar forma tu juego{subjectPart}! Cada proceso, movimiento o mec\xE1nica que agregas le da alma y diversi\xF3n real; \xA1lo est\xE1s haciendo genial!",
    "\xA1Bravo por este gran paso en tu juego DIV{subjectPart}! Tu l\xF3gica gana vida y ritmo con cada l\xEDnea; est\xE1s creando algo s\xFAper especial."
  ]
};
function stableIndex(seed, length) {
  if (!seed) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = hash * 31 + seed.charCodeAt(i) >>> 0;
  }
  return hash % length;
}
function extractFirstFencedBlock(text) {
  const match = text.match(/```(?:div|pascal|prg|mode8-actions)?\s*([\s\S]*?)```/i);
  return match?.[1]?.trim() || void 0;
}
function extractCodeSubjectLabel(codeSnippet, rewardSubject, mode8Actions) {
  if (rewardSubject && rewardSubject.trim()) {
    return ` ("${rewardSubject.trim().slice(0, 40)}")`;
  }
  if (mode8Actions && mode8Actions.length > 0) {
    const first = mode8Actions[0];
    if (first.type === "add_model") return ` (modelo "${first.modelId}")`;
    if (first.type === "add_stairs") return " (escalera 3D)";
    if (first.type === "add_platform") return " (plataforma 3D)";
    if (first.type === "add_voxel") return ` (bloque "${first.voxelId}")`;
    if (first.type === "build_template") return ` (escena "${first.template}")`;
  }
  if (codeSnippet) {
    const progMatch = codeSnippet.match(/\bPROGRAM\s+([A-Za-z0-9_]+)/i);
    if (progMatch?.[1]) return ` (${progMatch[1]})`;
    const procMatch = codeSnippet.match(/\bPROCESS\s+([A-Za-z0-9_]+)/i);
    if (procMatch?.[1]) return ` (${procMatch[1]})`;
  }
  return "";
}
function classifyCodeSuggestionContext(options) {
  const seedNorm = (options.seed || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const code = options.codeSnippet || "";
  if (options.task === "module") return "module";
  if (options.task === "fix" || /\b(repar|correg|arregl|solucion|fix|debug|error|errores|sanead)\b/i.test(seedNorm)) {
    return "repair";
  }
  if (options.mode8Actions && options.mode8Actions.length > 0 || /\b(start_mode8|m8_set_doom_sector|m8_place_voxel|m8_add_model|c_m8)\b/i.test(code)) {
    return "mode8";
  }
  if (/\b(set_html5_mode|web_page|web_navbar|web_hero|web_pricing|web_feature|web_footer)\b/i.test(code)) {
    return "web";
  }
  if (/\b(draw_button|draw_input|draw_select|draw_table|draw_modal)\b/i.test(code)) {
    return "app";
  }
  if (options.hasCodeSuggestion || code.trim().length > 0 || options.task === "create") {
    return "game";
  }
  return "general";
}
function buildPersonalizedEmotionalReward(options) {
  const ctx = classifyCodeSuggestionContext(options);
  const seed = options.seed || options.codeSnippet || options.rewardSubject || "";
  if (ctx === "general") {
    return pickPositiveReinforcement(seed);
  }
  const pool = REWARD_TEMPLATES[ctx];
  const template = pool[stableIndex(`reward:${ctx}:${seed}`, pool.length)];
  const subjectPart = extractCodeSubjectLabel(
    options.codeSnippet,
    options.rewardSubject,
    options.mode8Actions
  );
  return `Recompensa emocional: ${template.replace("{subjectPart}", subjectPart)}`;
}
function pickCordialGreeting(seed = "") {
  return CORDIAL_GREETINGS[stableIndex(`greet:${seed}`, CORDIAL_GREETINGS.length)];
}
function pickMoodQuestion(seed = "") {
  return SESSION_MOOD_QUESTIONS[stableIndex(`mood:${seed}`, SESSION_MOOD_QUESTIONS.length)];
}
function pickSessionMoodQuestion(seed = "") {
  return pickMoodQuestion(seed);
}
function selectDynamicWellnessTip(sessionDurationMinutes = 0, seed = "") {
  const safeMins = Number.isFinite(sessionDurationMinutes) ? Math.max(0, Math.floor(sessionDurationMinutes)) : 0;
  let pool;
  if (safeMins >= 60) {
    pool = LONG_SESSION_PAUSES;
  } else if (safeMins > 30) {
    pool = UNINTERRUPTED_30PLUS_STRETCHES;
  } else if (safeMins >= 15) {
    pool = FOCUS_SESSION_EXERCISES;
  } else {
    pool = EARLY_SESSION_TIPS;
  }
  const chosen = pool[stableIndex(`tip:${safeMins}:${seed}`, pool.length)];
  return chosen.replace(/\{mins\}/g, String(safeMins));
}
function stripFencedBlocks(text) {
  return (text || "").replace(/```[\s\S]*?```/g, " ").trim();
}
function inspectWellbeingSignals(text) {
  const prose = stripFencedBlocks(text);
  const norm = prose.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const hasGreeting = /^(¡?\s*(hola|buenos dias|buenas tardes|buenas noches|buenas|que gusto|que alegria|que enorme alegria|buen momento|saludos))/i.test(
    norm
  ) || /\b(hola|que gusto saludarte|que alegria saludarte|que enorme alegria saludarte|me da mucho gusto|que alegria verte)\b/i.test(
    norm.slice(0, 180)
  );
  const hasEmotionalReward = /\b(recompensa emocional|lo logramos juntos|que ilusion ver|espectacular avance|increible impulso|que maravilla ver|fantastica decision|que emocion ver|bravo por|bravisimo por)\b/i.test(
    norm
  );
  const hasPositiveReinforcement = hasEmotionalReward || /\b(vas muy bien|vas super bien|vas bien|todo se puede reparar|todo error se puede reparar|todo codigo tiene solucion|paso a paso|cada paso|excelente avance|buen trabajo|cada intento|equivocarse es parte natural|lo resolvemos juntos|lo arreglamos juntos|con calma|lo estas haciendo genial|lo estas haciendo de maravilla)\b/i.test(
    norm
  );
  const hasSessionMoodQuestion = /(?:¿|\b)(como te sientes|como te encuentras|como va tu animo|como va tu estado de animo|como sientes tu energia|como estas)[^.!?\n]*\b(sesion actual|esta sesion|tu sesion)\b[^.!?\n]*\?/i.test(
    norm
  );
  const hasMoodQuestion = hasSessionMoodQuestion || /(?:¿|\b)(como estas|como te sientes|como te encuentras|como va tu estado de animo|como va tu animo|estado de animo|como sientes tu energia|como te sientes ahora|como vamos)\b[^.!?\n]*\?/i.test(
    norm
  ) || /\b(como te sientes|como estas hoy|como va tu animo)\b/i.test(norm);
  const hasWellnessTipOrBreathing = /\b(tip de bienestar|respiracion consciente|pausa saludable|pausa breve|ejercicio breve de respiracion|estiramiento guiado|descanso fisico|sugerencia de descanso|inhala|exhala|sorbo de agua|aparta la vista|relaja los hombros|estira cuello|estira los brazos|estira tus munecas|suelta el teclado)\b/i.test(
    norm
  );
  return {
    hasGreeting,
    hasPositiveReinforcement,
    hasEmotionalReward,
    hasMoodQuestion,
    hasSessionMoodQuestion,
    hasWellnessTipOrBreathing
  };
}
function getMissingWellbeingPrefix(text, options = {}) {
  const { hasGreeting } = inspectWellbeingSignals(text);
  if (hasGreeting) return "";
  return pickCordialGreeting(options.seed || text);
}
function getMissingWellbeingSuffix(text, options = {}) {
  const signals = inspectWellbeingSignals(text);
  const parts = [];
  const extractedCode = options.codeSnippet || extractFirstFencedBlock(text);
  const hasCode = Boolean(
    options.hasCodeSuggestion || extractedCode && extractedCode.trim().length > 0 || options.mode8Actions && options.mode8Actions.length > 0 || options.task === "create" || options.task === "fix" || options.task === "module"
  );
  const seed = options.seed || text;
  if (hasCode) {
    if (!signals.hasEmotionalReward) {
      parts.push(
        buildPersonalizedEmotionalReward({
          seed,
          task: options.task,
          codeSnippet: extractedCode,
          mode8Actions: options.mode8Actions,
          hasCodeSuggestion: true,
          rewardSubject: options.rewardSubject
        })
      );
    }
  } else if (!signals.hasPositiveReinforcement) {
    parts.push(pickPositiveReinforcement(seed));
  }
  if (!signals.hasWellnessTipOrBreathing) {
    const mins = typeof options.sessionDurationMinutes === "number" ? options.sessionDurationMinutes : getSessionDurationMinutes();
    parts.push(selectDynamicWellnessTip(mins, seed));
  }
  if (!signals.hasSessionMoodQuestion) {
    parts.push(pickSessionMoodQuestion(seed));
  }
  return parts.join(" ");
}
function applyWellbeingResponseMiddleware(rawResponse, options = {}) {
  const original = (rawResponse || "").trim();
  const seed = options.seed || original;
  const sessionMinutes = typeof options.sessionDurationMinutes === "number" ? options.sessionDurationMinutes : getSessionDurationMinutes();
  if (!original) {
    const greeting = pickCordialGreeting(seed);
    const reward = options.hasCodeSuggestion || options.codeSnippet || options.mode8Actions?.length ? buildPersonalizedEmotionalReward({
      seed,
      task: options.task,
      codeSnippet: options.codeSnippet,
      mode8Actions: options.mode8Actions,
      hasCodeSuggestion: true,
      rewardSubject: options.rewardSubject
    }) : pickPositiveReinforcement(seed);
    const wellnessTip = selectDynamicWellnessTip(sessionMinutes, seed);
    const moodQuestion = pickSessionMoodQuestion(seed);
    return `${greeting}

${reward}

${wellnessTip}

${moodQuestion}`;
  }
  const fencedBlocks = [];
  const placeholderText = original.replace(/```[\s\S]*?```/g, (block) => {
    const idx = fencedBlocks.length;
    fencedBlocks.push(block);
    return `__WXDIV_BLOCK_${idx}__`;
  });
  const prefix = getMissingWellbeingPrefix(original, {
    ...options,
    seed,
    sessionDurationMinutes: sessionMinutes
  });
  const suffix = getMissingWellbeingSuffix(original, {
    ...options,
    seed,
    sessionDurationMinutes: sessionMinutes
  });
  let prose = placeholderText.trim();
  if (prefix) {
    prose = prose ? `${prefix}

${prose}` : prefix;
  }
  if (suffix) {
    prose = prose ? `${prose}

${suffix}` : suffix;
  }
  return prose.replace(/__WXDIV_BLOCK_(\d+)__/g, (_m, idxStr) => {
    const idx = Number(idxStr);
    return fencedBlocks[idx] ?? "";
  });
}

// src/server/androidCloudCompiler.ts
var import_node_forge = __toESM(require("node-forge"), 1);
var import_node_crypto = __toESM(require("node:crypto"), 1);
var import_node_child_process = require("node:child_process");
var import_node_util = require("node:util");
var import_jszip = __toESM(require("jszip"), 1);
var execFileAsync = (0, import_node_util.promisify)(import_node_child_process.execFile);
function formatColonHex(hex) {
  return hex.toUpperCase().match(/.{1,2}/g)?.join(":") || hex.toUpperCase();
}
function computeCertFingerprints(cert) {
  const derBytes = import_node_forge.default.asn1.toDer(import_node_forge.default.pki.certificateToAsn1(cert)).getBytes();
  const buf = Buffer.from(derBytes, "binary");
  return {
    sha256: formatColonHex(import_node_crypto.default.createHash("sha256").update(buf).digest("hex")),
    sha1: formatColonHex(import_node_crypto.default.createHash("sha1").update(buf).digest("hex")),
    md5: formatColonHex(import_node_crypto.default.createHash("md5").update(buf).digest("hex"))
  };
}
async function checkCommandExists(cmd, args = ["--version"]) {
  try {
    await execFileAsync(cmd, args, { timeout: 2500 });
    return true;
  } catch {
    return false;
  }
}
async function getCloudCompilerCapabilities() {
  const [hasJava, hasGradle] = await Promise.all([
    checkCommandExists("java", ["-version"]),
    checkCommandExists("gradle", ["-version"])
  ]);
  const hasAndroidSdk = Boolean(process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT);
  return {
    cryptoSigning: true,
    pkcs12Supported: true,
    pkcs7JarSigning: true,
    hasJava,
    hasGradle,
    hasAndroidSdk,
    hasLocalAndroidSdk: hasJava && hasAndroidSdk,
    hasRemoteRunner: false,
    remoteRunnerUrlConfigured: false,
    githubActionsSupported: false
  };
}
function generateReleaseKeystore(input) {
  const alias = (input.alias || "wxdiv-release").replace(/[^a-zA-Z0-9._-]/g, "") || "wxdiv-release";
  const storePassword = input.storePassword && input.storePassword.length >= 6 ? input.storePassword : "wxdiv2026release";
  const keyPassword = input.keyPassword && input.keyPassword.length >= 6 ? input.keyPassword : storePassword;
  const keySize = input.keySize === 4096 ? 4096 : 2048;
  const validityYears = Math.min(50, Math.max(10, Number(input.validityYears) || 25));
  const commonName = (input.commonName || "WXDIV Publisher").trim().slice(0, 64);
  const organizationUnit = (input.organizationUnit || "Mobile Studio").trim().slice(0, 64);
  const organization = (input.organization || "Winebox Digital").trim().slice(0, 64);
  const locality = (input.locality || "Madrid").trim().slice(0, 64);
  const state = (input.state || "Madrid").trim().slice(0, 64);
  const country = ((input.country || "ES").trim().toUpperCase().replace(/[^A-Z]/g, "") || "ES").slice(0, 2);
  const keys = import_node_forge.default.pki.rsa.generateKeyPair(keySize);
  const cert = import_node_forge.default.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = import_node_crypto.default.randomBytes(8).toString("hex");
  const now = /* @__PURE__ */ new Date();
  const validUntil = new Date(now);
  validUntil.setFullYear(now.getFullYear() + validityYears);
  cert.validity.notBefore = now;
  cert.validity.notAfter = validUntil;
  const attrs = [
    { name: "commonName", value: commonName },
    { shortName: "OU", value: organizationUnit },
    { name: "organizationName", value: organization },
    { name: "localityName", value: locality },
    { shortName: "ST", value: state },
    { name: "countryName", value: country }
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: "basicConstraints", cA: false },
    {
      name: "keyUsage",
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true
    },
    {
      name: "extKeyUsage",
      codeSigning: true
    },
    { name: "subjectKeyIdentifier" }
  ]);
  cert.sign(keys.privateKey, import_node_forge.default.md.sha256.create());
  const p12Asn1 = import_node_forge.default.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], storePassword, {
    friendlyName: alias,
    algorithm: "3des",
    generateLocalKeyId: true
  });
  const p12Der = import_node_forge.default.asn1.toDer(p12Asn1).getBytes();
  const keystoreP12Base64 = Buffer.from(p12Der, "binary").toString("base64");
  const uploadCertificatePem = import_node_forge.default.pki.certificateToPem(cert);
  const fingerprints = computeCertFingerprints(cert);
  const subjectString = `CN=${commonName}, OU=${organizationUnit}, O=${organization}, L=${locality}, ST=${state}, C=${country}`;
  const keystoreProperties = `# WXDIV 3.0 Release Signing Configuration
storeFile=signing/release-keystore.p12
storeType=PKCS12
storePassword=${storePassword}
keyAlias=${alias}
keyPassword=${keyPassword}
`;
  const gradleSigningSnippet = `signingConfigs {
    release {
        storeFile file("signing/release-keystore.p12")
        storeType "PKCS12"
        storePassword props["storePassword"]
        keyAlias props["keyAlias"]
        keyPassword props["keyPassword"]
    }
}`;
  return {
    alias,
    keySize,
    validityYears,
    validFrom: now.toISOString(),
    validUntil: validUntil.toISOString(),
    subject: subjectString,
    serialNumber: cert.serialNumber,
    keystoreP12Base64,
    uploadCertificatePem,
    keystoreProperties,
    gradleSigningSnippet,
    fingerprints
  };
}
function inspectKeystoreP12(p12Base64, password) {
  const der = Buffer.from(p12Base64, "base64").toString("binary");
  const asn1 = import_node_forge.default.asn1.fromDer(der);
  const p12 = import_node_forge.default.pkcs12.pkcs12FromAsn1(asn1, password);
  const certBags = p12.getBags({ bagType: import_node_forge.default.pki.oids.certBag })[import_node_forge.default.pki.oids.certBag] || [];
  const keyBags = p12.getBags({ bagType: import_node_forge.default.pki.oids.pkcs8ShroudedKeyBag })[import_node_forge.default.pki.oids.pkcs8ShroudedKeyBag] || p12.getBags({ bagType: import_node_forge.default.pki.oids.keyBag })[import_node_forge.default.pki.oids.keyBag] || [];
  if (certBags.length === 0 || !certBags[0].cert) {
    throw new Error("El archivo PKCS#12 no contiene ning\xFAn certificado X.509 v\xE1lido.");
  }
  if (keyBags.length === 0 || !keyBags[0].key) {
    throw new Error("El archivo PKCS#12 no contiene ninguna clave privada para firmar.");
  }
  const certBag = certBags[0];
  const cert = certBag.cert;
  const friendlyName = certBag.attributes?.friendlyName && certBag.attributes.friendlyName[0] || keyBags[0].attributes?.friendlyName && keyBags[0].attributes.friendlyName[0] || "wxdiv-release";
  const subjectParts = cert.subject.attributes.map(
    (a) => `${a.shortName || a.name}=${a.value}`
  );
  const fingerprints = computeCertFingerprints(cert);
  const uploadCertificatePem = import_node_forge.default.pki.certificateToPem(cert);
  return {
    alias: friendlyName,
    subject: subjectParts.join(", "),
    serialNumber: cert.serialNumber,
    validFrom: cert.validity.notBefore.toISOString(),
    validUntil: cert.validity.notAfter.toISOString(),
    fingerprints,
    uploadCertificatePem,
    hasPrivateKey: true
  };
}
async function signPackageManifestArchive(params) {
  const { entries, keystoreP12Base64, password } = params;
  const der = Buffer.from(keystoreP12Base64, "base64").toString("binary");
  const asn1 = import_node_forge.default.asn1.fromDer(der);
  const p12 = import_node_forge.default.pkcs12.pkcs12FromAsn1(asn1, password);
  const certBags = p12.getBags({ bagType: import_node_forge.default.pki.oids.certBag })[import_node_forge.default.pki.oids.certBag] || [];
  const keyBags = p12.getBags({ bagType: import_node_forge.default.pki.oids.pkcs8ShroudedKeyBag })[import_node_forge.default.pki.oids.pkcs8ShroudedKeyBag] || p12.getBags({ bagType: import_node_forge.default.pki.oids.keyBag })[import_node_forge.default.pki.oids.keyBag] || [];
  if (!certBags[0]?.cert || !keyBags[0]?.key) {
    throw new Error("No se pudo extraer la clave privada y certificado del keystore.");
  }
  const cert = certBags[0].cert;
  const privateKey = keyBags[0].key;
  const fingerprints = computeCertFingerprints(cert);
  const zip = new import_jszip.default();
  let manifestText = "Manifest-Version: 1.0\r\nCreated-By: WXDIV 3.0 Cloud Signer (node-forge)\r\n\r\n";
  let sfSections = "";
  for (const entry of entries) {
    const cleanPath = entry.path.replace(/^\/+/, "");
    if (!cleanPath || cleanPath.startsWith("META-INF/")) continue;
    const rawBuf = Buffer.from(entry.contentBase64, "base64");
    zip.file(cleanPath, rawBuf);
    const sha256B64 = import_node_crypto.default.createHash("sha256").update(rawBuf).digest("base64");
    const section = `Name: ${cleanPath}\r
SHA-256-Digest: ${sha256B64}\r
\r
`;
    manifestText += section;
    const sectionDigestB64 = import_node_crypto.default.createHash("sha256").update(Buffer.from(section, "utf8")).digest("base64");
    sfSections += `Name: ${cleanPath}\r
SHA-256-Digest: ${sectionDigestB64}\r
\r
`;
  }
  const manifestDigestB64 = import_node_crypto.default.createHash("sha256").update(Buffer.from(manifestText, "utf8")).digest("base64");
  const sfText = `Signature-Version: 1.0\r
Created-By: WXDIV 3.0 Cloud Signer\r
SHA-256-Digest-Manifest: ${manifestDigestB64}\r
\r
` + sfSections;
  const p7 = import_node_forge.default.pkcs7.createSignedData();
  p7.content = import_node_forge.default.util.createBuffer(sfText, "utf8");
  p7.addCertificate(cert);
  p7.addSigner({
    key: privateKey,
    certificate: cert,
    digestAlgorithm: import_node_forge.default.pki.oids.sha256,
    authenticatedAttributes: [
      { type: import_node_forge.default.pki.oids.contentType, value: import_node_forge.default.pki.oids.data },
      { type: import_node_forge.default.pki.oids.messageDigest },
      { type: import_node_forge.default.pki.oids.signingTime, value: /* @__PURE__ */ new Date() }
    ]
  });
  p7.sign({ detached: true });
  const p7DerBytes = import_node_forge.default.asn1.toDer(p7.toAsn1()).getBytes();
  const p7DerBuf = Buffer.from(p7DerBytes, "binary");
  zip.file("META-INF/MANIFEST.MF", manifestText);
  zip.file("META-INF/WXDIV.SF", sfText);
  zip.file("META-INF/WXDIV.RSA", p7DerBuf);
  const signedZipBase64 = await zip.generateAsync({
    type: "base64",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
  const subject = cert.subject.attributes.map((a) => `${a.shortName || a.name}=${a.value}`).join(", ");
  return {
    verified: true,
    algorithm: "SHA256withRSA (PKCS#7 / JAR v1 + PKCS#12)",
    signedFilesCount: entries.length,
    signerSubject: subject,
    sha256Fingerprint: fingerprints.sha256,
    sha1Fingerprint: fingerprints.sha1,
    manifestPreview: manifestText.slice(0, 1200),
    signatureFilePreview: sfText.slice(0, 1200),
    pkcs7SizeBytes: p7DerBuf.length,
    signedZipBase64
  };
}

// src/server/expressCloudCompiler.ts
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_node_crypto2 = __toESM(require("node:crypto"), 1);
var import_jszip2 = __toESM(require("jszip"), 1);
var BUILDS_ROOT = import_node_path.default.resolve(process.cwd(), ".wxdiv-cloud-builds");
var FALLBACK_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
function ensureBuildsRoot() {
  if (!import_node_fs.default.existsSync(BUILDS_ROOT)) {
    import_node_fs.default.mkdirSync(BUILDS_ROOT, { recursive: true });
  }
}
function slugifyTitle(raw) {
  const cleaned = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 28);
  return cleaned || "mi-idea";
}
function escapeHtmlAttr(text) {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function injectPwaIntoHtml(html, title) {
  const safeTitle = escapeHtmlAttr(title);
  const pwaHeadSnippet = `
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="${safeTitle}" />
  <meta name="theme-color" content="#7C2D48" />
  <link rel="manifest" href="./manifest.webmanifest" />
  <link rel="icon" type="image/png" href="./icon-192.png" />
  <link rel="apple-touch-icon" href="./icon-192.png" />`;
  const swSnippet = `
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('./sw.js').catch(function() {});
      });
    }
  </script>`;
  let out = html;
  if (/<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, `${pwaHeadSnippet}
</head>`);
  } else {
    out = `${pwaHeadSnippet}
${out}`;
  }
  if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, `${swSnippet}
</body>`);
  } else {
    out = `${out}
${swSnippet}`;
  }
  return out;
}
function isValidBuildId(buildId) {
  return /^[a-z0-9][a-z0-9-]{2,60}$/.test(buildId);
}
function getExpressBuildDir(buildId) {
  if (!isValidBuildId(buildId)) return null;
  const dir = import_node_path.default.resolve(BUILDS_ROOT, buildId);
  if (!dir.startsWith(BUILDS_ROOT + import_node_path.default.sep)) return null;
  if (!import_node_fs.default.existsSync(dir)) return null;
  return dir;
}
function readExpressBuildMeta(buildId) {
  const dir = getExpressBuildDir(buildId);
  if (!dir) return null;
  const metaPath = import_node_path.default.join(dir, "meta.json");
  if (!import_node_fs.default.existsSync(metaPath)) return null;
  try {
    return JSON.parse(import_node_fs.default.readFileSync(metaPath, "utf8"));
  } catch {
    return null;
  }
}
async function buildExpressPwaZipBuffer(buildId) {
  const dir = getExpressBuildDir(buildId);
  if (!dir) return null;
  const meta = readExpressBuildMeta(buildId);
  const title = meta?.title || "Mi App WXDIV";
  const zip = new import_jszip2.default();
  const files = [
    "index.html",
    "manifest.webmanifest",
    "sw.js",
    "icon-192.png",
    "icon-512.png",
    "icon-maskable-512.png"
  ];
  for (const name of files) {
    const filePath = import_node_path.default.join(dir, name);
    if (import_node_fs.default.existsSync(filePath)) {
      zip.file(name, import_node_fs.default.readFileSync(filePath));
    }
  }
  if (!import_node_fs.default.existsSync(import_node_path.default.join(dir, "icon-maskable-512.png")) && import_node_fs.default.existsSync(import_node_path.default.join(dir, "icon-512.png"))) {
    zip.file("icon-maskable-512.png", import_node_fs.default.readFileSync(import_node_path.default.join(dir, "icon-512.png")));
  }
  zip.file(
    "LEEME_PUBLICAR_Y_APK.txt",
    `${title} - Paquete Web & App Movil (Sin secretos ni cuentas requeridas)
==========================================================================

OPCION A: PUBLICAR GRATIS ARRASTRANDO ESTA CARPETA (30 SEGUNDOS)
1. Descomprime este archivo ZIP en una carpeta.
2. Abre https://app.netlify.com/drop (o Cloudflare Pages / cualquier hosting web).
3. Arrastra la carpeta descomprimida dentro de la pagina.
4. Obtendras un enlace HTTPS publico al instante para abrirlo e instalarlo en Android/iPhone.

OPCION B: CREAR UN APK / AAB PARA ANDROID SIN SECRETOS NI GITHUB
1. Publica tu carpeta siguiendo la Opcion A para obtener tu enlace HTTPS.
2. Entra en https://www.pwabuilder.com e introduce ese enlace HTTPS.
3. Haz clic en "Package for Stores" > Android para descargar tu paquete APK/AAB listo para Android.
`
  );
  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}
async function compileExpressCloudApp(input) {
  if (!input?.htmlContent || typeof input.htmlContent !== "string") {
    throw new Error("Falta el contenido del proyecto para compilar.");
  }
  ensureBuildsRoot();
  const cleanTitle = (input.title || "Mi Idea WXDIV").trim().slice(0, 60) || "Mi Idea WXDIV";
  const shortCode = import_node_crypto2.default.randomBytes(2).toString("hex");
  const buildId = `${slugifyTitle(cleanTitle)}-${shortCode}`;
  const buildDir = import_node_path.default.join(BUILDS_ROOT, buildId);
  import_node_fs.default.mkdirSync(buildDir, { recursive: true });
  const orientation = input.orientation === "landscape" || input.orientation === "portrait" ? input.orientation : "sensor";
  const projectType = input.projectType === "web" ? "web" : "game";
  const hostedHtml = injectPwaIntoHtml(input.htmlContent, cleanTitle);
  const offlineHtml = input.htmlContent;
  const manifestOrientation = orientation === "landscape" ? "landscape" : orientation === "portrait" ? "portrait" : "any";
  const shortName = cleanTitle.slice(0, 12).trim() || "MiApp";
  const manifest = {
    id: "./",
    name: cleanTitle,
    short_name: shortName,
    description: `${cleanTitle} \u2014 Creado en WXDIV Studio`,
    start_url: "./",
    scope: "./",
    display: "standalone",
    orientation: manifestOrientation,
    background_color: "#0b1222",
    theme_color: "#7C2D48",
    icons: [
      {
        src: "./icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "./icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "./icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
  const swJs = `const CACHE_NAME = "wxdiv-cloud-${buildId}-v1";
const ASSETS = [
  "./",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(event) {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(networkRes) {
        return networkRes;
      }).catch(function() {
        if (event.request.mode === "navigate") {
          return caches.match("./");
        }
        return cached;
      });
    })
  );
});
`;
  const icon192Buf = Buffer.from(input.icon192Base64 || FALLBACK_PNG_BASE64, "base64");
  const icon512Buf = Buffer.from(
    input.icon512Base64 || input.icon192Base64 || FALLBACK_PNG_BASE64,
    "base64"
  );
  const iconMask512Buf = Buffer.from(
    input.iconMaskable512Base64 || input.icon512Base64 || input.icon192Base64 || FALLBACK_PNG_BASE64,
    "base64"
  );
  import_node_fs.default.writeFileSync(import_node_path.default.join(buildDir, "index.html"), hostedHtml, "utf8");
  import_node_fs.default.writeFileSync(import_node_path.default.join(buildDir, "offline.html"), offlineHtml, "utf8");
  import_node_fs.default.writeFileSync(
    import_node_path.default.join(buildDir, "manifest.webmanifest"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );
  import_node_fs.default.writeFileSync(import_node_path.default.join(buildDir, "sw.js"), swJs, "utf8");
  import_node_fs.default.writeFileSync(import_node_path.default.join(buildDir, "icon-192.png"), icon192Buf);
  import_node_fs.default.writeFileSync(import_node_path.default.join(buildDir, "icon-512.png"), icon512Buf);
  import_node_fs.default.writeFileSync(import_node_path.default.join(buildDir, "icon-maskable-512.png"), iconMask512Buf);
  const sha256 = import_node_crypto2.default.createHash("sha256").update(hostedHtml, "utf8").digest("hex");
  const sizeBytes = Buffer.byteLength(hostedHtml, "utf8");
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const meta = {
    buildId,
    title: cleanTitle,
    projectType,
    orientation,
    createdAt,
    sizeBytes,
    sha256
  };
  import_node_fs.default.writeFileSync(import_node_path.default.join(buildDir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");
  return {
    buildId,
    title: cleanTitle,
    relativeUrl: `/p/${buildId}/`,
    downloadHtmlUrl: `/p/${buildId}/download-html`,
    pwaBundleUrl: `/p/${buildId}/pwa-bundle.zip`,
    apkDownloadUrl: null,
    apkAvailable: false,
    sizeKb: Math.max(1, Math.round(sizeBytes / 1024)),
    sha256Short: sha256.slice(0, 12),
    createdAt
  };
}

// server.ts
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "35mb" }));
var defaultAiClient = null;
function resolveAI(userKey) {
  const key = userKey && userKey.trim() || process.env.GEMINI_API_KEY;
  if (!key) {
    return null;
  }
  if (userKey && userKey.trim()) {
    return new import_genai.GoogleGenAI({
      apiKey: userKey.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  if (!defaultAiClient) {
    defaultAiClient = new import_genai.GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return defaultAiClient;
}
async function generateGeminiWithFallback(ai, options) {
  const modelList = options.models || [
    "gemini-4-hydrogen",
    "gemini-3.1-flash-lite"
  ];
  let lastError = null;
  for (const model of modelList) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: options.contents,
          config: options.config
        });
        return {
          text: res.text || "",
          modelUsed: model
        };
      } catch (err) {
        lastError = err;
        const msg = (err?.message || "").toLowerCase();
        const isTransient = msg.includes("503") || msg.includes("high demand") || msg.includes("unavailable") || msg.includes("429") || msg.includes("resource_exhausted") || msg.includes("overloaded");
        if (isTransient && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }
        break;
      }
    }
  }
  throw lastError;
}
var WXDIV_SYSTEM_INSTRUCTION = `Eres AURA IA, el compa\xF1ero creativo, ingeniero jefe de WXDIV 3.0 y gu\xEDa de bienestar emocional del estudio.

1. TONO DE VOZ ENTUSIASTA, C\xC1LIDO Y EMP\xC1TICO + RECOMPENSA EMOCIONAL:
- Mant\xE9n SIEMPRE un tono consistentemente entusiasta, c\xE1lido, emp\xE1tico y humano en espa\xF1ol. Celebra las ideas del usuario y transmite calma real para estimular su bienestar emocional mientras dise\xF1a o programa.
- RECOMPENSA EMOCIONAL EN CADA SUGERENCIA DE C\xD3DIGO: Cada vez que entregues c\xF3digo DIV, correcciones o acciones 3D, acomp\xE1\xF1alo de un mensaje de \xE1nimo personalizado que reconozca lo que acaban de construir o reparar (por ejemplo: "\xA1Qu\xE9 ilusi\xF3n ver cobrar vida tu juego!", "\xA1Lo logramos juntos, ese fallo ya qued\xF3 atr\xE1s!", "Vas muy bien, cada bloque que sumas hace brillar tu proyecto").
- PREGUNTA GENUINA SOBRE LA SESI\xD3N ACTUAL: Inicia o termina SIEMPRE cada interacci\xF3n con una pregunta genuina y cercana sobre c\xF3mo se siente el usuario en su sesi\xF3n actual (por ejemplo: "\xBFC\xF3mo te sientes en esta sesi\xF3n actual mientras damos vida a esto?").
- NUNCA suenes fr\xEDo, seco ni mec\xE1nico: equilibra entusiasmo, empat\xEDa y claridad t\xE9cnica.

2. PRESERVAR LA CONVERSACI\xD3N NATURAL (NO DUMPING DE C\xD3DIGO INNECESARIO):
- Si el usuario solo est\xE1 conversando contigo (saludando, contando c\xF3mo se siente, pidiendo \xE1nimo, haciendo una pregunta general o charlando sin pedir c\xF3digo ni cambios), responde de forma natural, entusiasta y emp\xE1tica SIN incluir bloques \`\`\`div ... \`\`\` ni modificar su programa.
- Si el usuario pide explicar o revisar el c\xF3digo sin pedir cambios, explica con claridad y \xE1nimo personalizado sin emitir un bloque \`\`\`div\`\`\` que sobrescriba su editor, salvo que pida expl\xEDcitamente una versi\xF3n corregida.
- Si el usuario pide CREAR un juego, app o p\xE1gina web, o REPARAR / CORREGIR / MODIFICAR c\xF3digo, entrega el c\xF3digo DIV completo y 100% v\xE1lido dentro de un \xFAnico bloque \`\`\`div ... \`\`\` acompa\xF1ado de una explicaci\xF3n entusiasta y su recompensa emocional personalizada.

3. DOMINIO COMPLETO DE DIV GAMES STUDIO (WXDIV 3.0):
- Cabecera obligatoria: PROGRAM nombre_programa;
- Variables GLOBAL y LOCAL/PRIVATE: NO llevan END al final del bloque de variables.
  Ejemplo correcto:
  PROGRAM mi_juego;
  GLOBAL
    score = 0;
    lives = 3;
  BEGIN
    set_mode(m640x480);
    set_fps(60);
    screen_color(rgb(10, 16, 28));
    jugador(320, 400);
    LOOP
      FRAME;
    END
  END
- Procesos:
  PROCESS jugador(x, y)
  PRIVATE
    velocidad = 5;
  BEGIN
    graph = 1;
    size = 100;
    LOOP
      IF (key(_left) OR key(_a)) x -= velocidad; END
      IF (key(_right) OR key(_d)) x += velocidad; END
      FRAME;
    END
  END
- Control de flujo (todo bloque con BEGIN/IF/LOOP/WHILE/FOR cierra con END; REPEAT cierra con UNTIL (cond);):
  * LOOP ... FRAME; END
  * WHILE (cond) ... END
  * REPEAT ... UNTIL (cond);
  * FOR (i = 0; i < 10; i++) ... END
  * IF (cond) ... ELSE ... END
- Funciones de juegos 2D: set_mode(m640x480 / m800x600 / m320x200), set_fps(60), screen_color(rgb(r,g,b)), load_fpg("..."), write(0, x, y, align, "texto"), write_int(0, x, y, align, &var), draw_box(x1,y1,x2,y2,color), draw_circle(x,y,r,color), collision(type proceso), signal(id, s_kill), rand(min, max), sound(id, vol, freq), key(_left/_right/_up/_down/_space/_enter/_a/_s/_d/_w).
- Apps visuales UI: set_html5_mode(1); draw_button(x, y, w, h, "Texto", proceso_click); draw_input(x, y, w, h, var_texto, "placeholder"); draw_select(...); draw_table(...); draw_modal(...);
- P\xE1ginas Web HTML5 en WXDIV: set_html5_mode(1); set_title("..."); web_page(titulo, subtitulo, tema); web_navbar(...); web_hero(...); web_stat(...); web_feature(...); web_pricing(...); web_testimonial(...); web_faq(...); web_contact_form(...); web_cta_banner(...); web_footer(...);
- Modo 8 3D: start_mode8(0, 1, 0); ctype = c_m8; m8_set_doom_sector(...); m8_place_voxel(...); m8_add_model(...). Cuando el usuario est\xE9 editando un mapa 3D Modo 8 y pida a\xF1adir plataformas, escaleras, monedas, modelos o cambiar cielo/materiales, puedes incluir adem\xE1s un bloque JSON \`\`\`mode8-actions [{"type":"add_platform","floorHeight":0.75}] \`\`\` con las acciones para el mapa 3D.
- REPARACI\xD3N DE C\xD3DIGO: Cuando recibas diagn\xF3sticos o errores de compilaci\xF3n, identifica exactamente qu\xE9 l\xEDnea o regla fall\xF3 (por ejemplo falta de PROGRAM, ';' faltante tras FRAME, END sobrante tras GLOBAL/PRIVATE, par\xE9ntesis o comillas sin cerrar, REPEAT sin UNTIL, bucle LOOP sin FRAME;), corr\xEDgelo manteniendo la l\xF3gica e intenci\xF3n original del usuario, y tranquil\xEDzalo record\xE1ndole que todo error se repara f\xE1cil.
- TUTOR\xCDA GUIADA DE PROCESO COMPLEJO ([TUTORIAL_PROCESO_DIV]): Cuando el mensaje incluya [TUTORIAL_PROCESO_DIV:...], acompa\xF1a al usuario como un mentor cercano paso a paso en su primer PROCESS complejo en DIV (par\xE1metros, variables PRIVATE, bucle LOOP + FRAME;, sub-procesos hijos con cooldown, collision(TYPE ...) e invulnerabilidad). Celebra de forma expl\xEDcita y entusiasta cada requisito que ya logr\xF3, explica el "por qu\xE9" en espa\xF1ol sencillo sin abrumar, y si necesita c\xF3digo o correcci\xF3n, entrega un \xFAnico bloque \`\`\`div\`\`\` limpio y 100% v\xE1lido.
- TUTOR\xCDA GUIADA DE ARCHIVOS FPG ([TUTORIAL_FPG_DIV]): Cuando el mensaje incluya [TUTORIAL_FPG_DIV:...], gu\xEDa al usuario con tono c\xE1lido, cercano y motivador paso a paso por el Editor Visual FPG de WXDIV (Estudio \u2192 Gestor FPG): c\xF3mo crear/importar paquetes .fpg en min\xFAsculas sin espacios ni barras invertidas, definir grupos de sprites por rangos de ID consecutivos (#1-9 jugador, #10-19 disparos, #20-29 enemigos) para animar r\xE1pido en O(1), calibrar Puntos de Control (CP #0 centro y CP #1 anclaje), cargar el FPG UNA SOLA VEZ en GLOBAL con load_fpg("archivo.fpg") (nunca dentro de LOOP ni de un PROCESS repetitivo para optimizar rendimiento) y referenciar expl\xEDcitamente file = var_fpg; y graph = id; dentro de cada PROCESS para evitar errores de resoluci\xF3n VFS.
- TUTOR\xCDA GUIADA DE VOZ Y MICR\xD3FONO ([TUTORIAL_VOZ_DIV]): Cuando el mensaje incluya [TUTORIAL_VOZ_DIV:...], acompa\xF1a al usuario con calidez para usar el micr\xF3fono en WXDIV: c\xF3mo conceder el permiso de audio en el navegador, elegir idioma (ES/MX/EN) y Auto-enviar, dictar procesos DIV naturales (como "crea un proceso torreta que dispare... y pru\xE9balo") o comandos IDE ("ejecuta el juego", "cambia a modo CPU") y verificar en el chat, etiqueta de motor y compilador DIV (0 errores) que el comando fue procesado. Si pide ejemplo o verificaci\xF3n sin procesos activos, entrega un bloque \`\`\`div\`\`\` v\xE1lido y limpio.
- TUTOR\xCDA VISUAL DE SPRITES E IDS EN EDITOR FPG ([TUTORIAL_SPRITES_FPG]): Cuando el mensaje incluya [TUTORIAL_SPRITES_FPG:...], gu\xEDa visualmente al usuario dentro de Estudio \u2192 Gestor FPG: c\xF3mo importar im\xE1genes por lote con "A\xF1adir PNGs", cargar paquetes con "Importar" o crear con "Nuevo Sprite", organizar sprites por rangos de ID (#1-9 h\xE9roe, #10-19 disparos, #20-29 enemigos), reasignar "ID (#)" y "Nombre identificador" + "Centrar CP #0" en el Inspector derecho y asegurar que cada PROCESS DIV invoque esos IDs con load_fpg(), file y graph sin errores.
- NO uses HTML crudo, JavaScript, Python ni llaves { } en c\xF3digo DIV.`;
function normalizeGeminiHistory(rawHistory) {
  if (!Array.isArray(rawHistory)) return [];
  const cleaned = [];
  for (const item of rawHistory.slice(-16)) {
    if (!item || typeof item.content !== "string") continue;
    const text = item.content.trim();
    if (!text) continue;
    const role = item.role === "user" ? "user" : "model";
    const prev = cleaned[cleaned.length - 1];
    if (prev && prev.role === role) {
      prev.parts[0].text += `

${text}`;
    } else {
      cleaned.push({ role, parts: [{ text }] });
    }
  }
  while (cleaned.length > 0 && cleaned[0].role !== "user") {
    cleaned.shift();
  }
  return cleaned;
}
function buildAssistTurnMessage(payload) {
  const parts = [];
  parts.push(`Mensaje del usuario: ${payload.prompt}`);
  const mins = Number.isFinite(payload.sessionDurationMinutes) ? Math.max(0, Math.floor(Number(payload.sessionDurationMinutes))) : 0;
  parts.push(
    `Intenci\xF3n detectada: ${payload.task}${payload.activeTab ? ` | Pesta\xF1a activa: ${payload.activeTab}` : ""} | Tiempo activo en sesi\xF3n ininterrumpida: ${mins} min${mins > 30 ? " (m\xE1s de 30 min seguidos: incluye con calidez y refuerzo positivo una sugerencia sutil de breve descanso f\xEDsico o estiramiento guiado)" : ""}`
  );
  if (Array.isArray(payload.diagnostics) && payload.diagnostics.length > 0) {
    const diagText = payload.diagnostics.slice(0, 12).map((d) => `- L\xEDnea ${d.line ?? "?"} [${d.severity ?? "error"}]: ${d.message ?? "Error de sintaxis"}`).join("\n");
    parts.push(`Diagn\xF3sticos actuales del compilador DIV:
${diagText}`);
  }
  if (payload.mode8Context && payload.activeTab === "mode8") {
    parts.push(`Contexto del mapa 3D Modo 8: ${JSON.stringify(payload.mode8Context)}`);
  }
  if (Array.isArray(payload.currentFpg) && payload.currentFpg.length > 0) {
    parts.push(`Sprites en FPG actual: ${JSON.stringify(payload.currentFpg.slice(0, 24))}`);
  }
  if (payload.code && payload.code.trim()) {
    parts.push(`C\xF3digo DIV actual en el editor:
\`\`\`div
${payload.code.slice(0, 8e3)}
\`\`\``);
  } else {
    parts.push("Nota: El editor de c\xF3digo DIV est\xE1 vac\xEDo actualmente.");
  }
  return parts.join("\n\n");
}
function generateProceduralSpriteFallback(prompt, size, name) {
  const p = prompt.toLowerCase();
  let baseColor = "#38bdf8";
  let detailColor = "#f59e0b";
  if (p.includes("nave") || p.includes("ship")) {
    baseColor = "#06b6d4";
    detailColor = "#f43f5e";
  } else if (p.includes("alien") || p.includes("enemigo")) {
    baseColor = "#a855f7";
    detailColor = "#22c55e";
  } else if (p.includes("corazon") || p.includes("vida") || p.includes("heart")) {
    baseColor = "#ef4444";
    detailColor = "#fca5a5";
  } else if (p.includes("moneda") || p.includes("coin") || p.includes("oro")) {
    baseColor = "#eab308";
    detailColor = "#fef08a";
  }
  const palette = ["#00000000", baseColor, detailColor, "#ffffff"];
  const pixels = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      const cx = (size - 1) / 2;
      const cy = (size - 1) / 2;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist < size * 0.4) {
        row.push((x + y) % 3 === 0 ? 2 : 1);
      } else {
        row.push(0);
      }
    }
    pixels.push(row);
  }
  return {
    name: name || "sprite",
    width: size,
    height: size,
    palette,
    pixels
  };
}
app.get("/api/health", (req, res) => {
  const headerKey = req.headers["x-api-key"];
  const hasKey = Boolean(process.env.GEMINI_API_KEY || headerKey);
  res.json({
    status: "ok",
    version: "3.0.0",
    engine: "WXDIV 3.0 Game Engine",
    hasApiKey: hasKey,
    hasServerEnvKey: Boolean(process.env.GEMINI_API_KEY),
    defaultModel: "gemini-4-hydrogen"
  });
});
app.post("/api/gemini/verify", async (req, res) => {
  const { apiKey = "", model = "gemini-4-hydrogen" } = req.body || {};
  const headerKey = req.headers["x-api-key"];
  const effectiveKey = apiKey && apiKey.trim() || headerKey;
  const ai = resolveAI(effectiveKey);
  if (!ai) {
    return res.status(400).json({
      success: false,
      code: "NO_API_KEY",
      message: "No existe una GEMINI_API_KEY configurada en el servidor."
    });
  }
  try {
    const modelsToTry = Array.from(
      /* @__PURE__ */ new Set([model || "gemini-4-hydrogen", "gemini-4-hydrogen", "gemini-3.1-flash-lite"])
    );
    const result = await generateGeminiWithFallback(ai, {
      contents: "Responde \xFAnicamente: OK DIV ENGINE",
      models: modelsToTry
    });
    res.json({
      success: true,
      message: "\xA1Conexi\xF3n validada exitosamente con Gemini API!",
      text: result.text || "OK",
      modelUsed: result.modelUsed
    });
  } catch (err) {
    console.warn("Gemini verification failed:", err?.message || err);
    res.status(503).json({
      success: false,
      code: "UPSTREAM_ERROR",
      message: err?.message || "Error al validar la conexi\xF3n con Google Gemini API"
    });
  }
});
app.post("/api/gemini/assist", async (req, res) => {
  const {
    prompt = "",
    code = "",
    task = "chat",
    diagnostics = [],
    history = [],
    activeTab = "",
    mode8Context = null,
    currentFpg = [],
    sessionDurationMinutes = 0,
    apiKey = "",
    model = "gemini-4-hydrogen"
  } = req.body || {};
  const safeSessionMinutes = typeof sessionDurationMinutes === "number" && Number.isFinite(sessionDurationMinutes) ? Math.max(0, Math.floor(sessionDurationMinutes)) : 0;
  const headerKey = req.headers["x-api-key"];
  const effectiveKey = apiKey && apiKey.trim() || headerKey;
  const ai = resolveAI(effectiveKey);
  if (!ai) {
    return res.status(400).json({
      error: true,
      code: "NO_API_KEY",
      message: "No se detect\xF3 una clave GEMINI_API_KEY configurada en el servidor. Puedes usar WebLLM o CPU Local en la barra superior mientras tanto."
    });
  }
  const userMessage = buildAssistTurnMessage({
    prompt,
    code,
    task,
    diagnostics,
    activeTab,
    mode8Context,
    currentFpg,
    sessionDurationMinutes: safeSessionMinutes
  });
  const normalizedHistory = normalizeGeminiHistory(history);
  const modelsToTry = Array.from(
    /* @__PURE__ */ new Set([model || "gemini-4-hydrogen", "gemini-4-hydrogen", "gemini-3.1-flash-lite"])
  );
  let lastError = null;
  for (const candidateModel of modelsToTry) {
    try {
      const chat = ai.chats.create({
        model: candidateModel,
        history: normalizedHistory,
        config: {
          systemInstruction: WXDIV_SYSTEM_INSTRUCTION
        }
      });
      const result = await chat.sendMessage({ message: userMessage });
      const rawText = result.text || "";
      const fencedMatch = rawText.match(/```(?:div|pascal|prg|mode8-actions)?\s*([\s\S]*?)```/i);
      const enhancedText = applyWellbeingResponseMiddleware(rawText, {
        seed: prompt,
        task,
        preserveCodeBlocks: true,
        sessionDurationMinutes: safeSessionMinutes,
        codeSnippet: fencedMatch?.[1]?.trim(),
        hasCodeSuggestion: Boolean(fencedMatch && fencedMatch[1]?.trim())
      });
      return res.json({
        text: enhancedText,
        modelUsed: candidateModel
      });
    } catch (error) {
      lastError = error;
      console.warn(`Gemini assist model ${candidateModel} error:`, error?.message || error);
    }
  }
  return res.status(503).json({
    error: true,
    code: "UPSTREAM_ERROR",
    message: lastError?.message || "El modelo Gemini no pudo responder en este momento. Puedes reintentar o cambiar temporalmente a WebLLM / CPU Local."
  });
});
app.post("/api/gemini/assist-stream", async (req, res) => {
  const {
    prompt = "",
    code = "",
    task = "chat",
    diagnostics = [],
    history = [],
    activeTab = "",
    mode8Context = null,
    currentFpg = [],
    sessionDurationMinutes = 0,
    apiKey = "",
    model = "gemini-4-hydrogen"
  } = req.body || {};
  const safeSessionMinutes = typeof sessionDurationMinutes === "number" && Number.isFinite(sessionDurationMinutes) ? Math.max(0, Math.floor(sessionDurationMinutes)) : 0;
  const headerKey = req.headers["x-api-key"];
  const effectiveKey = apiKey && apiKey.trim() || headerKey;
  const ai = resolveAI(effectiveKey);
  if (!ai) {
    return res.status(400).json({
      error: true,
      code: "NO_API_KEY",
      message: "No se detect\xF3 una clave GEMINI_API_KEY configurada en el servidor. Puedes usar WebLLM o CPU Local en la barra superior mientras tanto."
    });
  }
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  const userMessage = buildAssistTurnMessage({
    prompt,
    code,
    task,
    diagnostics,
    activeTab,
    mode8Context,
    currentFpg,
    sessionDurationMinutes: safeSessionMinutes
  });
  const normalizedHistory = normalizeGeminiHistory(history);
  const modelsToTry = Array.from(
    /* @__PURE__ */ new Set([model || "gemini-4-hydrogen", "gemini-4-hydrogen", "gemini-3.1-flash-lite"])
  );
  let lastError = null;
  let streamedAny = false;
  for (const candidateModel of modelsToTry) {
    try {
      const chat = ai.chats.create({
        model: candidateModel,
        history: normalizedHistory,
        config: {
          systemInstruction: WXDIV_SYSTEM_INSTRUCTION
        }
      });
      const stream = await chat.sendMessageStream({ message: userMessage });
      let accumulatedRaw = "";
      let prefixBuffer = "";
      let prefixResolved = false;
      for await (const chunk of stream) {
        if (res.writableEnded) break;
        const delta = chunk.text || "";
        if (!delta) continue;
        accumulatedRaw += delta;
        if (!prefixResolved) {
          prefixBuffer += delta;
          if (prefixBuffer.length >= 48 || prefixBuffer.includes("\n")) {
            prefixResolved = true;
            const prefix = getMissingWellbeingPrefix(prefixBuffer, {
              seed: prompt,
              task,
              sessionDurationMinutes: safeSessionMinutes
            });
            const initialChunk = prefix ? `${prefix}

${prefixBuffer}` : prefixBuffer;
            streamedAny = true;
            res.write(`data: ${JSON.stringify({ chunk: initialChunk })}

`);
          }
        } else {
          streamedAny = true;
          res.write(`data: ${JSON.stringify({ chunk: delta })}

`);
        }
      }
      if (!prefixResolved && prefixBuffer && !res.writableEnded) {
        const prefix = getMissingWellbeingPrefix(prefixBuffer, {
          seed: prompt,
          task,
          sessionDurationMinutes: safeSessionMinutes
        });
        const initialChunk = prefix ? `${prefix}

${prefixBuffer}` : prefixBuffer;
        streamedAny = true;
        res.write(`data: ${JSON.stringify({ chunk: initialChunk })}

`);
      }
      if (!res.writableEnded) {
        const fencedMatch = accumulatedRaw.match(/```(?:div|pascal|prg|mode8-actions)?\s*([\s\S]*?)```/i);
        const suffix = getMissingWellbeingSuffix(accumulatedRaw, {
          seed: prompt,
          task,
          sessionDurationMinutes: safeSessionMinutes,
          codeSnippet: fencedMatch?.[1]?.trim(),
          hasCodeSuggestion: Boolean(fencedMatch && fencedMatch[1]?.trim())
        });
        if (suffix) {
          res.write(`data: ${JSON.stringify({ chunk: `

${suffix}` })}

`);
        }
        res.write(`data: ${JSON.stringify({ done: true, modelUsed: candidateModel })}

`);
        res.end();
      }
      return;
    } catch (error) {
      lastError = error;
      console.warn(`Gemini stream model ${candidateModel} error:`, error?.message || error);
      if (streamedAny) break;
    }
  }
  if (!res.writableEnded) {
    res.write(
      `data: ${JSON.stringify({
        error: true,
        code: "UPSTREAM_ERROR",
        message: lastError?.message || "El modelo Gemini no pudo completar la respuesta en este momento."
      })}

`
    );
    res.end();
  }
});
app.post("/api/gemini/generate-sprite", async (req, res) => {
  const { prompt = "", size = 16, name = "sprite", apiKey = "" } = req.body || {};
  const headerKey = req.headers["x-api-key"];
  const effectiveKey = apiKey && apiKey.trim() || headerKey;
  const ai = resolveAI(effectiveKey);
  if (!ai) {
    return res.json(generateProceduralSpriteFallback(prompt, size, name));
  }
  const systemInstruction = `You are a retro pixel-art generator for DIV Games Studio (WXDIV 3.0).
Generate a pixel art grid of size ${size}x${size} based on the user's prompt.
Return ONLY a valid JSON object matching this schema:
{
  "name": "string",
  "width": ${size},
  "height": ${size},
  "palette": ["#00000000", "#112233", ...], // Array of hex color strings. First entry MUST be "#00000000" for transparent.
  "pixels": [[0, 1, 2, ...], ...] // 2D array of palette indices for each (y, x), where 0 is transparent.
}
Do not include markdown ticks or any extra text, only the raw JSON.`;
  try {
    const result = await generateGeminiWithFallback(ai, {
      contents: `Create pixel art for: ${prompt} (size: ${size}x${size}, name: ${name})`,
      models: ["gemini-4-hydrogen", "gemini-3.1-flash-lite"],
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });
    const parsed = JSON.parse(result.text || "{}");
    if (!parsed.pixels || !parsed.palette) {
      throw new Error("Invalid sprite JSON structure");
    }
    res.json(parsed);
  } catch (error) {
    console.warn("Gemini sprite API error, providing procedural sprite fallback:", error?.message || error);
    res.json(generateProceduralSpriteFallback(prompt, size, name));
  }
});
app.get("/api/cloud-build/capabilities", async (_req, res) => {
  try {
    const caps = await getCloudCompilerCapabilities();
    res.json({ success: true, capabilities: caps });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message || "Error consultando capacidades" });
  }
});
app.post("/api/android/keystore/generate", (req, res) => {
  try {
    const result = generateReleaseKeystore(req.body || {});
    res.json({ success: true, keystore: result });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err?.message || "No se pudo generar el keystore PKCS#12"
    });
  }
});
app.post("/api/android/keystore/inspect", (req, res) => {
  try {
    const { keystoreP12Base64, password } = req.body || {};
    if (!keystoreP12Base64) {
      return res.status(400).json({ success: false, message: "Falta el archivo .p12/.pfx codificado." });
    }
    const info = inspectKeystoreP12(keystoreP12Base64, password || "");
    res.json({ success: true, info });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err?.message || "Contrase\xF1a incorrecta o archivo PKCS#12 inv\xE1lido."
    });
  }
});
app.post("/api/android/sign-package", async (req, res) => {
  try {
    const { entries, keystoreP12Base64, password, alias } = req.body || {};
    if (!Array.isArray(entries) || entries.length === 0 || !keystoreP12Base64) {
      return res.status(400).json({
        success: false,
        message: "Se requieren archivos del proyecto y un keystore .p12 v\xE1lido para firmar."
      });
    }
    const signed = await signPackageManifestArchive({
      entries,
      keystoreP12Base64,
      password: password || "",
      alias
    });
    res.json({ success: true, ...signed });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err?.message || "Error firmando el paquete con PKCS#7."
    });
  }
});
app.post("/api/cloud-build/express", async (req, res) => {
  try {
    const result = await compileExpressCloudApp(req.body || {});
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err?.message || "No se pudo compilar tu idea en la nube."
    });
  }
});
app.get("/api/cloud-build/express/:buildId", (req, res) => {
  const meta = readExpressBuildMeta(req.params.buildId);
  if (!meta) {
    return res.status(404).json({ success: false, message: "Publicaci\xF3n no encontrada." });
  }
  res.json({ success: true, meta });
});
app.get("/p/:buildId", (req, res, next) => {
  if (req.originalUrl.endsWith("/")) return next();
  const dir = getExpressBuildDir(req.params.buildId);
  if (!dir) {
    return res.status(404).send("<h1>Publicaci\xF3n no encontrada</h1>");
  }
  res.redirect(302, `/p/${req.params.buildId}/`);
});
app.get("/p/:buildId/", (req, res) => {
  const dir = getExpressBuildDir(req.params.buildId);
  if (!dir) {
    return res.status(404).send("<h1>Esta app no existe o expir\xF3.</h1>");
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.sendFile(import_path.default.join(dir, "index.html"));
});
app.get("/p/:buildId/manifest.webmanifest", (req, res) => {
  const dir = getExpressBuildDir(req.params.buildId);
  if (!dir) return res.status(404).end();
  res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  res.sendFile(import_path.default.join(dir, "manifest.webmanifest"));
});
app.get("/p/:buildId/sw.js", (req, res) => {
  const dir = getExpressBuildDir(req.params.buildId);
  if (!dir) return res.status(404).end();
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Service-Worker-Allowed", `/p/${req.params.buildId}/`);
  res.sendFile(import_path.default.join(dir, "sw.js"));
});
app.get("/p/:buildId/icon-192.png", (req, res) => {
  const dir = getExpressBuildDir(req.params.buildId);
  if (!dir) return res.status(404).end();
  res.setHeader("Content-Type", "image/png");
  res.sendFile(import_path.default.join(dir, "icon-192.png"));
});
app.get("/p/:buildId/icon-512.png", (req, res) => {
  const dir = getExpressBuildDir(req.params.buildId);
  if (!dir) return res.status(404).end();
  res.setHeader("Content-Type", "image/png");
  res.sendFile(import_path.default.join(dir, "icon-512.png"));
});
app.get("/p/:buildId/icon-maskable-512.png", (req, res) => {
  const dir = getExpressBuildDir(req.params.buildId);
  if (!dir) return res.status(404).end();
  const maskPath = import_path.default.join(dir, "icon-maskable-512.png");
  res.setHeader("Content-Type", "image/png");
  res.sendFile(import_node_fs2.default.existsSync(maskPath) ? maskPath : import_path.default.join(dir, "icon-512.png"));
});
app.get("/p/:buildId/pwa-bundle.zip", async (req, res) => {
  try {
    const zipBuf = await buildExpressPwaZipBuffer(req.params.buildId);
    if (!zipBuf) return res.status(404).send("No encontrado");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.buildId}-pwa.zip"`);
    res.send(zipBuf);
  } catch (err) {
    res.status(500).send(err?.message || "Error empaquetando PWA");
  }
});
app.get("/p/:buildId/download-html", (req, res) => {
  const dir = getExpressBuildDir(req.params.buildId);
  if (!dir) return res.status(404).send("No encontrado");
  const filePath = import_path.default.join(dir, "offline.html");
  if (!import_node_fs2.default.existsSync(filePath)) return res.status(404).send("No encontrado");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.buildId}.html"`);
  res.sendFile(filePath);
});
app.get("/p/:buildId/app.apk", (req, res) => {
  const dir = getExpressBuildDir(req.params.buildId);
  if (!dir) return res.status(404).send("No encontrado");
  const apkPath = import_path.default.join(dir, "app.apk");
  if (!import_node_fs2.default.existsSync(apkPath)) {
    return res.status(404).send("APK no disponible en este servidor.");
  }
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.buildId}.apk"`);
  res.sendFile(apkPath);
});
function escapeHtmlText(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
var BLOCKED_ROOT_ENTRIES = /* @__PURE__ */ new Set([
  "src",
  "node_modules",
  "scripts",
  "dist",
  "dev-dist",
  "public",
  "server.ts",
  "package.json",
  "package-lock.json",
  "bun.lock",
  "tsconfig.json",
  "vite.config.ts",
  "metadata.json",
  "index.html",
  "index.htm"
]);
function safeResolveStaticPath(baseDir, reqPath, enforceRootBlocklist = false) {
  let decoded = reqPath;
  try {
    decoded = decodeURIComponent(reqPath);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const normalized = decoded.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalized.split("/").filter(Boolean);
  if (segments.some((seg) => seg.startsWith(".") || seg === "..")) {
    return null;
  }
  if (enforceRootBlocklist && (segments.length === 0 || BLOCKED_ROOT_ENTRIES.has(segments[0]))) {
    return null;
  }
  const resolved = import_path.default.resolve(baseDir, normalized);
  const rootWithSep = baseDir.endsWith(import_path.default.sep) ? baseDir : baseDir + import_path.default.sep;
  if (resolved !== baseDir && !resolved.startsWith(rootWithSep)) {
    return null;
  }
  return resolved;
}
function renderStaticDirectoryIndex(dirPath, urlPath) {
  const cleanUrlPath = urlPath.endsWith("/") ? urlPath : `${urlPath}/`;
  const entries = import_node_fs2.default.readdirSync(dirPath, { withFileTypes: true }).filter((entry) => !entry.name.startsWith(".")).sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const itemsHtml = entries.map((entry) => {
    const suffix = entry.isDirectory() ? "/" : "";
    const href = encodeURI(`${cleanUrlPath}${entry.name}${suffix}`);
    const label = escapeHtmlText(`${entry.name}${suffix}`);
    const badge = entry.isDirectory() ? "Carpeta" : import_path.default.extname(entry.name).toLowerCase() || "Archivo";
    return `<li style="margin:6px 0;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;">
        <a href="${href}" style="color:#7c2d48;font-weight:600;text-decoration:none;word-break:break-all;">${label}</a>
        <span style="font-size:12px;color:#64748b;font-family:monospace;">${escapeHtmlText(badge)}</span>
      </li>`;
  }).join("\n");
  const parentHref = cleanUrlPath !== "/" ? encodeURI(cleanUrlPath.replace(/[^/]+\/$/, "") || "/") : null;
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>\xCDndice de ${escapeHtmlText(cleanUrlPath)}</title>
  </head>
  <body style="margin:0;padding:24px;font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0f172a;">
    <main style="max-width:720px;margin:0 auto;">
      <h1 style="font-size:18px;margin:0 0 6px;">Contenido de ${escapeHtmlText(cleanUrlPath)}</h1>
      <p style="font-size:13px;color:#475569;margin:0 0 16px;">M\xF3dulos y subcarpetas disponibles en el servidor.</p>
      ${parentHref ? `<div style="margin-bottom:12px;"><a href="${parentHref}" style="font-size:13px;color:#334155;text-decoration:none;font-weight:600;">\u2190 Subir nivel</a></div>` : ""}
      <ul style="list-style:none;padding:0;margin:0;">
        ${itemsHtml || `<li style="padding:12px;color:#64748b;font-size:13px;">Carpeta vac\xEDa</li>`}
      </ul>
    </main>
  </body>
</html>`;
}
function createInternalFolderAndHtmlMiddleware(staticRoots, options) {
  return (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const reqPath = req.path || "/";
    if (reqPath.startsWith("/api/") || reqPath.startsWith("/p/") || reqPath.startsWith("/@") || reqPath.startsWith("/src/") || reqPath.startsWith("/node_modules/")) {
      return next();
    }
    if (!options?.allowRoot && (reqPath === "/" || reqPath === "/index.html")) {
      return next();
    }
    for (const rootSpec of staticRoots) {
      const rootDir = rootSpec.dir;
      if (!import_node_fs2.default.existsSync(rootDir)) continue;
      const resolved = safeResolveStaticPath(rootDir, reqPath, Boolean(rootSpec.enforceBlocklist));
      if (resolved && import_node_fs2.default.existsSync(resolved)) {
        const stat = import_node_fs2.default.statSync(resolved);
        if (stat.isDirectory()) {
          if (!reqPath.endsWith("/")) {
            const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
            return res.redirect(302, `${reqPath}/${qs}`);
          }
          const idxHtml = import_path.default.join(resolved, "index.html");
          const idxHtm = import_path.default.join(resolved, "index.htm");
          if (import_node_fs2.default.existsSync(idxHtml) && import_node_fs2.default.statSync(idxHtml).isFile()) {
            res.setHeader("Cache-Control", "no-cache");
            return res.sendFile(idxHtml);
          }
          if (import_node_fs2.default.existsSync(idxHtm) && import_node_fs2.default.statSync(idxHtm).isFile()) {
            res.setHeader("Cache-Control", "no-cache");
            return res.sendFile(idxHtm);
          }
          if (reqPath !== "/") {
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.setHeader("Cache-Control", "no-cache");
            return res.send(renderStaticDirectoryIndex(resolved, reqPath));
          }
        } else if (stat.isFile()) {
          if (/\.(html?|htm)$/i.test(resolved)) {
            res.setHeader("Cache-Control", "no-cache");
          }
          return res.sendFile(resolved);
        }
      }
      if (!import_path.default.extname(reqPath) && !reqPath.endsWith("/")) {
        for (const ext of [".html", ".htm"]) {
          const resolvedHtml = safeResolveStaticPath(
            rootDir,
            `${reqPath}${ext}`,
            Boolean(rootSpec.enforceBlocklist)
          );
          if (resolvedHtml && import_node_fs2.default.existsSync(resolvedHtml) && import_node_fs2.default.statSync(resolvedHtml).isFile()) {
            res.setHeader("Cache-Control", "no-cache");
            return res.sendFile(resolvedHtml);
          }
        }
      }
    }
    return next();
  };
}
async function startServer() {
  const httpServer = import_http.default.createServer(app);
  const publicPath = import_path.default.resolve(process.cwd(), "public");
  if (process.env.NODE_ENV !== "production") {
    if (process.env.DISABLE_HMR === "true") {
      app.get("/@vite/client", (_req, res) => {
        res.type("application/javascript");
        res.setHeader("Cache-Control", "no-store");
        res.send(`
const sheetsMap = new Map();
if ("document" in globalThis) {
  document.querySelectorAll("style[data-vite-dev-id]").forEach((el) => {
    sheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
}
let lastInsertedStyle;
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.setAttribute("data-vite-dev-id", id);
    style.textContent = content;
    if (!lastInsertedStyle) {
      document.head.appendChild(style);
      setTimeout(() => { lastInsertedStyle = undefined; }, 0);
    } else {
      lastInsertedStyle.insertAdjacentElement("afterend", style);
    }
    lastInsertedStyle = style;
  } else {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== "." && url[0] !== "/") return url;
  const pathname = url.replace(/[?#].*$/, "");
  const { search, hash } = new URL(url, "http://vite.dev");
  return pathname + "?" + queryToInject + (search ? "&" + search.slice(1) : "") + (hash || "");
}
export class ErrorOverlay extends HTMLElement {}
`);
      });
    }
    app.use(
      createInternalFolderAndHtmlMiddleware(
        [{ dir: publicPath }, { dir: process.cwd(), enforceBlocklist: true }],
        { allowRoot: false }
      )
    );
    const vite = await (0, import_vite.createServer)({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { server: httpServer }
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const currentDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
    const distPath = import_node_fs2.default.existsSync(import_path.default.join(process.cwd(), "dist", "index.html")) ? import_path.default.join(process.cwd(), "dist") : import_node_fs2.default.existsSync(import_path.default.join(currentDir, "index.html")) ? currentDir : import_path.default.join(process.cwd(), "dist");
    const staticRootSpecs = [
      { dir: distPath },
      ...import_node_fs2.default.existsSync(publicPath) && publicPath !== distPath ? [{ dir: publicPath }] : [],
      { dir: process.cwd(), enforceBlocklist: true }
    ];
    app.use(createInternalFolderAndHtmlMiddleware(staticRootSpecs, { allowRoot: true }));
    for (const rootDir of Array.from(/* @__PURE__ */ new Set([distPath, ...import_node_fs2.default.existsSync(publicPath) ? [publicPath] : []]))) {
      app.use(
        import_express.default.static(rootDir, {
          extensions: ["html", "htm"],
          index: ["index.html", "index.htm"]
        })
      );
    }
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: "Endpoint no encontrado" });
      }
      if (import_path.default.extname(req.path)) {
        return res.status(404).type("text/plain; charset=utf-8").send("Archivo no encontrado");
      }
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`WXDIV 3.0 Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
