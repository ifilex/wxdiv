/**
 * Utility to calculate the exact pixel coordinates (top, left) of the caret inside a textarea.
 */

const propertiesToCopy = [
  "boxSizing",
  "width",
  "height",
  "overflowX",
  "overflowY",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderStyle",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontSizeAdjust",
  "lineHeight",
  "fontFamily",
  "textAlign",
  "textTransform",
  "textIndent",
  "textDecoration",
  "letterSpacing",
  "wordSpacing",
  "tabSize",
] as const;

let mirrorDiv: HTMLDivElement | null = null;

export function getCaretCoordinates(
  element: HTMLTextAreaElement,
  position: number
): { top: number; left: number; lineHeight: number } {
  if (typeof window === "undefined") {
    return { top: 0, left: 0, lineHeight: 24 };
  }

  if (!mirrorDiv) {
    mirrorDiv = document.createElement("div");
    mirrorDiv.id = "textarea-caret-position-mirror";
    document.body.appendChild(mirrorDiv);
  }

  const style = mirrorDiv.style;
  const computed = window.getComputedStyle(element);

  style.whiteSpace = "pre";
  style.wordWrap = "normal";
  style.position = "absolute";
  style.visibility = "hidden";
  style.top = "-9999px";
  style.left = "-9999px";
  style.overflow = "hidden";

  propertiesToCopy.forEach((prop) => {
    // @ts-ignore
    style[prop] = computed[prop];
  });

  mirrorDiv.textContent = element.value.substring(0, position);

  const span = document.createElement("span");
  span.textContent = element.value.substring(position) || ".";
  mirrorDiv.appendChild(span);

  const lineHeight = parseFloat(computed.lineHeight) || 24;

  const top = span.offsetTop - element.scrollTop;
  const left = span.offsetLeft - element.scrollLeft;

  return {
    top,
    left,
    lineHeight,
  };
}
