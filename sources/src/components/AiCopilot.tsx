import React from "react";
import { DivGraphic } from "../types";
import { AndroidStudioAiPanel } from "./AndroidStudioAiPanel";

export interface AiCopilotProps {
  currentCode: string;
  fpg?: DivGraphic[];
  onApplyCode?: (newCode: string) => void;
  onReplaceCode?: (newCode: string) => void;
  onInsertCode: (snippet: string) => void;
  onRunGame?: () => void;
  onSwitchToEditor?: () => void;
  onOpenAiSettings?: () => void;
  onOpenSettings?: () => void;
  activeProcesses?: any[];
  fpgCount?: number;
  resolution?: string;
  initialPrompt?: string;
  onConsumeInitialPrompt?: () => void;
}

export const AiCopilot: React.FC<AiCopilotProps> = ({
  currentCode,
  onApplyCode,
  onReplaceCode,
  onInsertCode,
  onRunGame,
  onSwitchToEditor,
  onOpenAiSettings,
  onOpenSettings,
  initialPrompt,
  onConsumeInitialPrompt,
}) => {
  const handleApply = onReplaceCode || onApplyCode || (() => {});
  const handleSettings = onOpenSettings || onOpenAiSettings;

  return (
    <div className="w-full h-full flex-1 flex-grow min-h-0 bg-[#080d1a] overflow-hidden flex flex-col">
      <AndroidStudioAiPanel
        currentCode={currentCode}
        onInsertCode={onInsertCode}
        onApplyFullCode={handleApply}
        onRunGame={onRunGame}
        onSwitchToEditor={onSwitchToEditor}
        onOpenSettings={handleSettings}
        isFloating={true}
        initialPrompt={initialPrompt}
        onConsumeInitialPrompt={onConsumeInitialPrompt}
      />
    </div>
  );
};
