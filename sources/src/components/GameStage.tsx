import React, { useRef, useEffect, useState } from "react";
import { Play, Pause, RotateCcw, StepForward, Maximize, Volume2, VolumeX, Tv, Gamepad2, Compass, Globe, Code2, Check, Download, Copy, Sparkles, Send, Cpu, CircleDot, MoreHorizontal } from "lucide-react";
import { DivRuntime, EngineStats } from "../engine/runtime";
import { soundEngine } from "../engine/sound";
import { Camera3DInfo, BreakpointInfo } from "../types";
import { Camera3DDebugOverlay } from "./Camera3DDebugOverlay";
import { ProcessInspector } from "./ProcessInspector";
import { Html5AppState, generateProductionHtml5Js } from "../engine/html5Engine";
import { VB3Control } from "./VB3/types";

interface GameStageProps {
  runtime: DivRuntime;
  onRestart: () => void;
}

export const GameStage: React.FC<GameStageProps> = ({ runtime, onRestart }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<EngineStats>({
    fps: 60,
    processCount: 0,
    renderTimeMs: 0,
    frameIndex: 0,
    activeSounds: 0,
  });
  const [cameraInfo, setCameraInfo] = useState<Camera3DInfo>(runtime.getCamera3DInfo());
  const [is3DDebugOpen, setIs3DDebugOpen] = useState(false);
  const [isProcessDebuggerOpen, setIsProcessDebuggerOpen] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [isMuted, setIsMuted] = useState(soundEngine.isMuted);
  const [crtFilter, setCrtFilter] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 || navigator.maxTouchPoints > 0 : false
  );
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [canvasCursor, setCanvasCursor] = useState("default");

  // Native HTML5 & Web Landing Page Mode state
  const [isHtml5Mode, setIsHtml5Mode] = useState(runtime.isHtml5Mode);
  const [html5State, setHtml5State] = useState<Html5AppState>(runtime.html5State);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Calculator State & Interactivity
  const [calcDisplay, setCalcDisplay] = useState<string>("0");
  const [calcOperand1, setCalcOperand1] = useState<number | null>(null);
  const [calcOperator, setCalcOperator] = useState<string | null>(null);
  const [calcClearOnNext, setCalcClearOnNext] = useState<boolean>(false);
  const [calcMemory, setCalcMemory] = useState<number>(0);

  // Google AdMob Simulation State
  const [admobState, setAdmobState] = useState(runtime.admobState);

  useEffect(() => {
    const handler = (st: typeof runtime.admobState) => {
      setAdmobState({ ...st });
    };
    runtime.onAdMobStateChange = handler;
    return () => {
      if (runtime.onAdMobStateChange === handler) {
        runtime.onAdMobStateChange = undefined;
      }
    };
  }, [runtime]);

  // Breakpoint execution pause state
  const [breakpointInfo, setBreakpointInfo] = useState<BreakpointInfo | null>(runtime.currentBreakpoint || null);

  useEffect(() => {
    const unsubHit = runtime.addBreakpointHitListener((bp) => setBreakpointInfo(bp));
    const unsubResume = runtime.addBreakpointResumeListener(() => setBreakpointInfo(null));
    if (runtime.currentBreakpoint) {
      setBreakpointInfo(runtime.currentBreakpoint);
    }
    return () => {
      unsubHit();
      unsubResume();
    };
  }, [runtime]);

  // Responsive adaptive scale for Visual Form
  const visualFormContainerRef = useRef<HTMLDivElement>(null);
  const [formScale, setFormScale] = useState<number>(1);

  useEffect(() => {
    if (!html5State.visualForm) return;

    const updateScale = () => {
      const container = visualFormContainerRef.current;
      if (!container || !html5State.visualForm) return;

      const availW = container.clientWidth - 24;
      const availH = container.clientHeight - 24;
      const formW = html5State.visualForm.width || 380;
      const formH = (html5State.visualForm.height || 420) + 34;

      if (availW > 0 && availH > 0 && formW > 0 && formH > 0) {
        const sx = availW / formW;
        const sy = availH / formH;
        const s = Math.min(1, Math.min(sx, sy));
        setFormScale(s > 0 ? s : 1);
      }
    };

    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (visualFormContainerRef.current) {
      ro.observe(visualFormContainerRef.current);
    }
    window.addEventListener("resize", updateScale);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [html5State.visualForm]);

  useEffect(() => {
    if (html5State.visualForm) {
      const displayCtrl = html5State.visualForm.controls.find(
        (c) => c.id === "txtPantalla" || c.name === "txtPantalla" || c.type === "textbox"
      );
      if (displayCtrl) {
        const initVal = displayCtrl.text || "0";
        setCalcDisplay(initVal);
        setFormValues((prev) => ({ ...prev, [displayCtrl.id]: initVal }));
      }
    }
  }, [html5State.visualForm]);

  const handleVisualFormButtonClick = (ctrl: VB3Control) => {
    const rawCaption = (ctrl.caption || ctrl.name || "").trim();
    const isCalc = Boolean(
      html5State.visualForm?.controls.some((c) => c.id === "txtPantalla" || c.name === "txtPantalla") ||
      html5State.visualForm?.caption.toLowerCase().includes("calc") ||
      html5State.title.toLowerCase().includes("calc")
    );

    if (isCalc) {
      const displayCtrl =
        html5State.visualForm?.controls.find((c) => c.type === "textbox") ||
        html5State.visualForm?.controls[0];
      const displayId = displayCtrl ? displayCtrl.id : "txtPantalla";

      // Digit 0-9
      if (/^[0-9]$/.test(rawCaption)) {
        setCalcDisplay((prev) => {
          const next = prev === "0" || calcClearOnNext ? rawCaption : prev + rawCaption;
          setFormValues((f) => ({ ...f, [displayId]: next }));
          return next;
        });
        setCalcClearOnNext(false);
        return;
      }

      // Decimal point
      if (rawCaption === ".") {
        setCalcDisplay((prev) => {
          let next = prev;
          if (calcClearOnNext) {
            next = "0.";
          } else if (!prev.includes(".")) {
            next = prev + ".";
          }
          setFormValues((f) => ({ ...f, [displayId]: next }));
          return next;
        });
        setCalcClearOnNext(false);
        return;
      }

      // Sign invert (±)
      if (rawCaption === "±") {
        setCalcDisplay((prev) => {
          const next = prev.startsWith("-") ? prev.slice(1) : (prev === "0" ? "0" : "-" + prev);
          setFormValues((f) => ({ ...f, [displayId]: next }));
          return next;
        });
        return;
      }

      // Clear Entry (CE)
      if (rawCaption === "CE") {
        setCalcDisplay("0");
        setCalcClearOnNext(false);
        setFormValues((f) => ({ ...f, [displayId]: "0" }));
        return;
      }

      // Backspace (⌫)
      if (rawCaption === "⌫" || rawCaption === "←") {
        setCalcDisplay((prev) => {
          const next = prev.length > 1 ? prev.slice(0, -1) : "0";
          setFormValues((f) => ({ ...f, [displayId]: next }));
          return next;
        });
        return;
      }

      // Clear All (C / C (Limpiar))
      if (rawCaption === "C" || rawCaption.startsWith("C ") || rawCaption.startsWith("C(")) {
        setCalcDisplay("0");
        setCalcOperand1(null);
        setCalcOperator(null);
        setCalcClearOnNext(false);
        setFormValues((f) => ({ ...f, [displayId]: "0" }));
        return;
      }

      // Percentage (%)
      if (rawCaption === "%") {
        const num = parseFloat(calcDisplay) || 0;
        const formatted = String(num / 100);
        setCalcDisplay(formatted);
        setCalcClearOnNext(true);
        setFormValues((f) => ({ ...f, [displayId]: formatted }));
        return;
      }

      // Square root (√x / √)
      if (rawCaption === "√x" || rawCaption === "√") {
        const num = parseFloat(calcDisplay) || 0;
        const formatted = num >= 0 ? String(parseFloat(Math.sqrt(num).toFixed(8))) : "Error";
        setCalcDisplay(formatted);
        setCalcClearOnNext(true);
        setFormValues((f) => ({ ...f, [displayId]: formatted }));
        return;
      }

      // Square (x²)
      if (rawCaption === "x²" || rawCaption === "x^2") {
        const num = parseFloat(calcDisplay) || 0;
        const formatted = String(parseFloat((num * num).toFixed(8)));
        setCalcDisplay(formatted);
        setCalcClearOnNext(true);
        setFormValues((f) => ({ ...f, [displayId]: formatted }));
        return;
      }

      // Reciprocal (1/x)
      if (rawCaption === "1/x") {
        const num = parseFloat(calcDisplay) || 0;
        const formatted = num !== 0 ? String(parseFloat((1 / num).toFixed(8))) : "Error";
        setCalcDisplay(formatted);
        setCalcClearOnNext(true);
        setFormValues((f) => ({ ...f, [displayId]: formatted }));
        return;
      }

      // Memory (M+, M-, MR, MC)
      if (rawCaption === "M+" || rawCaption.startsWith("M+")) {
        const num = parseFloat(calcDisplay) || 0;
        setCalcMemory((prev) => prev + num);
        setCalcClearOnNext(true);
        return;
      }
      if (rawCaption === "M-" || rawCaption.startsWith("M-")) {
        const num = parseFloat(calcDisplay) || 0;
        setCalcMemory((prev) => prev - num);
        setCalcClearOnNext(true);
        return;
      }
      if (rawCaption === "MR") {
        const next = String(calcMemory);
        setCalcDisplay(next);
        setCalcClearOnNext(true);
        setFormValues((f) => ({ ...f, [displayId]: next }));
        return;
      }
      if (rawCaption === "MC") {
        setCalcMemory(0);
        return;
      }

      // Operators (+, -, *, /, ×, ÷)
      if (["+", "-", "*", "/", "×", "÷"].includes(rawCaption)) {
        setCalcOperand1(parseFloat(calcDisplay) || 0);
        setCalcOperator(rawCaption === "×" ? "*" : rawCaption === "÷" ? "/" : rawCaption);
        setCalcClearOnNext(true);
        return;
      }

      // Equals (=)
      if (rawCaption === "=") {
        if (calcOperator !== null && calcOperand1 !== null) {
          const op2 = parseFloat(calcDisplay) || 0;
          let res: number | string = 0;
          if (calcOperator === "+") res = calcOperand1 + op2;
          else if (calcOperator === "-") res = calcOperand1 - op2;
          else if (calcOperator === "*") res = calcOperand1 * op2;
          else if (calcOperator === "/") res = op2 !== 0 ? calcOperand1 / op2 : "Error";
          const formatted =
            typeof res === "number" && !isNaN(res)
              ? Number.isInteger(res)
                ? String(res)
                : parseFloat(res.toFixed(8)).toString()
              : "Error";
          setCalcDisplay(formatted);
          setCalcOperand1(null);
          setCalcOperator(null);
          setCalcClearOnNext(true);
          setFormValues((f) => ({ ...f, [displayId]: formatted }));
        }
        return;
      }
    }

    // Default button action with immediate visible feedback when testing custom visual forms
    runtime.triggerHtml5Action(ctrl.name.toLowerCase() + "_click");
    setFormSuccessMessage(`Acción ejecutada: ${rawCaption || ctrl.name}`);
    setTimeout(() => setFormSuccessMessage(null), 2600);
  };

  const renderVisualFormControl = (ctrl: VB3Control) => {
    const cType = ctrl.type.toLowerCase();
    const isDisplay = ctrl.id === "txtPantalla" || ctrl.name === "txtPantalla";
    const currentValue = formValues[ctrl.id] ?? (isDisplay ? calcDisplay : (ctrl.text || ctrl.caption || ""));

    switch (cType) {
      case "commandbutton":
      case "button":
        return (
          <button
            key={ctrl.id}
            id={ctrl.id}
            type="button"
            onClick={() => handleVisualFormButtonClick(ctrl)}
            style={{
              position: "absolute",
              left: `${ctrl.x}px`,
              top: `${ctrl.y}px`,
              width: `${ctrl.width}px`,
              height: `${ctrl.height}px`,
              backgroundColor: ctrl.backColor || html5State.visualForm?.backColor || "#c0c0c0",
              color: ctrl.foreColor || "#000000",
              fontSize: ctrl.fontSize ? `${ctrl.fontSize}px` : "13px",
              fontWeight: ctrl.fontBold !== false ? "bold" : "normal",
              border: "2px solid #ffffff",
              borderRightColor: "#000000",
              borderBottomColor: "#000000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
              cursor: "pointer",
              userSelect: "none",
              outline: "none",
              overflow: "hidden",
              padding: "2px 6px",
              lineHeight: 1.2,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
            }}
            className="active:border-t-black active:border-l-black active:border-r-white active:border-b-white transition-none shadow-sm"
          >
            <span className="truncate w-full text-center">{ctrl.caption || ctrl.name}</span>
          </button>
        );

      case "textbox":
        return (
          <input
            key={ctrl.id}
            id={ctrl.id}
            type={(ctrl as any).passwordChar ? "password" : "text"}
            value={currentValue}
            onChange={(e) => {
              const val = e.target.value;
              setFormValues((prev) => ({ ...prev, [ctrl.id]: val }));
              if (isDisplay) setCalcDisplay(val);
            }}
            style={{
              position: "absolute",
              left: `${ctrl.x}px`,
              top: `${ctrl.y}px`,
              width: `${ctrl.width}px`,
              height: `${ctrl.height}px`,
              backgroundColor: ctrl.backColor || "#ffffff",
              color: ctrl.foreColor || "#000000",
              textAlign: isDisplay ? "right" : ((ctrl as any).align || "left"),
              padding: isDisplay ? "2px 10px" : "2px 8px",
              fontSize: isDisplay ? "18px" : ctrl.fontSize ? `${ctrl.fontSize}px` : "13px",
              fontFamily: isDisplay ? "'Courier New', Courier, monospace" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
              fontWeight: isDisplay || ctrl.fontBold ? "bold" : "normal",
              border: "2px solid #808080",
              borderTopColor: "#000000",
              borderLeftColor: "#000000",
              borderRightColor: "#dfdfdf",
              borderBottomColor: "#dfdfdf",
              boxSizing: "border-box",
              outline: "none",
            }}
          />
        );

      case "label":
        return (
          <div
            key={ctrl.id}
            id={ctrl.id}
            style={{
              position: "absolute",
              left: `${ctrl.x}px`,
              top: `${ctrl.y}px`,
              width: `${ctrl.width}px`,
              height: `${ctrl.height}px`,
              color: ctrl.foreColor || "#000000",
              fontSize: ctrl.fontSize ? `${ctrl.fontSize}px` : "12px",
              fontWeight: ctrl.fontBold ? "bold" : "normal",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
              display: "flex",
              alignItems: "center",
              overflow: "hidden",
              userSelect: "none",
              boxSizing: "border-box",
            }}
          >
            <span className="truncate w-full">{ctrl.caption || ctrl.name}</span>
          </div>
        );

      case "frame":
        return (
          <fieldset
            key={ctrl.id}
            id={ctrl.id}
            style={{
              position: "absolute",
              left: `${ctrl.x}px`,
              top: `${ctrl.y}px`,
              width: `${ctrl.width}px`,
              height: `${ctrl.height}px`,
              border: "2px groove #ffffff",
              backgroundColor: ctrl.backColor || "transparent",
              boxSizing: "border-box",
              overflow: "hidden",
              padding: "4px",
              margin: 0,
            }}
          >
            <legend
              style={{
                fontSize: "11px",
                fontWeight: "bold",
                color: ctrl.foreColor || "#000000",
                padding: "0 4px",
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
              }}
            >
              {ctrl.caption || ctrl.name}
            </legend>
          </fieldset>
        );

      case "checkbox":
        return (
          <label
            key={ctrl.id}
            id={ctrl.id}
            style={{
              position: "absolute",
              left: `${ctrl.x}px`,
              top: `${ctrl.y}px`,
              width: `${ctrl.width}px`,
              height: `${ctrl.height}px`,
              color: ctrl.foreColor || "#000000",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              overflow: "hidden",
              fontSize: "12px",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
              cursor: "pointer",
              userSelect: "none",
              boxSizing: "border-box",
            }}
          >
            <input
              type="checkbox"
              className="flex-shrink-0"
              checked={Boolean(formValues[ctrl.id] ?? ctrl.value)}
              onChange={(e) => setFormValues((prev) => ({ ...prev, [ctrl.id]: e.target.checked }))}
            />
            <span className="truncate min-w-0">{ctrl.caption || ctrl.name}</span>
          </label>
        );

      case "combobox":
      case "select":
        return (
          <select
            key={ctrl.id}
            id={ctrl.id}
            value={formValues[ctrl.id] ?? ctrl.value ?? (ctrl.options ? ctrl.options[0] : "")}
            onChange={(e) => setFormValues((prev) => ({ ...prev, [ctrl.id]: e.target.value }))}
            style={{
              position: "absolute",
              left: `${ctrl.x}px`,
              top: `${ctrl.y}px`,
              width: `${ctrl.width}px`,
              height: `${ctrl.height}px`,
              backgroundColor: ctrl.backColor || "#ffffff",
              color: ctrl.foreColor || "#000000",
              fontSize: ctrl.fontSize ? `${ctrl.fontSize}px` : "12px",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
              border: "2px solid #808080",
              borderTopColor: "#000000",
              borderLeftColor: "#000000",
              borderRightColor: "#dfdfdf",
              borderBottomColor: "#dfdfdf",
              padding: "2px 4px",
              boxSizing: "border-box",
              outline: "none",
            }}
          >
            {(ctrl.options || ["Opción 1", "Opción 2"]).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case "grid":
      case "table":
        return (
          <div
            key={ctrl.id}
            id={ctrl.id}
            style={{
              position: "absolute",
              left: `${ctrl.x}px`,
              top: `${ctrl.y}px`,
              width: `${ctrl.width}px`,
              height: `${ctrl.height}px`,
              backgroundColor: "#ffffff",
              border: "2px solid #808080",
              borderTopColor: "#000000",
              borderLeftColor: "#000000",
              borderRightColor: "#dfdfdf",
              borderBottomColor: "#dfdfdf",
              overflow: "auto",
              boxSizing: "border-box",
              fontSize: "11px",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
            }}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-200 border-b border-slate-400 text-slate-800">
                  <th className="p-1 text-left text-[11px] font-bold">Item</th>
                  <th className="p-1 text-left text-[11px] font-bold">Estado</th>
                  <th className="p-1 text-left text-[11px] font-bold">Valor</th>
                </tr>
              </thead>
              <tbody className="text-slate-900">
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-1 text-[11px]">1</td>
                  <td className="p-1 text-[11px]">Activo</td>
                  <td className="p-1 text-[11px]">100</td>
                </tr>
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-1 text-[11px]">2</td>
                  <td className="p-1 text-[11px]">DIV</td>
                  <td className="p-1 text-[11px]">200</td>
                </tr>
              </tbody>
            </table>
          </div>
        );

      case "picturebox":
      case "canvas5":
      case "image":
        return (
          <div
            key={ctrl.id}
            id={ctrl.id}
            style={{
              position: "absolute",
              left: `${ctrl.x}px`,
              top: `${ctrl.y}px`,
              width: `${ctrl.width}px`,
              height: `${ctrl.height}px`,
              backgroundColor: ctrl.backColor || "#ffffff",
              border: "2px solid #808080",
              borderTopColor: "#000000",
              borderLeftColor: "#000000",
              borderRightColor: "#dfdfdf",
              borderBottomColor: "#dfdfdf",
              boxSizing: "border-box",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
              fontSize: "11px",
              fontFamily: "monospace",
            }}
          >
            {ctrl.caption || `[${ctrl.name}]`}
          </div>
        );

      case "hscrollbar":
      case "slider":
        return (
          <input
            key={ctrl.id}
            id={ctrl.id}
            type="range"
            min={0}
            max={100}
            value={formValues[ctrl.id] ?? ctrl.value ?? 50}
            onChange={(e) => setFormValues((prev) => ({ ...prev, [ctrl.id]: e.target.value }))}
            style={{
              position: "absolute",
              left: `${ctrl.x}px`,
              top: `${ctrl.y}px`,
              width: `${ctrl.width}px`,
              height: `${ctrl.height}px`,
              boxSizing: "border-box",
            }}
          />
        );

      default:
        return (
          <div
            key={ctrl.id}
            id={ctrl.id}
            style={{
              position: "absolute",
              left: `${ctrl.x}px`,
              top: `${ctrl.y}px`,
              width: `${ctrl.width}px`,
              height: `${ctrl.height}px`,
              backgroundColor: ctrl.backColor || "#e0e0e0",
              border: "1px solid #999",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              color: ctrl.foreColor || "#000000",
              boxSizing: "border-box",
              userSelect: "none",
            }}
          >
            {ctrl.caption || ctrl.name}
          </div>
        );
    }
  };

  const handleHtml5FormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runtime.triggerHtml5Action(
      html5State.form?.submitAction || "guardar_formulario",
      formValues
    );
    setFormSuccessMessage("✅ ¡Datos guardados y procesados con éxito!");
    setTimeout(() => setFormSuccessMessage(null), 4500);
  };

  const handleDownloadHtml = () => {
    const htmlCode = generateProductionHtml5Js(html5State);
    const blob = new Blob([htmlCode], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(html5State.title || "landing_page").toLowerCase().replace(/\s+/g, "_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyHtml = () => {
    const htmlCode = generateProductionHtml5Js(html5State);
    navigator.clipboard.writeText(htmlCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Hook canvas and HTML5 engine to runtime
  useEffect(() => {
    setIsHtml5Mode(runtime.isHtml5Mode);
    setHtml5State({ ...runtime.html5State });

    runtime.onHtml5StateUpdate = (s) => {
      setHtml5State({ ...s });
      setIsHtml5Mode(s.active);
    };

    if (canvasRef.current) {
      runtime.setCanvas(canvasRef.current);
    }
    runtime.onStatsUpdate = (s) => {
      setStats(s);
      if (s.camera3D) {
        setCameraInfo(s.camera3D);
      }
    };

    // Keyboard listener
    const handleKeyDown = (e: KeyboardEvent) => {
      // Never intercept keys or prevent default when user is typing in ANY text input or textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          target.closest("input, textarea, select, [contenteditable='true']"))
      ) {
        return;
      }

      // Keyboard support for visualForm calculator in HTML5 mode
      if (isHtml5Mode && html5State.visualForm) {
        const isCalc = Boolean(
          html5State.visualForm.controls.some((c) => c.id === "txtPantalla" || c.name === "txtPantalla") ||
          html5State.visualForm.caption.toLowerCase().includes("calc") ||
          html5State.title.toLowerCase().includes("calc")
        );
        if (isCalc && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (/^[0-9]$/.test(e.key)) {
            handleVisualFormButtonClick({ id: "btn" + e.key, name: "btn" + e.key, caption: e.key, type: "commandbutton", x: 0, y: 0, width: 0, height: 0 });
            return;
          }
          if (["+", "-", "*", "/"].includes(e.key)) {
            handleVisualFormButtonClick({ id: "btnOp", name: "btnOp", caption: e.key, type: "commandbutton", x: 0, y: 0, width: 0, height: 0 });
            return;
          }
          if (e.key === "Enter" || e.key === "=") {
            e.preventDefault();
            handleVisualFormButtonClick({ id: "btnIgual", name: "btnIgual", caption: "=", type: "commandbutton", x: 0, y: 0, width: 0, height: 0 });
            return;
          }
          if (e.key === "Escape" || e.key.toLowerCase() === "c") {
            handleVisualFormButtonClick({ id: "btnClear", name: "btnClear", caption: "C", type: "commandbutton", x: 0, y: 0, width: 0, height: 0 });
            return;
          }
          if (e.key === ".") {
            handleVisualFormButtonClick({ id: "btnDot", name: "btnDot", caption: ".", type: "commandbutton", x: 0, y: 0, width: 0, height: 0 });
            return;
          }
          if (e.key === "Backspace") {
            setCalcDisplay((prev) => {
              const next = prev.length > 1 ? prev.slice(0, -1) : "0";
              const displayCtrl = html5State.visualForm?.controls.find((c) => c.type === "textbox") || html5State.visualForm?.controls[0];
              const displayId = displayCtrl ? displayCtrl.id : "txtPantalla";
              setFormValues((f) => ({ ...f, [displayId]: next }));
              return next;
            });
            return;
          }
        }
      }

      // Forward key event to App UI Engine if an input field is active
      if (runtime.appUiEngine && runtime.appUiEngine.activeFocusId) {
        const handled = runtime.appUiEngine.handleKeyDown(e.key, e);
        if (handled) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // Prevent browser scrolling and tab loss with game keys
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Tab"].includes(e.code) || e.key === "Tab") {
        e.preventDefault();
      }

      if (e.key === "Tab" || e.code === "Tab") {
        runtime.toggleMode8Automap();
        return;
      }

      runtime.keyState[e.key.toLowerCase()] = true;
      runtime.keyState[e.code.toLowerCase()] = true;

      // Also map arrow and common game key names
      if (e.key === "ArrowUp" || e.code === "KeyW") {
        runtime.keyState["up"] = true;
        runtime.keyState["w"] = true;
      }
      if (e.key === "ArrowDown" || e.code === "KeyS") {
        runtime.keyState["down"] = true;
        runtime.keyState["s"] = true;
      }
      if (e.key === "ArrowLeft" || e.code === "KeyA") {
        runtime.keyState["left"] = true;
        runtime.keyState["a"] = true;
      }
      if (e.key === "ArrowRight" || e.code === "KeyD") {
        runtime.keyState["right"] = true;
        runtime.keyState["d"] = true;
      }
      if (e.code === "Space" || e.key === " ") runtime.keyState["space"] = true;
      if (e.key === "Enter") runtime.keyState["enter"] = true;
      if (e.key === "Escape") runtime.keyState["esc"] = true;
      if (e.code === "KeyE" || e.key.toLowerCase() === "e") runtime.keyState["e"] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          target.closest("input, textarea, select, [contenteditable='true']"))
      ) {
        return;
      }

      runtime.keyState[e.key.toLowerCase()] = false;
      runtime.keyState[e.code.toLowerCase()] = false;

      if (e.key === "ArrowUp" || e.code === "KeyW") {
        runtime.keyState["up"] = false;
        runtime.keyState["w"] = false;
      }
      if (e.key === "ArrowDown" || e.code === "KeyS") {
        runtime.keyState["down"] = false;
        runtime.keyState["s"] = false;
      }
      if (e.key === "ArrowLeft" || e.code === "KeyA") {
        runtime.keyState["left"] = false;
        runtime.keyState["a"] = false;
      }
      if (e.key === "ArrowRight" || e.code === "KeyD") {
        runtime.keyState["right"] = false;
        runtime.keyState["d"] = false;
      }
      if (e.code === "Space" || e.key === " ") runtime.keyState["space"] = false;
      if (e.key === "Enter") runtime.keyState["enter"] = false;
      if (e.key === "Escape") runtime.keyState["esc"] = false;
      if (e.code === "KeyE" || e.key.toLowerCase() === "e") runtime.keyState["e"] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [runtime]);

  // Ensure canvas is attached whenever canvas ref or html5 mode toggles
  useEffect(() => {
    if (canvasRef.current) {
      runtime.setCanvas(canvasRef.current);
    }
  }, [runtime, isHtml5Mode]);

  const toggleSound = () => {
    soundEngine.isMuted = !soundEngine.isMuted;
    setIsMuted(soundEngine.isMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Touch controls simulator
  const setTouchKey = (keyName: string, active: boolean) => {
    runtime.keyState[keyName] = active;
  };

  const hasHtml5Content = Boolean(
    html5State.visualForm ||
    html5State.navbar ||
    (html5State.stats && html5State.stats.length > 0) ||
    (html5State.tabs && html5State.tabs.length > 0) ||
    html5State.hero ||
    (html5State.features && html5State.features.length > 0) ||
    (html5State.pricing && html5State.pricing.length > 0) ||
    (html5State.testimonials && html5State.testimonials.length > 0) ||
    (html5State.faqs && html5State.faqs.length > 0) ||
    html5State.ctaBanner ||
    html5State.form ||
    (html5State.actions && html5State.actions.length > 0) ||
    html5State.table ||
    html5State.footer
  );

  return (
    <div
      ref={containerRef}
      className="flex flex-col flex-1 flex-grow w-full h-full min-h-0 bg-[#050811] border border-slate-800 rounded-lg overflow-hidden relative select-none"
    >
      {/* Game Stage Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0d1424] border-b border-slate-800 text-xs flex-shrink-0 gap-2 relative z-30">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              runtime.isRunning && !runtime.isPaused
                ? "bg-emerald-400"
                : runtime.isPaused
                ? "bg-amber-400"
                : "bg-slate-600"
            }`}
          />
          <span className="font-semibold text-slate-200 truncate max-w-[120px] sm:max-w-none">
            {isHtml5Mode ? (html5State.title || "App HTML5") : "Pantalla"}
          </span>
          <span
            className={`hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border shrink-0 ${
              isHtml5Mode
                ? "bg-emerald-950/60 text-emerald-300 border-emerald-700/50"
                : "bg-slate-800 text-slate-300 border-slate-700"
            }`}
          >
            {isHtml5Mode ? "HTML5 Nativo" : `Canvas ${runtime.width}x${runtime.height}`}
          </span>
          {breakpointInfo && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50 font-mono text-[10px] font-bold shrink-0">
              <CircleDot className="w-2.5 h-2.5 text-amber-400" />
              <span>BP L{breakpointInfo.line}</span>
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {breakpointInfo ? (
            <button
              onClick={() => runtime.resumeFromBreakpoint()}
              className="px-2.5 min-h-[36px] rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1 text-xs transition-all cursor-pointer"
              title="Continuar ejecución desde el Breakpoint (F5)"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>Continuar</span>
            </button>
          ) : runtime.isRunning && !runtime.isPaused ? (
            <button
              onClick={() => runtime.pause()}
              className="p-2 min-w-[36px] min-h-[36px] rounded bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors flex items-center justify-center"
              title="Pausar ejecución"
            >
              <Pause className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                if (runtime.isPaused) runtime.resume();
                else runtime.start();
              }}
              className="p-2 min-w-[36px] min-h-[36px] rounded bg-[#2F6F4E] hover:bg-[#275c40] text-white transition-colors flex items-center justify-center"
              title="Ejecutar"
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
          )}

          <button
            onClick={onRestart}
            className="p-2 min-w-[36px] min-h-[36px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center justify-center"
            title="Reiniciar ejecución"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* HTML5 Native / Canvas Mode Switcher Button */}
          <button
            onClick={() => {
              const next = !isHtml5Mode;
              setIsHtml5Mode(next);
              runtime.setHtml5Mode(next);
            }}
            className={`px-2.5 min-h-[36px] rounded flex items-center gap-1.5 text-xs font-semibold transition-all ${
              isHtml5Mode
                ? "text-emerald-200 bg-emerald-950/80 border border-emerald-600/60"
                : "text-slate-200 bg-slate-800 border border-slate-700 hover:bg-slate-700"
            }`}
            title="Alternar entre App HTML5 Nativa y Lienzo Canvas"
          >
            {isHtml5Mode ? <Globe className="w-3.5 h-3.5 text-emerald-400" /> : <Gamepad2 className="w-3.5 h-3.5 text-rose-300" />}
            <span className="hidden sm:inline">{isHtml5Mode ? "HTML5" : "Canvas"}</span>
          </button>

          {/* Mobile Touch Controls Toggle */}
          {!isHtml5Mode && (
            <button
              onClick={() => setShowTouchControls(!showTouchControls)}
              className={`p-2 min-w-[36px] min-h-[36px] rounded lg:hidden flex items-center justify-center border transition-colors ${
                showTouchControls
                  ? "text-white bg-[#7C2D48] border-[#7C2D48]"
                  : "text-slate-300 bg-slate-800 border-slate-700"
              }`}
              title="Mostrar/ocultar cruceta táctil"
            >
              <Gamepad2 className="w-4 h-4" />
            </button>
          )}

          {/* Secondary Desktop Controls */}
          <div className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => runtime.stepFrame()}
              className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Avanzar 1 FRAME (Paso a paso) [F10]"
            >
              <StepForward className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={toggleSound}
              className={`p-2 rounded ${
                isMuted ? "text-rose-400 bg-rose-950/40" : "text-slate-300 bg-slate-800 hover:bg-slate-700"
              } transition-colors`}
              title={isMuted ? "Activar sonido" : "Silenciar"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setShowCodeModal(true)}
              className="px-2 py-1.5 rounded flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Ver y exportar código HTML5 / JS nativo"
            >
              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>HTML/JS</span>
            </button>

            <button
              onClick={() => setCrtFilter(!crtFilter)}
              className={`p-2 rounded ${
                crtFilter ? "text-emerald-400 bg-emerald-950/40 border border-emerald-800/40" : "text-slate-400 bg-slate-800 hover:bg-slate-700"
              } transition-colors`}
              title="Efecto CRT Retro"
            >
              <Tv className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIs3DDebugOpen(!is3DDebugOpen)}
              className={`px-2 py-1.5 rounded flex items-center gap-1.5 text-xs transition-colors ${
                is3DDebugOpen || cameraInfo.active
                  ? "text-emerald-300 bg-slate-800 border border-emerald-600/50"
                  : "text-slate-400 bg-slate-800 hover:bg-slate-700"
              }`}
              title="Depuración de Cámara 3D"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-[11px]">3D</span>
            </button>

            <button
              onClick={() => setIsProcessDebuggerOpen(!isProcessDebuggerOpen)}
              className={`px-2 py-1.5 rounded flex items-center gap-1.5 text-xs transition-colors ${
                isProcessDebuggerOpen || stats.processCount > 0
                  ? "text-slate-200 bg-slate-800 border border-slate-600"
                  : "text-slate-400 bg-slate-800 hover:bg-slate-700"
              }`}
              title="Debugger de Procesos DIV"
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-mono">({stats.processCount})</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Pantalla completa"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Overflow Actions Menu */}
          <div className="relative md:hidden">
            <button
              onClick={() => setShowMoreActions((prev) => !prev)}
              className="p-2 min-w-[36px] min-h-[36px] rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center"
              title="Más opciones"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMoreActions && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMoreActions(false)} />
                <div className="absolute right-0 mt-1.5 w-52 bg-[#0d1424] border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1">
                  <button
                    onClick={() => { toggleSound(); setShowMoreActions(false); }}
                    className="w-full px-3 py-2.5 rounded-lg text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                    <span>{isMuted ? "Activar sonido" : "Silenciar"}</span>
                  </button>
                  <button
                    onClick={() => { runtime.stepFrame(); setShowMoreActions(false); }}
                    className="w-full px-3 py-2.5 rounded-lg text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                  >
                    <StepForward className="w-4 h-4 text-slate-400" />
                    <span>Avanzar 1 Frame</span>
                  </button>
                  <button
                    onClick={() => { setIsProcessDebuggerOpen(!isProcessDebuggerOpen); setShowMoreActions(false); }}
                    className="w-full px-3 py-2.5 rounded-lg text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                  >
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <span>Procesos ({stats.processCount})</span>
                  </button>
                  <button
                    onClick={() => { setIs3DDebugOpen(!is3DDebugOpen); setShowMoreActions(false); }}
                    className="w-full px-3 py-2.5 rounded-lg text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                  >
                    <Compass className="w-4 h-4 text-emerald-400" />
                    <span>Cámara 3D</span>
                  </button>
                  <button
                    onClick={() => { setCrtFilter(!crtFilter); setShowMoreActions(false); }}
                    className="w-full px-3 py-2.5 rounded-lg text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                  >
                    <Tv className="w-4 h-4 text-slate-400" />
                    <span>Filtro CRT: {crtFilter ? "ON" : "OFF"}</span>
                  </button>
                  <button
                    onClick={() => { setShowCodeModal(true); setShowMoreActions(false); }}
                    className="w-full px-3 py-2.5 rounded-lg text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                  >
                    <Code2 className="w-4 h-4 text-emerald-400" />
                    <span>Ver Código HTML/JS</span>
                  </button>
                  <button
                    onClick={() => { toggleFullscreen(); setShowMoreActions(false); }}
                    className="w-full px-3 py-2.5 rounded-lg text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                  >
                    <Maximize className="w-4 h-4 text-slate-400" />
                    <span>Pantalla completa</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Viewport Canvas or Direct HTML5 Container */}
      <div
        className="relative flex-1 flex-grow min-h-0 w-full flex items-center justify-center bg-black p-2 overflow-hidden"
        style={{ flexGrow: 1, minHeight: 0, height: "100%" }}
      >
        {/* Real-time 3D Camera Debugging Tool */}
        <Camera3DDebugOverlay
          runtime={runtime}
          cameraInfo={cameraInfo}
          isOpen={is3DDebugOpen}
          onClose={() => setIs3DDebugOpen(false)}
          showGuides={showGuides}
          onToggleGuides={() => setShowGuides(!showGuides)}
        />

        {/* Real-time Process Debugger Overlay */}
        {isProcessDebuggerOpen && (
          <div className="absolute inset-x-2 top-2 bottom-2 z-40 bg-[#070b14]/95 backdrop-blur-md rounded-lg border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
            <ProcessInspector
              runtime={runtime}
              isEmbeddedOverlay={true}
              onCloseOverlay={() => setIsProcessDebuggerOpen(false)}
            />
          </div>
        )}

        {/* Breakpoint Pause Floating Indicator Banner */}
        {breakpointInfo && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-[#0d1424]/95 border border-amber-500/80 shadow-lg backdrop-blur-md flex items-center gap-3 text-xs font-mono pointer-events-auto">
            <span className="inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            <span className="font-bold text-amber-300">Pausado en Breakpoint: Línea {breakpointInfo.line}</span>
            <span className="text-cyan-300 font-semibold font-mono">({breakpointInfo.processName || "proceso"})</span>
            <div className="flex items-center gap-1.5 ml-1">
              <button
                onClick={() => runtime.resumeFromBreakpoint()}
                className="px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                title="Continuar ejecución del motor DIV (F5)"
              >
                <Play className="w-2.5 h-2.5 fill-white" />
                <span>Continuar (F5)</span>
              </button>
              <button
                onClick={() => runtime.stepFrame()}
                className="px-2.5 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                title="Avanzar 1 frame paso a paso (F10)"
              >
                <StepForward className="w-2.5 h-2.5" />
                <span>Paso (F10)</span>
              </button>
            </div>
          </div>
        )}

        {/* Native HTML5 App View */}
        <div className={`relative w-full h-full max-w-5xl bg-black text-slate-100 rounded-lg shadow-2xl border border-slate-900 flex-col overflow-hidden animate-in fade-in duration-150 ${isHtml5Mode ? "flex" : "hidden"}`}>
            {/* Top Browser URL & Status Header Bar */}
            <div className="px-3 py-2 bg-[#0a0a0a] border-b border-slate-900 flex items-center justify-between gap-2 text-xs text-slate-400 select-none flex-shrink-0 min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 flex-shrink-0"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 flex-shrink-0"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 flex-shrink-0"></span>
                <span className="ml-1 font-mono text-[11px] px-2.5 py-0.5 rounded bg-black border border-slate-800 text-cyan-400 flex items-center gap-1.5 min-w-0 truncate">
                  <Globe className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                  <span className="truncate">
                    https://app.local/{html5State.title ? html5State.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : html5State.mode}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="hidden sm:flex px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 border border-emerald-600/50 text-emerald-400 items-center gap-1 whitespace-nowrap">
                  DOM Nativo 60 FPS
                </span>
                <button
                  type="button"
                  onClick={() => setShowCodeModal(true)}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Code2 className="w-3 h-3" />
                  <span>Exportar HTML5</span>
                </button>
              </div>
            </div>

            {/* Scrollable Native HTML5 Page Content or Clean Black Screen */}
            {!hasHtml5Content ? (
              <div className="flex-1 w-full h-full min-h-[360px] bg-black flex items-center justify-center select-none" />
            ) : html5State.visualForm ? (
              <div
                ref={visualFormContainerRef}
                className="flex-1 overflow-auto p-2 sm:p-4 flex flex-col items-center justify-center bg-black relative gap-2"
              >
                {formSuccessMessage && (
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-xs font-medium flex items-center gap-2 shadow-lg max-w-full">
                    <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="truncate">{formSuccessMessage}</span>
                  </div>
                )}
                {/* Responsive Scaled Wrapper: fits available viewport perfectly without clipping */}
                <div
                  style={{
                    width: `${Math.round(html5State.visualForm.width * formScale)}px`,
                    height: `${Math.round((html5State.visualForm.height + 34) * formScale)}px`,
                    position: "relative",
                    flexShrink: 0,
                  }}
                >
                  {/* Authentic Desktop Visual Form Window */}
                  <div
                    className="shadow-2xl flex flex-col select-none transition-transform duration-100"
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: `${html5State.visualForm.width}px`,
                      backgroundColor: html5State.visualForm.backColor || "#c0c0c0",
                      border: "3px solid #dfdfdf",
                      borderTopColor: "#ffffff",
                      borderLeftColor: "#ffffff",
                      borderRightColor: "#000000",
                      borderBottomColor: "#000000",
                      transform: `scale(${formScale})`,
                      transformOrigin: "top left",
                      boxSizing: "border-box",
                    }}
                  >
                    {/* Title bar */}
                    <div className="bg-gradient-to-r from-[#000080] to-[#1084d0] text-white px-2 py-1 flex items-center justify-between gap-2 font-sans text-xs font-bold select-none min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="truncate">{html5State.visualForm.caption || html5State.visualForm.name}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button type="button" className="w-4 h-3.5 bg-[#c0c0c0] border border-white border-r-black border-b-black text-black text-[9px] font-bold flex items-center justify-center leading-none">_</button>
                        <button type="button" className="w-4 h-3.5 bg-[#c0c0c0] border border-white border-r-black border-b-black text-black text-[9px] font-bold flex items-center justify-center leading-none">□</button>
                        <button type="button" className="w-4 h-3.5 bg-[#c0c0c0] border border-white border-r-black border-b-black text-black text-[9px] font-bold flex items-center justify-center leading-none">✕</button>
                      </div>
                    </div>

                    {/* Form Client Surface */}
                    <div
                      className="relative overflow-hidden"
                      style={{
                        width: "100%",
                        height: `${html5State.visualForm.height}px`,
                        backgroundColor: html5State.visualForm.backColor || "#c0c0c0",
                      }}
                    >
                      {html5State.visualForm.controls.map((ctrl) => renderVisualFormControl(ctrl))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (() => {
              const isLight = html5State.theme === "light";
              return (
              <div
                className={`flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-8 ${
                  isLight ? "bg-[#F7F8FA] text-[#111827]" : "bg-black text-slate-100"
                }`}
              >
                {/* Live HTML5 Notifications / Button Click Feedback */}
                {html5State.notifications && html5State.notifications.length > 0 && (
                  <div className="space-y-1.5">
                    {html5State.notifications.slice(-2).map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 shadow-sm ${
                          isLight
                            ? "bg-[#EEF6F1] border-[#CFE4D7] text-[#2F6F4E]"
                            : "bg-emerald-950/90 border-emerald-500/60 text-emerald-300"
                        }`}
                      >
                        <Check className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{notif.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Form Feedback Alert */}
                {formSuccessMessage && (
                  <div
                    className={`p-3.5 rounded-xl border text-sm font-medium flex items-center gap-2 shadow-sm animate-in fade-in duration-200 ${
                      isLight
                        ? "bg-[#EEF6F1] border-[#CFE4D7] text-[#2F6F4E]"
                        : "bg-emerald-950/90 border-emerald-500/60 text-emerald-300"
                    }`}
                  >
                    <Check className="w-4 h-4 flex-shrink-0" />
                    <span>{formSuccessMessage}</span>
                  </div>
                )}

                {/* Navbar Section */}
                {html5State.navbar && (
                  <div
                    className={`flex flex-wrap items-center justify-between gap-3 py-2.5 border-b ${
                      isLight ? "border-[#E2E8F0]" : "border-slate-800/80"
                    }`}
                  >
                    <div className={`flex items-center gap-2 font-bold text-base ${isLight ? "text-[#111827]" : "text-white"}`}>
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isLight
                            ? "bg-[#7C2D48] text-white"
                            : "bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 shadow-md"
                        }`}
                      >
                        {html5State.navbar.brand ? html5State.navbar.brand.charAt(0).toUpperCase() : "A"}
                      </div>
                      <span>{html5State.navbar.brand}</span>
                    </div>
                    <div className={`flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-medium ${isLight ? "text-[#4B5563]" : "text-slate-300"}`}>
                      {html5State.navbar.user && (
                        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-cyan-300 text-[11px]">
                          {html5State.navbar.user.name}
                        </span>
                      )}
                      {html5State.navbar.links.map((link, idx) => (
                        <span
                          key={idx}
                          onClick={() => link.action && runtime.triggerHtml5Action(link.action)}
                          className={`cursor-pointer transition-colors ${isLight ? "hover:text-[#7C2D48]" : "hover:text-cyan-400"}`}
                        >
                          {link.label}
                        </span>
                      ))}
                      {html5State.navbar.ctaText && (
                        <button
                          type="button"
                          onClick={() => runtime.triggerHtml5Action(html5State.navbar?.ctaAction || "btn_cta_nav")}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                            isLight
                              ? "bg-[#7C2D48] hover:bg-[#642239] text-white"
                              : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm shadow-cyan-500/20"
                          }`}
                        >
                          {html5State.navbar.ctaText}
                        </button>
                      )}
                    </div>
                  </div>
                )}

              {/* Stat Metric Cards */}
              {html5State.stats && html5State.stats.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {html5State.stats.map((s) => (
                    <div
                      key={s.id}
                      className={`p-3.5 rounded-xl border shadow-xs ${
                        isLight ? "bg-white border-[#E2E8F0]" : "bg-slate-900/80 border-slate-800"
                      }`}
                    >
                      <div className={`text-[11px] font-semibold uppercase tracking-wider ${isLight ? "text-[#6B7280]" : "text-slate-400"}`}>
                        {s.label}
                      </div>
                      <div className={`text-xl font-extrabold mt-1 ${isLight ? "text-[#111827]" : "text-white"}`}>
                        {s.value}
                      </div>
                      {s.change && (
                        <div className={`text-xs mt-0.5 font-medium ${s.isPositive ? (isLight ? "text-[#2F6F4E]" : "text-emerald-400") : (isLight ? "text-[#6B7280]" : "text-slate-400")}`}>
                          {s.change}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Filter Tabs Navigation */}
              {html5State.tabs && html5State.tabs.length > 0 && (
                <div className={`flex items-center gap-1.5 border-b pb-2 overflow-x-auto ${isLight ? "border-[#E2E8F0]" : "border-slate-800"}`}>
                  {html5State.tabs.map((tab) => {
                    const isActive = (html5State.activeTabId || html5State.tabs?.[0]?.id) === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => runtime.triggerHtml5Action("tab_change", { tabId: tab.id })}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? (isLight ? "bg-[#7C2D48] text-white" : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm")
                            : (isLight ? "bg-white text-[#4B5563] border border-[#E2E8F0]" : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800")
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Hero Section */}
              {html5State.hero && (
                <div className="text-center py-6 sm:py-10 max-w-2xl mx-auto space-y-4">
                  {html5State.hero.badge && (
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold border ${
                        isLight
                          ? "bg-[#FDF2F5] text-[#7C2D48] border-[#F3D0DC]"
                          : "bg-cyan-950/80 text-cyan-400 border-cyan-800/60"
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{html5State.hero.badge}</span>
                    </div>
                  )}
                  <h1
                    className={`text-3xl sm:text-4xl font-black tracking-tight leading-tight ${
                      isLight
                        ? "text-[#111827]"
                        : "text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400"
                    }`}
                  >
                    {html5State.hero.title}
                  </h1>
                  <p className={`text-sm sm:text-base leading-relaxed ${isLight ? "text-[#4B5563]" : "text-slate-400"}`}>
                    {html5State.hero.subtitle}
                  </p>
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => runtime.triggerHtml5Action(html5State.hero?.ctaAction || "btn_cta_hero")}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs active:scale-95 transition-all cursor-pointer ${
                        isLight
                          ? "bg-[#7C2D48] hover:bg-[#642239] text-white shadow-sm"
                          : "bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 shadow-lg shadow-cyan-500/20"
                      }`}
                    >
                      {html5State.hero.ctaText} →
                    </button>
                    {html5State.hero.secondaryCtaText && (
                      <button
                        onClick={() => runtime.triggerHtml5Action(html5State.hero?.secondaryCtaAction || "btn_demo")}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs border active:scale-95 transition-all cursor-pointer ${
                          isLight
                            ? "bg-white hover:bg-slate-50 text-[#111827] border-[#E2E8F0]"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                        }`}
                      >
                        {html5State.hero.secondaryCtaText}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Features Section */}
              {html5State.features.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  {html5State.features.map((feat) => (
                    <div
                      key={feat.id}
                      className={`p-4 rounded-xl border transition-all group ${
                        isLight
                          ? "bg-white border-[#E2E8F0] hover:border-[#7C2D48]/50"
                          : "bg-slate-900/60 border-slate-800/80 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5"
                      }`}
                    >
                      <div className="text-2xl mb-2">{feat.icon}</div>
                      <h3 className={`text-sm font-bold mb-1 ${isLight ? "text-[#111827]" : "text-white"}`}>{feat.title}</h3>
                      <p className={`text-xs leading-relaxed ${isLight ? "text-[#4B5563]" : "text-slate-400"}`}>{feat.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Web Pricing Plans Section */}
              {html5State.pricing && html5State.pricing.length > 0 && (
                <div className="space-y-4 pt-4">
                  <div className="text-center space-y-1">
                    <h2 className={`text-xl sm:text-2xl font-black ${isLight ? "text-[#111827]" : "text-white"}`}>
                      Planes y Precios
                    </h2>
                    <p className={`text-xs ${isLight ? "text-[#4B5563]" : "text-slate-400"}`}>
                      Escoge la opción ideal para tu pedido o suscripción
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch pt-2">
                    {html5State.pricing.map((plan) => (
                      <div
                        key={plan.id}
                        className={`relative p-5 rounded-2xl flex flex-col justify-between transition-all ${
                          plan.isPopular
                            ? (isLight
                                ? "bg-white border-2 border-[#7C2D48] shadow-md"
                                : "bg-gradient-to-b from-cyan-950/70 via-slate-900/90 to-slate-900/90 border-2 border-cyan-400 shadow-xl shadow-cyan-500/15")
                            : (isLight
                                ? "bg-white border border-[#E2E8F0]"
                                : "bg-slate-900/60 border border-slate-800/80 hover:border-slate-700")
                        }`}
                      >
                        {plan.isPopular && (
                          <div
                            className={`mb-2 inline-flex w-fit px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              isLight ? "bg-[#7C2D48] text-white" : "bg-cyan-400 text-slate-950"
                            }`}
                          >
                            Recomendado
                          </div>
                        )}
                        <div>
                          <div className={`text-sm font-bold ${isLight ? "text-[#111827]" : "text-white"}`}>{plan.name}</div>
                          <div className="mt-3 flex items-baseline gap-1">
                            <span className={`text-2xl sm:text-3xl font-black ${isLight ? "text-[#111827]" : "text-white"}`}>{plan.price}</span>
                            <span className={`text-xs ${isLight ? "text-[#6B7280]" : "text-slate-400"}`}>{plan.period || "/mes"}</span>
                          </div>
                          <ul className={`mt-4 space-y-2 text-xs ${isLight ? "text-[#374151]" : "text-slate-300"}`}>
                            {plan.features.map((feat, fIdx) => (
                              <li key={fIdx} className="flex items-center gap-2">
                                <span className={`font-bold text-xs ${isLight ? "text-[#2F6F4E]" : "text-emerald-400"}`}>✓</span>
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <button
                          type="button"
                          onClick={() => runtime.triggerHtml5Action(plan.ctaAction || "select_plan", { planId: plan.id })}
                          className={`mt-6 w-full py-2.5 px-3 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer ${
                            plan.isPopular
                              ? (isLight ? "bg-[#7C2D48] hover:bg-[#642239] text-white" : "bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-md shadow-cyan-500/25")
                              : (isLight ? "bg-[#F7F8FA] hover:bg-slate-100 text-[#111827] border border-[#E2E8F0]" : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700")
                          }`}
                        >
                          {plan.ctaText || "Elegir Plan"} →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Section */}
              {html5State.form && (
                <div
                  className={`max-w-xl mx-auto p-5 sm:p-7 rounded-2xl border shadow-sm space-y-5 ${
                    isLight
                      ? "bg-white border-[#E2E8F0]"
                      : "bg-gradient-to-b from-slate-900/90 to-slate-900/60 border-slate-800 shadow-xl"
                  }`}
                >
                  <div className="text-center">
                    <h2 className={`text-xl sm:text-2xl font-bold ${isLight ? "text-[#111827]" : "text-white"}`}>
                      {html5State.form.title}
                    </h2>
                    {html5State.form.description && (
                      <p className={`text-xs mt-1 ${isLight ? "text-[#4B5563]" : "text-slate-400"}`}>
                        {html5State.form.description}
                      </p>
                    )}
                  </div>

                  <form onSubmit={handleHtml5FormSubmit} className="space-y-4">
                    {html5State.form.fields.map((f) => {
                      const labelStyle = `block text-xs font-semibold ${isLight ? "text-[#374151]" : "text-slate-300"}`;
                      const fieldStyle = isLight
                        ? "w-full px-3.5 py-2.5 rounded-lg bg-[#F7F8FA] border border-[#E2E8F0] text-[#111827] placeholder-[#9CA3AF] text-xs focus:outline-none focus:border-[#7C2D48] focus:ring-1 focus:ring-[#7C2D48] transition-all"
                        : "w-full px-3.5 py-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all";
                      if (f.type === "textarea") {
                        return (
                          <div key={f.id} className="space-y-1">
                            <label className={labelStyle}>{f.label}</label>
                            <textarea
                              id={f.id}
                              value={formValues[f.id] || ""}
                              onChange={(e) => setFormValues((prev) => ({ ...prev, [f.id]: e.target.value }))}
                              placeholder={f.placeholder}
                              rows={3}
                              className={fieldStyle}
                            />
                          </div>
                        );
                      }
                      if (f.type === "select") {
                        return (
                          <div key={f.id} className="space-y-1">
                            <label className={labelStyle}>{f.label}</label>
                            <select
                              id={f.id}
                              value={formValues[f.id] || (f.options ? f.options[0] : "")}
                              onChange={(e) => setFormValues((prev) => ({ ...prev, [f.id]: e.target.value }))}
                              className={fieldStyle}
                            >
                              {(f.options || ["Opción 1", "Opción 2"]).map((opt, i) => (
                                <option key={i} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }
                      if (f.type === "checkbox") {
                        return (
                          <div key={f.id} className="flex items-center gap-2 pt-1">
                            <input
                              type="checkbox"
                              id={f.id}
                              checked={Boolean(formValues[f.id] ?? f.defaultValue)}
                              onChange={(e) => setFormValues((prev) => ({ ...prev, [f.id]: e.target.checked }))}
                              className="w-4 h-4 rounded cursor-pointer accent-[#7C2D48]"
                            />
                            <label htmlFor={f.id} className={`text-xs cursor-pointer ${isLight ? "text-[#374151]" : "text-slate-300"}`}>
                              {f.label}
                            </label>
                          </div>
                        );
                      }
                      return (
                        <div key={f.id} className="space-y-1">
                          <label className={labelStyle}>{f.label}</label>
                          <input
                            type={f.type}
                            id={f.id}
                            value={formValues[f.id] || ""}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, [f.id]: e.target.value }))}
                            placeholder={f.placeholder}
                            required={f.required}
                            className={fieldStyle}
                          />
                        </div>
                      );
                    })}

                    <button
                      type="submit"
                      className={`w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isLight
                          ? "bg-[#7C2D48] hover:bg-[#642239] text-white"
                          : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20"
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{html5State.form.submitLabel}</span>
                    </button>
                  </form>
                </div>
              )}

              {/* Custom Action Buttons */}
              {html5State.actions && html5State.actions.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  {html5State.actions.map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => runtime.triggerHtml5Action(act.action)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                        act.variant === "primary"
                          ? (isLight ? "bg-[#7C2D48] hover:bg-[#642239] text-white" : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20")
                          : act.variant === "danger"
                          ? "bg-rose-600 hover:bg-rose-500 text-white"
                          : (isLight ? "bg-white hover:bg-slate-50 text-[#111827] border border-[#E2E8F0]" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700")
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Data Table Section */}
              {html5State.table && (
                <div className={`p-4 rounded-xl border space-y-3 ${isLight ? "bg-white border-[#E2E8F0]" : "bg-slate-900/60 border-slate-800/80"}`}>
                  <h3 className={`text-sm font-bold ${isLight ? "text-[#111827]" : "text-white"}`}>{html5State.table.title}</h3>
                  <div className={`overflow-x-auto rounded-lg border ${isLight ? "border-[#E2E8F0]" : "border-slate-800"}`}>
                    <table className={`w-full text-left text-xs ${isLight ? "text-[#374151]" : "text-slate-300"}`}>
                      <thead className={`font-semibold uppercase text-[10px] tracking-wider ${isLight ? "bg-[#F7F8FA] text-[#6B7280]" : "bg-slate-800/60 text-slate-400"}`}>
                        <tr>
                          {html5State.table.headers.map((h, i) => (
                            <th key={i} className={`px-3 py-2 border-b ${isLight ? "border-[#E2E8F0]" : "border-slate-800"}`}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isLight ? "divide-[#E2E8F0] bg-white" : "divide-slate-800/60 bg-slate-950/40"}`}>
                        {html5State.table.rows.map((row, rIdx) => (
                          <tr key={rIdx} className={`transition-colors ${isLight ? "hover:bg-[#F7F8FA]" : "hover:bg-slate-800/30"}`}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="px-3 py-2">
                                {cIdx === row.length - 1 && (String(cell) === "Completar" || String(cell) === "Reabrir" || String(cell) === "Editar") ? (
                                  <button
                                    type="button"
                                    onClick={() => runtime.triggerHtml5Action("row_action", { rowIndex: rIdx, rowData: row })}
                                    className="px-2.5 py-1 rounded text-[11px] font-semibold bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 transition-colors cursor-pointer"
                                  >
                                    {String(cell)}
                                  </button>
                                ) : String(cell) === "Completada" || String(cell) === "Activo" || String(cell) === "Pagado" ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                                    {String(cell)}
                                  </span>
                                ) : String(cell) === "Pendiente" ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/50">
                                    {String(cell)}
                                  </span>
                                ) : (
                                  String(cell)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Web Testimonials Section */}
              {html5State.testimonials && html5State.testimonials.length > 0 && (
                <div className="space-y-4 pt-4">
                  <div className="text-center space-y-1">
                    <h2 className={`text-xl sm:text-2xl font-black ${isLight ? "text-[#111827]" : "text-white"}`}>
                      Testimonios de Clientes
                    </h2>
                    <p className={`text-xs ${isLight ? "text-[#4B5563]" : "text-slate-400"}`}>
                      Opiniones reales de personas y empresas que confían en nosotros
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    {html5State.testimonials.map((t) => (
                      <div
                        key={t.id}
                        className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${
                          isLight ? "bg-white border-[#E2E8F0]" : "bg-slate-900/60 border-slate-800/80"
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="text-amber-500 text-xs tracking-widest">
                            {"★".repeat(t.rating || 5)}
                          </div>
                          <p className={`text-xs italic leading-relaxed ${isLight ? "text-[#374151]" : "text-slate-300"}`}>
                            "{t.quote}"
                          </p>
                        </div>
                        <div className={`pt-2 border-t ${isLight ? "border-[#E2E8F0]" : "border-slate-800/60"}`}>
                          <div className={`text-xs font-bold ${isLight ? "text-[#111827]" : "text-white"}`}>{t.author}</div>
                          <div className={`text-[10px] ${isLight ? "text-[#6B7280]" : "text-slate-400"}`}>{t.role || "Cliente Verificado"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Web FAQ Accordion Section */}
              {html5State.faqs && html5State.faqs.length > 0 && (
                <div className="space-y-3 max-w-2xl mx-auto w-full pt-4">
                  <div className="text-center space-y-1 pb-1">
                    <h2 className={`text-xl sm:text-2xl font-black ${isLight ? "text-[#111827]" : "text-white"}`}>
                      Preguntas Frecuentes
                    </h2>
                    <p className={`text-xs ${isLight ? "text-[#4B5563]" : "text-slate-400"}`}>
                      Respuestas claras a las dudas más habituales
                    </p>
                  </div>
                  <div className="space-y-2">
                    {html5State.faqs.map((faq, idx) => {
                      const isOpen = openFaqIndex === idx;
                      return (
                        <div
                          key={faq.id}
                          className={`rounded-xl border overflow-hidden transition-all ${
                            isLight ? "bg-white border-[#E2E8F0]" : "bg-slate-900/60 border-slate-800/80"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                            className={`w-full p-3.5 text-left flex items-center justify-between text-xs font-bold transition-colors cursor-pointer ${
                              isLight ? "text-[#111827] hover:text-[#7C2D48]" : "text-white hover:text-cyan-300"
                            }`}
                          >
                            <span>{faq.question}</span>
                            <span className={`text-xs transition-transform duration-200 ${isLight ? "text-[#6B7280]" : "text-slate-400"} ${isOpen ? "rotate-180" : ""}`}>
                              ▼
                            </span>
                          </button>
                          {isOpen && (
                            <div
                              className={`px-3.5 pb-3.5 pt-2 text-xs border-t leading-relaxed animate-in fade-in duration-150 ${
                                isLight ? "text-[#4B5563] border-[#E2E8F0]" : "text-slate-400 border-slate-800/40"
                              }`}
                            >
                              {faq.answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Web CTA Banner Section */}
              {html5State.ctaBanner && (
                <div className="pt-4">
                  <div
                    className={`p-6 sm:p-8 rounded-3xl border text-center space-y-3 ${
                      isLight
                        ? "bg-[#FDF2F5] border-[#F3D0DC]"
                        : "bg-gradient-to-r from-cyan-950/80 via-blue-950/60 to-slate-900 border-cyan-500/30 shadow-2xl"
                    }`}
                  >
                    {html5State.ctaBanner.badge && (
                      <div
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                          isLight ? "bg-[#7C2D48] text-white" : "bg-cyan-400 text-slate-950"
                        }`}
                      >
                        {html5State.ctaBanner.badge}
                      </div>
                    )}
                    <h2 className={`text-2xl sm:text-3xl font-black ${isLight ? "text-[#111827]" : "text-white"}`}>
                      {html5State.ctaBanner.title}
                    </h2>
                    {html5State.ctaBanner.subtitle && (
                      <p className={`text-xs sm:text-sm max-w-lg mx-auto ${isLight ? "text-[#4B5563]" : "text-slate-300"}`}>
                        {html5State.ctaBanner.subtitle}
                      </p>
                    )}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => runtime.triggerHtml5Action(html5State.ctaBanner?.buttonAction || "btn_cta_banner")}
                        className={`px-6 py-2.5 rounded-xl font-bold text-xs active:scale-95 transition-all cursor-pointer ${
                          isLight
                            ? "bg-[#7C2D48] hover:bg-[#642239] text-white"
                            : "bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-500/25"
                        }`}
                      >
                        {html5State.ctaBanner.buttonText} →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              {html5State.footer && (
                <div
                  className={`pt-4 border-t flex flex-col sm:flex-row items-center justify-between text-[11px] gap-2 ${
                    isLight ? "border-[#E2E8F0] text-[#6B7280]" : "border-slate-800/60 text-slate-500"
                  }`}
                >
                  <span>{html5State.footer.text}</span>
                  <div className="flex items-center gap-3">
                    {html5State.footer.links.map((link, i) => (
                      <span
                        key={i}
                        className={`cursor-pointer transition-colors ${isLight ? "hover:text-[#7C2D48]" : "hover:text-slate-300"}`}
                      >
                        {link}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
              );
            })()}
        </div>

        {/* Retro Canvas Screen (Always kept mounted in DOM so 2D/3D context and loop are never lost) */}
        <div
          className={`relative items-center justify-center shadow-2xl rounded-sm overflow-hidden border border-slate-900 bg-black ${
            isHtml5Mode ? "hidden" : "flex"
          }`}
            style={{
              aspectRatio: `${runtime.width} / ${runtime.height}`,
              maxWidth: "100%",
              maxHeight: "100%",
              width: "auto",
              height: "auto",
            }}
          >
            <canvas
            ref={(el) => {
              (canvasRef as any).current = el;
              if (el) {
                runtime.setCanvas(el);
                runtime.markDirty();
              }
            }}
            tabIndex={0}
            width={runtime.width}
            height={runtime.height}
            className="pixelated bg-[#050811] focus:outline-none touch-none"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              imageRendering: "pixelated",
              transform: "translateZ(0)",
              willChange: "transform",
              cursor: canvasCursor,
            }}
            onMouseDown={(e) => {
              e.currentTarget.focus({ preventScroll: true });
              if (e.button === 0) {
                runtime.mouseState.left = true;
                runtime.appUiEngine?.handleMouseDown(runtime.mouseState.x, runtime.mouseState.y);
              }
              if (e.button === 2) runtime.mouseState.right = true;
            }}
            onMouseUp={(e) => {
              if (e.button === 0) {
                runtime.mouseState.left = false;
                runtime.appUiEngine?.handleMouseUp(runtime.mouseState.x, runtime.mouseState.y);
              }
              if (e.button === 2) runtime.mouseState.right = false;
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const mx = Math.floor(((e.clientX - rect.left) / rect.width) * runtime.width);
              const my = Math.floor(((e.clientY - rect.top) / rect.height) * runtime.height);
              runtime.mouseState.x = mx;
              runtime.mouseState.y = my;
              runtime.appUiEngine?.handleMouseMove(mx, my);
              const dynCursor = runtime.appUiEngine?.getCursorAt(mx, my) || (runtime.appUiEngine?.hasWidgets() ? "default" : "crosshair");
              if (dynCursor !== canvasCursor) {
                setCanvasCursor(dynCursor);
              }
            }}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              if (!touch) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const tx = Math.floor(((touch.clientX - rect.left) / rect.width) * runtime.width);
              const ty = Math.floor(((touch.clientY - rect.top) / rect.height) * runtime.height);
              runtime.mouseState.x = tx;
              runtime.mouseState.y = ty;
              runtime.mouseState.left = true;
              runtime.appUiEngine?.handleMouseMove(tx, ty);
              runtime.appUiEngine?.handleMouseDown(tx, ty);
            }}
            onTouchMove={(e) => {
              const touch = e.touches[0];
              if (!touch) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const tx = Math.floor(((touch.clientX - rect.left) / rect.width) * runtime.width);
              const ty = Math.floor(((touch.clientY - rect.top) / rect.height) * runtime.height);
              runtime.mouseState.x = tx;
              runtime.mouseState.y = ty;
              runtime.appUiEngine?.handleMouseMove(tx, ty);
            }}
            onTouchEnd={() => {
              runtime.mouseState.left = false;
              runtime.appUiEngine?.handleMouseUp(runtime.mouseState.x, runtime.mouseState.y);
            }}
            onTouchCancel={() => {
              runtime.mouseState.left = false;
              runtime.appUiEngine?.handleMouseUp(runtime.mouseState.x, runtime.mouseState.y);
            }}
            onWheel={(e) => {
              e.preventDefault();
              if (runtime.appUiEngine) {
                const handled = runtime.appUiEngine.handleWheel(e.deltaY, runtime.mouseState.x, runtime.mouseState.y);
                if (handled) {
                  runtime.wakeUp();
                }
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
          />

          {/* CRT Scanline Shader Overlay */}
          {crtFilter && (
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.75) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))",
                backgroundSize: "100% 3px, 6px 100%",
              }}
            />
          )}

          {/* Pause overlay */}
          {runtime.isPaused && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center text-slate-200">
              <span className="font-retro text-lg tracking-wider text-amber-400 mb-2">PAUSA</span>
              <span className="text-xs text-slate-400">Presiona Play para continuar</span>
            </div>
          )}

          {/* Google AdMob Simulated Continuous Banner */}
          {admobState.bannerVisible && (
            <div
              className={`absolute inset-x-0 ${
                admobState.bannerPosition === "top" ? "top-2" : "bottom-2"
              } z-40 flex justify-center pointer-events-auto px-2`}
            >
              <div className="bg-[#18181b]/95 border border-amber-500/50 text-white rounded-md px-3.5 py-1.5 flex items-center gap-3 shadow-2xl backdrop-blur-md max-w-sm w-full animate-in fade-in slide-in-from-bottom-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      AdMob Banner
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">320×50 Test</span>
                  </div>
                  <p className="text-[11px] text-slate-200 truncate mt-0.5 font-medium">
                    Google Mobile Ads • Banner Continuo Activo
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => runtime.admob_hide_banner()}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                  title="Ocultar Banner"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Google AdMob Simulated Fullscreen Interstitial Ad */}
          {admobState.interstitialVisible && (
            <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-200 pointer-events-auto">
              <div className="max-w-md w-full bg-[#090d16] border border-cyan-500/40 rounded-xl p-5 shadow-2xl flex flex-col items-center">
                <div className="flex items-center justify-between w-full mb-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    Anuncio Intersticial AdMob
                  </span>
                  <button
                    type="button"
                    onClick={() => runtime.admob_close_interstitial()}
                    disabled={admobState.interstitialCountdown > 0}
                    className={`text-xs px-2.5 py-1 rounded font-mono ${
                      admobState.interstitialCountdown > 0
                        ? "text-slate-500 bg-slate-900 border border-slate-800 cursor-not-allowed"
                        : "text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer"
                    }`}
                  >
                    {admobState.interstitialCountdown > 0
                      ? `Cerrar en ${admobState.interstitialCountdown}s`
                      : "Cerrar anuncio ✕"}
                  </button>
                </div>

                <div className="w-full aspect-video rounded-lg bg-gradient-to-br from-indigo-950 via-slate-900 to-cyan-950 border border-slate-800 flex flex-col items-center justify-center p-4 my-2 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
                  <Sparkles className="w-10 h-10 text-cyan-400 animate-bounce mb-2" />
                  <h4 className="text-base font-bold text-white tracking-wide">
                    ¡WXDIV 3.0 para Android!
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 max-w-xs text-center">
                    Demostración de Interstitial de pantalla completa listo para APK y Google Play Store.
                  </p>
                </div>

                <p className="text-[11px] text-slate-400 mt-2 font-mono">
                  {admobState.interstitialCountdown > 0
                    ? `Visualizando anuncio... (${admobState.interstitialCountdown}s)`
                    : "Puedes cerrar este anuncio para reanudar el juego."}
                </p>

                {admobState.interstitialCountdown === 0 && (
                  <button
                    type="button"
                    onClick={() => runtime.admob_close_interstitial()}
                    className="mt-3 px-5 py-2 rounded-lg font-bold text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-lg shadow-cyan-500/25 cursor-pointer"
                  >
                    Continuar jugando
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Google AdMob Simulated Rewarded Video Ad */}
          {admobState.rewardedVisible && (
            <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center animate-in zoom-in-95 duration-200 pointer-events-auto">
              <div className="max-w-md w-full bg-[#0a0f1d] border border-amber-500/50 rounded-xl p-5 shadow-2xl flex flex-col items-center">
                <div className="flex items-center justify-between w-full mb-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    🎁 Anuncio con Recompensa (Rewarded)
                  </span>
                  <button
                    type="button"
                    onClick={() => runtime.admob_close_rewarded()}
                    className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
                    title="Cancelar"
                  >
                    ✕
                  </button>
                </div>

                <div className="w-full bg-slate-900/90 rounded-lg p-4 border border-amber-500/30 my-2 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 text-xl font-bold mb-2">
                    💰
                  </div>
                  <h4 className="text-sm font-bold text-slate-100">
                    Recompensa AdMob disponible:
                  </h4>
                  <div className="mt-1 px-3 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-base font-mono">
                    +{admobState.rewardAmount} {admobState.rewardType}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Mira este video corto para recibir tu bonificación y continuar en la app.
                  </p>

                  {/* Video simulation progress */}
                  <div className="w-full bg-slate-800 rounded-full h-2 mt-4 overflow-hidden">
                    <div
                      className="bg-amber-400 h-full transition-all duration-1000"
                      style={{
                        width: `${((5 - admobState.rewardedCountdown) / 5) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1">
                    {admobState.rewardedCountdown > 0
                      ? `Video en reproducción... ${admobState.rewardedCountdown}s`
                      : "¡Video completado! Reclama tu recompensa"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    runtime.admob_grant_reward(admobState.rewardType, admobState.rewardAmount)
                  }
                  className="mt-3 w-full py-2.5 rounded-lg font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <span>¡Reclamar +{admobState.rewardAmount} {admobState.rewardType} y Continuar!</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile / Touch Virtual Controls */}
        {showTouchControls && !isHtml5Mode && (
          <div className="absolute bottom-3 inset-x-3 flex justify-between items-end pointer-events-none lg:hidden z-20">
            {/* D-Pad */}
            <div className="grid grid-cols-3 gap-1.5 w-36 h-36 pointer-events-auto touch-none select-none">
              <div />
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); setTouchKey("up", true); }}
                onPointerUp={() => setTouchKey("up", false)}
                onPointerCancel={() => setTouchKey("up", false)}
                onPointerLeave={() => setTouchKey("up", false)}
                className="min-w-[44px] min-h-[44px] bg-slate-900/75 active:bg-[#7C2D48] border border-white/20 rounded-xl flex items-center justify-center text-white text-base shadow-lg touch-none"
              >
                ▲
              </button>
              <div />
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); setTouchKey("left", true); }}
                onPointerUp={() => setTouchKey("left", false)}
                onPointerCancel={() => setTouchKey("left", false)}
                onPointerLeave={() => setTouchKey("left", false)}
                className="min-w-[44px] min-h-[44px] bg-slate-900/75 active:bg-[#7C2D48] border border-white/20 rounded-xl flex items-center justify-center text-white text-base shadow-lg touch-none"
              >
                ◀
              </button>
              <div />
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); setTouchKey("right", true); }}
                onPointerUp={() => setTouchKey("right", false)}
                onPointerCancel={() => setTouchKey("right", false)}
                onPointerLeave={() => setTouchKey("right", false)}
                className="min-w-[44px] min-h-[44px] bg-slate-900/75 active:bg-[#7C2D48] border border-white/20 rounded-xl flex items-center justify-center text-white text-base shadow-lg touch-none"
              >
                ▶
              </button>
              <div />
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); setTouchKey("down", true); }}
                onPointerUp={() => setTouchKey("down", false)}
                onPointerCancel={() => setTouchKey("down", false)}
                onPointerLeave={() => setTouchKey("down", false)}
                className="min-w-[44px] min-h-[44px] bg-slate-900/75 active:bg-[#7C2D48] border border-white/20 rounded-xl flex items-center justify-center text-white text-base shadow-lg touch-none"
              >
                ▼
              </button>
              <div />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pointer-events-auto touch-none select-none pb-1">
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); setTouchKey("space", true); }}
                onPointerUp={() => setTouchKey("space", false)}
                onPointerCancel={() => setTouchKey("space", false)}
                onPointerLeave={() => setTouchKey("space", false)}
                className="w-14 h-14 rounded-full bg-[#7C2D48]/85 active:bg-[#9E3F5E] border border-white/25 flex items-center justify-center text-white font-bold shadow-lg touch-none"
              >
                A
              </button>
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); setTouchKey("enter", true); }}
                onPointerUp={() => setTouchKey("enter", false)}
                onPointerCancel={() => setTouchKey("enter", false)}
                onPointerLeave={() => setTouchKey("enter", false)}
                className="w-14 h-14 rounded-full bg-[#2F6F4E]/85 active:bg-[#3A845D] border border-white/25 flex items-center justify-center text-white font-bold shadow-lg touch-none"
              >
                B
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stage Bottom Bar / Stats Telemetry */}
      <div className="px-3 py-1.5 bg-[#0a0f1d] border-t border-slate-800/80 flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400 select-none flex-shrink-0 h-8 overflow-hidden min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-slate-500">FPS:</span>
            <span className={`font-semibold tabular-nums ${stats.fps >= 55 ? "text-emerald-400" : "text-amber-400"}`}>
              {stats.fps}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsProcessDebuggerOpen(!isProcessDebuggerOpen)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all cursor-pointer ${
              isProcessDebuggerOpen
                ? "bg-cyan-950 text-cyan-200 border-cyan-500 shadow-sm shadow-cyan-500/30 font-bold"
                : "bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700/80"
            }`}
            title="Abrir / Cerrar Debugger de Procesos DIV en tiempo real"
          >
            <Cpu className="w-3 h-3 text-cyan-400 flex-shrink-0" />
            <span className="text-slate-400">Procs:</span>
            <span className="text-cyan-300 font-semibold tabular-nums">{stats.processCount}</span>
          </button>

          {/* Real-time 3D Camera Telemetry Readout */}
          {cameraInfo.active && (
            <button
              type="button"
              onClick={() => setIs3DDebugOpen(!is3DDebugOpen)}
              className="hidden sm:flex items-center gap-1.5 text-cyan-300 bg-cyan-950/70 hover:bg-cyan-900/70 px-2 py-0.5 rounded border border-cyan-800/60 transition-colors cursor-pointer"
              title="Haz clic para abrir/cerrar el panel de depuración de la cámara 3D"
            >
              <Compass className="w-3 h-3 text-cyan-400 flex-shrink-0" />
              <span className="text-[10px] tabular-nums whitespace-nowrap">
                X:{cameraInfo.x.toFixed(1)} Y:{cameraInfo.y.toFixed(1)} ∠{Math.round(((cameraInfo.angle % 360 + 360) % 360))}°
              </span>
            </button>
          )}

          <div className="items-center gap-1 hidden md:flex">
            <span className="text-slate-500">Frame:</span>
            <span className="tabular-nums">{stats.frameIndex}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 min-w-0">
          <span className="text-slate-500 hidden md:inline tabular-nums flex-shrink-0">Render: {stats.renderTimeMs.toFixed(1)}ms</span>
          <span className="text-slate-500 truncate">WASD / Flechas + ESPACIO</span>
        </div>
      </div>

      {/* Production HTML5 / JS Code Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b101d] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Código HTML5 / JS Nativo Generado</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-600/40">
                      ⚡ &lt; 2ms
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Página web y formulario independiente, listo para desplegar en producción sin dependencias ni canvas.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyHtml}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedCode ? "¡Copiado!" : "Copiar"}</span>
                </button>
                <button
                  onClick={handleDownloadHtml}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar .html</span>
                </button>
                <button
                  onClick={() => setShowCodeModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Code Body */}
            <div className="flex-1 overflow-auto p-4 bg-[#060a12] font-mono text-xs text-cyan-300 leading-relaxed select-text">
              <pre className="whitespace-pre">{generateProductionHtml5Js(html5State)}</pre>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-500">
              <span>Optimizado para SEO, móviles y formularios reactivos de alta velocidad.</span>
              <button
                onClick={() => setShowCodeModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
