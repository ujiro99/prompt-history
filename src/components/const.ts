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
    settingsTrigger: "settings-trigger",
    settingsContent: "settings-content",
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
      imported: "imported-prompts",
      errors: "import-errors",
    },
  },
  autocomplete: {
    popup: "autocomplete-popup",
    item: "suggestion-item",
  },
}

export enum MENU {
  None = "None",
  History = "History",
  Pinned = "Pinned",
  Save = "Save",
  Settings = "Settings",
}
