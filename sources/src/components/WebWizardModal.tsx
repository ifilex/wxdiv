import React, { useState, useMemo } from "react";
import {
  X,
  Globe,
  ShoppingBag,
  Rocket,
  Briefcase,
  User,
  ChevronLeft,
  ChevronRight,
  Play,
  Sparkles,
  Code2,
  Check,
  LayoutTemplate,
  Eye,
  Sun,
  Moon,
  HelpCircle,
} from "lucide-react";

export type WebArchetype = "sales" | "saas" | "services" | "portfolio";
export type WebVisualTheme = "light" | "dark";

export interface WebFeatureDraft {
  icon: string;
  title: string;
  desc: string;
}

export interface WebPricingDraft {
  name: string;
  price: string;
  period: string;
  features: string;
  isPopular: boolean;
  ctaText: string;
}

export interface WebStatDraft {
  label: string;
  value: string;
  change: string;
}

export interface WebTestimonialDraft {
  quote: string;
  author: string;
  role: string;
}

export interface WebFaqDraft {
  question: string;
  answer: string;
}

export interface WebWizardConfig {
  archetype: WebArchetype;
  theme: WebVisualTheme;
  brand: string;
  navLinks: string;
  navCta: string;
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  heroSecondaryCta: string;
  includeStats: boolean;
  stats: WebStatDraft[];
  includeFeatures: boolean;
  features: WebFeatureDraft[];
  includePricing: boolean;
  pricing: WebPricingDraft[];
  includeTestimonials: boolean;
  testimonials: WebTestimonialDraft[];
  includeFaq: boolean;
  faqs: WebFaqDraft[];
  includeForm: boolean;
  formTitle: string;
  formDesc: string;
  formButton: string;
  includeCtaBanner: boolean;
  ctaBannerTitle: string;
  ctaBannerSubtitle: string;
  ctaBannerButton: string;
  includeFooter: boolean;
  footerLinks: string;
}

