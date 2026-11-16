import React from "react";
import { DivGraphic } from "../types";
import { AndroidStudioAiPanel } from "./AndroidStudioAiPanel";
import { Mode8AiAction, Mode8SceneContext } from "../engine/ai/mode8WorkBlocks";

export interface AiCopilotProps {
  currentCode: string;
  fpg?: DivGraphic[];
  onApplyCode?: (newCode: string) => void;
  onReplaceCode?: (newCode: string) => void;
  onInsertCode: (snippet: string) => void;
  onRunGame?: () => void;
  onStopGame?: () => void;
  onSwitchToEditor?: () => void;
  onOpenAiSettings?: () => void;
  onOpenSettings?: () => void;
  activeProcesses?: any[];
  fpgCount?: number;
  resolution?: string;
  initialPrompt?: string;
  onConsumeInitialPrompt?: () => void;
  autoStartVoiceTrigger?: number;
  activeWorkspaceTab?: string;
  mode8SceneContext?: Mode8SceneContext;
  onApplyMode8Actions?: (actions: Mode8AiAction[]) => void;
}

export const AiCopilot: React.FC<AiCopilotProps> = ({
  currentCode,
  onApplyCode,
  onReplaceCode,
  onInsertCode,
  onRunGame,
  onStopGame,
  onSwitchToEditor,
  onOpenAiSettings,
  onOpenSettings,
  initialPrompt,
  onConsumeInitialPrompt,
  autoStartVoiceTrigger,
  activeWorkspaceTab,
  mode8SceneContext,
  onApplyMode8Actions,
}) => {
  const handleApply = onReplaceCode || onApplyCode || (() => {});
  const handleSettings = onOpenSettings || onOpenAiSettings;

  return (
    <div className="w-full h-full flex-1 flex-grow min-h-0 bg-[#F7F8FA] overflow-hidden flex flex-col">
      <AndroidStudioAiPanel
        currentCode={currentCode}
        onInsertCode={onInsertCode}
        onApplyFullCode={handleApply}
        onRunGame={onRunGame}
        onStopGame={onStopGame}
        onSwitchToEditor={onSwitchToEditor}
        onOpenSettings={handleSettings}
        isFloating={true}
        initialPrompt={initialPrompt}
        onConsumeInitialPrompt={onConsumeInitialPrompt}
        autoStartVoiceTrigger={autoStartVoiceTrigger}
        activeWorkspaceTab={activeWorkspaceTab}
        mode8SceneContext={mode8SceneContext}
        onApplyMode8Actions={onApplyMode8Actions}
      />
    </div>
  );
};
