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

#### 2.1.3 選択設定項目

1. **オートコンプリートの対象**
   - 候補対象の選択：全てのプロンプト / Pinnedプロンプトのみ
   - MenubarRadioGroupとMenubarRadioItemを使用
   - デフォルト値: 全て

#### 2.1.4 アクション設定項目

1. **プロンプトのエクスポート**

   - 保存済みプロンプトをCSVファイルとしてエクスポート
   - MenubarItemを使用（クリックでファイルダウンロード開始）

2. **プロンプトのインポート**
   - CSVファイルからプロンプトをインポート
   - MenubarItemを使用（クリックでファイル選択ダイアログ表示）

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
InputPopup.tsx (既存)
├── MenuBar (既存)
│   ├── History Menu (既存)
│   ├── Pinned Menu (既存)
│   ├── Save Menu (既存)
│   └── Settings Menu (新規)
│       ├── ON/OFF設定群
│       ├── 選択設定群
│       └── アクション設定群
└── SettingsService (新規)
    ├── 設定値の読み書き
    ├── エクスポート/インポート処理
    └── WXT Storage API連携
```

### 3.2 データ構造

#### 3.2.1 既存の設定値型定義の利用

プロジェクトの既存の `AppSettings` 型定義（`src/types/prompt.ts`）を利用：

```typescript
interface AppSettings {
  autoSaveEnabled: boolean          // プロンプト自動保存
  autoCompleteEnabled?: boolean     // オートコンプリート
  maxPrompts: number               // 最大プロンプト数
  sortOrder: SortOrder            // デフォルトソート順
  showNotifications: boolean      // 通知表示
  minimalMode?: boolean          // ミニマルモード
}
```

#### 3.2.2 新規追加する設定項目

以下の設定項目をAppSettingsに追加：

```typescript
interface AppSettings {
  // 既存項目...
  autoCompleteTarget?: "all" | "pinned" // オートコンプリート対象
}
```

### 3.3 UI コンポーネント設計

#### 3.3.1 必要なインポート追加

```typescript
import {
  MenubarItem,
  MenubarSeparator,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
} from "@/components/ui/menubar"
import { Settings, Download, Upload } from "lucide-react"
```

#### 3.3.2 MENU列挙型の拡張

```typescript
enum MENU {
  None = "None",
  History = "History",
  Pinned = "Pinned",
  Save = "Save",
  Settings = "Settings", // 新規追加
}
```

#### 3.3.3 state追加

```typescript
// 既存のAppSettings型を使用したstate
const [settings, setSettings] = useState<AppSettings | null>(null)

// 設定読み込み用のuseEffect
useEffect(() => {
  settingsService.getSettings().then(setSettings)
}, [])
```

### 3.4 設定メニューの構成

```typescript
<MenubarMenu value={MENU.Settings}>
  <MenuTrigger data-testid={TestIds.inputPopup.settingsTrigger}>
    <Settings size={16} className="stroke-gray-600" />
  </MenuTrigger>
  <MenubarContent side="top" className="w-56">
    {settings && (
      <>
        {/* ON/OFF設定群 */}
        <MenubarCheckboxItem
          checked={settings.autoSaveEnabled}
          onCheckedChange={(checked) => handleSettingChange('autoSaveEnabled', checked)}
        >
          プロンプト自動保存
        </MenubarCheckboxItem>

        <MenubarCheckboxItem
          checked={settings.autoCompleteEnabled ?? true}
          onCheckedChange={(checked) => handleSettingChange('autoCompleteEnabled', checked)}
        >
          オートコンプリート
        </MenubarCheckboxItem>

        <MenubarCheckboxItem
          checked={settings.showNotifications}
          onCheckedChange={(checked) => handleSettingChange('showNotifications', checked)}
        >
          通知
        </MenubarCheckboxItem>

        <MenubarSeparator />

        {/* 選択設定群 */}
        <MenubarRadioGroup
          value={settings.autoCompleteTarget ?? "all"}
          onValueChange={(value) => handleSettingChange('autoCompleteTarget', value)}
        >
          <MenubarRadioItem value="all">全てのプロンプト</MenubarRadioItem>
          <MenubarRadioItem value="pinned">Pinnedのみ</MenubarRadioItem>
        </MenubarRadioGroup>

        <MenubarSeparator />

        {/* アクション設定群 */}
        <MenubarItem onClick={handleExport}>
          <Download size={16} className="mr-2" />
          プロンプトのエクスポート
        </MenubarItem>

        <MenubarItem onClick={handleImport}>
          <Upload size={16} className="mr-2" />
          プロンプトのインポート
        </MenubarItem>
      </>
    )}
  </MenubarContent>