function escapeDivStr(value: string): string {
  return (value || "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "'")
    .replace(/\r?\n/g, " ")
    .trim();
}

function sanitizeSlug(name: string): string {
  const clean = (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  return clean && /^[a-z]/.test(clean) ? clean : "mi_web";
}

export function createDefaultWebConfig(archetype: WebArchetype): WebWizardConfig {
  if (archetype === "sales") {
    return {
      archetype: "sales",
      theme: "light",
      brand: "WineBOX Store",
      navLinks: "Catálogo,Ofertas,Reseñas,Preguntas,Pedidos",
      navCta: "Hacer Pedido",
      heroBadge: "Envío Gratis en 24h",
      heroTitle: "Selección Premium Directo a tu Puerta",
      heroSubtitle:
        "Descubre packs curados con garantía total, atención personalizada y despacho inmediato a todo el país.",
      heroCta: "Ver Ofertas y Packs",
      heroSecondaryCta: "Consultar Stock",
      includeStats: true,
      stats: [
        { label: "Clientes Felices", value: "4,800+", change: "99% recomiendan" },
        { label: "Tiempo de Entrega", value: "24 hs", change: "Envío asegurado" },
        { label: "Valoración Media", value: "4.9 / 5", change: "Reseñas reales" },
      ],
      includeFeatures: true,
      features: [
        {
          icon: "📦",
          title: "Empaque Protegido",
          desc: "Cada pedido viaja sellado con control térmico y seguro incluido.",
        },
        {
          icon: "💳",
          title: "Pago Flexible",
          desc: "Acepta tarjeta, transferencia o pago contra entrega sin recargos.",
        },
        {
          icon: "🎁",
          title: "Garantía de Satisfacción",
          desc: "Si no es lo que esperabas, lo cambiamos sin preguntas.",
        },
      ],
      includePricing: true,
      pricing: [
        {
          name: "Pack Degustación",
          price: "$29",
          period: " / pack x3",
          features: "3 unidades seleccionadas, Guía impresa, Envío estándar",
          isPopular: false,
          ctaText: "Comprar Pack",
        },
        {
          name: "Pack Reserva (Más Vendido)",
          price: "$54",
          period: " / caja x6",
          features: "6 unidades exclusivas, Envío 24h GRATIS, Regalo sorpresa",
          isPopular: true,
          ctaText: "Comprar Ahora",
        },
        {
          name: "Pack Evento / Empresa",
          price: "$98",
          period: " / caja x12",
          features: "12 unidades premium, Factura fiscal, Atención prioritaria",
          isPopular: false,
          ctaText: "Solicitar Caja",
        },
      ],
      includeTestimonials: true,
      testimonials: [
        {
          quote: "Llegó al día siguiente en perfecto estado. La presentación para regalo superó mis expectativas.",
          author: "Carolina Méndez",
          role: "Compradora Verificada",
        },
        {
          quote: "Pedimos cajas para nuestro evento de fin de año y el equipo resolvió todo en minutos.",
          author: "Javier Torres",
          role: "Director Comercial",
        },
      ],
      includeFaq: true,
      faqs: [
        {
          question: "¿Cuánto tarda en llegar mi pedido?",
          answer: "Despachamos en el día y recibes entre 24 y 48 horas hábiles según tu ciudad.",
        },
        {
          question: "¿Puedo pedir factura o compra por mayor?",
          answer: "Sí, completando el formulario final te enviamos cotización personalizada al instante.",
        },
      ],
      includeForm: true,
      formTitle: "Reserva tu Pedido o Consulta",
      formDesc: "Déjanos tus datos y confirmamos stock y entrega en menos de 15 minutos.",
      formButton: "Confirmar Pedido",
      includeCtaBanner: true,
      ctaBannerTitle: "Aprovecha 15% OFF en tu primera compra hoy",
      ctaBannerSubtitle: "Stock limitado por temporada. Reserva tu pack en un clic.",
      ctaBannerButton: "Quiero mi Descuento",
      includeFooter: true,
      footerLinks: "Catálogo,Envíos,Términos,Contacto",
    };
  }

  if (archetype === "services") {
    return {
      archetype: "services",
      theme: "light",
      brand: "Clínica & Estudio Vital",
      navLinks: "Servicios,Planes,Testimonios,FAQ,Reservar",
      navCta: "Agendar Cita",
      heroBadge: "Atención Personalizada",
      heroTitle: "Cuidamos tu Negocio y Bienestar con Resultados Medibles",
      heroSubtitle:
        "Agenda tu primera consulta de diagnóstico en 1 minuto. Atención presencial y online con especialistas certificados.",
      heroCta: "Reservar Consulta",
      heroSecondaryCta: "Ver Servicios",
      includeStats: true,
      stats: [
        { label: "Pacientes / Clientes", value: "2,400+", change: "Desde 2019" },
        { label: "Satisfacción", value: "98.5%", change: "Encuestas verificadas" },
        { label: "Respuesta Media", value: "< 15 min", change: "WhatsApp y Web" },
      ],
      includeFeatures: true,
      features: [
        {
          icon: "🩺",
          title: "Evaluación Inicial Completa",
          desc: "Analizamos tu situación actual y te entregamos un plan claro desde el día uno.",
        },
        {
          icon: "📅",
          title: "Horarios Flexibles",
          desc: "Turnos disponibles de lunes a sábado con confirmación inmediata.",
        },
        {
          icon: "✨",
          title: "Seguimiento Continuo",
          desc: "Acompañamiento cercano para asegurar que cumplas tus objetivos.",
        },
      ],
      includePricing: true,
      pricing: [
        {
          name: "Consulta Inicial",
          price: "$35",
          period: " / sesión",
          features: "Diagnóstico de 45 min, Plan de acción, Informe digital",
          isPopular: false,
          ctaText: "Agendar Sesión",
        },
        {
          name: "Programa Mensual",
          price: "$110",
          period: " / mes",
          features: "4 sesiones personalizadas, Soporte directo, Ajustes semanales",
          isPopular: true,
          ctaText: "Elegir Programa",
        },
      ],
      includeTestimonials: true,
      testimonials: [
        {
          quote: "Desde la primera consulta sentí claridad y confianza. Súper puntuales y humanos.",
          author: "Valeria Gómez",
          role: "Cliente desde 2024",
        },
        {
          quote: "Me encantó poder agendar todo desde la página sin llamadas eternas.",
          author: "Marcos Silva",
          role: "Emprendedor Local",
        },
      ],
      includeFaq: true,
      faqs: [
        {
          question: "¿Atienden también de forma online?",
          answer: "Sí, puedes elegir modalidad presencial en consulta o videollamada privada.",
        },
        {
          question: "¿Cómo confirmo mi turno?",
          answer: "Completa el formulario abajo y recibirás la confirmación de horario al instante.",
        },
      ],
      includeForm: true,
      formTitle: "Solicita tu Turno o Presupuesto",
      formDesc: "Indícanos qué servicio te interesa y coordinamos el horario ideal para ti.",
      formButton: "Solicitar Turno",
      includeCtaBanner: true,
      ctaBannerTitle: "¿Tienes dudas antes de reservar?",
      ctaBannerSubtitle: "Escríbenos ahora y te orientamos sin compromiso.",
      ctaBannerButton: "Hablar con un Especialista",
      includeFooter: true,
      footerLinks: "Servicios,Horarios,Privacidad,Contacto",
    };
  }

  if (archetype === "portfolio") {
    return {
      archetype: "portfolio",
      theme: "light",
      brand: "Alex Rivera · Studio",
      navLinks: "Sobre Mí,Proyectos,Servicios,Contacto",
      navCta: "Contratar",
      heroBadge: "Disponible para Proyectos",
      heroTitle: "Diseño Digital y Desarrollo Web para Marcas que Quieren Destacar",
      heroSubtitle:
        "Ayudo a emprendedores y empresas a transformar ideas complejas en productos digitales claros, rápidos y rentables.",
      heroCta: "Solicitar Propuesta",
      heroSecondaryCta: "Ver Experiencia",
      includeStats: true,
      stats: [
        { label: "Proyectos Entregados", value: "65+", change: "Webs y Apps" },
        { label: "Experiencia", value: "7 Años", change: "Producto Digital" },
        { label: "Clientes Recurrentes", value: "92%", change: "Largo plazo" },
      ],
      includeFeatures: true,
      features: [
        {
          icon: "🎨",
          title: "Diseño UI / UX a Medida",
          desc: "Interfaces limpias pensadas para convertir visitas en clientes reales.",
        },
        {
          icon: "⚡",
          title: "Desarrollo Rápido",
          desc: "Sitios livianos que cargan al instante tanto en celular como en escritorio.",
        },
        {
          icon: "📈",
          title: "Enfoque en Resultados",
          desc: "Cada sección se estructura para guiar al usuario hacia tu objetivo.",
        },
      ],
      includePricing: false,
      pricing: [
        {
          name: "Landing Express",
          price: "$290",
          period: " pago único",
          features: "Diseño responsivo, Formulario de leads, Entrega en 5 días",
          isPopular: true,
          ctaText: "Contratar Landing",
        },
        {
          name: "Web Completa + Tienda",
          price: "$650",
          period: " pago único",
          features: "Hasta 5 secciones, Catálogo integrado, Soporte post-lanzamiento",
          isPopular: false,
          ctaText: "Pedir Presupuesto",
        },
      ],
      includeTestimonials: true,
      testimonials: [
        {
          quote: "Triplicamos las consultas de nuestra web desde la primera semana de lanzamiento.",
          author: "Sofía Castro",
          role: "Fundadora de Casa Nube",
        },
        {
          quote: "Comunicación impecable y entregas siempre antes de la fecha acordada.",
          author: "Diego Paredes",
          role: "CEO en NovaRetail",
        },
      ],
      includeFaq: true,
      faqs: [
        {
          question: "¿Cuánto demora crear mi página web?",
          answer: "Una landing page suele estar lista en 5 a 7 días hábiles desde la aprobación inicial.",
        },
        {
          question: "¿Incluye adaptación a celulares?",
          answer: "Sí, cada proyecto se diseña primero para pantalla móvil y luego escritorio.",
        },
      ],
      includeForm: true,
      formTitle: "Cuéntame sobre tu Proyecto",
      formDesc: "Respondo en menos de 24 horas con un plan y presupuesto claro.",
      formButton: "Enviar Consulta",
      includeCtaBanner: false,
      ctaBannerTitle: "Construyamos tu próximo proyecto juntos",
      ctaBannerSubtitle: "Agenda una llamada breve o envíame los detalles de tu idea.",
      ctaBannerButton: "Contactar Ahora",
      includeFooter: true,
      footerLinks: "LinkedIn,Proyectos,Privacidad,Contacto",
    };
  }

  // Default: "saas"
  return {
    archetype: "saas",
    theme: "dark",
    brand: "Impulsa Cloud",
    navLinks: "Inicio,Beneficios,Precios,FAQ,Contacto",
    navCta: "Probar Gratis",
    heroBadge: "Nueva Plataforma 2026",
    heroTitle: "Automatiza tu Negocio y Multiplica tus Ventas Online",
    heroSubtitle:
      "Centraliza clientes, cobros y campañas desde un solo panel intuitivo. Sin configuraciones técnicas ni permanencia.",
    heroCta: "Empezar Prueba Gratis",
    heroSecondaryCta: "Solicitar Demo",
    includeStats: true,
    stats: [
      { label: "Equipos Activos", value: "12,500+", change: "+32% este mes" },
      { label: "Ahorro de Tiempo", value: "14h / sem", change: "Promedio por cliente" },
      { label: "Disponibilidad", value: "99.99%", change: "Garantía Cloud" },
    ],
    includeFeatures: true,
    features: [
      {
        icon: "⚡",
        title: "Puesta en Marcha en 2 Minutos",
        desc: "Importa tus datos o usa plantillas listas para empezar a operar hoy mismo.",
      },
      {
        icon: "📱",
        title: "100% Adaptado a Celular",
        desc: "Gestiona pedidos, citas y mensajes desde cualquier lugar.",
      },
      {
        icon: "📊",
        title: "Métricas en Tiempo Real",
        desc: "Visualiza tus ingresos y conversiones sin hojas de cálculo complicadas.",
      },
    ],
    includePricing: true,
    pricing: [
      {
        name: "Inicial",
        price: "$0",
        period: "/mes",
        features: "Hasta 100 registros, Panel web y móvil, Soporte por email",
        isPopular: false,
        ctaText: "Crear Cuenta Gratis",
      },
      {
        name: "Profesional",
        price: "$19",
        period: "/mes",
        features: "Registros ilimitados, Automatizaciones, Dominio propio y soporte 24/7",
        isPopular: true,
        ctaText: "Elegir Profesional",
      },
      {
        name: "Empresas",
        price: "$49",
        period: "/mes",
        features: "Múltiples sucursales, Roles de equipo, Asesor dedicado",
        isPopular: false,
        ctaText: "Contactar Ventas",
      },
    ],
    includeTestimonials: true,
    testimonials: [
      {
        quote: "Dejamos atrás cinco planillas distintas. Hoy todo el equipo trabaja ordenado desde un solo lugar.",
        author: "Laura Giménez",
        role: "Operaciones en MercadoSur",
      },
      {
        quote: "La página de registro y el cobro automático aumentaron nuestras ventas un 40%.",
        author: "Fernando Ruiz",
        role: "Fundador de Studio8",
      },
    ],
    includeFaq: true,
    faqs: [
      {
        question: "¿Necesito tarjeta de crédito para probar?",
        answer: "No, el plan Inicial es gratuito y puedes actualizar cuando tu negocio crezca.",
      },
      {
        question: "¿Puedo exportar mi web para publicarla en mi hosting?",
        answer: "Sí, puedes descargar el HTML5 listo para subir a Netlify, Vercel o tu servidor.",
      },
    ],
    includeForm: true,
    formTitle: "Solicita Acceso o Resuelve tus Dudas",
    formDesc: "Déjanos tu correo y activa tu espacio de trabajo hoy mismo.",
    formButton: "Enviar Solicitud",
    includeCtaBanner: true,
    ctaBannerTitle: "Lanza tu plataforma digital hoy sin complicaciones",
    ctaBannerSubtitle: "Únete a miles de proyectos que ya optimizan su crecimiento.",
    ctaBannerButton: "Comenzar Ahora",
    includeFooter: true,
    footerLinks: "Inicio,Términos,Privacidad,Soporte",
  };
}

export function generateDivWebCodeFromWizard(config: WebWizardConfig): string {
  const slug = sanitizeSlug(config.brand);
  const lines: string[] = [];

  lines.push(`// =================================================================`);
  lines.push(`// WXDIV 3.0 - PÁGINA WEB HTML5: ${escapeDivStr(config.brand).toUpperCase()}`);
  lines.push(`// =================================================================`);
  lines.push(`PROGRAM web_${slug};`);
  lines.push(``);
  lines.push(`BEGIN`);
  lines.push(`  set_mode(m800x600);`);
  lines.push(`  set_fps(60);`);
  lines.push(`  set_html5_mode(1);`);
  lines.push(`  set_title("${escapeDivStr(config.brand)}");`);
  lines.push(``);
  lines.push(
    `  web_page("${escapeDivStr(config.brand)}", "${escapeDivStr(config.heroTitle)}", "${config.theme}");`
  );
  lines.push(
    `  web_navbar("${escapeDivStr(config.brand)}", "${escapeDivStr(config.navLinks)}", "${escapeDivStr(config.navCta)}", "btn_nav_cta");`
  );
  lines.push(``);
  lines.push(
    `  web_hero("${escapeDivStr(config.heroTitle)}", "${escapeDivStr(config.heroSubtitle)}", "${escapeDivStr(config.heroCta)}", "btn_hero_cta", "${escapeDivStr(config.heroSecondaryCta)}", "btn_hero_sec", "${escapeDivStr(config.heroBadge)}");`
  );

  if (config.includeStats && config.stats.length > 0) {
    lines.push(``);
    for (const st of config.stats) {
      if (!st.label.trim() && !st.value.trim()) continue;
      lines.push(
        `  web_stat("${escapeDivStr(st.label)}", "${escapeDivStr(st.value)}", "${escapeDivStr(st.change)}", true);`
      );
    }
  }

  if (config.includeFeatures && config.features.length > 0) {
    lines.push(``);
    for (const ft of config.features) {
      if (!ft.title.trim()) continue;
      lines.push(
        `  web_feature("${escapeDivStr(ft.icon || "✨")}", "${escapeDivStr(ft.title)}", "${escapeDivStr(ft.desc)}");`
      );
    }
  }

  if (config.includePricing && config.pricing.length > 0) {
    lines.push(``);
    config.pricing.forEach((plan, idx) => {
      if (!plan.name.trim()) return;
      lines.push(
        `  web_pricing("${escapeDivStr(plan.name)}", "${escapeDivStr(plan.price)}", "${escapeDivStr(plan.period)}", "${escapeDivStr(plan.features)}", ${plan.isPopular ? "true" : "false"}, "${escapeDivStr(plan.ctaText)}", "plan_${idx + 1}");`
      );
    });
  }

  if (config.includeTestimonials && config.testimonials.length > 0) {
    lines.push(``);
    for (const ts of config.testimonials) {
      if (!ts.quote.trim()) continue;
      lines.push(
        `  web_testimonial("${escapeDivStr(ts.quote)}", "${escapeDivStr(ts.author)}", "${escapeDivStr(ts.role)}", 5);`
      );
    }
  }

  if (config.includeFaq && config.faqs.length > 0) {
    lines.push(``);
    for (const fq of config.faqs) {
      if (!fq.question.trim()) continue;
      lines.push(
        `  web_faq("${escapeDivStr(fq.question)}", "${escapeDivStr(fq.answer)}");`
      );
    }
  }

  if (config.includeForm) {
    lines.push(``);
    lines.push(
      `  web_contact_form("${escapeDivStr(config.formTitle)}", "${escapeDivStr(config.formDesc)}", "${escapeDivStr(config.formButton)}", "enviar_formulario_web");`
    );
  }

  if (config.includeCtaBanner) {
    lines.push(``);
    lines.push(
      `  web_cta_banner("${escapeDivStr(config.ctaBannerTitle)}", "${escapeDivStr(config.ctaBannerSubtitle)}", "${escapeDivStr(config.ctaBannerButton)}", "btn_cta_final", "Oferta Activa");`
    );
  }

  if (config.includeFooter) {
    lines.push(``);
    lines.push(
      `  web_footer("${escapeDivStr(config.brand)}", "© 2026 ${escapeDivStr(config.brand)}. Todos los derechos reservados.", "${escapeDivStr(config.footerLinks)}");`
    );
  }

  lines.push(``);
  lines.push(`  LOOP`);
  lines.push(`    FRAME;`);
  lines.push(`  END`);
  lines.push(`END`);

  return lines.join("\n");
}

interface WebWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyWebCode: (code: string, options: { runImmediately?: boolean; openAiPrompt?: string; title?: string }) => void;
}

const WIZARD_STEPS = [
  { id: "type", label: "1. Tipo y Cómo Funciona" },
  { id: "identity", label: "2. Marca y Portada" },
  { id: "sections", label: "3. Secciones y Ventas" },
  { id: "launch", label: "4. Lanzar o Editar con IA" },
] as const;

const ARCHETYPES: Array<{
  id: WebArchetype;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "sales",
    title: "Tienda / Catálogo de Ventas",
    subtitle: "Packs o productos con precios, ofertas y formulario de pedido.",
    icon: ShoppingBag,
  },
  {
    id: "saas",
    title: "Landing de Producto o App",
    subtitle: "Presentación comercial, beneficios, suscripciones y captación de leads.",
    icon: Rocket,
  },
  {
    id: "services",
    title: "Negocio Local o Servicios",
    subtitle: "Clínicas, agencias o estudios con testimonios, FAQ y reserva de turnos.",
    icon: Briefcase,
  },
  {
    id: "portfolio",
    title: "Portafolio o Marca Personal",
    subtitle: "Presenta tu trabajo, cifras reales de experiencia y contacto directo.",
    icon: User,
  },
];

