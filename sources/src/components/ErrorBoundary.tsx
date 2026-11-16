import React from "react";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import { flushAllPersistenceSyncAndAsync } from "../engine/indexedDbPersistence";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  sectionName?: string;
  onResetSection?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  declare readonly props: Readonly<ErrorBoundaryProps>;
  declare state: ErrorBoundaryState;
  declare setState: (
    state:
      | Partial<ErrorBoundaryState>
      | ((prevState: Readonly<ErrorBoundaryState>) => Partial<ErrorBoundaryState> | null)
  ) => void;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || "Error inesperado en el componente",
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    flushAllPersistenceSyncAndAsync();
    console.error(
      `[ErrorBoundary${this.props.sectionName ? `: ${this.props.sectionName}` : ""}]`,
      error,
      info.componentStack
    );
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  private handleResetAndRetry = () => {
    this.setState({ hasError: false, errorMessage: "" });
    this.props.onResetSection?.();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="w-full h-full min-h-[220px] flex items-center justify-center p-4 bg-[#F7F8FA] text-[#111827]">
        <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-lg space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FDF2F5] text-[#7C2D48] border border-[#F3D0DC] flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-[#111827]">
                Se recuperó un fallo en{" "}
                {this.props.sectionName || "esta sección"}
              </h3>
              <p className="text-xs text-[#4B5563] mt-1 leading-relaxed">
                Tus cambios recientes se han protegido automáticamente para evitar que el estudio se cierre.
              </p>
            </div>
          </div>

          {this.state.errorMessage && (
            <div className="rounded-lg bg-[#F7F8FA] border border-[#E2E8F0] px-3 py-2 text-[11px] font-mono text-[#7C2D48] break-words max-h-24 overflow-y-auto">
              {this.state.errorMessage}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            {this.props.onResetSection && (
              <button
                type="button"
                onClick={this.handleResetAndRetry}
                className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs font-semibold text-[#374151] flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Volver al Estudio</span>
              </button>
            )}
            <button
              type="button"
              onClick={this.handleRetry}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#7C2D48] hover:bg-[#642239] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar vista</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
