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
  type: "button" | "input" | "checkbox" | "select" | "table" | "modal" | "tabs" | "scrollbar" | "listbox" | "picturebox";
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
  private pointerDownX: number = -1;
  private pointerDownY: number = -1;
  private pointerDownWidgetId: string | null = null;
  public activeFocusId: string | null = null;
  public openSelectId: string | null = null;
  public caretIndex: number = 0;

  // Blink caret timer for text inputs
  private caretBlink: boolean = true;
  private caretInterval: any = null;

  // Active widgets registered per frame
  public widgets: ActiveWidget[] = [];
  private stagedWidgets: ActiveWidget[] = [];
  public tableScrolls: Map<string, number> = new Map();
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
  public onUiInteraction?: () => void;

  // Theme Mode: "android" (Material You / Android Native) | "vb3" (Visual Basic 3.0 Classic) | "dark"
  public currentThemeMode: "android" | "vb3" | "dark" = "android";

  // Colors & Theme (Android Material You & VB 3.0 palettes)
  public theme = {
    // Android Modern Palette: Clean Dark Slate, Material Teal & Emerald Accent, Crisp Surfaces
    bg: "#121824",
    surface: "#1a2234",
    surfaceHover: "#232e46",
    border: "#2e3c59",
    borderFocus: "#10b981", // Android emerald focus
    primary: "#0d9488",     // Android Material Teal
    primaryHover: "#0f766e",
    primaryText: "#ffffff",
    secondary: "#334155",
    secondaryHover: "#475569",
    danger: "#ef4444",
    dangerHover: "#dc2626",
    success: "#10b981",     // Android green
    textPrimary: "#f8fafc",
    textSecondary: "#94a3b8",
    textMuted: "#64748b",
  };

  /**
   * Switch UI Palette between Android Modern, Visual Basic 3.0 Classic and Modern Dark
   */
  public setThemeMode(mode: "android" | "vb3" | "dark") {
    this.currentThemeMode = mode;
    if (mode === "android") {
      this.theme = {
        bg: "#101622",
        surface: "#182234",
        surfaceHover: "#202c44",
        border: "#2d3b55",
        borderFocus: "#10b981",
        primary: "#0d9488",
        primaryHover: "#0f766e",
        primaryText: "#ffffff",
        secondary: "#2c3b54",
        secondaryHover: "#394c6a",
        danger: "#ef4444",
        dangerHover: "#dc2626",
        success: "#10b981",
        textPrimary: "#f8fafc",
        textSecondary: "#94a3b8",
        textMuted: "#64748b",
      };
    } else if (mode === "vb3") {
      this.theme = {
        bg: "#c0c0c0", // Classic Windows 3.1 / VB 3.0 Gray
        surface: "#d4d0c8",
        surfaceHover: "#e4e0d8",
        border: "#808080",
        borderFocus: "#000080", // Classic Navy Blue
        primary: "#000080",
        primaryHover: "#101090",
        primaryText: "#ffffff",
        secondary: "#c0c0c0",
        secondaryHover: "#d0d0d0",
        danger: "#800000",
        dangerHover: "#a00000",
        success: "#008000",
        textPrimary: "#000000",
        textSecondary: "#404040",
        textMuted: "#808080",
      };
    } else {
      this.theme = {
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
    }
  }

  constructor() {
    this.caretInterval = setInterval(() => {
      this.caretBlink = !this.caretBlink;
    }, 530);
  }

  public setContext(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  public beginStep() {
    this.stagedWidgets = [];
    this.openModals = [];
    this.layoutStack = [];
    this.wasMouseDown = this.isMouseDown;
  }

  public resetFrame() {
    this.stagedWidgets = [];
    this.openModals = [];
    this.layoutStack = [];
    this.wasMouseDown = this.isMouseDown;
  }

  public registerWidget(w: ActiveWidget) {
    const existingIdx = this.stagedWidgets.findIndex((item) => item.id === w.id);
    if (existingIdx >= 0) {
      this.stagedWidgets[existingIdx] = w;
    } else {
      this.stagedWidgets.push(w);
    }
    const curIdx = this.widgets.findIndex((item) => item.id === w.id);
    if (curIdx >= 0) {
      this.widgets[curIdx] = w;
    } else {
      this.widgets.push(w);
    }
  }

  public commitWidgets() {
    if (this.stagedWidgets.length > 0) {
      this.widgets = [...this.stagedWidgets];
    }
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
    const id = options?.id || `btn_${label}_${x}_${y}`;
    const widget: ActiveWidget = {
      type: "button",
      id,
      x,
      y,
      w,
      h,
      data: { label, onClick, options },
    };
    this.registerWidget(widget);
    if (this.ctx) this.renderSingleButton(this.ctx, widget);
  }

  public renderSingleButton(ctx: CanvasRenderingContext2D, w: ActiveWidget): void {
    const { label, options } = w.data;
    const isHover = this.isInside(this.mouseX, this.mouseY, w.x, w.y, w.w, w.h);
    const isPressed = isHover && this.isMouseDown;

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
    this.drawRoundedRect(ctx, w.x, w.y, w.w, w.h, 6, bg, borderColor, isHover ? 1.5 : 1);

    // Text Label
    ctx.shadowColor = "transparent";
    ctx.font = "bold 13px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, w.x + w.w / 2, w.y + w.h / 2 + (isPressed ? 1 : 0));
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
    const id = options?.id || `input_${x}_${y}`;
    const widget: ActiveWidget = {
      type: "input",
      id,
      x,
      y,
      w,
      h,
      data: { value, onChange, placeholder, options },
    };
    this.registerWidget(widget);
    if (this.ctx) this.renderSingleInput(this.ctx, widget);
  }

  public renderSingleInput(ctx: CanvasRenderingContext2D, w: ActiveWidget): void {
    const { value, placeholder, options } = w.data;
    const isHover = this.isInside(this.mouseX, this.mouseY, w.x, w.y, w.w, w.h);
    const isFocused = this.activeFocusId === w.id;

    ctx.save();
    // Box
    const bg = isFocused ? "#0b1329" : "#162035";
    const borderColor = isFocused ? this.theme.borderFocus : isHover ? "#64748b" : this.theme.border;
    this.drawRoundedRect(ctx, w.x, w.y, w.w, w.h, 6, bg, borderColor, isFocused ? 2 : 1);

    // Text or Placeholder
    const paddingX = 12;
    ctx.font = "13px 'Segoe UI', system-ui, monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    const textStr = value != null ? String(value) : "";
    const displayVal = options?.type === "password" ? "•".repeat(textStr.length) : textStr;

    if (!displayVal && placeholder) {
      ctx.fillStyle = this.theme.textMuted;
      ctx.fillText(placeholder, w.x + paddingX, w.y + w.h / 2);
    } else {
      ctx.fillStyle = this.theme.textPrimary;
      // Clip text to avoid overflow
      ctx.save();
      ctx.beginPath();
      ctx.rect(w.x + 4, w.y, w.w - 8, w.h);
      ctx.clip();
      ctx.fillText(displayVal, w.x + paddingX, w.y + w.h / 2);
      ctx.restore();
    }

    // Caret cursor when focused
    if (isFocused && this.caretBlink) {
      const textMetrics = ctx.measureText(displayVal);
      const caretX = Math.min(w.x + paddingX + textMetrics.width + 2, w.x + w.w - 8);
      ctx.fillStyle = this.theme.borderFocus;
      ctx.fillRect(caretX, w.y + 8, 2, w.h - 16);
    }

    ctx.restore();
  }

  /**
   * 2b. drawCheckbox(x, y, w, h, label, checked, onToggle, options?)
   */
  public drawCheckbox(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    checked: boolean,
    onToggle?: () => void,
    options?: { id?: string; disabled?: boolean }
  ): void {
    const id = options?.id || `chk_${label}_${x}_${y}`;
    const widget: ActiveWidget = {
      type: "checkbox",
      id,
      x,
      y,
      w,
      h,
      data: { label, checked, onToggle, options },
    };
    this.registerWidget(widget);
    if (this.ctx) this.renderSingleCheckbox(this.ctx, widget);
  }

  public renderSingleCheckbox(ctx: CanvasRenderingContext2D, w: ActiveWidget): void {
    const { label, checked, options } = w.data;
    const isHover = this.isInside(this.mouseX, this.mouseY, w.x, w.y, w.w, w.h);

    ctx.save();
    const boxSize = 18;
    const boxY = w.y + (w.h - boxSize) / 2;
    const boxX = w.x;

    const boxBg = checked ? this.theme.primary : "#1e293b";
    const boxBorder = checked ? this.theme.primaryHover : isHover ? this.theme.borderFocus : this.theme.border;
    this.drawRoundedRect(ctx, boxX, boxY, boxSize, boxSize, 4, boxBg, boxBorder, 1.5);

    if (checked) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(boxX + 4, boxY + 9);
      ctx.lineTo(boxX + 7.5, boxY + 13);
      ctx.lineTo(boxX + 14, boxY + 5);
      ctx.stroke();
    }

    // Label text
    ctx.font = "13px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = isHover ? "#ffffff" : this.theme.textPrimary;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, boxX + boxSize + 8, w.y + w.h / 2);

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
    const id = `sel_${x}_${y}`;
    const widget: ActiveWidget = {
      type: "select",
      id,
      x,
      y,
      w,
      h,
      data: { options, value, onChange },
    };
    this.registerWidget(widget);
    if (this.ctx) this.renderSingleSelect(this.ctx, widget);
  }

  public renderSingleSelect(ctx: CanvasRenderingContext2D, w: ActiveWidget): void {
    const { options, value } = w.data;
    const isOpen = this.openSelectId === w.id;
    const isHover = this.isInside(this.mouseX, this.mouseY, w.x, w.y, w.w, w.h);

    ctx.save();
    // Main button
    this.drawRoundedRect(ctx, w.x, w.y, w.w, w.h, 6, "#1e293b", isOpen ? this.theme.borderFocus : isHover ? "#64748b" : this.theme.border, 1.5);

    // Selected text
    ctx.font = "13px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = this.theme.textPrimary;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(value || (options[0] ?? ""), w.x + 12, w.y + w.h / 2);

    // Down arrow icon
    ctx.fillStyle = this.theme.textSecondary;
    ctx.beginPath();
    const arrowX = w.x + w.w - 16;
    const arrowY = w.y + w.h / 2;
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

    // Dropdown list popup (rendered on top if open)
    if (isOpen) {
      const itemH = 30;
      const listH = Math.min(options.length * itemH, 180);
      const listY = w.y + w.h + 4;

      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 10;
      this.drawRoundedRect(ctx, w.x, listY, w.w, listH, 6, "#0f172a", this.theme.borderFocus, 1.5);
      ctx.shadowColor = "transparent";

      options.forEach((opt: string, idx: number) => {
        const itemY = listY + idx * itemH;
        const isItemHover = this.isInside(this.mouseX, this.mouseY, w.x, itemY, w.w, itemH);

        if (isItemHover) {
          ctx.fillStyle = "#334155";
          ctx.fillRect(w.x + 2, itemY, w.w - 4, itemH);
        }

        ctx.font = opt === value ? "bold 13px 'Segoe UI', system-ui" : "13px 'Segoe UI', system-ui";
        ctx.fillStyle = opt === value ? "#38bdf8" : this.theme.textPrimary;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(opt, w.x + 12, itemY + itemH / 2);
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
    const id = options?.id || `tbl_${x}_${y}`;
    const widget: ActiveWidget = {
      type: "table",
      id,
      x,
      y,
      w,
      h,
      data: { columns, rows, options },
    };
    this.registerWidget(widget);
    if (this.ctx) this.renderSingleTable(this.ctx, widget);
  }

  public renderSingleTable(ctx: CanvasRenderingContext2D, w: ActiveWidget): void {
    const { columns, rows, options } = w.data;
    ctx.save();

    // Outer container card
    this.drawRoundedRect(ctx, w.x, w.y, w.w, w.h, 6, "#1e293b", this.theme.border, 1);

    const headerH = 34;
    const rowH = 30;
    const maxVisibleRows = Math.max(1, Math.floor((w.h - headerH) / rowH));
    const maxScroll = Math.max(0, rows.length - maxVisibleRows);
    let scrollOffset = this.tableScrolls.get(w.id) || 0;
    scrollOffset = Math.max(0, Math.min(maxScroll, scrollOffset));
    this.tableScrolls.set(w.id, scrollOffset);

    const hasScrollbar = maxScroll > 0;
    const sbW = hasScrollbar ? 12 : 0;
    const colW = (w.w - sbW) / Math.max(1, columns.length);

    // Header bar
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.rect(w.x + 1, w.y + 1, w.w - 2, headerH);
    ctx.fill();

    // Header columns
    ctx.font = "bold 12px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    columns.forEach((col: string, idx: number) => {
      ctx.fillText(col.toUpperCase(), w.x + idx * colW + 10, w.y + headerH / 2);
    });

    // Divider line
    ctx.strokeStyle = this.theme.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w.x, w.y + headerH);
    ctx.lineTo(w.x + w.w, w.y + headerH);
    ctx.stroke();

    // Visible Rows
    const visibleRows = rows.slice(scrollOffset, scrollOffset + maxVisibleRows);

    visibleRows.forEach((row: any, rIdx: number) => {
      const actualIdx = scrollOffset + rIdx;
      const curY = w.y + headerH + rIdx * rowH;
      const isHover = this.isInside(this.mouseX, this.mouseY, w.x, curY, w.w - sbW, rowH);
      const isSelected = options?.selectedRow === actualIdx;

      // Row background
      if (isSelected) {
        ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
        ctx.fillRect(w.x + 1, curY, w.w - sbW - 2, rowH);
      } else if (isHover) {
        ctx.fillStyle = "#334155";
        ctx.fillRect(w.x + 1, curY, w.w - sbW - 2, rowH);
      } else if (options?.striped && actualIdx % 2 === 1) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
        ctx.fillRect(w.x + 1, curY, w.w - sbW - 2, rowH);
      }

      // Row data cells
      ctx.font = "12px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = isSelected ? "#38bdf8" : this.theme.textPrimary;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      columns.forEach((col: string, cIdx: number) => {
        let cellVal = "";
        if (Array.isArray(row)) {
          cellVal = String(row[cIdx] ?? "");
        } else if (typeof row === "object" && row !== null) {
          const key = Object.keys(row)[cIdx] || col.toLowerCase();
          cellVal = String(row[key] ?? row[col] ?? "");
        }
        ctx.fillText(cellVal, w.x + cIdx * colW + 10, curY + rowH / 2);
      });
    });

    // Vertical Scrollbar if rows exceed visible space
    if (hasScrollbar) {
      const sbX = w.x + w.w - sbW - 1;
      const sbY = w.y + headerH + 1;
      const sbH = w.h - headerH - 2;

      // Scrollbar track
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.fillRect(sbX, sbY, sbW, sbH);

      // Scrollbar thumb
      const thumbH = Math.max(22, Math.floor((maxVisibleRows / rows.length) * sbH));
      const thumbY = sbY + Math.floor((scrollOffset / maxScroll) * (sbH - thumbH));
      const isThumbHover = this.isInside(this.mouseX, this.mouseY, sbX, thumbY, sbW, thumbH);

      ctx.fillStyle = isThumbHover ? "#64748b" : "#475569";
      this.drawRoundedRect(ctx, sbX + 2, thumbY, sbW - 4, thumbH, 3, ctx.fillStyle, "transparent", 0);
    }

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
    const id = `tabs_${x}_${y}`;
    const widget: ActiveWidget = {
      type: "tabs",
      id,
      x,
      y,
      w,
      h,
      data: { tabs, activeTab, onTabChange },
    };
    this.registerWidget(widget);
    if (this.ctx) this.renderSingleTabs(this.ctx, widget);
  }

  public renderSingleTabs(ctx: CanvasRenderingContext2D, w: ActiveWidget): void {
    const { tabs, activeTab } = w.data;
    const tabW = w.w / Math.max(1, tabs.length);

    ctx.save();
    // Tab bar container background
    this.drawRoundedRect(ctx, w.x, w.y, w.w, w.h, 8, "#0f172a", this.theme.border, 1);

    tabs.forEach((tab: string, idx: number) => {
      const tabX = w.x + idx * tabW;
      const isActive = typeof activeTab === "number" ? activeTab === idx : activeTab === tab;
      const isHover = this.isInside(this.mouseX, this.mouseY, tabX, w.y, tabW, w.h);

      if (isActive) {
        this.drawRoundedRect(ctx, tabX + 3, w.y + 3, tabW - 6, w.h - 6, 6, this.theme.primary, "transparent", 0);
      } else if (isHover) {
        this.drawRoundedRect(ctx, tabX + 3, w.y + 3, tabW - 6, w.h - 6, 6, "#1e293b", "transparent", 0);
      }

      ctx.font = isActive ? "bold 13px 'Segoe UI', system-ui" : "13px 'Segoe UI', system-ui";
      ctx.fillStyle = isActive ? "#ffffff" : isHover ? "#e2e8f0" : "#94a3b8";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tab, tabX + tabW / 2, w.y + w.h / 2);
    });

    ctx.restore();
  }

  /**
   * 7. drawScrollBar(x, y, w, h, value, max, onChange, orientation, options?)
   */
  public drawScrollBar(
    x: number,
    y: number,
    w: number,
    h: number,
    value: number,
    max: number,
    onChange?: (newVal: number) => void,
    orientation: "vertical" | "horizontal" = "vertical",
    options?: { id?: string }
  ): void {
    const id = options?.id || `sb_${x}_${y}`;
    const widget: ActiveWidget = {
      type: "scrollbar",
      id,
      x,
      y,
      w,
      h,
      data: { value, max, onChange, orientation },
    };
    this.registerWidget(widget);
    if (this.ctx) this.renderSingleScrollBar(this.ctx, widget);
  }

  public renderSingleScrollBar(ctx: CanvasRenderingContext2D, w: ActiveWidget): void {
    const { value, max, orientation } = w.data;
    const isVertical = orientation !== "horizontal";

    ctx.save();
    this.drawRoundedRect(ctx, w.x, w.y, w.w, w.h, 4, "#0f172a", this.theme.border, 1);

    const safeMax = Math.max(1, max || 1);
    const safeVal = Math.max(0, Math.min(safeMax, value || 0));

    if (isVertical) {
      const thumbH = Math.max(20, Math.floor((w.h / (safeMax + 10)) * w.h));
      const thumbY = w.y + Math.floor((safeVal / safeMax) * (w.h - thumbH));
      const isHover = this.isInside(this.mouseX, this.mouseY, w.x, thumbY, w.w, thumbH);
      this.drawRoundedRect(ctx, w.x + 2, thumbY, w.w - 4, thumbH, 3, isHover ? "#64748b" : "#475569", "transparent", 0);
    } else {
      const thumbW = Math.max(20, Math.floor((w.w / (safeMax + 10)) * w.w));
      const thumbX = w.x + Math.floor((safeVal / safeMax) * (w.w - thumbW));
      const isHover = this.isInside(this.mouseX, this.mouseY, thumbX, w.y, thumbW, w.h);
      this.drawRoundedRect(ctx, thumbX, w.y + 2, thumbW, w.h - 4, 3, isHover ? "#64748b" : "#475569", "transparent", 0);
    }

    ctx.restore();
  }

  /**
   * 8. drawPictureBox(x, y, w, h, onPaint, options?) - Visual Basic 5 DirectX Canvas
   */
  public drawPictureBox(
    x: number,
    y: number,
    w: number,
    h: number,
    onPaint?: (ctx: CanvasRenderingContext2D, rect: { x: number; y: number; w: number; h: number }) => void,
    options?: { id?: string; title?: string; bg?: string }
  ): void {
    const id = options?.id || `pic_${x}_${y}`;
    const widget: ActiveWidget = {
      type: "picturebox",
      id,
      x,
      y,
      w,
      h,
      data: { onPaint, title: options?.title, bg: options?.bg },
    };
    this.registerWidget(widget);
    if (this.ctx) this.renderSinglePictureBox(this.ctx, widget);
  }

  public renderSinglePictureBox(ctx: CanvasRenderingContext2D, w: ActiveWidget): void {
    const { onPaint, title, bg } = w.data;
    ctx.save();

    // Classic 3D Sunken Bevel Border (VB 3.0 / VB 5.0 PictureBox style)
    ctx.fillStyle = bg || "#000000";
    ctx.fillRect(w.x, w.y, w.w, w.h);

    // Bevel edges
    ctx.strokeStyle = "#404040";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(w.x, w.y, w.w, w.h);

    if (title) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(w.x + 1, w.y + 1, w.w - 2, 22);
      ctx.font = "bold 11px 'Segoe UI', system-ui";
      ctx.fillStyle = "#38bdf8";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`🎮 ${title}`, w.x + 8, w.y + 11);
    }

    if (onPaint) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
      ctx.clip();
      onPaint(ctx, { x: w.x, y: w.y, w: w.w, h: w.h });
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Render All Active Interactive Widgets to the Canvas
   */
  public renderWidgets(ctx: CanvasRenderingContext2D): void {
    this.commitWidgets();
    for (const w of this.widgets) {
      if (w.type === "button") this.renderSingleButton(ctx, w);
      else if (w.type === "input") this.renderSingleInput(ctx, w);
      else if (w.type === "checkbox") this.renderSingleCheckbox(ctx, w);
      else if (w.type === "select") this.renderSingleSelect(ctx, w);
      else if (w.type === "tabs") this.renderSingleTabs(ctx, w);
      else if (w.type === "table") this.renderSingleTable(ctx, w);
      else if (w.type === "scrollbar") this.renderSingleScrollBar(ctx, w);
      else if (w.type === "picturebox") this.renderSinglePictureBox(ctx, w);
    }
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
    if (this.mouseX !== x || this.mouseY !== y) {
      this.mouseX = x;
      this.mouseY = y;
      this.onUiInteraction?.();
    }
  }

  public handleMouseDown(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
    this.isMouseDown = true;
    this.pointerDownX = x;
    this.pointerDownY = y;

    // Check modal close button or modal intercept
    if (this.openModals.length > 0) {
      const topModal = this.openModals[this.openModals.length - 1];
      const closeBtnX = topModal.x + topModal.w - 36;
      const closeBtnY = topModal.y + 10;
      if (this.isInside(x, y, closeBtnX, closeBtnY, 24, 24)) {
        this.pointerDownWidgetId = `modal_close_${topModal.id}`;
      } else {
        this.pointerDownWidgetId = `modal_body_${topModal.id}`;
      }
      this.onUiInteraction?.();
      return;
    }

    // Check open select items
    if (this.openSelectId) {
      const selWidget = this.widgets.find((w) => w.id === this.openSelectId);
      if (selWidget) {
        const itemH = 30;
        const listH = Math.min(selWidget.data.options.length * itemH, 180);
        const listY = selWidget.y + selWidget.h + 4;
        if (this.isInside(x, y, selWidget.x, listY, selWidget.w, listH)) {
          const itemIdx = Math.floor((y - listY) / itemH);
          if (itemIdx >= 0 && itemIdx < selWidget.data.options.length) {
            this.pointerDownWidgetId = `sel_opt_${selWidget.id}_${itemIdx}`;
            this.onUiInteraction?.();
            return;
          }
        }
      }
    }

    // Find clicked widget in reverse order (topmost first)
    const clickedWidget = [...this.widgets].reverse().find((w) =>
      this.isInside(x, y, w.x, w.y, w.w, w.h)
    );

    this.pointerDownWidgetId = clickedWidget ? clickedWidget.id : null;

    if (clickedWidget && clickedWidget.type === "input") {
      this.activeFocusId = clickedWidget.id;
    } else if (clickedWidget && clickedWidget.type === "table") {
      // Check if clicked in table scrollbar area
      const headerH = 34;
      const rows = clickedWidget.data?.rows || [];
      const rowH = 30;
      const maxVisibleRows = Math.max(1, Math.floor((clickedWidget.h - headerH) / rowH));
      const maxScroll = Math.max(0, rows.length - maxVisibleRows);
      const sbW = 12;
      const sbX = clickedWidget.x + clickedWidget.w - sbW;

      if (maxScroll > 0 && x >= sbX && y >= clickedWidget.y + headerH) {
        const sbH = clickedWidget.h - headerH;
        const clickRatio = Math.max(0, Math.min(1, (y - (clickedWidget.y + headerH)) / sbH));
        const newOffset = Math.round(clickRatio * maxScroll);
        this.tableScrolls.set(clickedWidget.id, newOffset);
        this.onUiInteraction?.();
        return;
      }
    } else if (clickedWidget && clickedWidget.type === "scrollbar") {
      const { max, onChange, orientation } = clickedWidget.data;
      const isVertical = orientation !== "horizontal";
      const safeMax = Math.max(1, max || 1);
      if (isVertical) {
        const ratio = Math.max(0, Math.min(1, (y - clickedWidget.y) / clickedWidget.h));
        const newVal = Math.round(ratio * safeMax);
        clickedWidget.data.value = newVal;
        onChange?.(newVal);
      } else {
        const ratio = Math.max(0, Math.min(1, (x - clickedWidget.x) / clickedWidget.w));
        const newVal = Math.round(ratio * safeMax);
        clickedWidget.data.value = newVal;
        onChange?.(newVal);
      }
      this.onUiInteraction?.();
      return;
    } else {
      // Clicked outside input: unfocus
      if (this.activeFocusId && (!clickedWidget || clickedWidget.type !== "input")) {
        this.activeFocusId = null;
      }
    }

    this.onUiInteraction?.();
  }

  public handleMouseUp(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
    this.isMouseDown = false;

    // Check modal close
    if (this.openModals.length > 0) {
      const topModal = this.openModals[this.openModals.length - 1];
      const closeBtnX = topModal.x + topModal.w - 36;
      const closeBtnY = topModal.y + 10;
      if (
        this.pointerDownWidgetId === `modal_close_${topModal.id}` &&
        this.isInside(x, y, closeBtnX, closeBtnY, 24, 24)
      ) {
        topModal.onClose?.();
      }
      this.pointerDownWidgetId = null;
      this.onUiInteraction?.();
      return;
    }

    // Check open select items
    if (this.openSelectId) {
      const selWidget = this.widgets.find((w) => w.id === this.openSelectId);
      if (selWidget) {
        const itemH = 30;
        const listH = Math.min(selWidget.data.options.length * itemH, 180);
        const listY = selWidget.y + selWidget.h + 4;
        if (this.isInside(x, y, selWidget.x, listY, selWidget.w, listH)) {
          const itemIdx = Math.floor((y - listY) / itemH);
          if (itemIdx >= 0 && itemIdx < selWidget.data.options.length) {
            const chosen = selWidget.data.options[itemIdx];
            selWidget.data.onChange?.(chosen);
            this.openSelectId = null;
            this.pointerDownWidgetId = null;
            this.onUiInteraction?.();
            return;
          }
        }
      }
      // Clicked outside open dropdown: close it
      this.openSelectId = null;
    }

    // Find widget under mouse on release
    const releasedWidget = [...this.widgets].reverse().find((w) =>
      this.isInside(x, y, w.x, w.y, w.w, w.h)
    );

    if (releasedWidget && releasedWidget.id === this.pointerDownWidgetId) {
      if (releasedWidget.type === "button" && !releasedWidget.data?.options?.disabled && !releasedWidget.data?.disabled) {
        releasedWidget.data?.onClick?.();
      } else if (releasedWidget.type === "checkbox" && !releasedWidget.data?.options?.disabled && !releasedWidget.data?.disabled) {
        const nextVal = !releasedWidget.data.checked;
        releasedWidget.data.checked = nextVal;
        releasedWidget.data?.onToggle?.(nextVal);
      } else if (releasedWidget.type === "select") {
        this.openSelectId = this.openSelectId === releasedWidget.id ? null : releasedWidget.id;
      } else if (releasedWidget.type === "tabs") {
        const tabW = releasedWidget.w / Math.max(1, releasedWidget.data.tabs.length);
        const tabIdx = Math.floor((x - releasedWidget.x) / tabW);
        if (tabIdx >= 0 && tabIdx < releasedWidget.data.tabs.length) {
          const tab = releasedWidget.data.tabs[tabIdx];
          releasedWidget.data.onTabChange?.(tab, tabIdx);
        }
      } else if (releasedWidget.type === "table") {
        const headerH = 34;
        const rowH = 30;
        const scrollOffset = this.tableScrolls.get(releasedWidget.id) || 0;
        if (y > releasedWidget.y + headerH && y < releasedWidget.y + releasedWidget.h) {
          const rIdx = Math.floor((y - (releasedWidget.y + headerH)) / rowH);
          const actualIdx = scrollOffset + rIdx;
          const rows = releasedWidget.data?.rows || [];
          if (actualIdx >= 0 && actualIdx < rows.length) {
            releasedWidget.data?.options?.onRowClick?.(actualIdx, rows[actualIdx]);
          }
        }
      }
    }

    this.pointerDownWidgetId = null;
    this.onUiInteraction?.();
  }

  public handleWheel(deltaY: number, x: number, y: number): boolean {
    for (const w of [...this.widgets].reverse()) {
      if (this.isInside(x, y, w.x, w.y, w.w, w.h)) {
        if (w.type === "table" && w.data?.rows) {
          const rows = w.data.rows;
          const headerH = 34;
          const rowH = 30;
          const maxVisibleRows = Math.max(1, Math.floor((w.h - headerH) / rowH));
          const maxScroll = Math.max(0, rows.length - maxVisibleRows);
          if (maxScroll > 0) {
            const current = this.tableScrolls.get(w.id) || 0;
            const step = deltaY > 0 ? 1 : -1;
            const next = Math.max(0, Math.min(maxScroll, current + step));
            if (next !== current) {
              this.tableScrolls.set(w.id, next);
              this.onUiInteraction?.();
              return true;
            }
          }
        } else if (w.type === "scrollbar" && w.data) {
          const { max, onChange } = w.data;
          const current = w.data.value || 0;
          const step = deltaY > 0 ? 1 : -1;
          const next = Math.max(0, Math.min(max || 100, current + step));
          if (next !== current) {
            w.data.value = next;
            onChange?.(next);
            this.onUiInteraction?.();
            return true;
          }
        }
      }
    }
    return false;
  }

  public handleKeyDown(key: string, e?: KeyboardEvent): boolean {
    if (!this.activeFocusId) return false;
    const widget = this.widgets.find((w) => w.id === this.activeFocusId);
    if (!widget || widget.type !== "input") return false;

    const data = widget.data;
    if (!data) return false;

    let curr = data.value != null ? String(data.value) : "";

    if (key === "Backspace") {
      curr = curr.slice(0, -1);
      data.value = curr;
      data.onChange?.(curr);
      this.onUiInteraction?.();
      return true;
    } else if (key === "Delete") {
      curr = "";
      data.value = curr;
      data.onChange?.(curr);
      this.onUiInteraction?.();
      return true;
    } else if (key === "Enter") {
      this.activeFocusId = null;
      data.options?.onEnter?.(curr);
      this.onUiInteraction?.();
      return true;
    } else if (key === "Escape") {
      this.activeFocusId = null;
      this.onUiInteraction?.();
      return true;
    } else if (key === "Tab") {
      const inputs = this.widgets.filter((w) => w.type === "input");
      const currentIdx = inputs.findIndex((w) => w.id === this.activeFocusId);
      if (inputs.length > 0) {
        const nextIdx = (currentIdx + (e?.shiftKey ? -1 : 1) + inputs.length) % inputs.length;
        this.activeFocusId = inputs[nextIdx].id;
        this.onUiInteraction?.();
        return true;
      }
    } else if (key.length === 1 && !e?.ctrlKey && !e?.metaKey && !e?.altKey) {
      curr += key;
      data.value = curr;
      data.onChange?.(curr);
      this.onUiInteraction?.();
      return true;
    }

    return false;
  }

  /**
   * Returns dynamic cursor style ('pointer' | 'text' | 'default')
   */
  public getCursorAt(x: number, y: number): string {
    if (this.openModals.length > 0) {
      const topModal = this.openModals[this.openModals.length - 1];
      const closeBtnX = topModal.x + topModal.w - 36;
      const closeBtnY = topModal.y + 10;
      if (this.isInside(x, y, closeBtnX, closeBtnY, 24, 24)) return "pointer";
      return "default";
    }

    if (this.openSelectId) {
      const selWidget = this.widgets.find((w) => w.id === this.openSelectId);
      if (selWidget) {
        const itemH = 30;
        const listH = Math.min(selWidget.data.options.length * itemH, 180);
        const listY = selWidget.y + selWidget.h + 4;
        if (this.isInside(x, y, selWidget.x, listY, selWidget.w, listH)) {
          return "pointer";
        }
      }
    }

    const w = [...this.widgets].reverse().find((item) =>
      this.isInside(x, y, item.x, item.y, item.w, item.h)
    );

    if (!w) return "default";
    if (w.type === "button" || w.type === "checkbox" || w.type === "select" || w.type === "tabs") {
      return "pointer";
    }
    if (w.type === "input") {
      return "text";
    }
    return "default";
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
