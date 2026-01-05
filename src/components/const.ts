// for data-testid attributes
export const TestIds = {
  widget: {
    container: "widget-container",
    loading: "widget-loading",
    error: "widget-error",
  },
  inputPopup: {
    popup: "input-popup",
    historyTrigger: "history-trigger",
    historyList: "history-list",
    historyItem: "history-item",
    pinnedTrigger: "pinned-trigger",
    pinnedList: "pinned-list",
    pinnedItem: "pinned-item",
    editTrigger: "edit-trigger",
    improveTrigger: "improve-trigger",
    settingsTrigger: "settings-trigger",
    settingsContent: "settings-content",
    promptPreview: "prompt-preview",
    variablePreview: "variable-preview",
  },
  settingsMenu: {
    import: "settings-import",
    export: "settings-export",
  },
  import: {
    dialog: "import-dialog",
    fileInput: "import-file-input",
    selectButton: "import-select-button",
    executeButton: "import-execute-button",
    resetButton: "import-reset-button",
    closeButton: "import-close-button",
    ui: {
      willImport: "will-import",
      noPrompts: "no-prompts",
      duplicate: "duplicate-prompts",
      missingPresets: "missing-presets",
      imported: "imported-prompts",
      errors: "import-errors",
    },
  },
  autocomplete: {
    popup: "autocomplete-popup",
    item: "suggestion-item",
  },
  variableInputDialog: {
    submit: "variable-input-submit",
  },
  organizerPreviewDialog: {
    list: "template-list",
    detail: "template-detail",
  },
  variableGenerationDialog: {
    dialog: "variable-generation-dialog",
  },
} as const

export enum MENU {
  None = "None",
  History = "History",
  Pinned = "Pinned",
  Save = "Save",
  Settings = "Settings",
  Improve = "Improve",
}
