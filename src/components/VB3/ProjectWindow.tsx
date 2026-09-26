import React, { useState } from "react";
import { VB3Form } from "./types";
import { WindowId } from "../WindowManager/types";
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  FileCode,
  Image,
  Map,
  Volume2,
  Box,
  Layers,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

interface ProjectWindowProps {
  projectName: string;
  forms: VB3Form[];
  activeFormId: string | null;
  onSelectForm: (formId: string) => void;
  onAddForm: () => void;
  onDeleteForm: (formId: string) => void;
  onRenameForm: (formId: string, newName: string, newCaption: string) => void;
  onViewForm: () => void;
  onViewCode: () => void;
  onOpenTool?: (toolId: WindowId) => void;
}

export const ProjectWindow: React.FC<ProjectWindowProps> = ({
  projectName,
  forms,
  activeFormId,
  onSelectForm,
  onAddForm,
  onDeleteForm,
  onRenameForm,
  onViewForm,
  onViewCode,
  onOpenTool,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>(() => {
    return activeFormId || (forms[0]?.id ?? "code_main");
  });
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameCaption, setRenameCaption] = useState("");

  const activeForm = forms.find((f) => f.id === (activeFormId || selectedItemId)) || forms[0];

  const handleStartRename = (form: VB3Form) => {
    setRenameValue(form.name);
    setRenameCaption(form.caption || form.name);
    setIsRenaming(true);
  };

  const handleConfirmRename = () => {
    if (activeForm && renameValue.trim()) {
      onRenameForm(activeForm.id, renameValue.trim(), renameCaption.trim() || renameValue.trim());
      setIsRenaming(false);
    }
  };

  return (
    <div className="w-full h-full bg-[#c0c0c0] p-1 flex flex-col select-none font-sans text-xs">
      {/* Top action buttons: View Form, View Code, + Form, Delete Form */}
      <div className="flex items-center gap-1 mb-1">
        <button
          onClick={onViewForm}
          title="Ver Formulario en Diseñador Visual"
          className="flex-1 py-1 px-1 bg-[#c0c0c0] border-t border-l border-white border-b-2 border-r-2 border-black active:border-t-2 active:border-l-2 active:border-black active:border-b active:border-r active:border-white font-bold text-black text-[11px] shadow-sm hover:bg-[#d0d0d0] flex items-center justify-center gap-1 truncate"
        >
          <span>🗎</span>
          <span>View Form</span>
        </button>
        <button
          onClick={onViewCode}
          title="Ver Código Fuente del Proyecto"
          className="flex-1 py-1 px-1 bg-[#c0c0c0] border-t border-l border-white border-b-2 border-r-2 border-black active:border-t-2 active:border-l-2 active:border-black active:border-b active:border-r active:border-white font-bold text-black text-[11px] shadow-sm hover:bg-[#d0d0d0] flex items-center justify-center gap-1 truncate"
        >
          <span>⚙</span>
          <span>View Code</span>
        </button>
        <button
          onClick={onAddForm}
          title="Añadir Nuevo Formulario al Proyecto"
          className="py-1 px-2 bg-[#c0c0c0] border-t border-l border-white border-b-2 border-r-2 border-black active:border-t-2 active:border-l-2 active:border-black active:border-b active:border-r active:border-white font-bold text-emerald-900 text-[11px] shadow-sm hover:bg-emerald-100 flex items-center justify-center gap-1"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-700" />
          <span>+ Form</span>
        </button>
        {forms.length > 0 && activeForm && (
          <button
            onClick={() => {
              if (window.confirm(`¿Eliminar formulario "${activeForm.name}" del proyecto?`)) {
                onDeleteForm(activeForm.id);
              }
            }}
            title="Eliminar Formulario Seleccionado"
            className="py-1 px-1.5 bg-[#c0c0c0] border-t border-l border-white border-b-2 border-r-2 border-black active:border-t-2 active:border-l-2 active:border-black active:border-b active:border-r active:border-white font-bold text-rose-800 text-[11px] shadow-sm hover:bg-rose-100 flex items-center justify-center"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
          </button>
        )}
      </div>

      {/* Rename Form Bar if active */}
      {isRenaming && activeForm && (
        <div className="bg-amber-100 border border-amber-500 p-1 mb-1 text-[11px] flex items-center gap-1">
          <span className="font-bold text-amber-900">Nombre:</span>
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            className="flex-1 h-5 px-1 bg-white border border-gray-600 font-mono text-xs text-black"
          />
          <button
            onClick={handleConfirmRename}
            className="px-2 py-0.5 bg-emerald-700 text-white font-bold text-[10px] rounded"
          >
            OK
          </button>
          <button
            onClick={() => setIsRenaming(false)}
            className="px-1.5 py-0.5 bg-gray-400 text-black text-[10px] rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Project Treeview Listbox */}
      <div className="flex-1 bg-white border border-black overflow-y-auto font-mono text-xs divide-y divide-gray-100">
        {/* Project Root Header */}
        <div className="px-1.5 py-1 bg-gray-200 border-b border-gray-300 font-bold flex items-center justify-between text-gray-800 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">📁</span>
            <span className="truncate">{projectName}</span>
          </div>
          <span className="text-[10px] text-gray-500 font-mono">
            {forms.length} {forms.length === 1 ? "Form" : "Forms"}
          </span>
        </div>

        {/* Section: Forms */}
        <div className="p-0.5">
          <div className="px-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5 flex items-center justify-between">
            <span>Formularios ({forms.length})</span>
            <button
              onClick={onAddForm}
              className="text-emerald-700 hover:text-emerald-900 text-[10px] font-bold"
              title="Añadir nuevo formulario"
            >
              + Añadir
            </button>
          </div>

          {forms.length === 0 ? (
            <div className="px-2 py-2 text-center text-gray-400 italic text-[11px]">
              No hay formularios. Haz click en "+ Form" para crear uno.
            </div>
          ) : (
            forms.map((f) => {
              const isSelected = selectedItemId === f.id || activeFormId === f.id;
              return (
                <div
                  key={f.id}
                  onClick={() => {
                    setSelectedItemId(f.id);
                    onSelectForm(f.id);
                  }}
                  onDoubleClick={() => {
                    onSelectForm(f.id);
                    onViewForm();
                  }}
                  className={`group px-1.5 py-1 flex items-center justify-between cursor-pointer leading-tight rounded-none ${
                    isSelected
                      ? "bg-[#000080] text-white"
                      : "text-black hover:bg-[#e8e8e8]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-[11px]">🗎</span>
                    <span className="font-semibold truncate">{f.name}.frm</span>
                    <span
                      className={`text-[9px] truncate ${
                        isSelected ? "text-blue-200" : "text-gray-500"
                      }`}
                    >
                      ({f.controls.length} ctrl)
                    </span>
                  </div>

                  {/* Quick Action Icons: Rename & Delete */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectForm(f.id);
                        handleStartRename(f);
                      }}
                      title="Renombrar formulario"
                      className={`p-0.5 rounded hover:bg-black/20 ${
                        isSelected ? "text-blue-100" : "text-gray-600 hover:text-black"
                      }`}
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`¿Eliminar formulario "${f.name}"?`)) {
                          onDeleteForm(f.id);
                        }
                      }}
                      title="Eliminar formulario"
                      className={`p-0.5 rounded hover:bg-black/20 ${
                        isSelected ? "text-rose-200" : "text-rose-600 hover:text-rose-800"
                      }`}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Section: Code Modules & Engine Resources */}
        <div className="p-0.5 pt-1">
          <div className="px-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
            Módulos & Recursos
          </div>

          {/* Main DIV Module */}
          <div
            onClick={() => {
              setSelectedItemId("code_main");
              onViewCode();
            }}
            onDoubleClick={onViewCode}
            className={`px-1.5 py-1 flex items-center justify-between cursor-pointer leading-tight ${
              selectedItemId === "code_main"
                ? "bg-[#000080] text-white"
                : "text-black hover:bg-[#e8e8e8]"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-amber-500">⚙</span>
              <span className="font-semibold">main.div</span>
            </div>
            <span
              className={`text-[9px] ${
                selectedItemId === "code_main" ? "text-blue-200" : "text-gray-500"
              }`}
            >
              Código DIV
            </span>
          </div>

          {/* Sprites & Assets */}
          <div
            onClick={() => {
              setSelectedItemId("res_fpg");
              onOpenTool?.("fpg");
            }}
            onDoubleClick={() => onOpenTool?.("fpg")}
            className={`px-1.5 py-1 flex items-center justify-between cursor-pointer leading-tight ${
              selectedItemId === "res_fpg"
                ? "bg-[#000080] text-white"
                : "text-black hover:bg-[#e8e8e8]"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-emerald-600">🖼️</span>
              <span className="font-semibold">juego.fpg</span>
            </div>
            <span
              className={`text-[9px] ${
                selectedItemId === "res_fpg" ? "text-blue-200" : "text-gray-500"
              }`}
            >
              Sprites FPG
            </span>
          </div>

          {/* Sound FX */}
          <div
            onClick={() => {
              setSelectedItemId("res_sound");
              onOpenTool?.("sound");
            }}
            onDoubleClick={() => onOpenTool?.("sound")}
            className={`px-1.5 py-1 flex items-center justify-between cursor-pointer leading-tight ${
              selectedItemId === "res_sound"
                ? "bg-[#000080] text-white"
                : "text-black hover:bg-[#e8e8e8]"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-purple-600">🔊</span>
              <span className="font-semibold">audio.sfx</span>
            </div>
            <span
              className={`text-[9px] ${
                selectedItemId === "res_sound" ? "text-blue-200" : "text-gray-500"
              }`}
            >
              Audio FX
            </span>
          </div>

          {/* 2D Maps */}
          <div
            onClick={() => {
              setSelectedItemId("res_map");
              onOpenTool?.("map");
            }}
            onDoubleClick={() => onOpenTool?.("map")}
            className={`px-1.5 py-1 flex items-center justify-between cursor-pointer leading-tight ${
              selectedItemId === "res_map"
                ? "bg-[#000080] text-white"
                : "text-black hover:bg-[#e8e8e8]"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-cyan-600">🗺️</span>
              <span className="font-semibold">world.map</span>
            </div>
            <span
              className={`text-[9px] ${
                selectedItemId === "res_map" ? "text-blue-200" : "text-gray-500"
              }`}
            >
              Mapa 2D
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