export const WebWizardModal: React.FC<WebWizardModalProps> = ({
  isOpen,
  onClose,
  onApplyWebCode,
}) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [config, setConfig] = useState<WebWizardConfig>(() => createDefaultWebConfig("sales"));
  const [showCodePreview, setShowCodePreview] = useState(false);

  const generatedCode = useMemo(() => generateDivWebCodeFromWizard(config), [config]);

  if (!isOpen) return null;

  const handleSelectArchetype = (arch: WebArchetype) => {
    setConfig(createDefaultWebConfig(arch));
  };

  const activeSectionsSummary = [
    "Barra de navegación y Portada Hero",
    config.includeStats && "Métricas de confianza",
    config.includeFeatures && "Tarjetas de productos o beneficios",
    config.includePricing && "Planes o paquetes con precios",
    config.includeTestimonials && "Testimonios de clientes",
    config.includeFaq && "Preguntas frecuentes (FAQ)",
    config.includeForm && "Formulario de pedido / contacto",
    config.includeCtaBanner && "Banner final de llamada a la acción",
    config.includeFooter && "Pie de página",
  ].filter(Boolean) as string[];

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-0 sm:p-4 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="web-wizard-title"
    >
      <div className="w-full sm:max-w-3xl max-h-[94dvh] bg-white rounded-t-2xl sm:rounded-2xl border border-[#E2E8F0] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-white border-b border-[#E2E8F0] flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#7C2D48] text-white flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="web-wizard-title" className="text-sm sm:text-base font-bold text-[#111827] truncate">
                Asistente de Páginas Web, Tiendas y Landings
              </h2>
              <p className="text-xs text-[#6B7280] truncate">
                Crea tu sitio HTML5 paso a paso o continúa editándolo con AURA IA
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-xl hover:bg-slate-100 text-[#4B5563] flex items-center justify-center flex-shrink-0 cursor-pointer"
            aria-label="Cerrar asistente web"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Navigation */}
        <div className="px-3 sm:px-6 py-2 bg-[#F7F8FA] border-b border-[#E2E8F0] flex items-center gap-1.5 overflow-x-auto flex-shrink-0">
          {WIZARD_STEPS.map((st, idx) => {
            const active = idx === stepIdx;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setStepIdx(idx)}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? "bg-[#7C2D48] text-white"
                    : "bg-white text-[#4B5563] border border-[#E2E8F0] hover:text-[#111827]"
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 bg-white">
          {/* STEP 1: ARCHETYPE + HOW WXDIV BUILDS WEBSITES */}
          {stepIdx === 0 && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-[#FDF2F5] border border-[#F3D0DC] p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[#111827]">
                  <LayoutTemplate className="w-4 h-4 text-[#7C2D48] flex-shrink-0" />
                  <span>Cómo crea páginas web reales WXDIV</span>
                </div>
                <p className="text-xs sm:text-sm text-[#374151] leading-relaxed">
                  Además de videojuegos, WXDIV convierte órdenes sencillas como{" "}
                  <code className="font-mono text-[#7C2D48] font-semibold">web_hero</code>,{" "}
                  <code className="font-mono text-[#7C2D48] font-semibold">web_pricing</code> y{" "}
                  <code className="font-mono text-[#7C2D48] font-semibold">web_contact_form</code> en una{" "}
                  <strong>página web HTML5 real</strong> que puedes probar en vivo, editar hablando con{" "}
                  <strong>AURA IA</strong> y descargar lista para publicar en internet.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  Elige el punto de partida de tu sitio web
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ARCHETYPES.map((arch) => {
                    const Icon = arch.icon;
                    const selected = config.archetype === arch.id;
                    return (
                      <button
                        key={arch.id}
                        type="button"
                        onClick={() => handleSelectArchetype(arch.id)}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                          selected
                            ? "border-[#7C2D48] bg-[#FDF2F5]/60 ring-1 ring-[#7C2D48]/30"
                            : "border-[#E2E8F0] bg-[#F7F8FA] hover:border-[#CBD5E1]"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            selected
                              ? "bg-[#7C2D48] text-white"
                              : "bg-white border border-[#E2E8F0] text-[#7C2D48]"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs sm:text-sm font-bold text-[#111827]">
                              {arch.title}
                            </span>
                            {selected && <Check className="w-4 h-4 text-[#7C2D48] flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-[#4B5563] mt-1 leading-relaxed">
                            {arch.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  Estilo visual de la página
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, theme: "light" }))}
                    className={`min-h-[48px] px-4 py-3 rounded-xl border text-left flex items-center gap-3 cursor-pointer transition-all ${
                      config.theme === "light"
                        ? "border-[#7C2D48] bg-[#FDF2F5]/60"
                        : "border-[#E2E8F0] bg-[#F7F8FA]"
                    }`}
                  >
                    <Sun className="w-4 h-4 text-[#7C2D48] flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#111827]">Claro Editorial (Estilo WineBOX)</div>
                      <div className="text-[11px] text-[#6B7280]">Fondo blanco limpio con acentos vino</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, theme: "dark" }))}
                    className={`min-h-[48px] px-4 py-3 rounded-xl border text-left flex items-center gap-3 cursor-pointer transition-all ${
                      config.theme === "dark"
                        ? "border-[#7C2D48] bg-[#FDF2F5]/60"
                        : "border-[#E2E8F0] bg-[#F7F8FA]"
                    }`}
                  >
                    <Moon className="w-4 h-4 text-[#111827] flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#111827]">Oscuro Tecnológico</div>
                      <div className="text-[11px] text-[#6B7280]">Fondo oscuro con alto contraste moderno</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: IDENTITY AND HERO */}
          {stepIdx === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  Personaliza tu marca y la primera pantalla (Portada)
                </h3>
                <p className="text-xs text-[#4B5563] mt-0.5">
                  Esto es lo primero que verán tus visitantes al entrar a tu web o tienda.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Nombre de tu Marca o Negocio
                  </label>
                  <input
                    type="text"
                    value={config.brand}
                    onChange={(e) => setConfig((p) => ({ ...p, brand: e.target.value }))}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] focus:bg-white focus:border-[#7C2D48] text-xs text-[#111827] outline-none"
                    placeholder="Ej. WineBOX Store"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Botón del Menú Superior
                  </label>
                  <input
                    type="text"
                    value={config.navCta}
                    onChange={(e) => setConfig((p) => ({ ...p, navCta: e.target.value }))}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] focus:bg-white focus:border-[#7C2D48] text-xs text-[#111827] outline-none"
                    placeholder="Ej. Comprar Ahora"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Enlaces del menú superior (separados por comas)
                </label>
                <input
                  type="text"
                  value={config.navLinks}
                  onChange={(e) => setConfig((p) => ({ ...p, navLinks: e.target.value }))}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] focus:bg-white focus:border-[#7C2D48] text-xs text-[#111827] outline-none"
                />
              </div>

              <div className="p-4 rounded-2xl border border-[#E2E8F0] bg-[#F7F8FA] space-y-3.5">
                <div className="text-xs font-bold text-[#111827]">Portada Principal (Hero)</div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">
                      Etiqueta destacada superior (opcional)
                    </label>
                    <input
                      type="text"
                      value={config.heroBadge}
                      onChange={(e) => setConfig((p) => ({ ...p, heroBadge: e.target.value }))}
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white focus:border-[#7C2D48] text-xs text-[#111827] outline-none"
                      placeholder="Ej. Envío Gratis 24h"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">
                      Botón principal de llamada a la acción
                    </label>
                    <input
                      type="text"
                      value={config.heroCta}
                      onChange={(e) => setConfig((p) => ({ ...p, heroCta: e.target.value }))}
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white focus:border-[#7C2D48] text-xs text-[#111827] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Titular Principal (La promesa más importante)
                  </label>
                  <input
                    type="text"
                    value={config.heroTitle}
                    onChange={(e) => setConfig((p) => ({ ...p, heroTitle: e.target.value }))}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white focus:border-[#7C2D48] text-xs text-[#111827] font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Subtítulo descriptivo
                  </label>
                  <textarea
                    rows={2}
                    value={config.heroSubtitle}
                    onChange={(e) => setConfig((p) => ({ ...p, heroSubtitle: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white focus:border-[#7C2D48] text-xs text-[#111827] outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SECTIONS & SALES MODULES */}
          {stepIdx === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  Activa y edita las secciones de tu página
                </h3>
                <p className="text-xs text-[#4B5563] mt-0.5">
                  Activa solo los bloques que necesites. También podrás pedirle más cambios a AURA IA después.
                </p>
              </div>

              {/* Section 1: Features / Products */}
              <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                <label className="px-4 py-3 bg-[#F7F8FA] flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-xs font-bold text-[#111827]">
                    Tarjetas de Productos, Servicios o Beneficios
                  </span>
                  <input
                    type="checkbox"
                    checked={config.includeFeatures}
                    onChange={(e) => setConfig((p) => ({ ...p, includeFeatures: e.target.checked }))}
                    className="w-4 h-4 accent-[#7C2D48]"
                  />
                </label>
                {config.includeFeatures && (
                  <div className="p-3.5 space-y-2.5 bg-white border-t border-[#E2E8F0]">
                    {config.features.map((feat, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <input
                          type="text"
                          value={feat.icon}
                          onChange={(e) => {
                            const next = [...config.features];
                            next[idx] = { ...next[idx], icon: e.target.value };
                            setConfig((p) => ({ ...p, features: next }));
                          }}
                          className="sm:col-span-1 min-h-[38px] px-2 py-1.5 rounded-lg border border-[#E2E8F0] text-center text-xs"
                          aria-label="Icono"
                        />
                        <input
                          type="text"
                          value={feat.title}
                          onChange={(e) => {
                            const next = [...config.features];
                            next[idx] = { ...next[idx], title: e.target.value };
                            setConfig((p) => ({ ...p, features: next }));
                          }}
                          placeholder="Título de tarjeta"
                          className="sm:col-span-4 min-h-[38px] px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#111827]"
                        />
                        <input
                          type="text"
                          value={feat.desc}
                          onChange={(e) => {
                            const next = [...config.features];
                            next[idx] = { ...next[idx], desc: e.target.value };
                            setConfig((p) => ({ ...p, features: next }));
                          }}
                          placeholder="Descripción breve"
                          className="sm:col-span-7 min-h-[38px] px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs text-[#4B5563]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: Pricing / Packs */}
              <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                <label className="px-4 py-3 bg-[#F7F8FA] flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-xs font-bold text-[#111827]">
                    Tabla de Precios, Packs o Planes de Venta
                  </span>
                  <input
                    type="checkbox"
                    checked={config.includePricing}
                    onChange={(e) => setConfig((p) => ({ ...p, includePricing: e.target.checked }))}
                    className="w-4 h-4 accent-[#7C2D48]"
                  />
                </label>
                {config.includePricing && (
                  <div className="p-3.5 space-y-3 bg-white border-t border-[#E2E8F0]">
                    {config.pricing.map((plan, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA]/60 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={plan.name}
                            onChange={(e) => {
                              const next = [...config.pricing];
                              next[idx] = { ...next[idx], name: e.target.value };
                              setConfig((p) => ({ ...p, pricing: next }));
                            }}
                            placeholder="Nombre del plan o pack"
                            className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#111827]"
                          />
                          <input
                            type="text"
                            value={plan.price}
                            onChange={(e) => {
                              const next = [...config.pricing];
                              next[idx] = { ...next[idx], price: e.target.value };
                              setConfig((p) => ({ ...p, pricing: next }));
                            }}
                            placeholder="Precio (ej. $49)"
                            className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-mono font-bold text-[#7C2D48]"
                          />
                          <input
                            type="text"
                            value={plan.ctaText}
                            onChange={(e) => {
                              const next = [...config.pricing];
                              next[idx] = { ...next[idx], ctaText: e.target.value };
                              setConfig((p) => ({ ...p, pricing: next }));
                            }}
                            placeholder="Botón (ej. Comprar)"
                            className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs text-[#111827]"
                          />
                        </div>
                        <input
                          type="text"
                          value={plan.features}
                          onChange={(e) => {
                            const next = [...config.pricing];
                            next[idx] = { ...next[idx], features: e.target.value };
                            setConfig((p) => ({ ...p, pricing: next }));
                          }}
                          placeholder="Qué incluye (separado por comas)"
                          className="w-full min-h-[36px] px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs text-[#4B5563]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 3: Contact / Order Form */}
              <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                <label className="px-4 py-3 bg-[#F7F8FA] flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-xs font-bold text-[#111827]">
                    Formulario de Pedido, Reserva o Contacto
                  </span>
                  <input
                    type="checkbox"
                    checked={config.includeForm}
                    onChange={(e) => setConfig((p) => ({ ...p, includeForm: e.target.checked }))}
                    className="w-4 h-4 accent-[#7C2D48]"
                  />
                </label>
                {config.includeForm && (
                  <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-white border-t border-[#E2E8F0]">
                    <input
                      type="text"
                      value={config.formTitle}
                      onChange={(e) => setConfig((p) => ({ ...p, formTitle: e.target.value }))}
                      placeholder="Título del formulario"
                      className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#111827]"
                    />
                    <input
                      type="text"
                      value={config.formButton}
                      onChange={(e) => setConfig((p) => ({ ...p, formButton: e.target.value }))}
                      placeholder="Texto del botón de envío"
                      className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs text-[#111827]"
                    />
                  </div>
                )}
              </div>

              {/* Section 4: Extra optional switches */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { key: "includeStats", label: "Métricas / Cifras" },
                  { key: "includeTestimonials", label: "Testimonios" },
                  { key: "includeFaq", label: "Preguntas FAQ" },
                ].map((opt) => (
                  <label
                    key={opt.key}
                    className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-[#111827]">{opt.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean((config as any)[opt.key])}
                      onChange={(e) =>
                        setConfig((p) => ({ ...p, [opt.key]: e.target.checked }))
                      }
                      className="w-4 h-4 accent-[#7C2D48]"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: SUMMARY, CODE PREVIEW & LAUNCH */}
          {stepIdx === 3 && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-[#EEF6F1] border border-[#CFE4D7] p-4 space-y-2">
                <div className="text-sm font-bold text-[#111827]">
                  Tu página web &ldquo;{config.brand}&rdquo; está lista para funcionar
                </div>
                <p className="text-xs text-[#374151] leading-relaxed">
                  Se construyó en formato <strong>HTML5 Nativo</strong> con{" "}
                  <strong>{activeSectionsSummary.length} bloques activos</strong>. Puedes verla en vivo ahora mismo o pedirle a <strong>AURA IA</strong> que agregue ofertas, cambie textos o sume secciones nuevas.
                </p>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F7F8FA] p-3.5 space-y-2">
                <div className="text-xs font-bold text-[#111827]">Secciones incluidas:</div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-[#374151]">
                  {activeSectionsSummary.map((item) => (
                    <li key={item} className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#2F6F4E] flex-shrink-0" />
                      <span className="truncate">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onApplyWebCode(generatedCode, {
                      runImmediately: true,
                      title: config.brand,
                    });
                    onClose();
                  }}
                  className="min-h-[52px] p-3.5 rounded-xl bg-[#2F6F4E] hover:bg-[#25593E] text-white text-left flex flex-col justify-between gap-2 cursor-pointer transition-colors"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <div>
                    <div className="text-xs font-bold">Crear y Probar Web</div>
                    <div className="text-[11px] opacity-90">Ver página en vivo al instante</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onApplyWebCode(generatedCode, {
                      runImmediately: true,
                      title: config.brand,
                      openAiPrompt: `Tengo esta web de "${config.brand}" lista. Ayúdame a mejorarla o agregarle una nueva sección: por ejemplo agrega otro producto/plan de venta o nuevas preguntas frecuentes FAQ.`,
                    });
                    onClose();
                  }}
                  className="min-h-[52px] p-3.5 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-left flex flex-col justify-between gap-2 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  <div>
                    <div className="text-xs font-bold">Seguir con AURA IA</div>
                    <div className="text-[11px] opacity-90">Carga tu web y ábrela en el chat IA</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onApplyWebCode(generatedCode, {
                      runImmediately: false,
                      title: config.brand,
                    });
                    onClose();
                  }}
                  className="min-h-[52px] p-3.5 rounded-xl bg-white hover:bg-slate-50 text-[#111827] border border-[#E2E8F0] text-left flex flex-col justify-between gap-2 cursor-pointer transition-colors"
                >
                  <Code2 className="w-4 h-4 text-[#7C2D48]" />
                  <div>
                    <div className="text-xs font-bold">Ver en Editor DIV</div>
                    <div className="text-[11px] text-[#6B7280]">Ajusta textos o acciones a mano</div>
                  </div>
                </button>
              </div>

              {/* Collapsible generated DIV code */}
              <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowCodePreview((v) => !v)}
                  className="w-full px-3.5 py-2.5 bg-[#F7F8FA] flex items-center justify-between text-xs font-semibold text-[#374151] hover:bg-slate-100 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-[#7C2D48]" />
                    <span>{showCodePreview ? "Ocultar código DIV generado" : "Ver código DIV generado (opcional)"}</span>
                  </span>
                  <span className="font-mono text-[11px] text-[#6B7280]">
                    {generatedCode.split("\n").length} líneas
                  </span>
                </button>
                {showCodePreview && (
                  <pre className="p-3 bg-[#0F172A] text-slate-100 text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed">
                    {generatedCode}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Footer */}
        <div className="px-4 sm:px-6 py-3 bg-[#F7F8FA] border-t border-[#E2E8F0] flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
            <HelpCircle className="w-3.5 h-3.5 text-[#7C2D48] hidden sm:inline" />
            <span>Paso {stepIdx + 1} de {WIZARD_STEPS.length}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
              disabled={stepIdx === 0}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs font-semibold text-[#374151] disabled:opacity-40 flex items-center gap-1 cursor-pointer disabled:cursor-default"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            {stepIdx < WIZARD_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStepIdx((i) => Math.min(WIZARD_STEPS.length - 1, i + 1))}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onApplyWebCode(generatedCode, {
                    runImmediately: true,
                    title: config.brand,
                  });
                  onClose();
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#2F6F4E] hover:bg-[#25593E] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Crear y Probar Web</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
