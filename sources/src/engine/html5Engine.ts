import { VB3Form, VB3Control } from "../components/VB3/types";
import { getPresetFormDefinition } from "./presetForms";

/**
 * WXDIV 3.0 / DIV Games Studio Native HTML5 & Web Landing Page Engine
 *
 * Compiles and renders DIV Landing Pages, Forms, and Web Apps directly to
 * pure native HTML5 DOM elements (buttons, inputs, textareas, selects, cards, hero, navbar)
 * instead of a simulated pixel canvas, achieving instant responsiveness, native typing,
 * and lightning-fast code generation (<2ms).
 */

export interface Html5FormField {
  id: string;
  label: string;
  type: "text" | "number" | "email" | "password" | "textarea" | "select" | "checkbox";
  placeholder?: string;
  options?: string[];
  defaultValue?: any;
  required?: boolean;
}

export interface Html5FeatureItem {
  id: string;
  icon: string;
  title: string;
  desc: string;
}

export interface Html5CardItem {
  title: string;
  desc: string;
  buttonText?: string;
  tag?: string;
  action?: string;
}

export interface Html5Notification {
  id: string;
  text: string;
  type: "success" | "info" | "warning" | "danger";
  timestamp: number;
}

export interface Html5StatCard {
  id: string;
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon?: string;
}

export interface Html5TabItem {
  id: string;
  label: string;
  active?: boolean;
}

export interface Html5ActionBtn {
  id: string;
  label: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  action: string;
}

export interface Html5PricingPlan {
  id: string;
  name: string;
  price: string;
  period?: string;
  description?: string;
  features: string[];
  isPopular?: boolean;
  ctaText?: string;
  ctaAction?: string;
}

export interface Html5Testimonial {
  id: string;
  quote: string;
  author: string;
  role?: string;
  company?: string;
  rating?: number;
  avatar?: string;
}

export interface Html5FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface Html5CtaBanner {
  title: string;
  subtitle?: string;
  buttonText: string;
  buttonAction?: string;
  badge?: string;
}

export interface Html5AppState {
  active: boolean;
  mode: "app" | "landing_page" | "form" | "hybrid" | "dashboard" | "web";
  title: string;
  subtitle: string;
  theme?: "dark" | "light" | "cyan" | "emerald";
  visualForm?: VB3Form;
  navbar?: {
    brand: string;
    links: Array<{ label: string; href?: string; action?: string }>;
    user?: { name: string; email?: string; logged?: boolean };
    ctaText?: string;
    ctaAction?: string;
  };
  hero?: {
    title: string;
    subtitle: string;
    ctaText: string;
    ctaAction?: string;
    secondaryCtaText?: string;
    secondaryCtaAction?: string;
    badge?: string;
  };
  tabs?: Html5TabItem[];
  activeTabId?: string;
  stats?: Html5StatCard[];
  features: Html5FeatureItem[];
  pricing?: Html5PricingPlan[];
  testimonials?: Html5Testimonial[];
  faqs?: Html5FaqItem[];
  ctaBanner?: Html5CtaBanner;
  form?: {
    id: string;
    title: string;
    description?: string;
    submitLabel: string;
    submitAction?: string;
    fields: Html5FormField[];
    values: Record<string, any>;
    submitted: boolean;
  };
  table?: {
    title: string;
    headers: string[];
    rows: any[][];
    onRowAction?: string;
  };
  actions?: Html5ActionBtn[];
  cards: Html5CardItem[];
  footer?: {
    brand: string;
    text: string;
    links: string[];
  };
  notifications: Html5Notification[];
}

/**
 * Creates a clean default Html5AppState
 */
export function createDefaultHtml5State(): Html5AppState {
  return {
    active: false,
    mode: "app",
    title: "",
    subtitle: "",
    visualForm: undefined,
    navbar: undefined,
    hero: undefined,
    features: [],
    pricing: [],
    testimonials: [],
    faqs: [],
    ctaBanner: undefined,
    form: undefined,
    cards: [],
    footer: undefined,
    notifications: [],
  };
}

/**
 * Parses DIV code into an Html5AppState in sub-millisecond time
 */
