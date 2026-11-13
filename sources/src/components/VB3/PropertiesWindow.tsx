import React, { useState, useEffect, useRef } from "react";
import { VB3Control, VB3Form } from "./types";

export const BASE_WEB_FONTS = [
  // Modern Clean Sans (Landing Pages & UI)
  "Inter",
  "Outfit",
  "Roboto",
  "Montserrat",
  "Poppins",
  "Plus Jakarta Sans",
  "Space Grotesk",
  "Syne",
  "Manrope",
  "Urbanist",
  "DM Sans",
  "Sora",
  // High-End Editorial & Luxury Serif
  "Playfair Display",
  "Cinzel",
  "Lora",
  // Tech, Gaming & Arcade
  "Orbitron",
  "Press Start 2P",
  "Bebas Neue",
  // Monospace Code & Systems
  "JetBrains Mono",
  "Fira Code",
  "MS Sans Serif",
];

interface PropertiesWindowProps {
  form: VB3Form;
  selectedControl: VB3Control | null;
  onSelectControl: (controlId: string | null) => void;
  onUpdateProperty: (propertyName: string, value: any) => void;
}

export const PropertiesWindow: React.FC<PropertiesWindowProps> = ({
  form,
  selectedControl,
  onSelectControl,
  onUpdateProperty,
}) => {
  const isFormSelected = !selectedControl;

  // Selected property in list
  const [selectedPropKey, setSelectedPropKey] = useState<string>("Caption");
  const [editValue, setEditValue] = useState<string>("");
  const isUserTypingRef = useRef(false);

  // Sync editValue when selected object or property changes, unless user is actively typing
  useEffect(() => {
    isUserTypingRef.current = false;
    if (isFormSelected) {
      if (selectedPropKey === "Caption") setEditValue(form.caption || "");
      else if (selectedPropKey === "Name") setEditValue(form.name || "");
      else if (selectedPropKey === "BackColor") setEditValue(form.backColor || "#c0c0c0");
      else if (selectedPropKey === "Width") setEditValue(String(form.width || 640));
      else if (selectedPropKey === "Height") setEditValue(String(form.height || 480));
      else if (selectedPropKey === "FontName") setEditValue(form.fontName || "Outfit");
      else setEditValue("");
    } else if (selectedControl) {
      if (selectedPropKey === "Caption") setEditValue(selectedControl.caption || "");
      else if (selectedPropKey === "Text") setEditValue(selectedControl.text || selectedControl.caption || "");
      else if (selectedPropKey === "Name") setEditValue(selectedControl.name || "");
      else if (selectedPropKey === "Left") setEditValue(String(selectedControl.x));
      else if (selectedPropKey === "Top") setEditValue(String(selectedControl.y));
      else if (selectedPropKey === "Width") setEditValue(String(selectedControl.width));
      else if (selectedPropKey === "Height") setEditValue(String(selectedControl.height));
      else if (selectedPropKey === "Enabled") setEditValue(selectedControl.enabled !== false ? "True" : "False");
      else if (selectedPropKey === "Visible") setEditValue(selectedControl.visible !== false ? "True" : "False");
      else if (selectedPropKey === "FontName") setEditValue(selectedControl.fontName || "Outfit");
      else if (selectedPropKey === "FontSize") setEditValue(String(selectedControl.fontSize || 12));
      else if (selectedPropKey === "FontBold") setEditValue(selectedControl.fontBold ? "True" : "False");
      else if (selectedPropKey === "Interval") setEditValue(String(selectedControl.interval || 1000));
      else if (selectedPropKey === "EmbedUrl") setEditValue(selectedControl.embedUrl || "");
      else if (selectedPropKey === "EmbedHtml") setEditValue(selectedControl.embedHtml || "");
      else if (selectedPropKey === "JsCode") setEditValue(selectedControl.jsCode || "");
      else if (selectedPropKey === "Value") setEditValue(String(selectedControl.value ?? ""));
      else if (selectedPropKey === "ShapeType") setEditValue(selectedControl.shapeType || "rect");
      else if (selectedPropKey === "ChartType") setEditValue(selectedControl.chartType || "bar");
      else if (selectedPropKey === "BadgeVariant") setEditValue(selectedControl.badgeVariant || "primary");
      else if (selectedPropKey === "Gradient") setEditValue(selectedControl.gradient || "");
      else if (selectedPropKey === "BorderRadius") setEditValue(String(selectedControl.borderRadius ?? 8));
      else if (selectedPropKey === "BackColor") setEditValue(selectedControl.backColor || "");
      else if (selectedPropKey === "ForeColor") setEditValue(selectedControl.foreColor || "");
      else setEditValue("");
    }
  }, [
    isFormSelected,
    selectedControl?.id,
    selectedControl?.caption,
    selectedControl?.name,
    selectedControl?.x,
    selectedControl?.y,
    selectedControl?.width,
    selectedControl?.height,
    selectedControl?.fontName,
    selectedControl?.fontSize,
    form.caption,
    form.name,
    form.backColor,
    form.width,
    form.height,
    form.fontName,
    selectedPropKey,
  ]);

  // Apply edit value immediately
  const handleApply = (customVal?: string) => {
    const val = customVal !== undefined ? customVal : editValue;
    onUpdateProperty(selectedPropKey, val);
  };

  const handleChangeEditValue = (val: string) => {
    isUserTypingRef.current = true;
    setEditValue(val);
    // Instant live update so users never lose changes
    onUpdateProperty(selectedPropKey, val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleApply();
      (e.target as HTMLInputElement).blur();
    }
  };

  // Property definitions based on target
  const propertiesList = isFormSelected
    ? [
        { key: "Caption", label: "Caption", val: form.caption },
        { key: "Name", label: "Name", val: form.name },
        { key: "BackColor", label: "BackColor", val: form.backColor || "#c0c0c0" },
        { key: "FontName", label: "FontName (Base Web Font)", val: form.fontName || "Outfit" },
        { key: "Height", label: "Height", val: String(form.height || 480) },
        { key: "Width", label: "Width", val: String(form.width || 640) },
        { key: "BorderStyle", label: "BorderStyle", val: "2 - Sizable" },
        { key: "ControlBox", label: "ControlBox", val: "True" },
        { key: "Enabled", label: "Enabled", val: "True" },
        { key: "Visible", label: "Visible", val: "True" },
      ]
    : [
        { key: "Caption", label: "Caption", val: selectedControl?.caption || selectedControl?.text || "" },
        { key: "Name", label: "Name", val: selectedControl?.name || "" },
        { key: "Text", label: "Text", val: selectedControl?.text || selectedControl?.caption || "" },
        { key: "Left", label: "Left", val: String(selectedControl?.x ?? 0) },
        { key: "Top", label: "Top", val: String(selectedControl?.y ?? 0) },
        { key: "Width", label: "Width", val: String(selectedControl?.width ?? 100) },
        { key: "Height", label: "Height", val: String(selectedControl?.height ?? 30) },
        { key: "FontName", label: "FontName (Base Web Font)", val: selectedControl?.fontName || form.fontName || "Outfit" },
        { key: "FontSize", label: "FontSize", val: String(selectedControl?.fontSize || 12) },
        { key: "FontBold", label: "FontBold", val: selectedControl?.fontBold ? "True" : "False" },
        { key: "Enabled", label: "Enabled", val: selectedControl?.enabled !== false ? "True" : "False" },
        { key: "Visible", label: "Visible", val: selectedControl?.visible !== false ? "True" : "False" },
        { key: "BackColor", label: "BackColor", val: selectedControl?.backColor || "#ffffff" },
        { key: "ForeColor", label: "ForeColor", val: selectedControl?.foreColor || "#000000" },
        ...(selectedControl?.type === "herobanner" ||
        selectedControl?.type === "card" ||
        selectedControl?.type === "progressbar" ||
        selectedControl?.type === "pricingcard" ||
        selectedControl?.type === "statmetric"
          ? [
              { key: "Gradient", label: "Gradient", val: selectedControl.gradient || "linear-gradient(135deg, #1e1b4b, #4338ca)" },
              { key: "BorderRadius", label: "BorderRadius", val: String(selectedControl.borderRadius ?? 8) },
            ]
          : []),
        ...(selectedControl?.type === "chart"
          ? [{ key: "ChartType", label: "ChartType (bar/line/donut/area)", val: selectedControl.chartType || "bar" }]
          : []),
        ...(selectedControl?.type === "badge"
          ? [{ key: "BadgeVariant", label: "BadgeVariant (primary/success/warning/danger/purple)", val: selectedControl.badgeVariant || "primary" }]
          : []),
        ...(selectedControl?.type === "jscode" ||
        selectedControl?.type === "canvas5" ||
        selectedControl?.type === "html5editor"
          ? [{ key: "JsCode", label: "JsCode (Script JavaScript & HTML5)", val: selectedControl.jsCode || "// Script JS en vivo" }]
          : []),
        ...(selectedControl?.type === "timer"
          ? [{ key: "Interval", label: "Interval (ms)", val: String(selectedControl.interval || 1000) }]
          : []),
        ...(selectedControl?.type === "webembed" || selectedControl?.type === "ole" || selectedControl?.type === "videoplayer"
          ? [
              { key: "EmbedUrl", label: "EmbedUrl (URL / Media)", val: selectedControl.embedUrl || "https://example.com" },
              { key: "EmbedHtml", label: "EmbedHtml (HTML5 Code)", val: selectedControl.embedHtml || "" },
            ]
          : []),
        ...(selectedControl?.type === "gauge" ||
        selectedControl?.type === "hscrollbar" ||
        selectedControl?.type === "vscrollbar" ||
        selectedControl?.type === "slider" ||
        selectedControl?.type === "progressbar" ||
        selectedControl?.type === "statmetric"
          ? [{ key: "Value", label: "Value (0-100)", val: String(selectedControl.value ?? 60) }]
          : []),
        ...(selectedControl?.type === "shape"
          ? [{ key: "ShapeType", label: "ShapeType (rect/roundrect/circle/oval)", val: selectedControl.shapeType || "rect" }]
          : []),
      ];

  const currentSelectionLabel = isFormSelected
    ? `${form.name} (Formulario)`
    : `${selectedControl.name} (${selectedControl.type})`;

  return (
    <div className="w-full h-full flex-1 flex-grow min-h-0 bg-[#c0c0c0] p-1 flex flex-col select-none font-sans text-xs">
      {/* Target Selector Dropdown + Quick Switcher Button */}
      <div className="flex items-center gap-1 mb-1 flex-shrink-0">
        <select
          value={isFormSelected ? "FORM" : selectedControl?.id || "FORM"}
          onChange={(e) => {
            const val = e.target.value;
            onSelectControl(val === "FORM" ? null : val);
          }}
          className="flex-1 h-6 bg-white border border-black px-1 font-mono text-[11px] focus:outline-none text-black font-semibold cursor-pointer truncate shadow-xs"
        >
          <option value="FORM">📁 {form.name} [Formulario]</option>
          {form.controls.map((ctrl) => (
            <option key={ctrl.id} value={ctrl.id}>
              ⚙ {ctrl.name} ({ctrl.type})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onSelectControl(isFormSelected && form.controls[0] ? form.controls[0].id : null)}
          title={isFormSelected ? "Seleccionar primer control" : "Seleccionar Formulario"}
          className="px-1.5 h-6 bg-[#d0d0d0] hover:bg-[#e0e0e0] border-t border-l border-white border-b border-r border-black active:border-t-black active:border-l-black font-bold text-[10px] text-gray-800 flex items-center justify-center flex-shrink-0"
        >
          {isFormSelected ? "Control" : "Form"}
        </button>
      </div>

      {/* Target Notification Badge */}
      <div className="px-1.5 py-0.5 mb-1 bg-slate-800 text-cyan-300 font-mono text-[10px] rounded-xs flex items-center justify-between shadow-inner flex-shrink-0">
        <span className="truncate">Propiedades de: <strong>{currentSelectionLabel}</strong></span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
      </div>

      {/* Property Edit Bar with [X] and [✓] buttons */}
      <div className="flex items-center gap-1 mb-1 flex-shrink-0">
        <button
          onClick={() => {
            // Cancel / Revert
            const prop = propertiesList.find((p) => p.key === selectedPropKey);
            if (prop) {
              setEditValue(prop.val);
              handleApply(prop.val);
            }
          }}
          title="Cancelar / Restaurar valor original"
          className="w-5 h-5 bg-[#c0c0c0] border-t border-l border-white border-b-2 border-r-2 border-black active:border-t-2 active:border-l-2 active:border-black active:border-b active:border-r active:border-white font-bold text-red-700 text-xs flex items-center justify-center shadow-sm"
        >
          ✕
        </button>
        <button
          onClick={() => handleApply()}
          title="Aceptar / Aplicar cambio (Enter)"
          className="w-5 h-5 bg-[#c0c0c0] border-t border-l border-white border-b-2 border-r-2 border-black active:border-t-2 active:border-l-2 active:border-black active:border-b active:border-r active:border-white font-bold text-emerald-800 text-xs flex items-center justify-center shadow-sm"
        >
          ✓
        </button>

        {selectedPropKey === "FontName" ? (
          <select
            value={editValue || "Outfit"}
            onChange={(e) => {
              const val = e.target.value;
              handleChangeEditValue(val);
            }}
            className="flex-1 h-5 bg-white border border-black px-1 font-sans text-xs text-black focus:outline-none"
          >
            {BASE_WEB_FONTS.map((font) => (
              <option key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </option>
            ))}
          </select>
        ) : selectedPropKey === "Enabled" || selectedPropKey === "Visible" || selectedPropKey === "FontBold" ? (
          <div className="flex-1 flex gap-1 h-5 items-center">
            <button
              type="button"
              onClick={() => handleChangeEditValue("True")}
              className={`flex-1 h-full font-bold text-[10px] border border-black ${
                editValue === "True" ? "bg-emerald-700 text-white" : "bg-white text-black"
              }`}
            >
              True
            </button>
            <button
              type="button"
              onClick={() => handleChangeEditValue("False")}
              className={`flex-1 h-full font-bold text-[10px] border border-black ${
                editValue === "False" ? "bg-rose-700 text-white" : "bg-white text-black"
              }`}
            >
              False
            </button>
          </div>
        ) : selectedPropKey === "ChartType" ? (
          <select
            value={editValue || "bar"}
            onChange={(e) => handleChangeEditValue(e.target.value)}
            className="flex-1 h-5 bg-white border border-black px-1 font-mono text-xs text-black focus:outline-none"
          >
            <option value="bar">Bar (Barras 2D)</option>
            <option value="line">Line (Línea Continua)</option>
            <option value="donut">Donut (Circular)</option>
            <option value="area">Area (Área con Relleno)</option>
          </select>
        ) : selectedPropKey === "ShapeType" ? (
          <select
            value={editValue || "rect"}
            onChange={(e) => handleChangeEditValue(e.target.value)}
            className="flex-1 h-5 bg-white border border-black px-1 font-mono text-xs text-black focus:outline-none"
          >
            <option value="rect">Rectangle</option>
            <option value="roundrect">Rounded Rectangle</option>
            <option value="circle">Circle</option>
            <option value="oval">Oval</option>
          </select>
        ) : selectedPropKey === "BadgeVariant" ? (
          <select
            value={editValue || "primary"}
            onChange={(e) => handleChangeEditValue(e.target.value)}
            className="flex-1 h-5 bg-white border border-black px-1 font-mono text-xs text-black focus:outline-none"
          >
            <option value="primary">Primary (Azul)</option>
            <option value="success">Success (Esmeralda)</option>
            <option value="warning">Warning (Ámbar)</option>
            <option value="danger">Danger (Rojo)</option>
            <option value="purple">Purple (Púrpura)</option>
          </select>
        ) : selectedPropKey === "BackColor" || selectedPropKey === "ForeColor" ? (
          <div className="flex-1 min-w-0 flex items-center gap-1 h-5">
            <input
              type="color"
              value={editValue?.startsWith("#") ? editValue : "#ffffff"}
              onChange={(e) => handleChangeEditValue(e.target.value)}
              className="w-5 h-5 border border-black p-0 cursor-pointer flex-shrink-0"
              title="Paleta de Color"
            />
            <input
              type="text"
              value={editValue}
              onChange={(e) => handleChangeEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => handleApply()}
              className="flex-1 min-w-0 h-5 bg-white border border-black px-1 font-mono text-xs text-black focus:outline-none"
            />
          </div>
        ) : (
          <input
            type="text"
            value={editValue}
            onChange={(e) => handleChangeEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => handleApply()}
            className="flex-1 min-w-0 h-5 bg-white border border-black px-1 font-mono text-xs text-black focus:outline-none"
          />
        )}
      </div>

      {/* Property Sheet Table */}
      <div className="flex-1 flex-grow min-h-0 bg-white border border-black overflow-y-auto overflow-x-hidden font-sans text-xs">
        <table className="w-full table-fixed border-collapse">
          <tbody>
            {propertiesList.map((p) => {
              const isSelected = selectedPropKey === p.key;
              return (
                <tr
                  key={p.key}
                  onClick={() => {
                    setSelectedPropKey(p.key);
                    setEditValue(p.val);
                  }}
                  className={`cursor-pointer ${
                    isSelected
                      ? "bg-[#000080] text-white"
                      : "text-black hover:bg-[#f0f0f0]"
                  }`}
                >
                  <td className="w-1/2 px-2 py-2 sm:py-0.5 border-r border-[#d4d4d4] font-medium truncate">
                    {p.label}
                  </td>
                  <td className="w-1/2 px-2 py-2 sm:py-0.5 font-mono truncate">
                    {p.val}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
