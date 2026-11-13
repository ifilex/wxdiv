/**
 * TextBlockLogic.ts
 * Lógica especializada para el bloque de 'Text' dentro de MIT App Inventor para WXDIV 3.0 / DIV Games Studio.
 * Encapsula la gestión, validación, transformación y serialización precisa de strings
 * al formato esperado por el motor de juegos (DIV Games Studio y HTML5 Web Engine).
 */

export type TextOperation =
  | "literal"
  | "join"
  | "length"
  | "is_empty"
  | "compare"
  | "trim"
  | "upcase"
  | "downcase"
  | "contains"
  | "split"
  | "segment"
  | "replace_all";

export interface TextBlockData {
  text: string;
  varName?: string;
  operation?: TextOperation;
  isGlobal?: boolean;
}

export class TextBlockLogic {
  /**
   * Limpia y escapa un string según las especificaciones del analizador y compilador de DIV Games Studio.
   * Maneja comillas dobles, caracteres de escape, saltos de línea y tabulaciones.
   */
  public static escapeDivString(input: string): string {
    if (input === null || input === undefined) return "";
    return input
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\r\n|\n|\r/g, "\\n");
  }

  /**
   * Desescapa un string extraído de código fuente DIV a un string nativo JavaScript.
   */
  public static unescapeDivString(input: string): string {
    if (!input) return "";
    let clean = input.trim();
    // Quitar comillas envolventes si existen
    if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
      clean = clean.slice(1, -1);
    }
    return clean
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }

  /**
   * Valida si un string contiene caracteres que requieran atención en el motor de juegos.
   */
  public static validateDivString(input: string): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    if (!input) {
      return { isValid: true, warnings: [] };
    }

    if (input.length > 255) {
      warnings.push("La longitud supera 255 caracteres; algunas rutinas clásicas de DIV usan buffers de 256 bytes.");
    }

    if (/[\u0000-\u001F]/.test(input.replace(/\n|\r|\t/g, ""))) {
      warnings.push("Contiene caracteres de control ASCII no imprimibles.");
    }

    return {
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Serializa un bloque de texto como declaración global formal para DIV Games Studio.
   * Formato: STRING var_name = "contenido";
   */
  public static serializeToDivGlobal(varName: string, text: string): string {
    const cleanVar = (varName || "mensaje_texto").replace(/[^a-zA-Z0-9_]/g, "_");
    const escaped = this.escapeDivString(text);
    return `STRING ${cleanVar} = "${escaped}";`;
  }

  /**
   * Serializa un valor literal de texto como expresión entre comillas para DIV.
   * Formato: "contenido"
   */
  public static serializeToDivLiteral(text: string): string {
    const escaped = this.escapeDivString(text);
    return `"${escaped}"`;
  }

  /**
   * Serializa operaciones de texto de MIT App Inventor en código nativo de DIV Games Studio.
   */
  public static serializeToDivExpression(
    op: TextOperation,
    args: {
      text1?: string;
      text2?: string;
      text?: string;
      piece?: string;
      start?: number | string;
      length?: number | string;
      segment?: string;
      replacement?: string;
    }
  ): string {
    switch (op) {
      case "literal":
        return this.serializeToDivLiteral(args.text || "");

      case "join": {
        const t1 = args.text1 || '""';
        const t2 = args.text2 || '""';
        return `${t1} + ${t2}`;
      }

      case "length": {
        const t = args.text || '""';
        return `strlen(${t})`;
      }

      case "is_empty": {
        const t = args.text || '""';
        return `(strlen(${t}) == 0)`;
      }

      case "compare": {
        const t1 = args.text1 || '""';
        const t2 = args.text2 || '""';
        return `strcmp(${t1}, ${t2})`;
      }

      case "trim": {
        const t = args.text || '""';
        return `trim(${t})`;
      }

      case "upcase": {
        const t = args.text || '""';
        return `toupper(${t})`;
      }

      case "downcase": {
        const t = args.text || '""';
        return `tolower(${t})`;
      }

      case "contains": {
        const t = args.text || '""';
        const p = args.piece || '""';
        return `(strstr(${t}, ${p}) != -1)`;
      }

      case "split": {
        const t = args.text || '""';
        return `split_words(${t})`;
      }

      case "segment": {
        const t = args.text || '""';
        const s = args.start || 1;
        const l = args.length || 1;
        return `substr(${t}, ${s}, ${l})`;
      }

      case "replace_all": {
        const t = args.text || '""';
        const seg = args.segment || '""';
        const rep = args.replacement || '""';
        return `replace_str(${t}, ${seg}, ${rep})`;
      }

      default:
        return this.serializeToDivLiteral(args.text || "");
    }
  }

  /**
   * Transforma una cadena según acciones rápidas comunes en App Inventor.
   */
  public static transformString(
    text: string,
    action: "uppercase" | "lowercase" | "trim" | "capitalize" | "clear" | "reverse"
  ): string {
    switch (action) {
      case "uppercase":
        return text.toUpperCase();
      case "lowercase":
        return text.toLowerCase();
      case "trim":
        return text.trim();
      case "capitalize":
        return text.replace(/\b\w/g, (char) => char.toUpperCase());
      case "reverse":
        return text.split("").reverse().join("");
      case "clear":
        return "";
      default:
        return text;
    }
  }
}
