import React, { useState, useEffect } from "react";
import { VB3Control, VB3Form } from "./types";

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
  const currentObject = selectedControl || form;

  // Selected property in list
  const [selectedPropKey, setSelectedPropKey] = useState<string>("Caption");
  const [editValue, setEditValue] = useState<string>("");

  // Sync editValue when selected object or property changes
  useEffect(() => {
    if (isFormSelected) {
      if (selectedPropKey === "Caption") setEditValue(form.caption || "");
      else if (selectedPropKey === "Name") setEditValue(form.name || "");
      else if (selectedPropKey === "BackColor") setEditValue(form.backColor || "");
      else if (selectedPropKey === "Width") setEditValue(String(form.width || 480));
      else if (selectedPropKey === "Height") setEditValue(String(form.height || 360));
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
      else if (selectedPropKey === "FontName") setEditValue(selectedControl.fontName || "MS Sans Serif");
      else if (selectedPropKey === "FontSize") setEditValue(String(selectedControl.fontSize || 9));
      else if (selectedPropKey === "Interval") setEditValue(String(selectedControl.interval || 1000));
      else if (selectedPropKey === "EmbedUrl") setEditValue(selectedControl.embedUrl || "");
      else if (selectedPropKey === "EmbedHtml") setEditValue(selectedControl.embedHtml || "");
      else if (selectedPropKey === "Value") setEditValue(String(selectedControl.value ?? ""));
      else if (selectedPropKey === "ShapeType") setEditValue(selectedControl.shapeType || "rect");
      else setEditValue("");
    }
  }, [isFormSelected, selectedControl, form, selectedPropKey]);

  // Apply edit value
  const handleApply = () => {
    onUpdateProperty(selectedPropKey, editValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleApply();
    }
  };

  // Property definitions based on target
  const propertiesList = isFormSelected
    ? [
        { key: "Caption", label: "Caption", val: form.caption },
        { key: "Name", label: "Name", val: form.name },
        { key: "BackColor", label: "BackColor", val: form.backColor },
        { key: "BorderStyle", label: "BorderStyle", val: "2 - Sizable" },
        { key: "ControlBox", label: "ControlBox", val: "True" },
        { key: "Enabled", label: "Enabled", val: "True" },
        { key: "FontName", label: "FontName", val: "MS Sans Serif" },
        { key: "FontSize", label: "FontSize", val: "8.25" },
        { key: "Height", label: "Height", val: String(form.height) },
        { key: "Width", label: "Width", val: String(form.width) },
        { key: "Visible", label: "Visible", val: "True" },
        { key: "WindowState", label: "WindowState", val: "0 - Normal" },
      ]
    : [
        { key: "Caption", label: "Caption", val: selectedControl?.caption || selectedControl?.text || "" },
        { key: "Name", label: "Name", val: selectedControl?.name || "" },
        { key: "Text", label: "Text", val: selectedControl?.text || selectedControl?.caption || "" },
        { key: "Left", label: "Left", val: String(selectedControl?.x ?? 0) },
        { key: "Top", label: "Top", val: String(selectedControl?.y ?? 0) },
        { key: "Width", label: "Width", val: String(selectedControl?.width ?? 100) },
        { key: "Height", label: "Height", val: String(selectedControl?.height ?? 30) },
        { key: "Enabled", label: "Enabled", val: selectedControl?.enabled !== false ? "True" : "False" },
        { key: "Visible", label: "Visible", val: selectedControl?.visible !== false ? "True" : "False" },
        { key: "FontName", label: "FontName", val: selectedControl?.fontName || "MS Sans Serif" },
        { key: "FontSize", label: "FontSize", val: String(selectedControl?.fontSize || 8.25) },
        { key: "FontBold", label: "FontBold", val: selectedControl?.fontBold ? "True" : "False" },
        { key: "BackColor", label: "BackColor", val: selectedControl?.backColor || "&H80000005&" },
        { key: "ForeColor", label: "ForeColor", val: selectedControl?.foreColor || "&H80000008&" },
        { key: "TabIndex", label: "TabIndex", val: "0" },
        { key: "TabStop", label: "TabStop", val: "True" },
        ...(selectedControl?.type === "timer"
          ? [{ key: "Interval", label: "Interval", val: String(selectedControl.interval || 1000) }]
          : []),
        ...(selectedControl?.type === "webembed" || selectedControl?.type === "ole"
          ? [
              { key: "EmbedUrl", label: "EmbedUrl", val: selectedControl.embedUrl || "https://example.com" },
              { key: "EmbedHtml", label: "EmbedHtml", val: selectedControl.embedHtml || "" },
            ]
          : []),
        ...(selectedControl?.type === "gauge" || selectedControl?.type === "hscrollbar" || selectedControl?.type === "vscrollbar"
          ? [{ key: "Value", label: "Value (0-100)", val: String(selectedControl.value ?? 60) }]
          : []),
        ...(selectedControl?.type === "shape"
          ? [{ key: "ShapeType", label: "ShapeType (rect/roundrect/circle)", val: selectedControl.shapeType || "rect" }]
          : []),
      ];

  return (
    <div className="w-full h-full bg-[#c0c0c0] p-1 flex flex-col select-none font-sans text-xs">
      {/* Target Selector Dropdown */}
      <div className="mb-1">
        <select
          value={isFormSelected ? "FORM" : selectedControl?.id || "FORM"}
          onChange={(e) => {
            const val = e.target.value;
            onSelectControl(val === "FORM" ? null : val);
          }}
          className="w-full h-6 bg-white border border-black px-1 font-mono text-xs focus:outline-none text-black font-semibold cursor-pointer"
        >
          <option value="FORM">{form.name} Form</option>
          {form.controls.map((ctrl) => (
            <option key={ctrl.id} value={ctrl.id}>
              {ctrl.name} {ctrl.type}
            </option>
          ))}
        </select>
      </div>

      {/* Property Edit Bar with [X] and [✓] buttons */}
      <div className="flex items-center gap-1 mb-1">
        <button
          onClick={() => {
            // Cancel / Revert
            const prop = propertiesList.find((p) => p.key === selectedPropKey);
            if (prop) setEditValue(prop.val);
          }}
          title="Cancelar (Esc)"
          className="w-5 h-5 bg-[#c0c0c0] border-t border-l border-white border-b-2 border-r-2 border-black active:border-t-2 active:border-l-2 active:border-black active:border-b active:border-r active:border-white font-bold text-red-700 text-xs flex items-center justify-center shadow-sm"
        >
          ✕
        </button>
        <button
          onClick={handleApply}
          title="Aceptar / Aplicar (Enter)"
          className="w-5 h-5 bg-[#c0c0c0] border-t border-l border-white border-b-2 border-r-2 border-black active:border-t-2 active:border-l-2 active:border-black active:border-b active:border-r active:border-white font-bold text-emerald-800 text-xs flex items-center justify-center shadow-sm"
        >
          ✓
        </button>
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleApply}
          className="flex-1 h-5 bg-white border border-black px-1 font-mono text-xs text-black focus:outline-none"
        />
      </div>

      {/* Property Sheet Table */}
      <div className="flex-1 bg-white border border-black overflow-y-auto font-sans text-xs">
        <table className="w-full border-collapse">
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
                  <td className="w-1/2 px-1.5 py-0.5 border-r border-[#d4d4d4] font-medium truncate">
                    {p.label}
                  </td>
                  <td className="w-1/2 px-1.5 py-0.5 font-mono truncate">
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
