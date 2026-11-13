import React from "react";
import { BlockInstance } from "./types";

interface BlockSvgProps {
  block: BlockInstance;
  isSelected?: boolean;
  isDragging?: boolean;
  onMouseDown?: (e: React.MouseEvent, blockId: string) => void;
  onPointerDown?: (e: React.PointerEvent, blockId: string) => void;
  onDoubleClick?: (e: React.MouseEvent, blockId: string) => void;
  onContextMenu?: (e: React.MouseEvent, blockId: string) => void;
  onFieldChange?: (blockId: string, fieldKey: string, newValue: any) => void;
}

export const BlockSvg: React.FC<BlockSvgProps> = ({
  block,
  isSelected = false,
  isDragging = false,
  onMouseDown,
  onPointerDown,
  onDoubleClick,
  onContextMenu,
  onFieldChange,
}) => {
  const isHat = block.shape === "hat" || block.shape === "procedure";
  const isCBlock = block.shape === "c-block" || isHat;
  const isValue = block.shape === "value";

  const subCount = block.subStatements ? block.subStatements.length : 0;
  const hasSub = subCount > 0;

  // Base dimensions
  const headerHeight = 32;
  const subItemHeight = 32;
  const cSlotHeight = isCBlock ? (hasSub ? subCount * subItemHeight + 12 : 36) : 0;
  const bottomBarHeight = isCBlock ? 18 : 0;
  const totalHeight = isCBlock ? headerHeight + cSlotHeight + bottomBarHeight : isValue ? 28 : 36;

  // Calculate dynamic width based on title, subtitle, and inline values
  const isTextBlock = block.category === "Text" || block.dataStructureType === "text";
  const stringVal = String(block.fields?.text ?? block.fields?.value ?? "");
  const textExtraLen = isTextBlock ? Math.max(stringVal.length * 8.5 + 40, 90) : 0;
  const textLen = (block.title.startsWith('"') ? 20 : block.title.length * 7.5) + (block.subtitle && !isTextBlock ? block.subtitle.length * 7 : 0) + textExtraLen;
  const inlineLen = block.inlineValues ? block.inlineValues.reduce((acc, v) => acc + (v.label.length + v.value.length) * 7 + 24, 0) : 0;
  const blockWidth = Math.max(180, Math.min(740, textLen + inlineLen + 60));

  // Generador de rutas SVG con muescas y pestañas de rompecabezas
  const generateBlockPath = () => {
    const w = blockWidth;
    const h = totalHeight;

    if (isValue) {
      // Bloque de valor (píldora con pestaña puzzle a la izquierda)
      return `
        M 12 0
        L ${w - 6} 0
        A 6 6 0 0 1 ${w} 6
        L ${w} ${h - 6}
        A 6 6 0 0 1 ${w - 6} ${h}
        L 12 ${h}
        A 6 6 0 0 1 6 ${h - 6}
        L 6 18
        c -4 0 -6 -2 -6 -6
        s 2 -6 6 -6
        L 6 6
        A 6 6 0 0 1 12 0
        Z
      `;
    }

    if (isHat) {
      // Bloque sombrero (Evento / Procedimiento con tope redondeado y boca en C)
      return `
        M 0 16
        Q 0 0 20 0
        L ${w - 6} 0
        A 6 6 0 0 1 ${w} 6
        L ${w} ${headerHeight}
        L 52 ${headerHeight}
        c -3 0 -5 3 -8 3
        c -3 0 -5 -3 -8 -3
        L 20 ${headerHeight}
        L 20 ${headerHeight + cSlotHeight}
        L 36 ${headerHeight + cSlotHeight}
        c 3 0 5 3 8 3
        c 3 0 5 -3 8 -3
        L ${w} ${headerHeight + cSlotHeight}
        L ${w} ${h - 6}
        A 6 6 0 0 1 ${w - 6} ${h}
        L 36 ${h}
        c -3 0 -5 3 -8 3
        c -3 0 -5 -3 -8 -3
        L 16 ${h}
        L 0 ${h}
        Z
      `;
    }

    if (block.shape === "c-block") {
      // Bloque de control tipo IF / WHILE / FOR con boca C expandible
      return `
        M 0 0
        L 16 0
        c 3 0 5 3 8 3
        c 3 0 5 -3 8 -3
        L ${w - 6} 0
        A 6 6 0 0 1 ${w} 6
        L ${w} ${headerHeight}
        L 52 ${headerHeight}
        c -3 0 -5 3 -8 3
        c -3 0 -5 -3 -8 -3
        L 20 ${headerHeight}
        L 20 ${headerHeight + cSlotHeight}
        L 36 ${headerHeight + cSlotHeight}
        c 3 0 5 3 8 3
        c 3 0 5 -3 8 -3
        L ${w} ${headerHeight + cSlotHeight}
        L ${w} ${h - 6}
        A 6 6 0 0 1 ${w - 6} ${h}
        L 36 ${h}
        c -3 0 -5 3 -8 3
        c -3 0 -5 -3 -8 -3
        L 16 ${h}
        L 0 ${h}
        Z
      `;
    }

    // Comando estándar tipo declaración con muesca superior y pestaña inferior
    return `
      M 0 0
      L 16 0
      c 3 0 5 3 8 3
      c 3 0 5 -3 8 -3
      L ${w - 6} 0
      A 6 6 0 0 1 ${w} 6
      L ${w} ${h - 6}
      A 6 6 0 0 1 ${w - 6} ${h}
      L 36 ${h}
      c -3 0 -5 3 -8 3
      c -3 0 -5 -3 -8 -3
      L 16 ${h}
      L 0 ${h}
      Z
    `;
  };

  return (
    <g
      transform={`translate(${block.x}, ${block.y})`}
      onMouseDown={(e) => onMouseDown?.(e, block.id)}
      onPointerDown={(e) => onPointerDown?.(e, block.id)}
      onDoubleClick={(e) => onDoubleClick?.(e, block.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(e, block.id);
      }}
      className={`cursor-grab active:cursor-grabbing select-none touch-none ${isDragging ? "opacity-90" : ""}`}
      style={{
        filter: isSelected
          ? "drop-shadow(0 0 7px #ffff00)"
          : "drop-shadow(0 2.5px 5px rgba(0,0,0,0.32))",
      }}
    >
      {/* Cuerpo principal del bloque con path SVG puzzle */}
      <path
        d={generateBlockPath()}
        fill={block.color}
        stroke={isSelected ? "#ffff00" : "rgba(0,0,0,0.35)"}
        strokeWidth={isSelected ? 2 : 1}
      />

      {/* Bisel 3D sutil en el borde superior para textura plástica tipo MIT App Inventor */}
      <path
        d={`M 2 3 L ${blockWidth - 8} 3`}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1.5}
        fill="none"
      />

      {/* Título e icono del bloque */}
      <g transform="translate(14, 20)">
        {/* Indicador visual de color para bloques de color */}
        {(block.colorHex || block.category === "Colors") && (
          <circle
            cx="-2"
            cy="-4"
            r="5.5"
            fill={block.colorHex || block.fields?.color || "#ea4335"}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        )}
        <text
          fill="#ffffff"
          fontSize="11.5"
          fontWeight="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.2px"
        >
          {block.title}
        </text>

        {/* Subtítulo (Parámetros, ej. x, y) */}
        {block.subtitle && (
          <g transform={`translate(${block.title.length * 7.5 + 14}, 0)`}>
            <rect
              x="-6"
              y="-13"
              width={block.subtitle.length * 7 + 14}
              height="18"
              rx="4"
              fill="rgba(0,0,0,0.25)"
              stroke="rgba(255,255,255,0.25)"
            />
            <text
              fill="#fffae6"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
            >
              {block.subtitle}
            </text>
          </g>
        )}
      </g>

      {/* Píldoras de valores conectadas en la parte derecha (Inline Values) */}
      {block.inlineValues && block.inlineValues.length > 0 && (
        <g transform={`translate(${Math.max(140, block.title.length * 7.5 + 30)}, 5)`}>
          {block.inlineValues.map((v, i) => (
            <g key={i} transform={`translate(${i * 115}, 0)`}>
              {/* Conector puzzle */}
              <rect
                x="0"
                y="0"
                width={Math.max(90, (v.label.length + v.value.length) * 6.5 + 20)}
                height="22"
                rx="5"
                fill={v.color || "#3f71c4"}
                stroke="rgba(0,0,0,0.3)"
              />
              <text
                x="8"
                y="15"
                fill="#ffffff"
                fontSize="10"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {v.label}: {v.value}
              </text>
            </g>
          ))}
        </g>
      )}

      {/* Si es C-block, mostrar etiqueta de entrada 'do' o 'then' */}
      {isCBlock && (
        <text
          x="28"
          y={headerHeight + 18}
          fill="rgba(255,255,255,0.8)"
          fontSize="10"
          fontWeight="bold"
          fontFamily="sans-serif"
        >
          {block.type.includes("if") ? "then" : "do"}
        </text>
      )}

      {/* Renderizado de bloques hijos anidados dentro de la boca en C (Sub-Statements) */}
      {isCBlock && block.subStatements && block.subStatements.length > 0 && (
        <g transform={`translate(26, ${headerHeight + 4})`}>
          {block.subStatements.map((sub, idx) => {
            const subW = Math.max(140, sub.title.length * 7 + 45);
            return (
              <g key={sub.id || idx} transform={`translate(0, ${idx * subItemHeight})`}>
                {/* Bloque hijo encajado */}
                <path
                  d={`
                    M 0 0
                    L 14 0
                    c 2 0 4 2 6 2
                    c 2 0 4 -2 6 -2
                    L ${subW} 0
                    A 4 4 0 0 1 ${subW + 4} 4
                    L ${subW + 4} 24
                    A 4 4 0 0 1 ${subW} 28
                    L 26 28
                    c -2 0 -4 2 -6 2
                    c -2 0 -4 -2 -6 -2
                    L 0 28
                    Z
                  `}
                  fill={sub.color || "#5da048"}
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth="1"
                />
                <text
                  x="12"
                  y="18"
                  fill="#ffffff"
                  fontSize="10.5"
                  fontWeight="bold"
                  fontFamily="system-ui, sans-serif"
                >
                  {sub.title}
                </text>
              </g>
            );
          })}
        </g>
      )}

      {/* Campo editable interactivo para bloques de texto */}
      {isTextBlock ? (
        <foreignObject
          x={Math.max(20, block.title.startsWith('"') ? 16 : block.title.length * 7.5 + 20)}
          y={4}
          width={Math.max(90, Math.min(360, stringVal.length * 8.5 + 36))}
          height={24}
          className="overflow-visible"
        >
          <div
            className="flex items-center gap-0.5 bg-white rounded border border-[#822149] px-1.5 py-0.5 shadow-inner cursor-text"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onDoubleClick?.(e, block.id);
            }}
          >
            <span className="text-[#c44078] font-serif font-bold text-xs select-none">“</span>
            <input
              type="text"
              value={stringVal}
              onChange={(e) => onFieldChange?.(block.id, "text", e.target.value)}
              className="w-full bg-transparent text-[#111827] font-mono text-[11px] font-bold outline-none border-none p-0"
              title="Haz clic para escribir texto directamente o doble clic para abrir el editor avanzado"
              placeholder="texto..."
            />
            <span className="text-[#c44078] font-serif font-bold text-xs select-none">”</span>
          </div>
        </foreignObject>
      ) : (
        block.fields && Object.keys(block.fields).length > 0 && (
          <g transform={`translate(${Math.max(120, block.title.length * 7.5 + 24)}, 7)`}>
            {Object.entries(block.fields).map(([k, val], i) => (
              <g key={k} transform={`translate(${i * 65}, 0)`}>
                <rect
                  x="0"
                  y="0"
                  width={Math.max(48, String(val).length * 8 + 12)}
                  height="18"
                  rx="3"
                  fill="#ffffff"
                  stroke="#666666"
                />
                <text
                  x="6"
                  y="13"
                  fill="#111827"
                  fontSize="10.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {String(val)}
                </text>
              </g>
            ))}
          </g>
        )
      )}
    </g>
  );
};