export function parseDivToHtml5State(
  code: string,
  visualFormsOrPresetId?: any[] | string
): Html5AppState {
  const state = createDefaultHtml5State();
  const lower = (code || "").toLowerCase();

  // Mode 8 3D worlds MUST NEVER be hijacked into HTML5 DOM landing/form mode
  const isMode8Code =
    lower.includes("m8_set_doom_sector") ||
    lower.includes("m8_add_doom_line") ||
    lower.includes("m8_engine_mode") ||
    lower.includes("m8_place_voxel") ||
    lower.includes("m8_add_voxel") ||
    lower.includes("m8_add_model") ||
    lower.includes("m8_place_model") ||
    lower.includes("m8_set_sector") ||
    lower.includes("m8_set_fluid") ||
    lower.includes("m8_spawn_entity") ||
    lower.includes("start_mode8") ||
    lower.includes("jugador_doom") ||
    lower.includes("jugador_blox") ||
    lower.includes("jugador_marine") ||
    lower.includes("mundo 3d modo 8");
  if (isMode8Code) {
    state.active = false;
    return state;
  }

  const presetIdOrTitle = typeof visualFormsOrPresetId === "string" ? visualFormsOrPresetId.toLowerCase() : "";
  const visualForms = Array.isArray(visualFormsOrPresetId) ? visualFormsOrPresetId : undefined;

  // Check if it is a Web page or Landing page (una WEB, no una APP)
  const isWebOrLanding =
    lower.includes("draw_landing_page") ||
    lower.includes("web_page") ||
    lower.includes("web_hero") ||
    lower.includes("web_navbar") ||
    lower.includes("web_pricing") ||
    lower.includes("web_feature") ||
    lower.includes("web_faq") ||
    lower.includes("web_testimonial") ||
    lower.includes("web_stat") ||
    lower.includes("web_footer") ||
    lower.includes("web_cta_banner") ||
    lower.includes("web_contact_form") ||
    lower.includes("landing_page") ||
    lower.includes("landing_controller") ||
    lower.includes("landing_web_engine") ||
    lower.includes("navbar(") ||
    lower.includes("hero(") ||
    lower.includes("add_feature(") ||
    lower.includes("add_pricing(") ||
    lower.includes("add_testimonial(") ||
    lower.includes("add_faq(") ||
    lower.includes("add_footer(") ||
    lower.includes("draw_html_form(") ||
    presetIdOrTitle.includes("landing") ||
    presetIdOrTitle.startsWith("web_") ||
    presetIdOrTitle.includes("[web]") ||
    /program\s+(?:landing|web_|generador_landing)/i.test(code);

  // Check if HTML5 mode is explicitly activated or indicated
  const hasHtml5Call =
    isWebOrLanding ||
    lower.includes("program app_") ||
    lower.includes("program web_") ||
    /program\s+(?:app_|web_|landing_|generador_landing|dashboard_|crm_|chat_|pos_|punto_de_|presupuesto_|gestor_sqlite|login_form|notepad_|paint_|calculadora_|tareas_)[a-z0-9_]*/i.test(code) ||
    lower.includes("set_html5_mode") ||
    lower.includes("m_html5") ||
    lower.includes("draw_landing_page") ||
    lower.includes("draw_html_form") ||
    lower.includes("add_form_input") ||
    lower.includes("add_form_select") ||
    lower.includes("add_form_textarea") ||
    lower.includes("draw_table(") ||
    lower.includes("draw_button(") ||
    lower.includes("draw_input(") ||
    (lower.includes("navbar(") && lower.includes("hero(")) ||
    presetIdOrTitle.startsWith("app_") ||
    presetIdOrTitle.startsWith("web_") ||
    presetIdOrTitle.includes("[app]") ||
    presetIdOrTitle.includes("[web]") ||
    presetIdOrTitle.includes("dashboard") ||
    presetIdOrTitle.includes("crm") ||
    presetIdOrTitle.includes("todo") ||
    presetIdOrTitle.includes("sqlite");

  if (!hasHtml5Call && (!visualForms || visualForms.length === 0)) {
    state.active = false;
    return state;
  }

  state.active = true;
  state.mode = isWebOrLanding ? "landing_page" : "app";

  // 0. If visual designer form is provided directly, preserve it 100% ONLY if not a web/landing page
  if (!isWebOrLanding && visualForms && visualForms.length > 0) {
    const activeForm = visualForms[0];
    if (activeForm && activeForm.controls) {
      state.active = true;
      state.mode = "app";
      state.title = activeForm.caption || activeForm.name || "Aplicación";
      state.visualForm = activeForm;
      return state;
    }
  }

  // 0b. If code contains DIV visual form controls (draw_button, draw_input, etc.) and NOT a web or landing page
  const hasDrawButtons = /draw_button\s*\(/i.test(code);
  const hasDrawInputs = /draw_input\s*\(/i.test(code);
  if (!isWebOrLanding && (hasDrawButtons || hasDrawInputs) && !lower.includes("draw_landing_page")) {
    let formBackColor = "#c0c0c0";
    const rgbMatch = code.match(/screen_color\s*\(\s*rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*\)/i);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, "0");
      const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, "0");
      const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, "0");
      formBackColor = `#${r}${g}${b}`;
    } else {
      const hexMatch = code.match(/screen_color\s*\(\s*["'](#?[a-zA-Z0-9]+)["']\s*\)/i);
      if (hexMatch) formBackColor = hexMatch[1];
    }

    const controls: VB3Control[] = [];
    const dInputRegex = /draw_input\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([a-zA-Z0-9_]+)(?:\s*,\s*["']([^"']*)["'])?\s*\)/gi;
    let diMatch: RegExpExecArray | null;
    while ((diMatch = dInputRegex.exec(code)) !== null) {
      const x = parseInt(diMatch[1], 10);
      const y = parseInt(diMatch[2], 10);
      const w = parseInt(diMatch[3], 10);
      const h = parseInt(diMatch[4], 10);
      const name = diMatch[5];
      const caption = diMatch[6] || "";
      controls.push({
        id: name.toLowerCase(),
        name,
        type: "textbox",
        x,
        y,
        width: w,
        height: h,
        caption,
        text: name.toLowerCase().includes("pantalla") || name.toLowerCase().includes("calc") ? "0" : (caption || ""),
        enabled: true,
        visible: true,
      });
    }

    const dBtnRegex = /draw_button\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*["']([^"']+)["'](?:\s*,\s*([a-zA-Z0-9_]+))?\s*\)/gi;
    let dbMatch: RegExpExecArray | null;
    while ((dbMatch = dBtnRegex.exec(code)) !== null) {
      const x = parseInt(dbMatch[1], 10);
      const y = parseInt(dbMatch[2], 10);
      const w = parseInt(dbMatch[3], 10);
      const h = parseInt(dbMatch[4], 10);
      const caption = dbMatch[5];
      const action = dbMatch[6] || `btn_${controls.length + 1}`;
      controls.push({
        id: `btn_${action.toLowerCase()}`,
        name: action,
        type: "commandbutton",
        x,
        y,
        width: w,
        height: h,
        caption,
        enabled: true,
        visible: true,
      });
    }

    const dLblRegex = /write\s*\(\s*\d+\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*\d+\s*,\s*["']([^"']+)["']\s*\)/gi;
    let dlMatch: RegExpExecArray | null;
    while ((dlMatch = dLblRegex.exec(code)) !== null) {
      const x = parseInt(dlMatch[1], 10);
      const y = parseInt(dlMatch[2], 10);
      const text = dlMatch[3];
      if (!text.includes("inicializado correctamente") && !text.includes("Ejecución Activa")) {
        controls.push({
          id: `lbl_${controls.length + 1}`,
          name: `lbl_${controls.length + 1}`,
          type: "label",
          x,
          y,
          width: 140,
          height: 24,
          caption: text,
          enabled: true,
          visible: true,
        });
      }
    }

    const dCbRegex = /draw_checkbox\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*["']([^"']+)["']/gi;
    let dcMatch: RegExpExecArray | null;
    while ((dcMatch = dCbRegex.exec(code)) !== null) {
      const x = parseInt(dcMatch[1], 10);
      const y = parseInt(dcMatch[2], 10);
      const w = parseInt(dcMatch[3], 10);
      const h = parseInt(dcMatch[4], 10);
      const caption = dcMatch[5];
      controls.push({
        id: `chk_${controls.length + 1}`,
        name: `chk_${controls.length + 1}`,
        type: "checkbox",
        x,
        y,
        width: w,
        height: h,
        caption,
        enabled: true,
        visible: true,
      });
    }

    if (controls.length > 0) {
      const maxRight = Math.max(...controls.map((c) => c.x + c.width), 340);
      const maxBottom = Math.max(...controls.map((c) => c.y + c.height), 380);
      const setTitleMatch = code.match(/set_title\s*\(\s*["']([^"']+)["']\s*\)/i);
      const formCaptionMatch = code.match(/write\s*\(\s*0\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*,\s*["']([^"']+) inicializado correctamente/i);
      const progMatch = code.match(/PROGRAM\s+([a-zA-Z0-9_]+)/i);
      const formTitle = setTitleMatch
        ? setTitleMatch[1]
        : formCaptionMatch
        ? formCaptionMatch[1]
        : progMatch
        ? progMatch[1].replace(/_Program$/i, "").replace(/_app$/i, "").replace(/_/g, " ")
        : "Formulario";
      const modeMatch = code.match(/set_mode\s*\(\s*m(\d+)x(\d+)\s*\)/i);
      const modeW = modeMatch ? parseInt(modeMatch[1], 10) : 0;
      const modeH = modeMatch ? parseInt(modeMatch[2], 10) : 0;
      const formWidth = Math.max(modeW || 380, maxRight + 20);
      const formHeight = Math.max(modeH || 380, maxBottom + 20);

      state.active = true;
      state.mode = "app";
      state.title = formTitle;
      state.visualForm = {
        id: "frm_active",
        name: formTitle.replace(/\s+/g, ""),
        caption: formTitle,
        backColor: formBackColor,
        width: formWidth,
        height: formHeight,
        controls,
      };
      return state;
    }
  }

  // 1. Title detection
  const titleMatch =
    code.match(/set_title\s*\(\s*["']([^"']+)["']\s*\)/i) ||
    code.match(/PROGRAM\s+([a-zA-Z0-9_]+)/i);
  if (titleMatch) {
    state.title = titleMatch[1].replace(/_/g, " ");
  }

  // 2. Landing & Web Page Primitives:
  // web_page("Título", "Subtítulo", "Tema") or draw_landing_page("Título", "Subtítulo", "Texto Botón")
  const webPageMatch = code.match(/web_page\s*\(\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?(?:\s*,\s*["']([^"']+)["'])?\s*\)/i);
  const landingMatch = code.match(/draw_landing_page\s*\(\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?(?:\s*,\s*["']([^"']+)["'])?\s*\)/i);
  if (webPageMatch || landingMatch) {
    state.mode = "landing_page";
    const titleVal = webPageMatch ? webPageMatch[1] : landingMatch![1] || "Inicio";
    const subVal = webPageMatch ? (webPageMatch[2] || "") : (landingMatch![2] || "");
    const ctaVal = landingMatch ? (landingMatch[3] || "Comenzar") : "Empezar Ahora";
    state.title = titleVal;
    state.subtitle = subVal;
    if (webPageMatch && webPageMatch[3]) {
      state.theme = webPageMatch[3] as any;
    }
    state.hero = {
      title: titleVal,
      subtitle: subVal,
      ctaText: ctaVal,
      ctaAction: "btn_cta_hero",
    };
  }

  // 3. Navbar Primitives: web_navbar or navbar
  const webNavbarMatch = code.match(/web_navbar\s*\(\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?(?:\s*,\s*["']([^"']+)["'])?(?:\s*,\s*["']([^"']+)["'])?\s*\)/i);
  const navbarMatch = code.match(/navbar\s*\(\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?\s*\)/i);
  if (webNavbarMatch || navbarMatch) {
    const brand = webNavbarMatch ? webNavbarMatch[1] : navbarMatch![1];
    const linksStr = (webNavbarMatch ? webNavbarMatch[2] : navbarMatch![2]) || "Inicio,Servicios,Precios,Contacto";
    const ctaText = webNavbarMatch ? webNavbarMatch[3] : undefined;
    const ctaAction = webNavbarMatch ? webNavbarMatch[4] : undefined;
    const links = linksStr.split(",").map((s) => ({ label: s.trim(), href: `#${s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}` }));
    state.navbar = { brand, links, ctaText, ctaAction };
  }

  // 3b. Footer Primitives: web_footer or add_footer
  const webFooterMatch = code.match(/web_footer\s*\(\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?(?:\s*,\s*["']([^"']+)["'])?\s*\)/i);
  const footerMatch = code.match(/add_footer\s*\(\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?\s*\)/i);
  if (webFooterMatch || footerMatch) {
    const fBrand = webFooterMatch ? webFooterMatch[1] : footerMatch![1];
    const fCopy = webFooterMatch ? webFooterMatch[2] : undefined;
    const fLinks = (webFooterMatch ? webFooterMatch[3] : footerMatch![2]) || "Privacidad,Términos,Contacto";
    state.footer = {
      brand: fBrand,
      text: fCopy || `© ${new Date().getFullYear()} ${fBrand}. Todos los derechos reservados.`,
      links: fLinks.split(",").map((s) => s.trim()),
    };
  }

  // 4. Hero Primitives: web_hero or hero
  const webHeroMatch = code.match(/web_hero\s*\(\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?(?:\s*,\s*["']([^"']+)["'])?(?:\s*,\s*["']([^"']+)["'])?(?:\s*,\s*["']([^"']+)["'])?(?:\s*,\s*["']([^"']+)["'])?(?:\s*,\s*["']([^"']+)["'])?\s*\)/i);
  const heroMatch = code.match(/hero\s*\(\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?(?:\s*,\s*["']([^"']+)["'])?(?:\s*,\s*["']([^"']+)["'])?\s*\)/i);
  if (webHeroMatch) {
    state.hero = {
      title: webHeroMatch[1],
      subtitle: webHeroMatch[2] || state.hero?.subtitle || "",
      ctaText: webHeroMatch[3] || state.hero?.ctaText || "Comenzar Gratis",
      ctaAction: webHeroMatch[4] || "btn_cta_hero",
      secondaryCtaText: webHeroMatch[5] || undefined,
      secondaryCtaAction: webHeroMatch[6] || "btn_demo",
      badge: webHeroMatch[7] || state.hero?.badge,
    };
  } else if (heroMatch) {
    state.hero = {
      title: heroMatch[1],
      subtitle: heroMatch[2] || state.hero?.subtitle || "",
      ctaText: heroMatch[3] || state.hero?.ctaText || "Acceder",
      ctaAction: "btn_cta_hero",
      badge: heroMatch[4] || state.hero?.badge,
    };
  }

  // 5. Features detection: web_feature or add_feature
  const featRegex = /(?:web_feature|add_feature)\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/gi;
  let featMatch: RegExpExecArray | null;
  const parsedFeatures: Html5FeatureItem[] = [];
  while ((featMatch = featRegex.exec(code)) !== null) {
    parsedFeatures.push({
      id: `feat_${parsedFeatures.length + 1}`,
      icon: featMatch[1],
      title: featMatch[2],
      desc: featMatch[3],
    });
  }
  if (parsedFeatures.length > 0) {
    state.features = parsedFeatures;
  }

  // 5b. Web Pricing Plans detection:
  // web_pricing("Nombre Plan", "$29/mes", "facturación mensual", "Caract 1, Caract 2, Caract 3", true, "Comenzar", "accion")
  const pricingRegex = /(?:web_pricing|add_pricing)\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["'](?:\s*,\s*["']([^"']*)["'])?(?:\s*,\s*["']([^"']*)["'])?(?:\s*,\s*(true|false))?(?:\s*,\s*["']([^"']*)["'])?(?:\s*,\s*["']([^"']*)["'])?\s*\)/gi;
  let prMatch: RegExpExecArray | null;
  const parsedPricing: Html5PricingPlan[] = [];
  while ((prMatch = pricingRegex.exec(code)) !== null) {
    const rawFeatures = prMatch[4] || "Soporte 24/7, Aceleración Cloud";
    parsedPricing.push({
      id: `plan_${parsedPricing.length + 1}`,
      name: prMatch[1],
      price: prMatch[2],
      period: prMatch[3] || "/mes",
      description: "",
      features: rawFeatures.split(",").map((s) => s.trim()),
      isPopular: prMatch[5] === "true",
      ctaText: prMatch[6] || "Elegir Plan",
      ctaAction: prMatch[7] || `select_plan_${parsedPricing.length + 1}`,
    });
  }
  if (parsedPricing.length > 0) {
    state.pricing = parsedPricing;
  }

  // 5c. Web Testimonials detection:
  // web_testimonial("Excelente solución web", "Ana Rodríguez", "CTO en TechLabs", 5)
  const testRegex = /(?:web_testimonial|add_testimonial)\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["'](?:\s*,\s*["']([^"']*)["'])?(?:\s*,\s*(\d+))?\s*\)/gi;
  let tmMatch: RegExpExecArray | null;
  const parsedTestimonials: Html5Testimonial[] = [];
  while ((tmMatch = testRegex.exec(code)) !== null) {
    parsedTestimonials.push({
      id: `test_${parsedTestimonials.length + 1}`,
      quote: tmMatch[1],
      author: tmMatch[2],
      role: tmMatch[3] || "Cliente Verificado",
      rating: tmMatch[4] ? parseInt(tmMatch[4], 10) : 5,
    });
  }
  if (parsedTestimonials.length > 0) {
    state.testimonials = parsedTestimonials;
  }

  // 5d. Web FAQ Accordion detection:
  // web_faq("¿Cómo se publica?", "Genera el ZIP o despliega directamente en hosting web.")
  const faqRegex = /(?:web_faq|add_faq)\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/gi;
  let fqMatch: RegExpExecArray | null;
  const parsedFaqs: Html5FaqItem[] = [];
  while ((fqMatch = faqRegex.exec(code)) !== null) {
    parsedFaqs.push({
      id: `faq_${parsedFaqs.length + 1}`,
      question: fqMatch[1],
      answer: fqMatch[2],
    });
  }
  if (parsedFaqs.length > 0) {
    state.faqs = parsedFaqs;
  }

  // 5e. Web Stat Metric detection:
  // web_stat("Usuarios Activos", "50,000+", "+18%", true)
  const statRegex = /(?:web_stat|add_web_stat)\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["'](?:\s*,\s*["']([^"']*)["'])?(?:\s*,\s*(true|false))?\s*\)/gi;
  let stMatch: RegExpExecArray | null;
  const parsedStats: Html5StatCard[] = [];
  while ((stMatch = statRegex.exec(code)) !== null) {
    parsedStats.push({
      id: `stat_${parsedStats.length + 1}`,
      label: stMatch[1],
      value: stMatch[2],
      change: stMatch[3] || undefined,
      isPositive: stMatch[4] !== "false",
    });
  }
  if (parsedStats.length > 0) {
    state.stats = parsedStats;
  }

  // 5f. Web CTA Banner:
  // web_cta_banner("¿Listo para despegar?", "Únete hoy mismo...", "Registrarme Ahora", "cta_banner", "Descuento 50%")
  const ctaBannerMatch = code.match(/(?:web_cta_banner|cta_banner)\s*\(\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?(?:\s*,\s*["']([^"']+)["'])?(?:\s*,\s*["']([^"']+)["'])?(?:\s*,\s*["']([^"']+)["'])?\s*\)/i);
  if (ctaBannerMatch) {
    state.ctaBanner = {
      title: ctaBannerMatch[1],
      subtitle: ctaBannerMatch[2] || "",
      buttonText: ctaBannerMatch[3] || "Comenzar Ahora",
      buttonAction: ctaBannerMatch[4] || "btn_cta_banner",
      badge: ctaBannerMatch[5] || undefined,
    };
  }

  // 6. Form Primitive: web_contact_form or draw_html_form
  const contactFormMatch = code.match(/web_contact_form\s*\(\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?(?:\s*,\s*["']([^"']+)["'])?(?:\s*,\s*["']([^"']+)["'])?\s*\)/i);
  const formMatch = code.match(/draw_html_form\s*\(\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?\s*\)/i);
  if (contactFormMatch) {
    state.mode = "landing_page";
    state.form = {
      id: "form_contacto",
      title: contactFormMatch[1] || "Contáctanos",
      description: contactFormMatch[2] || "Completa tus datos y te responderemos a la brevedad.",
      submitLabel: contactFormMatch[3] || "Enviar Mensaje →",
      submitAction: contactFormMatch[4] || "enviar_contacto",
      fields: [
        { id: "nombre", label: "Nombre", type: "text", placeholder: "Tu nombre completo...", required: true },
        { id: "email", label: "Correo Electrónico", type: "email", placeholder: "tu@empresa.com", required: true },
        { id: "mensaje", label: "Mensaje", type: "textarea", placeholder: "¿En qué podemos ayudarte?...", required: true },
      ],
      values: {},
      submitted: false,
    };
  } else if (formMatch) {
    state.mode = state.mode === "landing_page" ? "hybrid" : "form";
    if (!state.form) {
      state.form = {
        id: "form_principal",
        title: formMatch[1] || "Formulario de Datos",
        submitLabel: formMatch[2] || "Guardar",
        fields: [],
        values: {},
        submitted: false,
      };
    } else {
      state.form.title = formMatch[1];
      if (formMatch[2]) state.form.submitLabel = formMatch[2];
    }
  }

  // 7. Form Inputs: add_form_input("id", "Etiqueta", "tipo", "placeholder")
  const inputRegex = /add_form_input\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?(?:\s*,\s*["']([^"']+)["'])?\s*\)/gi;
  let inMatch: RegExpExecArray | null;
  const parsedInputs: Html5FormField[] = [];
  while ((inMatch = inputRegex.exec(code)) !== null) {
    const fieldType = (inMatch[3] || "text").toLowerCase() as any;
    parsedInputs.push({
      id: inMatch[1],
      label: inMatch[2],
      type: ["text", "number", "email", "password", "textarea", "select", "checkbox"].includes(fieldType)
        ? fieldType
        : "text",
      placeholder: inMatch[4] || "",
    });
  }

  // 8. Form Textarea: add_form_textarea("id", "Etiqueta", "placeholder")
  const textarRegex = /add_form_textarea\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?\s*\)/gi;
  let txMatch: RegExpExecArray | null;
  while ((txMatch = textarRegex.exec(code)) !== null) {
    parsedInputs.push({
      id: txMatch[1],
      label: txMatch[2],
      type: "textarea",
      placeholder: txMatch[3] || "",
    });
  }

  // 9. Form Select: add_form_select("id", "Etiqueta", "opcion1,opcion2,opcion3")
  const selectRegex = /add_form_select\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?\s*\)/gi;
  let selMatch: RegExpExecArray | null;
  while ((selMatch = selectRegex.exec(code)) !== null) {
    const rawOpts = selMatch[3] || "Opción 1,Opción 2";
    parsedInputs.push({
      id: selMatch[1],
      label: selMatch[2],
      type: "select",
      options: rawOpts.split(",").map((s) => s.trim()),
    });
  }

  // 9b. DIV Canvas UI Primitives conversion to Native HTML5 DOM:
  // Parse draw_input(x, y, w, h, var_or_store, placeholder)
  const drawInputRegex = /draw_input\s*\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*(?:store_get\s*\(\s*["']([^"']+)["']\s*\)|([a-zA-Z0-9_]+))(?:\s*,\s*["']([^"']*)["'])?\s*\)/gi;
  let dInMatch: RegExpExecArray | null;
  while ((dInMatch = drawInputRegex.exec(code)) !== null) {
    const rawId = (dInMatch[1] || dInMatch[2] || `campo_${parsedInputs.length + 1}`)
      .replace(/^app_state\./, "")
      .replace(/_text$/, "");
    const placeholder = dInMatch[3] || "";
    const isPass = rawId.includes("pass") || rawId.includes("clave");
    const isEmail = rawId.includes("email") || rawId.includes("correo");
    const label = rawId.charAt(0).toUpperCase() + rawId.slice(1).replace(/_/g, " ");
    if (!parsedInputs.some((f) => f.id === rawId)) {
      parsedInputs.push({
        id: rawId,
        label,
        type: isPass ? "password" : isEmail ? "email" : "text",
        placeholder: placeholder || `Introduce ${label.toLowerCase()}...`,
      });
    }
  }

  // Parse draw_button(x, y, w, h, "Texto", action)
  const drawBtnRegex = /draw_button\s*\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*["']([^"']+)["'](?:\s*,\s*([a-zA-Z0-9_]+))?/gi;
  let dBtnMatch: RegExpExecArray | null;
  const parsedActions: Html5ActionBtn[] = [];
  while ((dBtnMatch = drawBtnRegex.exec(code)) !== null) {
    const btnLabel = dBtnMatch[1];
    const btnAction = dBtnMatch[2] || `btn_act_${parsedActions.length + 1}`;
    if (!parsedActions.some((a) => a.label === btnLabel)) {
      parsedActions.push({
        id: `act_${parsedActions.length + 1}`,
        label: btnLabel,
        variant: parsedActions.length === 0 ? "primary" : "secondary",
        action: btnAction,
      });
    }
  }

  // Parse draw_checkbox(x, y, w, h, "Texto", checked, action)
  const drawCbRegex = /draw_checkbox\s*\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*["']([^"']+)["']/gi;
  let dCbMatch: RegExpExecArray | null;
  while ((dCbMatch = drawCbRegex.exec(code)) !== null) {
    const cbLabel = dCbMatch[1];
    const cbId = `check_${parsedInputs.length + 1}`;
    if (!parsedInputs.some((f) => f.label === cbLabel)) {
      parsedInputs.push({
        id: cbId,
        label: cbLabel,
        type: "checkbox",
        defaultValue: true,
      });
    }
  }

  // Fallback: If no inputs found yet, parse STORE app_state declarations
  if (parsedInputs.length === 0) {
    const storeBlockMatch = code.match(/STORE\s+([a-zA-Z0-9_]+)([\s\S]*?)END/i);
    if (storeBlockMatch) {
      const body = storeBlockMatch[2];
      const varRegex = /([a-zA-Z0-9_]+)\s*:\s*(string|int|float|bool)\s*(?:=\s*([^;\n\r]+))?/gi;
      let vMatch: RegExpExecArray | null;
      while ((vMatch = varRegex.exec(body)) !== null) {
        const vName = vMatch[1];
        const vType = vMatch[2].toLowerCase();
        const cleanName = vName.replace(/_(?:text|val|checked|selected)$/, "");
        parsedInputs.push({
          id: cleanName,
          label: cleanName.charAt(0).toUpperCase() + cleanName.slice(1).replace(/_/g, " "),
          type: vType === "bool" ? "checkbox" : cleanName.includes("pass") ? "password" : cleanName.includes("email") ? "email" : "text",
          placeholder: `Introduce ${cleanName.replace(/_/g, " ")}...`,
        });
      }
    }
  }

  if (parsedInputs.length > 0) {
    if (!state.form) {
      state.form = {
        id: "form_dinamico",
        title: state.title || "Formulario de la Aplicación",
        submitLabel: parsedActions.length > 0 ? parsedActions[0].label : "+ Guardar Información",
        submitAction: parsedActions.length > 0 ? parsedActions[0].action : "guardar_formulario",
        fields: parsedInputs,
        values: {},
        submitted: false,
      };
    } else {
      state.form.fields = parsedInputs;
      if (parsedActions.length > 0 && !state.form.submitLabel) {
        state.form.submitLabel = parsedActions[0].label;
      }
    }
    if (parsedActions.length > 1) {
      state.actions = parsedActions.slice(1);
    }
  } else if (parsedActions.length > 0) {
    state.actions = parsedActions;
  }

  // 11. SQLite Table detection
  const tableMatch = code.match(/sqlite_create_table\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/i);
  if (tableMatch) {
    const tableName = tableMatch[1];
    const schema = tableMatch[2];
    const cols = schema.split(",").map((c) => c.trim().split(" ")[0]);
    state.table = {
      title: `Registros en Base de Datos: ${tableName.toUpperCase()}`,
      headers: cols.length > 0 ? cols : ["ID", "Nombre", "Estado", "Fecha"],
      rows: [
        [1, "Administrador Sistema", "Activo", "2026-10-06"],
        [2, "Usuario Registrado", "Pendiente", "2026-10-06"],
      ],
    };
  }

  // 12. Tab selectors (e.g. draw_tabs(..., ["Todas", "Pendientes", "Completadas"]))
  const tabsMatch = code.match(/draw_tabs\s*\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*\[([^\]]+)\]/i);
  if (tabsMatch) {
    const rawTabs = tabsMatch[1].split(",").map((t) => t.replace(/["']/g, "").trim());
    state.tabs = rawTabs.map((t) => ({ id: t, label: t }));
    state.activeTabId = rawTabs[0];
  }

  // 13. App UI Table detection (e.g. draw_table(..., ["ID", "DESCRIPCIÓN", "ESTADO"]))
  const tableDrawMatch = code.match(/draw_table\s*\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*\[([^\]]+)\]/i);
  if (tableDrawMatch && !state.table) {
    const headers = tableDrawMatch[1].split(",").map((h) => h.replace(/["']/g, "").trim());
    state.table = {
      title: "Listado de Registros Reactivos",
      headers,
      rows: [
        [1, "Diseñar wireframes en Figma", "Completada"],
        [2, "Configurar API Gateway y Auth", "Completada"],
        [3, "Exportar build para Capacitor móvil", "Pendiente"],
        [4, "Probar Service Worker para PWA offline", "Pendiente"],
      ],
    };
  }

  // 14. STORE User Session extraction
  const storeUserMatch = code.match(/STORE\s+user[\s\S]*?nombre\s*:\s*string\s*=\s*["']([^"']+)["']/i);
  if (storeUserMatch) {
    const emailMatch = code.match(/email\s*:\s*string\s*=\s*["']([^"']+)["']/i);
    state.navbar = state.navbar || { brand: state.title, links: [] };
    state.navbar.user = {
      name: storeUserMatch[1],
      email: emailMatch ? emailMatch[1] : undefined,
      logged: true,
    };
  }

  // 15. Dashboard KPIs extraction
  if (lower.includes("dashboard") || lower.includes("analitica") || lower.includes("metrics")) {
    state.mode = "dashboard";
    if (!state.stats || state.stats.length === 0) {
      state.stats = [
        { id: "s1", label: "Ingresos Totales", value: "$48,520", change: "+12.4%", isPositive: true },
        { id: "s2", label: "Usuarios Activos", value: "3,420", change: "+8.1%", isPositive: true },
        { id: "s3", label: "Tasa de Conversión", value: "4.8%", change: "+0.5%", isPositive: true },
        { id: "s4", label: "Retención", value: "88.6%", change: "+2.3%", isPositive: true },
      ];
    }
  }

  // 16. Fallback to matching preset VB3Form definition (Calculator, Notepad, Paint, SQLite DB, etc.)
  if (!state.visualForm && !isWebOrLanding) {
    const hasInlinePrimitives = Boolean(
      state.hero ||
      state.form ||
      state.table ||
      (state.actions && state.actions.length > 0) ||
      (state.tabs && state.tabs.length > 0) ||
      (state.features && state.features.length > 0)
    );
    if (!hasInlinePrimitives) {
      let inferredPresetId = presetIdOrTitle;
      if (!getPresetFormDefinition(inferredPresetId)) {
        if (lower.includes("calculadora")) inferredPresetId = "app_calculator_sci";
        else if (lower.includes("sqlite") || lower.includes("empresas.db")) inferredPresetId = "app_database_sqlite";
        else if (lower.includes("notepad") || lower.includes("editor_texto")) inferredPresetId = "app_text_editor";
        else if (lower.includes("paint") || lower.includes("dibujo")) inferredPresetId = "app_paint_canvas";
        else if (lower.includes("login_form")) inferredPresetId = "app_login";
        else if (lower.includes("crm")) inferredPresetId = "app_crm";
      }
      const presetForm = getPresetFormDefinition(inferredPresetId);
      if (presetForm) {
        state.visualForm = presetForm;
        state.mode = "app";
        if (!state.title || state.title === "Aplicación Web") {
          state.title = presetForm.caption || presetForm.name || state.title;
        }
      }
    }
  }

  return state;
}

/**
 * Generates an authentic desktop-grade HTML5 standalone application from a visual form (VB3Form),
 * exactly replicating 100% of the form's background color, window title bar, button bevels,
 * input fields, coordinates, and full calculator / interactive event engine.
 */
export function generateVisualFormHtml(form: VB3Form, appTitle?: string): string {
  const title = form.caption || form.name || appTitle || "App Nativa HTML5";
  const backColor = form.backColor || "#c0c0c0";

  const renderedControls = form.controls.map((c) => {
    const cType = c.type.toLowerCase();
    const cName = c.name || c.id;
    const cCaption = c.caption || c.name || "";
    const x = c.x;
    const y = c.y;
    const w = c.width;
    const h = c.height;

    if (cType === "commandbutton" || cType === "button") {
      return `<button id="${c.id}" type="button" class="vb-btn" data-name="${cName}" data-caption="${cCaption.replace(/"/g, '&quot;')}" style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; background-color: ${c.backColor || backColor}; color: ${c.foreColor || '#000000'}; border: 2px solid #ffffff; border-right-color: #000000; border-bottom-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-weight: bold; font-size: ${c.fontSize || 13}px; cursor: pointer; user-select: none; display: flex; align-items: center; justify-content: center; outline: none; box-sizing: border-box;">${cCaption}</button>`;
    }

    if (cType === "textbox") {
      const isPass = (c as any).passwordChar;
      const isDisplay = c.id === "txtPantalla" || c.name === "txtPantalla" || c.id.toLowerCase().includes("pantalla") || c.id.toLowerCase().includes("display") || c.id.toLowerCase().includes("calc");
      const rawText = String(c.text || c.caption || (isDisplay ? "0" : ""));
      if (h >= 80 && !isDisplay) {
        const escTxt = rawText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<textarea id="${c.id}" name="${cName}" class="vb-input" style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; background-color: ${c.backColor || '#ffffff'}; color: ${c.foreColor || '#000000'}; border: 2px solid #808080; border-top-color: #000000; border-left-color: #000000; border-bottom-color: #dfdfdf; border-right-color: #dfdfdf; padding: 8px; font-family: 'Courier New', Courier, monospace; font-size: ${c.fontSize || 13}px; resize: none; outline: none; box-sizing: border-box;">${escTxt}</textarea>`;
      }
      return `<input id="${c.id}" name="${cName}" class="vb-input" type="${isPass ? 'password' : 'text'}" value="${rawText.replace(/"/g, '&quot;')}" style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; background-color: ${c.backColor || '#ffffff'}; color: ${c.foreColor || '#000000'}; border: 2px solid #808080; border-top-color: #000000; border-left-color: #000000; border-bottom-color: #dfdfdf; border-right-color: #dfdfdf; padding: ${isDisplay ? '2px 10px' : '2px 8px'}; font-family: ${isDisplay ? "'Courier New', Courier, monospace" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif"}; font-size: ${isDisplay ? '20px' : (c.fontSize || 13) + 'px'}; font-weight: ${isDisplay ? 'bold' : 'normal'}; text-align: ${isDisplay ? 'right' : ((c as any).align || 'left')}; outline: none; box-sizing: border-box;" />`;
    }

    if (cType === "label") {
      return `<div id="${c.id}" class="vb-label" style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; color: ${c.foreColor || '#000000'}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: ${c.fontSize || 12}px; font-weight: ${c.fontBold ? 'bold' : 'normal'}; display: flex; align-items: center; box-sizing: border-box; user-select: none; overflow: hidden; white-space: nowrap;">${cCaption}</div>`;
    }

    if (cType === "frame") {
      return `<fieldset id="${c.id}" style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; border: 2px groove #ffffff; margin: 0; padding: 4px; box-sizing: border-box; background-color: ${c.backColor || 'transparent'};"><legend style="font-size: 11px; font-weight: bold; color: ${c.foreColor || '#000000'}; padding: 0 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">${cCaption}</legend></fieldset>`;
    }

    if (cType === "checkbox") {
      return `<label id="${c.id}" style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; display: flex; align-items: center; gap: 6px; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: ${c.foreColor || '#000000'}; cursor: pointer; user-select: none; box-sizing: border-box;"><input type="checkbox" ${c.value ? 'checked' : ''} /><span>${cCaption}</span></label>`;
    }

    if (cType === "combobox" || cType === "select") {
      const opts = c.options || ["Opción 1", "Opción 2"];
      return `<select id="${c.id}" name="${cName}" style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; background-color: ${c.backColor || '#ffffff'}; color: ${c.foreColor || '#000000'}; border: 2px solid #808080; border-top-color: #000000; border-left-color: #000000; border-bottom-color: #dfdfdf; border-right-color: #dfdfdf; padding: 2px 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 12px; box-sizing: border-box; outline: none;">${opts.map((opt) => `<option value="${opt}" ${opt === c.value ? 'selected' : ''}>${opt}</option>`).join('')}</select>`;
    }

    if (cType === "grid" || cType === "table") {
      return `<div id="${c.id}" style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; background: #ffffff; border: 2px solid #808080; border-top-color: #000000; border-left-color: #000000; border-bottom-color: #dfdfdf; border-right-color: #dfdfdf; overflow: auto; box-sizing: border-box; font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;"><table style="width: 100%; border-collapse: collapse;"><thead><tr style="background: #e2e8f0; border-bottom: 1px solid #999;"><th style="padding: 3px 6px; text-align: left;">Item</th><th style="padding: 3px 6px; text-align: left;">Estado</th><th style="padding: 3px 6px; text-align: left;">Valor</th></tr></thead><tbody><tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 3px 6px;">1</td><td style="padding: 3px 6px;">Activo</td><td style="padding: 3px 6px;">100</td></tr><tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 3px 6px;">2</td><td style="padding: 3px 6px;">DIV</td><td style="padding: 3px 6px;">200</td></tr></tbody></table></div>`;
    }

    if (cType === "picturebox" || cType === "canvas5" || cType === "image") {
      if (c.id === "picCanvas" || cCaption.toLowerCase().includes("lienzo")) {
        return `<canvas id="${c.id}" width="${w}" height="${h}" class="vb-paint-canvas" style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; background-color: #ffffff; border: 2px solid #808080; border-top-color: #000000; border-left-color: #000000; border-bottom-color: #dfdfdf; border-right-color: #dfdfdf; box-sizing: border-box; cursor: crosshair; touch-action: none;"></canvas>`;
      }
      return `<div id="${c.id}" style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; background-color: ${c.backColor || '#ffffff'}; border: 2px solid #808080; border-top-color: #000000; border-left-color: #000000; border-bottom-color: #dfdfdf; border-right-color: #dfdfdf; box-sizing: border-box; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 11px; font-family: monospace; color: #64748b;">${cCaption || `[${cName}]`}</div>`;
    }

    if (cType === "hscrollbar" || cType === "slider") {
      return `<input id="${c.id}" type="range" min="0" max="100" value="${c.value || 50}" style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; box-sizing: border-box;" />`;
    }

    return `<div id="${c.id}" style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; background-color: ${c.backColor || '#e0e0e0'}; border: 1px solid #999; box-sizing: border-box; display: flex; align-items: center; justify-content: center; font-size: 11px;">${cCaption}</div>`;
  }).join("\n      ");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      background-color: #000000;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .viewport-scaler {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
      padding: 12px;
      box-sizing: border-box;
    }
    .scaled-wrapper {
      position: relative;
      flex-shrink: 0;
      width: ${form.width}px;
      height: ${form.height + 34}px;
    }
    .window-frame {
      position: absolute;
      left: 0;
      top: 0;
      background-color: ${backColor};
      border: 3px solid #dfdfdf;
      border-top-color: #ffffff;
      border-left-color: #ffffff;
      border-right-color: #000000;
      border-bottom-color: #000000;
      box-shadow: 0 20px 60px rgba(0,0,0,0.95);
      width: ${form.width}px;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      transform-origin: top left;
      transition: transform 0.1s ease-out;
    }
    .title-bar {
      background: linear-gradient(90deg, #000080, #1084d0);
      color: #ffffff;
      padding: 4px 8px;
      font-size: 12px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: space-between;
      user-select: none;
      box-sizing: border-box;
    }
    .title-bar-btns {
      display: flex;
      gap: 3px;
    }
    .win-btn {
      width: 16px;
      height: 14px;
      background: #c0c0c0;
      border: 1px solid #fff;
      border-right-color: #000;
      border-bottom-color: #000;
      font-size: 9px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #000;
      line-height: 1;
    }
    .form-canvas {
      position: relative;
      width: 100%;
      height: ${form.height}px;
      background-color: ${backColor};
      overflow: hidden;
    }
    .vb-btn:active {
      border: 2px solid #000000 !important;
      border-right-color: #ffffff !important;
      border-bottom-color: #ffffff !important;
    }
  </style>
</head>
<body>
  <div class="viewport-scaler" id="viewportScaler">
    <div class="scaled-wrapper" id="scaledWrapper">
      <div class="window-frame" id="windowFrame">
        <div class="title-bar">
          <span>🗔 ${title}</span>
          <div class="title-bar-btns">
            <div class="win-btn">_</div>
            <div class="win-btn">□</div>
            <div class="win-btn">✕</div>
          </div>
        </div>
        <div class="form-canvas">
          ${renderedControls}
        </div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const displayEl = document.getElementById("txtPantalla") || document.querySelector("input[type='text']") || document.querySelector("input");
      let calcAcc = 0;
      let calcOp = "";
      let calcResetOnNext = false;
      let calcMemory = 0;

      // Responsive auto-fit scaling function
      function adaptFormToPage() {
        const scaler = document.getElementById("viewportScaler");
        const wrapper = document.getElementById("scaledWrapper");
        const frame = document.getElementById("windowFrame");
        if (!scaler || !wrapper || !frame) return;

        const availW = scaler.clientWidth - 24;
        const availH = scaler.clientHeight - 24;
        const formW = ${form.width};
        const formH = ${form.height} + 34;

        if (availW <= 0 || availH <= 0) return;

        const scaleX = availW / formW;
        const scaleY = availH / formH;
        const scale = Math.min(1, Math.min(scaleX, scaleY));

        frame.style.transform = "scale(" + scale + ")";
        wrapper.style.width = Math.round(formW * scale) + "px";
        wrapper.style.height = Math.round(formH * scale) + "px";
      }

      window.addEventListener("resize", adaptFormToPage);
      window.addEventListener("orientationchange", adaptFormToPage);
      window.addEventListener("DOMContentLoaded", adaptFormToPage);
      setTimeout(adaptFormToPage, 50);

      document.querySelectorAll(".vb-btn").forEach(btn => {
        btn.addEventListener("mousedown", () => {
          btn.style.borderTopColor = "#000000";
          btn.style.borderLeftColor = "#000000";
          btn.style.borderRightColor = "#ffffff";
          btn.style.borderBottomColor = "#ffffff";
        });
        const restore = () => {
          btn.style.borderTopColor = "#ffffff";
          btn.style.borderLeftColor = "#ffffff";
          btn.style.borderRightColor = "#000000";
          btn.style.borderBottomColor = "#000000";
        };
        btn.addEventListener("mouseup", restore);
        btn.addEventListener("mouseleave", restore);

        btn.addEventListener("click", () => {
          const name = btn.getAttribute("data-name") || "";
          const caption = (btn.getAttribute("data-caption") || btn.innerText || "").trim();
          
          const isCalc = Boolean(document.getElementById("txtPantalla") || (name && name.startsWith("btn") && (/^[0-9]$/.test(caption) || ["+", "-", "*", "/", "×", "÷", "=", "C", "CE", "⌫", "C (Limpiar)", ".", "±", "M+", "M-", "MR", "MC", "%", "√x", "√", "x²", "1/x"].includes(caption))));

          if (isCalc && displayEl) {
            if (/^[0-9]$/.test(caption)) {
              if (displayEl.value === "0" || calcResetOnNext) {
                displayEl.value = caption;
                calcResetOnNext = false;
              } else {
                displayEl.value += caption;
              }
              return;
            }
            if (caption === ".") {
              if (calcResetOnNext) {
                displayEl.value = "0.";
                calcResetOnNext = false;
              } else if (!displayEl.value.includes(".")) {
                displayEl.value += ".";
              }
              return;
            }
            if (caption === "±") {
              const val = displayEl.value;
              displayEl.value = val.startsWith("-") ? val.slice(1) : (val === "0" ? "0" : "-" + val);
              return;
            }
            if (caption === "CE") {
              displayEl.value = "0";
              calcResetOnNext = false;
              return;
            }
            if (caption === "⌫" || caption === "←") {
              displayEl.value = displayEl.value.length > 1 ? displayEl.value.slice(0, -1) : "0";
              return;
            }
            if (caption === "C" || caption.startsWith("C ") || caption.startsWith("C(")) {
              displayEl.value = "0";
              calcAcc = 0;
              calcOp = "";
              calcResetOnNext = false;
              return;
            }
            if (caption === "%") {
              const num = parseFloat(displayEl.value) || 0;
              displayEl.value = String(num / 100);
              calcResetOnNext = true;
              return;
            }
            if (caption === "√x" || caption === "√") {
              const num = parseFloat(displayEl.value) || 0;
              displayEl.value = num >= 0 ? String(parseFloat(Math.sqrt(num).toFixed(8))) : "Error";
              calcResetOnNext = true;
              return;
            }
            if (caption === "x²" || caption === "x^2") {
              const num = parseFloat(displayEl.value) || 0;
              displayEl.value = String(parseFloat((num * num).toFixed(8)));
              calcResetOnNext = true;
              return;
            }
            if (caption === "1/x") {
              const num = parseFloat(displayEl.value) || 0;
              displayEl.value = num !== 0 ? String(parseFloat((1 / num).toFixed(8))) : "Error";
              calcResetOnNext = true;
              return;
            }
            if (caption === "M+" || caption.startsWith("M+")) {
              calcMemory += parseFloat(displayEl.value) || 0;
              calcResetOnNext = true;
              return;
            }
            if (caption === "M-" || caption.startsWith("M-")) {
              calcMemory -= parseFloat(displayEl.value) || 0;
              calcResetOnNext = true;
              return;
            }
            if (caption === "MR") {
              displayEl.value = String(calcMemory);
              calcResetOnNext = true;
              return;
            }
            if (caption === "MC") {
              calcMemory = 0;
              return;
            }
            if (["+", "-", "*", "/", "×", "÷"].includes(caption)) {
              calcAcc = parseFloat(displayEl.value) || 0;
              calcOp = caption === "×" ? "*" : caption === "÷" ? "/" : caption;
              calcResetOnNext = true;
              return;
            }
            if (caption === "=") {
              if (calcOp) {
                const second = parseFloat(displayEl.value) || 0;
                let res = 0;
                if (calcOp === "+") res = calcAcc + second;
                else if (calcOp === "-") res = calcAcc - second;
                else if (calcOp === "*") res = calcAcc * second;
                else if (calcOp === "/") res = second !== 0 ? calcAcc / second : "Error";
                displayEl.value = typeof res === "number" && !isNaN(res) ? (Number.isInteger(res) ? String(res) : parseFloat(res.toFixed(8)).toString()) : "Error";
                calcAcc = typeof res === "number" ? res : 0;
                calcOp = "";
                calcResetOnNext = true;
              }
              return;
            }
          }

          console.log("Form Action Click:", name, caption);
        });
      });

      // Keyboard support for calculator and inputs
      window.addEventListener("keydown", (e) => {
        if (!displayEl) return;
        if (e.target && e.target.tagName === "INPUT" && e.target !== displayEl) return;

        if (/^[0-9]$/.test(e.key)) {
          const btn = Array.from(document.querySelectorAll(".vb-btn")).find(b => (b.getAttribute("data-caption") || b.innerText).trim() === e.key);
          if (btn) btn.click();
        } else if (["+", "-", "*", "/"].includes(e.key)) {
          const opSymbol = e.key === "*" ? "×" : e.key === "/" ? "÷" : e.key;
          const btn = Array.from(document.querySelectorAll(".vb-btn")).find(b => {
            const cap = (b.getAttribute("data-caption") || b.innerText).trim();
            return cap === e.key || cap === opSymbol;
          });
          if (btn) btn.click();
        } else if (e.key === "Enter" || e.key === "=") {
          e.preventDefault();
          const btn = Array.from(document.querySelectorAll(".vb-btn")).find(b => (b.getAttribute("data-caption") || b.innerText).trim() === "=");
          if (btn) btn.click();
        } else if (e.key === "Escape") {
          const btn = Array.from(document.querySelectorAll(".vb-btn")).find(b => {
            const cap = (b.getAttribute("data-caption") || b.innerText).trim();
            return cap === "C" || cap.startsWith("C ") || cap.startsWith("C(");
          });
          if (btn) btn.click();
        } else if (e.key === "." || e.key === ",") {
          const btn = Array.from(document.querySelectorAll(".vb-btn")).find(b => (b.getAttribute("data-caption") || b.innerText).trim() === ".");
          if (btn) btn.click();
        } else if (e.key === "Backspace") {
          const btn = Array.from(document.querySelectorAll(".vb-btn")).find(b => {
            const cap = (b.getAttribute("data-caption") || b.innerText).trim();
            return cap === "⌫" || cap === "CE";
          });
          if (btn) {
            btn.click();
          } else {
            displayEl.value = displayEl.value.length > 1 ? displayEl.value.slice(0, -1) : "0";
          }
        } else if (e.key === "%") {
          const btn = Array.from(document.querySelectorAll(".vb-btn")).find(b => (b.getAttribute("data-caption") || b.innerText).trim() === "%");
          if (btn) btn.click();
        }
      });

      // Interactive Paint 2D Canvas support if .vb-paint-canvas exists
      const paintCanvas = document.querySelector(".vb-paint-canvas");
      if (paintCanvas && paintCanvas.getContext) {
        const pctx = paintCanvas.getContext("2d");
        pctx.fillStyle = "#ffffff";
        pctx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);
        let drawing = false;
        let brushMode = "pencil";
        const btnLapiz = document.getElementById("btnLapiz");
        const btnPincel = document.getElementById("btnPincel");
        const btnBorrador = document.getElementById("btnBorrador");
        const lblStatus = document.getElementById("lblPaintStatus");
        if (btnLapiz) btnLapiz.addEventListener("click", () => { brushMode = "pencil"; if (lblStatus) lblStatus.textContent = "Herramienta: Lápiz • Color: Negro"; });
        if (btnPincel) btnPincel.addEventListener("click", () => { brushMode = "brush"; if (lblStatus) lblStatus.textContent = "Herramienta: Pincel (8px) • Color: Rojo Vino"; });
        if (btnBorrador) btnBorrador.addEventListener("click", () => { brushMode = "eraser"; if (lblStatus) lblStatus.textContent = "Herramienta: Borrador"; });
        function drawDot(ev) {
          const rect = paintCanvas.getBoundingClientRect();
          const px = ((ev.clientX - rect.left) / rect.width) * paintCanvas.width;
          const py = ((ev.clientY - rect.top) / rect.height) * paintCanvas.height;
          pctx.fillStyle = brushMode === "eraser" ? "#ffffff" : brushMode === "brush" ? "#7C2D48" : "#111827";
          const sz = brushMode === "eraser" ? 16 : brushMode === "brush" ? 8 : 3;
          pctx.beginPath();
          pctx.arc(px, py, sz / 2, 0, Math.PI * 2);
          pctx.fill();
        }
        paintCanvas.addEventListener("pointerdown", (ev) => { drawing = true; drawDot(ev); });
        paintCanvas.addEventListener("pointermove", (ev) => { if (drawing) drawDot(ev); });
        window.addEventListener("pointerup", () => { drawing = false; });
      }
    })();
  </script>
</body>
</html>`;
}

/**
 * Generates pristine, self-contained, lightning-fast HTML5 + Tailwind CSS + Vanilla JS code
 * in less than 2 milliseconds. Ready for production, landing page hosting, or client forms.
 */
export function generateProductionHtml5Js(state: Html5AppState): string {
  if (state.visualForm) {
    return generateVisualFormHtml(state.visualForm, state.title);
  }

  const hasAnyContent = Boolean(
    state.navbar ||
    (state.stats && state.stats.length > 0) ||
    (state.tabs && state.tabs.length > 0) ||
    state.hero ||
    (state.features && state.features.length > 0) ||
    (state.pricing && state.pricing.length > 0) ||
    (state.testimonials && state.testimonials.length > 0) ||
    (state.faqs && state.faqs.length > 0) ||
    state.ctaBanner ||
    state.form ||
    (state.actions && state.actions.length > 0) ||
    state.table ||
    state.footer
  );

  if (!hasAnyContent) {
    const safeTitle = state.title || "Mi Aplicación Web";
    const safeSub = state.subtitle || "Aplicación compilada lista para usar en cualquier navegador y sin internet.";
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #F7F8FA;
      color: #111827;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .app-card {
      width: 100%;
      max-width: 560px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      padding: 28px;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.06);
    }
    h1 { font-size: 24px; font-weight: 800; color: #111827; margin-bottom: 8px; }
    p { font-size: 14px; color: #4B5563; line-height: 1.6; margin-bottom: 20px; }
    .note-box { display: flex; gap: 8px; margin-bottom: 16px; }
    input {
      flex: 1;
      min-height: 44px;
      padding: 0 14px;
      border-radius: 10px;
      border: 1px solid #CBD5E1;
      font-size: 14px;
    }
    button {
      min-height: 44px;
      padding: 0 18px;
      border-radius: 10px;
      border: none;
      background: #7C2D48;
      color: #FFFFFF;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
    }
    button:hover { background: #642239; }
    ul { list-style: none; display: flex; flex-direction: column; gap: 8px; }
    li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-radius: 10px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      font-size: 14px;
    }
    .del-btn {
      background: transparent;
      color: #94A3B8;
      min-height: 32px;
      padding: 0 8px;
      font-size: 12px;
    }
    .del-btn:hover { color: #DC2626; background: #FEE2E2; }
  </style>
</head>
<body>
  <main class="app-card">
    <h1>${safeTitle}</h1>
    <p>${safeSub}</p>
    <form class="note-box" id="quickAppForm">
      <input type="text" id="quickAppInput" placeholder="Escribe un registro o nota..." required />
      <button type="submit">Guardar</button>
    </form>
    <ul id="quickAppList"></ul>
  </main>
  <script>
    (function() {
      var KEY = "wxdiv_quick_" + ${JSON.stringify(safeTitle.slice(0, 24))};
      var items = [];
      try { items = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) {}
      var listEl = document.getElementById("quickAppList");
      var inputEl = document.getElementById("quickAppInput");
      var formEl = document.getElementById("quickAppForm");
      function render() {
        listEl.innerHTML = items.map(function(txt, i) {
          return '<li><span></span><button type="button" class="del-btn" data-idx="' + i + '">Eliminar</button></li>';
        }).join("");
        Array.prototype.forEach.call(listEl.querySelectorAll("li"), function(li, i) {
          li.querySelector("span").textContent = items[i];
          li.querySelector("button").onclick = function() {
            items.splice(i, 1);
            try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
            render();
          };
        });
      }
      formEl.onsubmit = function(ev) {
        ev.preventDefault();
        var v = (inputEl.value || "").trim();
        if (!v) return;
        items.unshift(v);
        inputEl.value = "";
        try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
        render();
      };
      render();
    })();
  </script>
</body>
</html>`;
  }

  const brand = state.navbar?.brand || state.title || "Mi Aplicación Web";
  const navLinks = state.navbar?.links || [];
  const hero = state.hero;
  const features = state.features || [];
  const form = state.form;
  const footer = state.footer;
  const isLight = state.theme === "light";

  return `<!DOCTYPE html>
<html lang="es" class="${isLight ? "scroll-smooth" : "dark scroll-smooth"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${state.title || brand}</title>
  <meta name="description" content="${state.subtitle || ''}">
  <!-- 100% Offline Self-Contained Utility CSS (zero external CDN dependencies) -->
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; line-height: 1.5; -webkit-text-size-adjust: 100%; }
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; min-height: 100vh; display: flex; flex-direction: column; -webkit-font-smoothing: antialiased; }
    a { color: inherit; text-decoration: none; }
    button, input, textarea, select { font: inherit; color: inherit; }
    .hidden { display: none !important; }
    .flex { display: flex; }
    .inline-flex { display: inline-flex; }
    .inline-block { display: inline-block; }
    .block { display: block; }
    .flex-col { flex-direction: column; }
    .flex-wrap { flex-wrap: wrap; }
    .items-center { align-items: center; }
    .items-baseline { align-items: baseline; }
    .items-stretch { align-items: stretch; }
    .justify-between { justify-content: space-between; }
    .justify-center { justify-content: center; }
    .grid { display: grid; }
    .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .gap-1 { gap: 0.25rem; } .gap-1\\.5 { gap: 0.375rem; } .gap-2 { gap: 0.5rem; } .gap-2\\.5 { gap: 0.625rem; }
    .gap-3 { gap: 0.75rem; } .gap-4 { gap: 1rem; } .gap-6 { gap: 1.5rem; }
    .space-y-3 > * + * { margin-top: 0.75rem; }
    .space-y-4 > * + * { margin-top: 1rem; }
    .space-y-5 > * + * { margin-top: 1.25rem; }
    .w-4 { width: 1rem; } .h-4 { height: 1rem; }
    .w-8 { width: 2rem; } .h-8 { height: 2rem; }
    .w-fit { width: fit-content; }
    .w-full { width: 100%; }
    .h-16 { height: 4rem; }
    .max-w-2xl { max-width: 42rem; } .max-w-3xl { max-width: 48rem; } .max-w-4xl { max-width: 56rem; }
    .max-w-5xl { max-width: 64rem; } .max-w-6xl { max-width: 72rem; } .max-w-xl { max-width: 36rem; }
    .mx-auto { margin-left: auto; margin-right: auto; }
    .mt-1 { margin-top: 0.25rem; } .mt-2 { margin-top: 0.5rem; } .mt-3 { margin-top: 0.75rem; }
    .mt-4 { margin-top: 1rem; } .mt-6 { margin-top: 1.5rem; } .mt-8 { margin-top: 2rem; }
    .mt-auto { margin-top: auto; }
    .mb-2 { margin-bottom: 0.5rem; } .mb-3 { margin-bottom: 0.75rem; } .mb-4 { margin-bottom: 1rem; }
    .mb-6 { margin-bottom: 1.5rem; } .mb-8 { margin-bottom: 2rem; } .mb-10 { margin-bottom: 2.5rem; } .mb-12 { margin-bottom: 3rem; }
    .p-3 { padding: 0.75rem; } .p-4 { padding: 1rem; } .p-6 { padding: 1.5rem; } .p-8 { padding: 2rem; }
    .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
    .px-8 { padding-left: 2rem; padding-right: 2rem; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
    .py-3\\.5 { padding-top: 0.875rem; padding-bottom: 0.875rem; }
    .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
    .py-10 { padding-top: 2.5rem; padding-bottom: 2.5rem; }
    .py-16 { padding-top: 4rem; padding-bottom: 4rem; }
    .pt-2 { padding-top: 0.5rem; } .pt-4 { padding-top: 1rem; } .pt-16 { padding-top: 4rem; } .pb-12 { padding-bottom: 3rem; }
    .sticky { position: sticky; } .top-0 { top: 0; } .relative { position: relative; } .z-50 { z-index: 50; }
    .rounded { border-radius: 0.25rem; } .rounded-md { border-radius: 0.375rem; } .rounded-lg { border-radius: 0.5rem; }
    .rounded-xl { border-radius: 0.75rem; } .rounded-2xl { border-radius: 1rem; } .rounded-3xl { border-radius: 1.5rem; }
    .border { border-width: 1px; border-style: solid; }
    .border-2 { border-width: 2px; border-style: solid; }
    .border-t { border-top-width: 1px; border-top-style: solid; }
    .border-b { border-bottom-width: 1px; border-bottom-style: solid; }
    .border-y { border-top-width: 1px; border-bottom-width: 1px; border-top-style: solid; border-bottom-style: solid; }
    .text-center { text-align: center; }
    .text-xs { font-size: 0.75rem; line-height: 1rem; }
    .text-\\[11px\\] { font-size: 11px; }
    .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
    .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
    .text-2xl { font-size: 1.5rem; line-height: 2rem; }
    .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
    .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
    .font-medium { font-weight: 500; } .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; } .font-extrabold { font-weight: 800; } .font-black { font-weight: 900; }
    .italic { font-style: italic; }
    .uppercase { text-transform: uppercase; }
    .tracking-wide { letter-spacing: 0.025em; } .tracking-wider { letter-spacing: 0.05em; }
    .tracking-widest { letter-spacing: 0.1em; } .tracking-tight { letter-spacing: -0.025em; }
    .leading-tight { line-height: 1.2; } .leading-relaxed { line-height: 1.625; }
    .cursor-pointer { cursor: pointer; }
    .transition-all, .transition-colors, .transition-transform { transition: all 0.2s ease; }
    .backdrop-blur-md, .backdrop-blur-xl { backdrop-filter: blur(12px); }
    .shadow-md { box-shadow: 0 4px 10px rgba(0,0,0,0.12); }
    .shadow-lg { box-shadow: 0 10px 25px rgba(0,0,0,0.16); }
    .shadow-xl { box-shadow: 0 20px 30px rgba(0,0,0,0.22); }
    .shadow-2xl { box-shadow: 0 25px 50px rgba(0,0,0,0.35); }
    .bg-white { background-color: #ffffff; } .bg-white\\/95 { background-color: rgba(255,255,255,0.95); }
    .bg-black { background-color: #020617; } .bg-black\\/80 { background-color: rgba(2,6,23,0.85); }
    .bg-\\[\\#F7F8FA\\] { background-color: #F7F8FA; }
    .bg-\\[\\#FDF2F5\\] { background-color: #FDF2F5; }
    .bg-\\[\\#EEF6F1\\] { background-color: #EEF6F1; }
    .bg-\\[\\#7C2D48\\] { background-color: #7C2D48; }
    .hover\\:bg-\\[\\#642239\\]:hover { background-color: #642239; }
    .bg-slate-800 { background-color: #1e293b; } .bg-slate-800\\/80 { background-color: rgba(30,41,59,0.8); }
    .bg-slate-900 { background-color: #0f172a; } .bg-slate-900\\/40 { background-color: rgba(15,23,42,0.45); }
    .bg-slate-900\\/60 { background-color: rgba(15,23,42,0.65); } .bg-slate-950\\/70 { background-color: rgba(2,6,23,0.75); }
    .bg-cyan-400 { background-color: #22d3ee; } .bg-cyan-500 { background-color: #06b6d4; }
    .hover\\:bg-cyan-400:hover { background-color: #22d3ee; }
    .bg-cyan-600\\/30 { background-color: rgba(8,145,178,0.3); } .bg-cyan-950\\/80 { background-color: rgba(8,51,68,0.85); }
    .bg-emerald-950\\/80 { background-color: rgba(2,44,34,0.85); }
    .bg-gradient-to-r.from-cyan-500.to-emerald-400 { background: linear-gradient(90deg, #06b6d4, #34d399); }
    .bg-gradient-to-r.from-cyan-900\\/60 { background: linear-gradient(90deg, rgba(22,78,99,0.7), rgba(30,58,138,0.6), rgba(15,23,42,0.85)); }
    .bg-gradient-to-b.from-cyan-950\\/60 { background: linear-gradient(180deg, rgba(8,51,68,0.75), rgba(15,23,42,0.85)); }
    .bg-gradient-to-b.from-slate-900\\/90 { background: linear-gradient(180deg, rgba(15,23,42,0.92), rgba(15,23,42,0.7)); }
    .text-white { color: #ffffff; } .text-black { color: #020617; } .text-slate-950 { color: #020617; }
    .text-slate-100 { color: #f1f5f9; } .text-slate-200 { color: #e2e8f0; } .text-slate-300 { color: #cbd5e1; }
    .text-slate-400 { color: #94a3b8; } .text-slate-500 { color: #64748b; }
    .text-cyan-300 { color: #67e8f9; } .text-cyan-400 { color: #22d3ee; }
    .text-emerald-300 { color: #6ee7b7; } .text-emerald-400 { color: #34d399; } .text-amber-500 { color: #f59e0b; }
    .text-\\[\\#111827\\] { color: #111827; } .text-\\[\\#374151\\] { color: #374151; }
    .text-\\[\\#4B5563\\] { color: #4B5563; } .text-\\[\\#6B7280\\] { color: #6B7280; }
    .text-\\[\\#7C2D48\\] { color: #7C2D48; } .text-\\[\\#2F6F4E\\] { color: #2F6F4E; }
    .border-\\[\\#E2E8F0\\] { border-color: #E2E8F0; } .border-\\[\\#F3D0DC\\] { border-color: #F3D0DC; }
    .border-\\[\\#CFE4D7\\] { border-color: #CFE4D7; } .border-\\[\\#7C2D48\\] { border-color: #7C2D48; }
    .border-slate-800 { border-color: #1e293b; } .border-slate-900 { border-color: #0f172a; }
    .border-slate-900\\/80 { border-color: rgba(15,23,42,0.8); } .border-slate-800\\/80 { border-color: rgba(30,41,59,0.8); }
    .border-cyan-500 { border-color: #06b6d4; } .border-cyan-500\\/40 { border-color: rgba(6,182,212,0.4); }
    .border-cyan-800\\/60 { border-color: rgba(21,94,117,0.6); } .border-emerald-500\\/60 { border-color: rgba(16,185,129,0.6); }
    .focus\\:outline-none:focus { outline: none; }
    .focus\\:border-cyan-500:focus { border-color: #06b6d4; }
    .focus\\:border-\\[\\#7C2D48\\]:focus { border-color: #7C2D48; }
    details[open] summary span:last-child { transform: rotate(180deg); }
    @media (min-width: 640px) {
      .sm\\:px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
      .sm\\:p-10 { padding: 2.5rem; } .sm\\:p-12 { padding: 3rem; }
      .sm\\:flex-row { flex-direction: row; }
      .sm\\:text-6xl { font-size: 3.5rem; line-height: 1.1; }
      .sm\\:text-4xl { font-size: 2.25rem; } .sm\\:text-3xl { font-size: 1.875rem; }
      .sm\\:text-xl { font-size: 1.25rem; } .sm\\:text-base { font-size: 1rem; }
    }
    @media (min-width: 768px) {
      .md\\:flex { display: flex !important; }
      .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .md\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .md\\:pt-24 { padding-top: 5rem; } .md\\:pb-20 { padding-bottom: 4.5rem; }
    }
  </style>
</head>
<body class="${isLight ? "bg-[#F7F8FA] text-[#111827] selection:bg-[#7C2D48] selection:text-white" : "bg-black text-slate-100 selection:bg-cyan-500 selection:text-black"} font-sans antialiased min-h-screen flex flex-col">

  ${state.navbar ? `
  <!-- Navigation Bar -->
  <header class="sticky top-0 z-50 backdrop-blur-md ${isLight ? "bg-white/95 border-b border-[#E2E8F0]" : "bg-black/80 border-b border-slate-900"} transition-all">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
      <a href="#" class="flex items-center gap-2.5 font-bold text-lg ${isLight ? "text-[#111827]" : "text-white"} tracking-wide">
        <div class="w-8 h-8 rounded-lg ${isLight ? "bg-[#7C2D48] text-white" : "bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 shadow-lg shadow-cyan-500/20"} flex items-center justify-center font-bold text-sm">
          ${brand.charAt(0).toUpperCase()}
        </div>
        <span>${brand}</span>
      </a>

      <!-- Desktop Nav -->
      <nav class="hidden md:flex items-center gap-6 text-sm font-medium ${isLight ? "text-[#4B5563]" : "text-slate-300"}">
        ${navLinks.map((link) => `<a href="${link.href || '#'}" class="${isLight ? "hover:text-[#7C2D48]" : "hover:text-cyan-400"} transition-colors">${link.label}</a>`).join("\n        ")}
      </nav>

      <div class="flex items-center gap-3">
        <a href="#formulario" class="px-4 py-2 rounded-lg text-xs font-semibold ${isLight ? "bg-[#7C2D48] hover:bg-[#642239] text-white" : "bg-cyan-500 hover:bg-cyan-400 text-black shadow-md shadow-cyan-500/20"} transition-all active:scale-95">
          ${state.navbar.ctaText || form?.submitLabel || "Acceder"}
        </a>
      </div>
    </div>
  </header>` : ""}

  ${hero ? `
  <!-- Hero Section -->
  <section id="inicio" class="relative pt-16 pb-12 md:pt-24 md:pb-20 px-4 sm:px-6 max-w-5xl mx-auto text-center flex flex-col items-center">
    ${hero.badge ? `
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold ${isLight ? "bg-[#FDF2F5] text-[#7C2D48] border border-[#F3D0DC]" : "bg-cyan-950/80 text-cyan-400 border border-cyan-800/60"} mb-6">
      ${hero.badge}
    </div>` : ""}

    <h1 class="text-4xl sm:text-6xl font-black ${isLight ? "text-[#111827]" : "text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400"} tracking-tight leading-tight max-w-4xl">
      ${hero.title}
    </h1>

    ${hero.subtitle ? `
    <p class="mt-6 text-lg sm:text-xl ${isLight ? "text-[#4B5563]" : "text-slate-400"} max-w-2xl leading-relaxed">
      ${hero.subtitle}
    </p>` : ""}

    <div class="mt-8 flex flex-wrap items-center justify-center gap-4">
      <a href="#formulario" class="px-6 py-3.5 rounded-xl font-bold text-sm ${isLight ? "bg-[#7C2D48] hover:bg-[#642239] text-white shadow-lg" : "bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 shadow-xl shadow-cyan-500/25"} transition-all transform hover:-translate-y-0.5 active:scale-95">
        ${hero.ctaText} →
      </a>
      ${hero.secondaryCtaText ? `
      <a href="#caracteristicas" class="px-6 py-3.5 rounded-xl font-bold text-sm ${isLight ? "bg-white hover:bg-slate-50 text-[#111827] border border-[#E2E8F0]" : "bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700"} transition-all active:scale-95">
        ${hero.secondaryCtaText}
      </a>` : ""}
    </div>
  </section>` : ""}

  <!-- Stats Section -->
  ${state.stats && state.stats.length > 0 ? `
  <section class="py-10 px-4 sm:px-6 max-w-6xl mx-auto w-full border-y ${isLight ? "border-[#E2E8F0]" : "border-slate-900/80"}">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      ${state.stats.map((s) => `
      <div class="p-4 rounded-2xl ${isLight ? "bg-white border border-[#E2E8F0]" : "bg-slate-900/40 border border-slate-800/80"} text-center">
        <div class="text-xs font-semibold ${isLight ? "text-[#6B7280]" : "text-slate-400"} uppercase tracking-wider">${s.label}</div>
        <div class="text-2xl sm:text-3xl font-extrabold ${isLight ? "text-[#111827]" : "text-white"} mt-1">${s.value}</div>
        ${s.change ? `<div class="text-xs mt-1 font-semibold ${s.isPositive ? (isLight ? 'text-[#2F6F4E]' : 'text-emerald-400') : (isLight ? 'text-[#6B7280]' : 'text-slate-400')}">${s.change}</div>` : ''}
      </div>`).join('')}
    </div>
  </section>` : ''}

  <!-- Features Section -->
  ${features.length > 0 ? `
  <section id="caracteristicas" class="py-16 px-4 sm:px-6 max-w-6xl mx-auto w-full">
    <div class="text-center mb-12">
      <h2 class="text-2xl sm:text-3xl font-extrabold ${isLight ? "text-[#111827]" : "text-white"}">Características Principales</h2>
      <p class="text-sm sm:text-base ${isLight ? "text-[#4B5563]" : "text-slate-400"} mt-2">Diseñado para ofrecer claridad, velocidad y resultados.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      ${features
        .map(
          (f) => `
      <div class="p-6 rounded-2xl ${isLight ? "bg-white border border-[#E2E8F0] hover:border-[#7C2D48]/40" : "bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/5"} transition-all group">
        <div class="text-3xl mb-4 p-3 w-fit rounded-xl ${isLight ? "bg-[#FDF2F5]" : "bg-slate-800/80"} group-hover:scale-110 transition-transform">${f.icon}</div>
        <h3 class="text-lg font-bold ${isLight ? "text-[#111827]" : "text-white"} mb-2">${f.title}</h3>
        <p class="text-sm ${isLight ? "text-[#4B5563]" : "text-slate-400"} leading-relaxed">${f.desc}</p>
      </div>`
        )
        .join("")}
    </div>
  </section>` : ""}

  <!-- Pricing Plans Section -->
  ${state.pricing && state.pricing.length > 0 ? `
  <section id="precios" class="py-16 px-4 sm:px-6 max-w-6xl mx-auto w-full">
    <div class="text-center mb-12">
      <h2 class="text-2xl sm:text-3xl font-extrabold ${isLight ? "text-[#111827]" : "text-white"}">Planes y Precios</h2>
      <p class="text-sm sm:text-base ${isLight ? "text-[#4B5563]" : "text-slate-400"} mt-2">Opciones claras listas para empezar hoy mismo.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-${Math.min(state.pricing.length, 3)} gap-6 items-stretch">
      ${state.pricing.map((p) => `
      <div class="relative p-6 sm:p-8 rounded-3xl flex flex-col justify-between transition-all ${
        p.isPopular
          ? (isLight ? 'bg-white border-2 border-[#7C2D48] shadow-lg' : 'bg-gradient-to-b from-cyan-950/60 to-slate-900/80 border-2 border-cyan-500 shadow-xl shadow-cyan-500/10')
          : (isLight ? 'bg-white border border-[#E2E8F0]' : 'bg-slate-900/60 border border-slate-800')
      }">
        ${p.isPopular ? `
        <div class="mb-3 inline-flex w-fit px-3 py-1 rounded-md text-[11px] font-bold ${isLight ? 'bg-[#7C2D48] text-white' : 'bg-cyan-500 text-black'} uppercase tracking-wider">
          Recomendado
        </div>` : ''}

        <div>
          <h3 class="text-lg font-bold ${isLight ? "text-[#111827]" : "text-white"}">${p.name}</h3>
          <div class="mt-4 flex items-baseline gap-1">
            <span class="text-3xl sm:text-4xl font-black ${isLight ? "text-[#111827]" : "text-white"}">${p.price}</span>
            <span class="text-xs ${isLight ? "text-[#6B7280]" : "text-slate-400"}">${p.period || '/mes'}</span>
          </div>

          <ul class="mt-6 space-y-3 text-xs sm:text-sm ${isLight ? "text-[#374151]" : "text-slate-300"}">
            ${p.features.map((feat) => `
            <li class="flex items-center gap-2">
              <span class="${isLight ? 'text-[#2F6F4E]' : 'text-emerald-400'} font-bold">✓</span>
              <span>${feat}</span>
            </li>`).join('')}
          </ul>
        </div>

        <a href="#formulario" class="mt-8 w-full py-3 px-4 rounded-xl font-bold text-xs text-center transition-all ${
          p.isPopular
            ? (isLight ? 'bg-[#7C2D48] hover:bg-[#642239] text-white' : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-md shadow-cyan-500/20')
            : (isLight ? 'bg-[#F7F8FA] hover:bg-[#F1F5F9] text-[#111827] border border-[#E2E8F0]' : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700')
        }">
          ${p.ctaText || 'Elegir Plan'} →
        </a>
      </div>`).join('')}
    </div>
  </section>` : ''}

  <!-- Testimonials Section -->
  ${state.testimonials && state.testimonials.length > 0 ? `
  <section id="testimonios" class="py-16 px-4 sm:px-6 max-w-6xl mx-auto w-full">
    <div class="text-center mb-12">
      <h2 class="text-2xl sm:text-3xl font-extrabold ${isLight ? "text-[#111827]" : "text-white"}">Lo que dicen nuestros clientes</h2>
      <p class="text-sm sm:text-base ${isLight ? "text-[#4B5563]" : "text-slate-400"} mt-2">Experiencias reales de quienes ya confían en nosotros.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      ${state.testimonials.map((t) => `
      <div class="p-6 rounded-2xl ${isLight ? "bg-white border border-[#E2E8F0]" : "bg-slate-900/60 border border-slate-800"} flex flex-col justify-between">
        <div class="space-y-3">
          <div class="text-amber-500 text-sm tracking-widest">${'★'.repeat(t.rating || 5)}</div>
          <p class="text-sm ${isLight ? "text-[#374151]" : "text-slate-300"} italic leading-relaxed">"${t.quote}"</p>
        </div>
        <div class="mt-6 pt-4 border-t ${isLight ? "border-[#E2E8F0]" : "border-slate-800/80"}">
          <div class="text-xs font-bold ${isLight ? "text-[#111827]" : "text-white"}">${t.author}</div>
          <div class="text-[11px] ${isLight ? "text-[#6B7280]" : "text-slate-400"}">${t.role || 'Cliente'}</div>
        </div>
      </div>`).join('')}
    </div>
  </section>` : ''}

  <!-- FAQ Accordion Section -->
  ${state.faqs && state.faqs.length > 0 ? `
  <section id="faq" class="py-16 px-4 sm:px-6 max-w-3xl mx-auto w-full">
    <div class="text-center mb-10">
      <h2 class="text-2xl sm:text-3xl font-extrabold ${isLight ? "text-[#111827]" : "text-white"}">Preguntas Frecuentes</h2>
      <p class="text-sm sm:text-base ${isLight ? "text-[#4B5563]" : "text-slate-400"} mt-2">Respuestas rápidas a las dudas más comunes.</p>
    </div>

    <div class="space-y-3">
      ${state.faqs.map((f) => `
      <details class="group p-4 rounded-2xl ${isLight ? "bg-white border border-[#E2E8F0]" : "bg-slate-900/60 border border-slate-800"} transition-all [&_summary::-webkit-details-marker]:hidden">
        <summary class="flex items-center justify-between cursor-pointer font-bold text-sm ${isLight ? "text-[#111827]" : "text-white"} select-none">
          <span>${f.question}</span>
          <span class="${isLight ? "text-[#6B7280]" : "text-slate-400"} transition-transform group-open:rotate-180">▼</span>
        </summary>
        <p class="mt-3 text-xs sm:text-sm ${isLight ? "text-[#4B5563] border-[#E2E8F0]" : "text-slate-400 border-slate-800/60"} leading-relaxed pt-2 border-t">
          ${f.answer}
        </p>
      </details>`).join('')}
    </div>
  </section>` : ''}

  <!-- Interactive HTML5 Form Section -->
  ${form ? `
  <section id="formulario" class="py-16 px-4 sm:px-6 max-w-2xl mx-auto w-full">
    <div class="${isLight ? "bg-white border border-[#E2E8F0] shadow-lg" : "bg-gradient-to-b from-slate-900/90 to-slate-900/60 border border-slate-800 shadow-2xl backdrop-blur-xl"} rounded-3xl p-6 sm:p-10">
      <div class="text-center mb-8">
        <h2 class="text-2xl sm:text-3xl font-extrabold ${isLight ? "text-[#111827]" : "text-white"}">${form.title}</h2>
        ${form.description ? `<p class="text-sm ${isLight ? "text-[#4B5563]" : "text-slate-400"} mt-2">${form.description}</p>` : ""}
      </div>

      <form id="nativeHtml5Form" class="space-y-5" onsubmit="handleFormSubmit(event)">
        ${form.fields
          .map((f) => {
            const labelCls = isLight ? "text-[#374151]" : "text-slate-300";
            const inputCls = isLight
              ? "bg-[#F7F8FA] border border-[#E2E8F0] text-[#111827] placeholder-[#9CA3AF] focus:border-[#7C2D48] focus:ring-1 focus:ring-[#7C2D48]"
              : "bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500";
            if (f.type === "textarea") {
              return `
        <div>
          <label for="${f.id}" class="block text-xs font-semibold ${labelCls} uppercase tracking-wider mb-2">${f.label}</label>
          <textarea id="${f.id}" name="${f.id}" rows="3" placeholder="${f.placeholder || ''}" class="w-full px-4 py-3 rounded-xl ${inputCls} focus:outline-none text-sm transition-all"></textarea>
        </div>`;
            }
            if (f.type === "select") {
              return `
        <div>
          <label for="${f.id}" class="block text-xs font-semibold ${labelCls} uppercase tracking-wider mb-2">${f.label}</label>
          <select id="${f.id}" name="${f.id}" class="w-full px-4 py-3 rounded-xl ${inputCls} focus:outline-none text-sm transition-all">
            ${(f.options || ["Opción 1", "Opción 2"]).map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
          </select>
        </div>`;
            }
            if (f.type === "checkbox") {
              return `
        <div class="flex items-center gap-3 pt-2">
          <input type="checkbox" id="${f.id}" name="${f.id}" class="w-4 h-4 rounded cursor-pointer">
          <label for="${f.id}" class="text-sm ${labelCls} cursor-pointer">${f.label}</label>
        </div>`;
            }
            return `
        <div>
          <label for="${f.id}" class="block text-xs font-semibold ${labelCls} uppercase tracking-wider mb-2">${f.label}</label>
          <input type="${f.type}" id="${f.id}" name="${f.id}" placeholder="${f.placeholder || ''}" ${f.required ? 'required' : ''} class="w-full px-4 py-3 rounded-xl ${inputCls} focus:outline-none text-sm transition-all">
        </div>`;
          })
          .join("")}

        <button type="submit" id="submitBtn" class="w-full mt-4 py-3.5 px-6 rounded-xl font-bold text-sm ${isLight ? "bg-[#7C2D48] hover:bg-[#642239] text-white" : "bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/25"} transition-all transform active:scale-95 flex items-center justify-center gap-2">
          <span>${form.submitLabel}</span>
          <span>✓</span>
        </button>

        <div id="formSuccessAlert" class="hidden mt-4 p-4 rounded-xl ${isLight ? "bg-[#EEF6F1] border border-[#CFE4D7] text-[#2F6F4E]" : "bg-emerald-950/80 border border-emerald-500/60 text-emerald-300"} text-sm text-center">
          ✅ ¡Información registrada y sincronizada con éxito!
        </div>
      </form>
    </div>
  </section>` : ""}

  <!-- Call To Action Banner -->
  ${state.ctaBanner ? `
  <section class="py-16 px-4 sm:px-6 max-w-5xl mx-auto w-full">
    <div class="p-8 sm:p-12 rounded-3xl ${isLight ? "bg-[#FDF2F5] border border-[#F3D0DC]" : "bg-gradient-to-r from-cyan-900/60 via-blue-900/50 to-slate-900/80 border border-cyan-500/30 shadow-2xl"} text-center space-y-4">
      ${state.ctaBanner.badge ? `
      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold ${isLight ? "bg-[#7C2D48] text-white" : "bg-cyan-500 text-black"}">
        ${state.ctaBanner.badge}
      </div>` : ''}
      <h2 class="text-3xl sm:text-4xl font-black ${isLight ? "text-[#111827]" : "text-white"}">${state.ctaBanner.title}</h2>
      ${state.ctaBanner.subtitle ? `<p class="${isLight ? "text-[#4B5563]" : "text-slate-300"} max-w-xl mx-auto text-sm sm:text-base">${state.ctaBanner.subtitle}</p>` : ''}
      <div class="pt-4">
        <a href="#formulario" class="px-8 py-3.5 rounded-xl font-bold text-sm ${isLight ? "bg-[#7C2D48] hover:bg-[#642239] text-white" : "bg-cyan-400 hover:bg-cyan-300 text-black shadow-lg shadow-cyan-500/30"} transition-all inline-block">
          ${state.ctaBanner.buttonText} →
        </a>
      </div>
    </div>
  </section>` : ''}

  ${footer ? `
  <!-- Footer -->
  <footer class="mt-auto border-t ${isLight ? "border-[#E2E8F0] bg-white" : "border-slate-900 bg-black"} py-8 px-4 sm:px-6">
    <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${isLight ? "text-[#6B7280]" : "text-slate-500"}">
      <div>${footer.text}</div>
      <div class="flex items-center gap-4">
        ${footer.links.map((link) => `<a href="#" class="${isLight ? "hover:text-[#7C2D48]" : "hover:text-slate-300"} transition-colors">${link}</a>`).join("")}
      </div>
    </div>
  </footer>` : ""}

  <!-- Instant JavaScript Runtime -->
  <script>
    function handleFormSubmit(e) {
      e.preventDefault();
      const form = e.target;
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      console.log("[DIV HTML5 Runtime] Form Submitted:", data);

      // Save to localStorage for instant persistence
      try {
        const history = JSON.parse(localStorage.getItem("div_html5_records") || "[]");
        history.push({ ...data, _created: new Date().toISOString() });
        localStorage.setItem("div_html5_records", JSON.stringify(history));
      } catch (err) {}

      // UI Feedback
      const alertBox = document.getElementById("formSuccessAlert");
      if (alertBox) {
        alertBox.classList.remove("hidden");
        setTimeout(() => alertBox.classList.add("hidden"), 4000);
      }
      form.reset();
    }
  </script>
</body>
</html>`;
}
