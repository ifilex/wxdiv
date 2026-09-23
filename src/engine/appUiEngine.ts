/**
 * App UI Primitives, Layout System & Interactive Widget Engine for WXDIV 3.0
 */

export interface ButtonOptions {
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost";
  id?: string;
  icon?: string;
  disabled?: boolean;
}

export interface InputOptions {
  id?: string;
  type?: "text" | "password" | "number";
  disabled?: boolean;
}

export interface TableOptions {
  id?: string;
  striped?: boolean;
  selectedRow?: number;
  onRowClick?: (rowIndex: number, rowData: any) => void;
}

export interface LayoutContext {
  direction: "vertical" | "horizontal" | "grid";
  x: number;
  y: number;
  width: number;
  height: number;
  gap: number;
  padding: number;
  cols?: number;
  currentX: number;
  currentY: number;
  itemIndex: number;
}

export interface ActiveWidget {
  type: "button" | "input" | "select" | "table" | "modal" | "tabs";
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  data?: any;
}

export class AppUiEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  // Active interaction states
  public mouseX: number = 0;
  public mouseY: number = 0;
  public isMouseDown: boolean = false;
  private wasMouseDown: boolean = false;
  public activeFocusId: string | null = null;
  public openSelectId: string | null = null;

  // Blink caret timer for text inputs
  private caretBlink: boolean = true;
  private caretInterval: any = null;

  // Active widgets registered per frame
  private widgets: ActiveWidget[] = [];
  private openModals: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    title: string;
    content: string;
    onClose?: () => void;
  }> = [];

  // Layout system stack
  private layoutStack: LayoutContext[] = [];

  // Colors & Theme
  public theme = {
    bg: "#0f172a",
    surface: "#1e293b",
    surfaceHover: "#334155",
    border: "#475569",
    borderFocus: "#38bdf8",
    primary: "#0284c7",
    primaryHover: "#0369a1",
    primaryText: "#ffffff",
    secondary: "#334155",
    secondaryHover: "#475569",
    danger: "#dc2626",
    dangerHover: "#b91c1c",
    success: "#16a34a",
    textPrimary: "#f8fafc",
    textSecondary: "#94a3b8",
    textMuted: "#64748b",
  };

  constructor() {
    this.caretInterval = setInterval(() => {
      this.caretBlink = !this.caretBlink;
    }, 530);
  }

  public setContext(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  public resetFrame() {
    this.widgets = [];
    this.openModals = [];
    this.layoutStack = [];
    this.wasMouseDown = this.isMouseDown;
  }

  // --------------------------------------------------------------------------
  // LAYOUT SYSTEM
  // --------------------------------------------------------------------------

  public layout_begin(
    direction: "vertical" | "horizontal" | "grid",
    x: number,
    y: number,
    width: number,
    height: number,
    gap: number = 8,
    padding: number = 10,
    cols: number = 2
  ): void {
    const ctx: LayoutContext = {
      direction,
      x,
      y,
      width,
      height,
      gap,
      padding,
      cols,
      currentX: x + padding,
      currentY: y + padding,
      itemIndex: 0,
    };
    this.layoutStack.push(ctx);
  }

  public layout_next(customW?: number, customH?: number): { x: number; y: number; w: number; h: number } {
    if (this.layoutStack.length === 0) {
      return { x: 0, y: 0, w: 100, h: 36 };
    }
    const current = this.layoutStack[this.layoutStack.length - 1];
    let w = customW ?? 120;
    let h = customH ?? 36;

    if (current.direction === "vertical") {
      w = customW ?? current.width - current.padding * 2;
      const pos = { x: current.currentX, y: current.currentY, w, h };
      current.currentY += h + current.gap;
      current.itemIndex++;
      return pos;
    } else if (current.direction === "horizontal") {
      h = customH ?? current.height - current.padding * 2;
      const pos = { x: current.currentX, y: current.currentY, w, h };
      current.currentX += w + current.gap;
      current.itemIndex++;
      return pos;
    } else {
      // Grid
      const cols = current.cols || 2;
      const colWidth = (current.width - current.padding * 2 - current.gap * (cols - 1)) / cols;
      w = customW ?? colWidth;
      const col = current.itemIndex % cols;
      const row = Math.floor(current.itemIndex / cols);
      const posX = current.x + current.padding + col * (colWidth + current.gap);
      const posY = current.y + current.padding + row * (h + current.gap);
      current.itemIndex++;
      return { x: posX, y: posY, w, h };
    }
  }

  public layout_end(): void {
    this.layoutStack.pop();
  }

  // --------------------------------------------------------------------------
  // UI PRIMITIVES
  // --------------------------------------------------------------------------

  /**
   * 1. drawButton(x, y, w, h, label, onClick, options?)
   */
  public drawButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    onClick?: () => void,
    options?: ButtonOptions
  ): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const id = options?.id || `btn_${label}_${x}_${y}`;
    const isHover = this.isInside(this.mouseX, this.mouseY, x, y, w, h);
    const isPressed = isHover && this.isMouseDown;

    this.widgets.push({
      type: "button",
      id,
      x,
      y,
      w,
      h,
      data: { onClick, disabled: options?.disabled },
    });

    // Check click trigger
    if (isHover && this.wasMouseDown && !this.isMouseDown && !options?.disabled && onClick) {
      onClick();
    }

    ctx.save();
    // Shadow / Elevation
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = isPressed ? 2 : 6;
    ctx.shadowOffsetY = isPressed ? 1 : 3;

    // Fill style based on variant
    const variant = options?.variant || "primary";
    let bg = this.theme.primary;
    let textColor = this.theme.primaryText;
    let borderColor = this.theme.border;

    if (variant === "secondary") {
      bg = isPressed ? "#1e293b" : isHover ? this.theme.secondaryHover : this.theme.secondary;
    } else if (variant === "danger") {
      bg = isPressed ? "#991b1b" : isHover ? this.theme.dangerHover : this.theme.danger;
    } else if (variant === "success") {
      bg = isPressed ? "#15803d" : isHover ? "#22c55e" : this.theme.success;
    } else if (variant === "ghost") {
      bg = isHover ? "rgba(255, 255, 255, 0.08)" : "transparent";
      textColor = isHover ? "#38bdf8" : this.theme.textPrimary;
    } else {
      bg = isPressed ? "#0369a1" : isHover ? this.theme.primaryHover : this.theme.primary;
    }

    if (options?.disabled) {
      bg = "#334155";
      textColor = "#64748b";
    }

    // Draw rounded box
    this.drawRoundedRect(ctx, x, y, w, h, 6, bg, borderColor, isHover ? 1.5 : 1);

    // Text Label
    ctx.shadowColor = "transparent";
    ctx.font = "bold 13px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + w / 2, y + h / 2 + (isPressed ? 1 : 0));
    ctx.restore();
  }

  /**
   * 2. drawInput(x, y, w, h, value, onChange, placeholder?, options?)
   */
  public drawInput(
    x: number,
    y: number,
    w: number,
    h: number,
    value: string,
    onChange?: (newVal: string) => void,
    placeholder: string = "Escribir...",
    options?: InputOptions
  ): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const id = options?.id || `input_${x}_${y}`;
    const isHover = this.isInside(this.mouseX, this.mouseY, x, y, w, h);
    const isFocused = this.activeFocusId === id;

    this.widgets.push({
      type: "input",
      id,
      x,
      y,
      w,
      h,
      data: { value, onChange, type: options?.type, disabled: options?.disabled },
    });

    if (isHover && this.wasMouseDown && !this.isMouseDown && !options?.disabled) {
      this.activeFocusId = id;
    }

    ctx.save();
    // Box
    const bg = isFocused ? "#0f172a" : "#1e293b";
    const borderColor = isFocused ? this.theme.borderFocus : isHover ? "#64748b" : this.theme.border;
    this.drawRoundedRect(ctx, x, y, w, h, 6, bg, borderColor, isFocused ? 2 : 1);

    // Text or Placeholder
    const paddingX = 12;
    ctx.font = "13px 'Segoe UI', system-ui, monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    const displayVal = options?.type === "password" ? "•".repeat(value.length) : value;

    if (!value && placeholder) {
      ctx.fillStyle = this.theme.textMuted;
      ctx.fillText(placeholder, x + paddingX, y + h / 2);
    } else {
      ctx.fillStyle = this.theme.textPrimary;
      // Clip text to avoid overflow
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 4, y, w - 8, h);
      ctx.clip();
      ctx.fillText(displayVal, x + paddingX, y + h / 2);
      ctx.restore();
    }

    // Caret cursor when focused
    if (isFocused && this.caretBlink) {
      const textMetrics = ctx.measureText(displayVal);
      const caretX = Math.min(x + paddingX + textMetrics.width + 2, x + w - 10);
      ctx.fillStyle = this.theme.borderFocus;
      ctx.fillRect(caretX, y + 8, 2, h - 16);
    }

    ctx.restore();
  }

  /**
   * 3. drawSelect(x, y, w, h, options, value, onChange)
   */
  public drawSelect(
    x: number,
    y: number,
    w: number,
    h: number,
    options: string[],
    value: string,
    onChange?: (selected: string) => void
  ): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const id = `sel_${x}_${y}`;
    const isOpen = this.openSelectId === id;
    const isHover = this.isInside(this.mouseX, this.mouseY, x, y, w, h);

    this.widgets.push({
      type: "select",
      id,
      x,
      y,
      w,
      h,
      data: { options, value, onChange, isOpen },
    });

    if (isHover && this.wasMouseDown && !this.isMouseDown) {
      this.openSelectId = isOpen ? null : id;
    }

    ctx.save();
    // Main button
    this.drawRoundedRect(ctx, x, y, w, h, 6, "#1e293b", isOpen ? this.theme.borderFocus : this.theme.border, 1.5);

    // Selected text
    ctx.font = "13px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = this.theme.textPrimary;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(value || (options[0] ?? ""), x + 12, y + h / 2);

    // Down arrow icon
    ctx.fillStyle = this.theme.textSecondary;
    ctx.beginPath();
    const arrowX = x + w - 16;
    const arrowY = y + h / 2;
    if (isOpen) {
      ctx.moveTo(arrowX - 5, arrowY + 3);
      ctx.lineTo(arrowX + 5, arrowY + 3);
      ctx.lineTo(arrowX, arrowY - 3);
    } else {
      ctx.moveTo(arrowX - 5, arrowY - 3);
      ctx.lineTo(arrowX + 5, arrowY - 3);
      ctx.lineTo(arrowX, arrowY + 3);
    }
    ctx.fill();

    // Dropdown list popup (rendered on top)
    if (isOpen) {
      const itemH = 30;
      const listH = Math.min(options.length * itemH, 180);
      const listY = y + h + 4;

      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 10;
      this.drawRoundedRect(ctx, x, listY, w, listH, 6, "#0f172a", this.theme.borderFocus, 1.5);
      ctx.shadowColor = "transparent";

      options.forEach((opt, idx) => {
        const itemY = listY + idx * itemH;
        const isItemHover = this.isInside(this.mouseX, this.mouseY, x, itemY, w, itemH);

        if (isItemHover) {
          ctx.fillStyle = "#334155";
          ctx.fillRect(x + 2, itemY, w - 4, itemH);
          if (this.wasMouseDown && !this.isMouseDown && onChange) {
            onChange(opt);
            this.openSelectId = null;
          }
        }

        ctx.font = opt === value ? "bold 13px 'Segoe UI', system-ui" : "13px 'Segoe UI', system-ui";
        ctx.fillStyle = opt === value ? "#38bdf8" : this.theme.textPrimary;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(opt, x + 12, itemY + itemH / 2);
      });
    }

    ctx.restore();
  }

  /**
   * 4. drawTable(x, y, w, h, columns, rows, options?)
   */
  public drawTable(
    x: number,
    y: number,
    w: number,
    h: number,
    columns: string[],
    rows: Array<Record<string, any> | any[]>,
    options?: TableOptions
  ): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.save();

    // Outer container card
    this.drawRoundedRect(ctx, x, y, w, h, 6, "#1e293b", this.theme.border, 1);

    const headerH = 34;
    const rowH = 30;
    const colW = w / Math.max(1, columns.length);

    // Header bar
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.rect(x + 1, y + 1, w - 2, headerH);
    ctx.fill();

    // Header columns
    ctx.font = "bold 12px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    columns.forEach((col, idx) => {
      ctx.fillText(col.toUpperCase(), x + idx * colW + 10, y + headerH / 2);
    });

    // Divider line
    ctx.strokeStyle = this.theme.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + headerH);
    ctx.lineTo(x + w, y + headerH);
    ctx.stroke();

    // Rows
    const maxVisibleRows = Math.floor((h - headerH) / rowH);
    const visibleRows = rows.slice(0, maxVisibleRows);

    visibleRows.forEach((row, rIdx) => {
      const curY = y + headerH + rIdx * rowH;
      const isHover = this.isInside(this.mouseX, this.mouseY, x, curY, w, rowH);
      const isSelected = options?.selectedRow === rIdx;

      // Row background
      if (isSelected) {
        ctx.fillStyle = "rgba(56, 189, 248, 0.2)";
        ctx.fillRect(x + 1, curY, w - 2, rowH);
      } else if (isHover) {
        ctx.fillStyle = "#334155";
        ctx.fillRect(x + 1, curY, w - 2, rowH);
        if (this.wasMouseDown && !this.isMouseDown && options?.onRowClick) {
          options.onRowClick(rIdx, row);
        }
      } else if (options?.striped && rIdx % 2 === 1) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
        ctx.fillRect(x + 1, curY, w - 2, rowH);
      }

      // Row data cells
      ctx.font = "12px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = isSelected ? "#38bdf8" : this.theme.textPrimary;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      columns.forEach((col, cIdx) => {
        let cellVal = "";
        if (Array.isArray(row)) {
          cellVal = String(row[cIdx] ?? "");
        } else if (typeof row === "object" && row !== null) {
          const key = Object.keys(row)[cIdx] || col.toLowerCase();
          cellVal = String(row[key] ?? row[col] ?? "");
        }
        ctx.fillText(cellVal, x + cIdx * colW + 10, curY + rowH / 2);
      });
    });

    ctx.restore();
  }

  /**
   * 5. drawModal(x, y, w, h, title, content, onClose)
   */
  public drawModal(
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    content: string,
    onClose?: () => void
  ): void {
    // Register modal to be rendered in high-priority modal overlay pass
    this.openModals.push({ id: `modal_${title}`, x, y, w, h, title, content, onClose });
  }

  /**
   * 6. drawTabs(x, y, w, h, tabs, activeTab, onTabChange)
   */
  public drawTabs(
    x: number,
    y: number,
    w: number,
    h: number,
    tabs: string[],
    activeTab: string | number,
    onTabChange?: (tab: string, index: number) => void
  ): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const tabW = w / Math.max(1, tabs.length);

    ctx.save();
    // Tab bar container background
    this.drawRoundedRect(ctx, x, y, w, h, 8, "#0f172a", this.theme.border, 1);

    tabs.forEach((tab, idx) => {
      const tabX = x + idx * tabW;
      const isActive = typeof activeTab === "number" ? activeTab === idx : activeTab === tab;
      const isHover = this.isInside(this.mouseX, this.mouseY, tabX, y, tabW, h);

      if (isHover && this.wasMouseDown && !this.isMouseDown && onTabChange) {
        onTabChange(tab, idx);
      }

      if (isActive) {
        // Active pill
        this.drawRoundedRect(ctx, tabX + 3, y + 3, tabW - 6, h - 6, 6, this.theme.primary, "transparent", 0);
      } else if (isHover) {
        this.drawRoundedRect(ctx, tabX + 3, y + 3, tabW - 6, h - 6, 6, "#1e293b", "transparent", 0);
      }

      // Tab text
      ctx.font = isActive ? "bold 13px 'Segoe UI', system-ui" : "13px 'Segoe UI', system-ui";
      ctx.fillStyle = isActive ? "#ffffff" : isHover ? "#e2e8f0" : "#94a3b8";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tab, tabX + tabW / 2, y + h / 2);
    });

    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // OVERLAY RENDER PASS (Modals & Popups on top of everything)
  // --------------------------------------------------------------------------

  public renderOverlays(): void {
    if (!this.ctx || !this.canvas || this.openModals.length === 0) return;
    const ctx = this.ctx;
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;

    for (const m of this.openModals) {
      ctx.save();
      // Backdrop Scrim
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Modal Dialog Box
      ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
      ctx.shadowBlur = 24;
      this.drawRoundedRect(ctx, m.x, m.y, m.w, m.h, 10, "#1e293b", "#38bdf8", 2);
      ctx.shadowColor = "transparent";

      // Modal Header
      const headerH = 44;
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.rect(m.x + 2, m.y + 2, m.w - 4, headerH);
      ctx.fill();

      // Title
      ctx.font = "bold 15px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = "#f8fafc";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(m.title, m.x + 16, m.y + headerH / 2);

      // Close Button [X]
      const closeBtnX = m.x + m.w - 36;
      const closeBtnY = m.y + 10;
      const isCloseHover = this.isInside(this.mouseX, this.mouseY, closeBtnX, closeBtnY, 24, 24);
      ctx.fillStyle = isCloseHover ? "#ef4444" : "#475569";
      this.drawRoundedRect(ctx, closeBtnX, closeBtnY, 24, 24, 4, ctx.fillStyle, "transparent", 0);
      ctx.font = "bold 14px 'Segoe UI', system-ui";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("✕", closeBtnX + 12, closeBtnY + 12);

      if (isCloseHover && this.wasMouseDown && !this.isMouseDown && m.onClose) {
        m.onClose();
      }

      // Content text
      ctx.font = "14px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = "#cbd5e1";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      this.drawWrappedText(ctx, m.content, m.x + 16, m.y + headerH + 16, m.w - 32, 22);

      ctx.restore();
    }
  }

  // --------------------------------------------------------------------------
  // INPUT EVENT HOOKS (Mouse & Keyboard)
  // --------------------------------------------------------------------------

  public handleMouseMove(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  public handleMouseDown(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
    this.isMouseDown = true;
  }

  public handleMouseUp(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
    this.isMouseDown = false;
  }

  public handleKeyDown(key: string, e?: KeyboardEvent): boolean {
    if (!this.activeFocusId) return false;
    const widget = this.widgets.find((w) => w.id === this.activeFocusId);
    if (!widget || widget.type !== "input") return false;

    const data = widget.data;
    if (!data || !data.onChange) return false;

    let curr = data.value || "";

    if (key === "Backspace") {
      curr = curr.slice(0, -1);
      data.onChange(curr);
      return true;
    } else if (key === "Enter") {
      this.activeFocusId = null;
      return true;
    } else if (key === "Escape") {
      this.activeFocusId = null;
      return true;
    } else if (key.length === 1) {
      curr += key;
      data.onChange(curr);
      return true;
    }

    return false;
  }

  // --------------------------------------------------------------------------
  // DRAWING UTILITIES
  // --------------------------------------------------------------------------

  private isInside(px: number, py: number, x: number, y: number, w: number, h: number): boolean {
    return px >= x && px <= x + w && py >= y && py <= y + h;
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
    fillColor: string,
    borderColor: string,
    borderWidth: number = 1
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    if (fillColor && fillColor !== "transparent") {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    if (borderColor && borderColor !== "transparent" && borderWidth > 0) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      ctx.stroke();
    }
  }

  private drawWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    const words = text.split(" ");
    let line = "";
    let curY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, curY);
        line = words[n] + " ";
        curY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, curY);
  }

  public destroy() {
    if (this.caretInterval) {
      clearInterval(this.caretInterval);
    }
  }
}

export const appUiEngine = new AppUiEngine();
