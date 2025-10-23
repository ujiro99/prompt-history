# 設定メニュー機能設計書

## 1. 概要

InputPopup.tsxの既存のMenubarに設定メニューを追加し、ユーザーが拡張機能の動作をカスタマイズできる機能を実装する。設定項目はMenubarContentの中にMenubarItemとして配置し、shadcn/uiとRadix UIのMenubarコンポーネントを活用する。

## 2. 要件

### 2.1 機能要件

#### 2.1.1 設定メニューの表示

- InputPopupの既存Menubar（History、Pinned、Save）に Settings メニューを追加
- Settingsアイコン（lucide-react）をトリガーとして使用
- MenubarContentにて設定項目一覧を表示

#### 2.1.2 ON/OFF設定項目

1. **プロンプト自動保存**
   - ChatGPTでプロンプト送信時の自動保存機能の有効/無効
   - MenubarCheckboxItemを使用
   - デフォルト値: ON

2. **オートコンプリート**
   - プロンプト入力時のオートコンプリート機能の有効/無効
   - MenubarCheckboxItemを使用
   - デフォルト値: ON

3. **通知**
   - 操作完了時の通知表示の有効/無効
   - MenubarCheckboxItemを使用
   - デフォルト値: ON

4. **変数展開**
   - プロンプト実行時の変数展開機能の有効/無効
   - MenubarCheckboxItemを使用
   - デフォルト値: ON
   - ON: 変数入力ダイアログを表示、プロンプト編集ダイアログで変数設定セクションを表示
   - OFF: 変数ダイアログをスキップしプロンプトをそのまま実行、プロンプト編集ダイアログで変数設定セクションを表示しない

#### 2.1.3 選択設定項目

1. **オートコンプリートの対象**
   - 候補対象の選択：全てのプロンプト / Pinnedプロンプトのみ
   - MenubarRadioGroupとMenubarRadioItemを使用
   - デフォルト値: 全て

#### 2.1.4 アクション設定項目

1. **プロンプトのエクスポート / インポート**
   - 詳細は [import-export-design.md](./import-export-design.md) を参照

### 2.2 非機能要件

#### 2.2.1 UI/UX

- 既存のInputPopupのデザインと統一性を保つ
- 設定項目はMenubarSeparatorで論理的にグループ分け
- アクセシビリティ対応（data-testid、キーボードナビゲーション）

#### 2.2.2 データ永続化

- 設定値はWXT Storage APIを使用してブラウザ間で同期
- 設定変更は即座に反映・保存

## 3. 技術仕様

### 3.1 アーキテクチャ

```
InputPopup.tsx
├── Menubar
│   ├── History Menu
│   ├── Pinned Menu
│   ├── Save Menu
│   └── Settings Menu (SettingsMenu.tsx)
│       ├── ON/OFF設定群（CheckboxItem）
│       ├── 選択設定群（RadioGroup）
│       └── アクション設定群（MenuItem）
```

**利用サービス**:

- `SettingsService`: 設定値の管理（WXT Storage API経由）
- `promptExportService` / `promptImportService`: インポート・エクスポート処理

### 3.2 データ構造

#### 3.2.1 既存の設定値型定義の利用

プロジェクトの既存の `AppSettings` 型定義（`src/types/prompt.ts`）を利用：

```typescript
interface AppSettings {
  autoSaveEnabled: boolean // プロンプト自動保存
  autoCompleteEnabled?: boolean // オートコンプリート
  maxPrompts: number // 最大プロンプト数
  sortOrder: SortOrder // デフォルトソート順
  showNotifications: boolean // 通知表示
  minimalMode?: boolean // ミニマルモード
}
```

#### 3.2.2 新規追加する設定項目

以下の設定項目をAppSettingsに追加：

```typescript
interface AppSettings {
  // 既存項目...
  autoCompleteTarget?: "all" | "pinned" // オートコンプリート対象
  variableExpansionEnabled?: boolean // 変数展開機能の有効/無効
}
```

### 3.3 UI コンポーネント設計