</MenubarMenu>
```

## 4. 実装詳細

### 4.1 修正対象ファイル

#### 4.1.1 InputPopup.tsx

- MENU列挙型にSettingsを追加
- 設定値管理用のstate追加
- 設定メニューのUI追加
- 設定変更ハンドラー実装

### 4.2 既存サービスの利用

#### 4.2.1 設定管理

既存の `src/services/storage/settings.ts` の `SettingsService` を利用：

- `getSettings()`: 設定値の読み込み
- `setSettings(settings: Partial<AppSettings>)`: 設定値の更新
- `watchSettings()`: 設定変更の監視

#### 4.2.2 新規作成予定ファイル

エクスポート/インポート機能は別サービスとして切り出し：

- `services/importExport/promptExportService.ts` - プロンプトエクスポート処理
- `services/importExport/promptImportService.ts` - プロンプトインポート処理
- `services/importExport/types.ts` - インポート/エクスポート関連の型定義

### 4.3 設定値ハンドラー実装

```typescript
// 設定変更ハンドラー（既存のSettingsServiceを利用）
const handleSettingChange = async (key: keyof AppSettings, value: any) => {
  const updatedSettings = { [key]: value }
  await settingsService.setSettings(updatedSettings)
  // stateの更新はwatchSettingsかreloadで対応
}

// エクスポートハンドラー（新規のExportServiceを利用予定）
const handleExport = async () => {
  // promptExportService.exportToCSV() などを呼び出し
}

// インポートハンドラー（新規のImportServiceを利用予定）
const handleImport = async () => {
  // promptImportService.importFromCSV() などを呼び出し
}
```

## 5. データフロー

### 5.1 設定変更フロー

```
ユーザー操作（MenubarCheckboxItem/RadioItem）
↓
handleSettingChange
↓
settingsService.setSettings（既存サービス）
↓
WXT Storage API
↓
設定値永続化
↓
watchSettings/reload（state更新）
```

### 5.2 エクスポート/インポートフロー

```
【エクスポート】
MenubarItemクリック
↓
handleExport
↓
promptExportService.exportToCSV（新規予定）
↓
プロンプトデータ収集
↓
CSVファイル生成・ダウンロード

【インポート】
MenubarItemクリック
↓
handleImport
↓
ファイル選択ダイアログ
↓
promptImportService.importFromCSV（新規予定）
↓
CSVパース・バリデーション
↓
プロンプトデータ保存
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

1. **エクスポート機能**

   - エクスポートボタンクリック
   - CSVファイルのダウンロード確認
   - ファイル内容の妥当性確認

2. **インポート機能**
   - インポートボタンクリック
   - ファイル選択ダイアログ表示
   - 正常CSVファイルのインポート
   - 不正ファイルのエラーハンドリング

### 6.3 設定永続化テスト

1. **ブラウザ再起動後の設定保持**
2. **異なるタブでの設定同期**
3. **設定のデフォルト値適用**

## 7. 考慮事項

### 7.1 セキュリティ

- インポートファイルのバリデーション強化
- XSS対策（設定値のサニタイゼーション）

### 7.2 パフォーマンス

- 設定変更時の最小限のDOM更新
- 大量プロンプトのエクスポート/インポート最適化

### 7.3 国際化

- 設定項目名の多言語対応（i18n）
- エラーメッセージの多言語対応

### 7.4 互換性

- 既存のInputPopup機能への影響回避
- 将来的な設定項目追加への拡張性確保