設定メニューは `SettingsMenu.tsx` として実装済み。以下のコンポーネントを使用：

- `MenubarMenu`, `MenubarContent`: メニューコンテナ
- `MenubarCheckboxItem`: ON/OFF設定用
- `MenubarRadioGroup`, `MenubarRadioItem`: 選択設定用
- `MenubarItem`: アクション実行用
- `MenubarSeparator`: セクション区切り
- `MenubarLabel`: グループラベル

**主要な実装ポイント**:

- `useSettings` hookで設定値を取得・更新
- 各設定項目のデフォルト値は `??` 演算子で指定
- 変数展開設定のデフォルトは `true`

## 4. 実装詳細

### 4.1 実装のポイント

#### 4.1.1 変数展開機能の設定対応

**EditDialog.tsx**:

- `variableExpansionEnabled`設定に応じて変数設定セクションの表示を制御
- 設定がOFFの場合、変数の解析とUIをスキップ

**usePromptExecution.tsx**:

- `variableExpansionEnabled`設定に応じて変数入力ダイアログの表示を制御
- 設定がOFFの場合、変数チェックをスキップして直接実行

#### 4.1.2 型定義の拡張

**src/types/prompt.ts**:

- `AppSettings`型に`variableExpansionEnabled?: boolean`を追加

#### 4.1.3 国際化対応

- 変数展開設定のラベルを多言語対応（`settings.variableExpansion`）

### 4.2 利用サービス

#### 4.2.1 設定管理

`src/services/storage/settings.ts` の `SettingsService` を利用：

- 設定値の読み込み・更新・監視

#### 4.2.2 インポート・エクスポート

詳細は [import-export-design.md](./import-export-design.md) を参照

## 5. データフロー

### 5.1 設定変更フロー

```
ユーザー操作（CheckboxItem/RadioItem）
  ↓
handleSettingChange
  ↓
SettingsService.setSettings
  ↓
WXT Storage API（永続化）
  ↓
設定値同期（他タブ・コンポーネント）
```

## 6. テストケース

### 6.1 UI操作テスト

1. **設定メニューの表示**
   - Settingsアイコンクリック
   - MenubarContentの表示確認
   - 各設定項目の表示確認

2. **ON/OFF設定の切り替え**
   - CheckboxItemのチェック状態変更
   - 設定値の即座反映確認
   - 永続化の確認

3. **選択設定の変更**
   - RadioGroupの選択変更
   - 設定値の反映確認

### 6.2 機能テスト

1. **インポート・エクスポート機能**
   - 詳細は [import-export-design.md](./import-export-design.md) を参照

2. **変数展開機能**

   **設定がONの場合**:
   - 変数を含むプロンプト実行時に変数入力ダイアログが表示されること
   - プロンプト編集ダイアログで変数設定セクションが表示されること
   - 変数の解析と設定UIが正常に動作すること

   **設定がOFFの場合**:
   - 変数を含むプロンプト実行時に変数入力ダイアログが表示されないこと
   - プロンプトがそのまま実行されること（`{{変数名}}`の形式のまま）
   - プロンプト編集ダイアログで変数設定セクションが表示されないこと
   - 変数の解析とUIの生成がスキップされること

   **設定の切り替え**:
   - ON→OFFへの切り替えが即座に反映されること
   - OFF→ONへの切り替えが即座に反映されること
   - 設定変更が永続化されること

### 6.3 設定永続化テスト

1. **ブラウザ再起動後の設定保持**
2. **異なるタブでの設定同期**
3. **設定のデフォルト値適用**

## 7. 考慮事項

### 7.1 パフォーマンス

- 設定変更時の最小限のDOM更新
- WXT Storage APIの効率的な利用

### 7.2 国際化

- 設定項目名の多言語対応（i18n）
- 各言語での適切なラベル表示

### 7.3 拡張性

- 将来的な設定項目追加への対応
- 設定グループの論理的な構成維持

### 7.4 互換性

- 既存機能への影響最小化
- デフォルト値による後方互換性の確保
