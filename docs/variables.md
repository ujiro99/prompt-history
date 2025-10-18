# 変数展開機能 設計書

## 概要

プロンプト内に変数があったら、プロンプト入力時に変数入力画面を表示する。
変数の内容も含めてAIサービスへ入力する。

## 機能要件

### 1. プロンプト編集画面

- プロンプト編集画面を表示するさい、プロンプト中に変数が存在するかを解析、判定する
  - プロンプト中に `{{変数名}}` という形で埋め込まれたものを、変数と認識する
- 変数が含まれた場合、変数毎に以下を設定する欄を追加で表示する
  - `変数の型`： 一行文字列、複数行文字列、選択肢、対象外
  - `デフォルト値`
  - `選択肢`（型が選択肢の場合のみ）： 選択肢をカンマ区切りで入力
- 上記の設定値を、Promptのデータとして、永続化する

### 2. 変数入力画面

- AIサービスへのプロンプトの入力（実行）時、当該プロンプトに変数の設定があるか、もしくは、プロンプト中に変数が存在するかを解析、判定する
- 変数が設定されている、または、含まれた場合、変数入力画面を表示する
- 変数入力画面では、変数の型に応じて入力欄を動的に生成する
  - 型に応じて、`一行文字列`はInput、`複数行文字列`はTextarea、`選択肢`はSelectとする。
  - 型が`対象外`の場合は入力欄を表示しない
  - 変数の設定が存在しない場合は、一行文字列、デフォルト値無し、として扱う
  - 変数のデフォルト値が設定されている場合は、入力欄にデフォルト値をセットする
- 変数の入力が完了したら、プロンプトの下部に変数部を追加したうえで、AIサービスへ入力する
  - ユーザーにより入力されなかった場合は、変数部に追加しない
- 以下のような形式で入力する。上から、一行文字列、複数行文字列、選択肢の例。
  ```
  # variables:
  {{変数名A}}: "入力された値"
  {{変数名B}}: """
  人工知能(AI)は近年急速に発展しています。
  特に大規模言語モデル(LLM)の登場により、
  自然言語処理の分野で大きな進歩がありました。
  これらの技術は様々な産業で活用され始めています。
  """
  {{変数名C}}: "選択肢"
  ```

### 3. インポート・エクスポート機能

- プロンプトのエクスポート時、変数の設定も含めてエクスポートする
- プロンプトのインポート時、変数の設定も含めてインポートする

## 変数名の仕様

### 基本仕様

変数名は `{{変数名}}` という形式でプロンプト内に記述します。

**有効な変数名の規則**:

- 先頭文字: Unicode文字（任意の言語の文字）またはアンダースコア（\_）
- 2文字目以降: Unicode文字、Unicode数字（任意の言語の数字）、アンダースコア（\_）
- 正規表現パターン: `/\{\{([\p{L}_][\p{L}\p{N}_]*)\}\}/gu`
- Unicode正規化: NFC（正規化形式C - 合成形式）に自動正規化

**サポートされる文字**:

- **Unicode Letter (`\p{L}`)**: すべての言語の文字
  - 日本語（ひらがな、カタカナ、漢字）
  - 中国語（簡体字、繁体字）
  - 韓国語（ハングル）
  - 欧州言語（アクセント付き文字を含む）
  - アラビア語、ヘブライ語、キリル文字など
- **Unicode Number (`\p{N}`)**: すべての言語の数字
  - アラビア数字（0-9）
  - 全角数字（０-９）
  - その他の数字体系
- **アンダースコア (\_)**: 区切り文字として使用可能

**除外される文字（セキュリティ対策）**:

- **制御文字 (`\p{C}`)**: 不可視文字や書式制御文字
  - Zero Width Space (U+200B)
  - Soft Hyphen (U+00AD)
  - Zero Width Joiner (U+200D)
  - その他の制御文字

**有効な変数名の例**:

```
// 英語
{{name}}
{{user_name}}
{{userName}}
{{_private}}
{{value1}}
{{item_2}}
{{MAX_VALUE}}

// 日本語
{{なまえ}}
{{ユーザー名}}
{{値1}}
{{user_名前}}

// 中国語
{{名字}}
{{用户名}}
{{數值}}

// 韓国語
{{이름}}
{{사용자}}
{{값1}}

// 欧州言語
{{café}}
{{naïve}}
{{Müller}}

// 混在
{{user_名前}}
{{usuario_1}}
{{사용자_name}}
```

**無効な変数名の例**:

```
{{1name}}          // 数字始まりは不可
{{user-name}}      // ハイフンは使用不可
{{user name}}      // スペースは使用不可
{{user.name}}      // ドットは使用不可
{{}}               // 空の変数名は不可
{{ name }}         // 前後のスペースは不可
{name}             // 単一の波括弧は不可
{{name​}}          // 不可視文字（Zero Width Space）を含む
{{😀_value}}       // 絵文字は文字として認識されない
```

### Unicode正規化

変数名は**NFC（Normalization Form C - 正規化形式C）**に自動的に正規化されます。これにより、合成文字と分解文字が同じ変数として扱われます。

**例**:

```
{{café}}  // é を合成文字 (U+00E9) として記述
{{café}}  // é を分解文字 (U+0065 U+0301) として記述
```

上記の2つは見た目が同じで、内部的にも同一の変数として認識されます。

### 変数名の解析

- 同じ変数名が複数回出現しても、1つの変数として認識（重複除去）
- プロンプト内の変数の出現順序は保持しない
- 不正な形式の変数は無視される
- すべての変数名はNFC形式に正規化される

## アーキテクチャ

### データモデル

#### Prompt型の拡張

既存のPrompt型に以下のフィールドを追加：

```typescript
interface Prompt {
  // ... 既存フィールド
  variables?: VariableConfig[] // 変数設定情報
}
```

#### 新規型定義

```typescript
/**
 * 変数の型
 */
export type VariableType = "text" | "textarea" | "select" | "exclude"

/**
 * 選択肢の設定情報（拡張性を考慮）
 */
export interface SelectOptions {
  /** 選択肢リスト */
  options: string[]
  // 将来的な拡張用フィールド（例）
  // allowCustomInput?: boolean  // カスタム入力許可
  // multiSelect?: boolean        // 複数選択許可
}

/**
 * 変数の設定情報
 */
export interface VariableConfig {
  /** 変数名 */
  name: string
  /** 変数の型 */
  type: VariableType
  /** デフォルト値 */
  defaultValue?: string
  /** 選択肢設定（type='select'の場合） */
  selectOptions?: SelectOptions
}

/**
 * 変数の入力値
 */
export interface VariableValues {
  [variableName: string]: string
}
```

### コンポーネント構成

#### 1. 変数入力ダイアログ（新規）

**ファイル**: `src/components/inputMenu/controller/VariableInputDialog.tsx`

**役割**: プロンプト実行時に変数の入力を受け付ける

**Props**:

```typescript
interface VariableInputDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variables: VariableConfig[]
  onSubmit: (values: VariableValues) => void
}
```

#### 2. プロンプト編集ダイアログ（拡張）

**ファイル**: `src/components/inputMenu/controller/EditDialog.tsx`

**追加機能**:

- プロンプト内容から変数を自動検出
- 検出された変数ごとに設定UI表示
- 変数設定をSaveDialogDataに含める

#### 3. 変数設定欄コンポーネント（新規）

**ファイル**: `src/components/inputMenu/controller/VariableConfigField.tsx`

**役割**: 変数1つの設定UI（型、デフォルト値、選択肢）

### ユーティリティ関数

#### 1. 変数解析（variableParser）

**ファイル**: `src/utils/variables/variableParser.ts`

**関数**:

```typescript
/**
 * プロンプトから変数名を抽出
 * @param content - プロンプト内容
 * @returns 変数名の配列
 */
export function parseVariables(content: string): string[]

/**
 * 変数名が有効かチェック
 * @param name - 変数名
 * @returns 有効ならtrue
 */
export function isValidVariableName(name: string): boolean

/**
 * 変数設定と実際のプロンプト内容をマージ
 * @param content - プロンプト内容
 * @param configs - 変数設定
 * @returns マージされた変数設定
 */
export function mergeVariableConfigs(
  content: string,
  configs?: VariableConfig[],
): VariableConfig[]
```

#### 2. 変数フォーマット（variableFormatter）

**ファイル**: `src/utils/variables/variableFormatter.ts`

**関数**:

```typescript
/**
 * 変数セクションをフォーマット
 * @param values - 変数の入力値
 * @returns フォーマットされた文字列
 */
export function formatVariableSection(values: VariableValues): string

/**
 * プロンプトに変数セクションを追加
 * @param content - 元のプロンプト
 * @param values - 変数の入力値
 * @returns 変数セクション追加後のプロンプト
 */
export function expandPrompt(content: string, values: VariableValues): string

/**
 * 値のフォーマット（一行/複数行に応じて引用符を使い分け）
 * @param value - 値
 * @returns フォーマットされた値
 */
export function formatValue(value: string): string
```

### 実行フロー

#### プロンプト編集時

```
EditDialog 表示
  ↓
プロンプト内容変更検知
  ↓
parseVariables() で変数抽出
  ↓
変数設定UI動的生成
  ↓
保存時、変数設定も含めて保存
```

#### プロンプト実行時

```
InputPopup - handleItemClick()
  ↓
ExecuteManager.executePrompt()
  ↓
変数設定チェック
  ↓
変数あり？ → VariableInputDialog 表示
  |            ↓
  |          変数入力
  |            ↓
  |          formatVariableSection()
  |            ↓
  |          expandPrompt()
  ↓
AIサービスへプロンプト送信
```

## UI/UX フロー

### プロンプト編集画面

```
+------------------------------------------+
| プロンプト編集                           |
+------------------------------------------+
| 名前: [__________________________]       |
|                                          |
| プロンプト:                              |
| [________________________________]       |
| [    こんにちは{{name}}さん      ]       |
| [    今日の天気は{{weather}}です ]       |
| [________________________________]       |
|                                          |
| --- 変数設定 ---                         |
|                                          |
| 変数: name                               |
|   型: [一行文字列 ▼]                     |
|   デフォルト値: [太郎____________]       |
|                                          |
| 変数: weather                            |
|   型: [選択肢 ▼]                         |
|   デフォルト値: [晴れ____________]       |
|   選択肢: [晴れ,曇り,雨__________]       |
|                                          |
| [キャンセル]              [保存]         |
+------------------------------------------+
```

### 変数入力画面

```
+------------------------------------------+
| 変数の入力                               |
+------------------------------------------+
| name:                                    |
| [太郎__________________________]         |
|                                          |
| weather:                                 |
| [晴れ ▼]                                 |
|   - 晴れ                                 |
|   - 曇り                                 |
|   - 雨                                   |
|                                          |
| [キャンセル]              [実行]         |
+------------------------------------------+
```

## テスト設計

### ユニットテスト

#### 1. variableParser.test.ts

- `parseVariables()`
  - 正常系: 変数を含むプロンプトから変数名を抽出
  - 正常系: 同じ変数名が複数回出現する場合、重複を除外
  - 正常系: 変数がない場合、空配列を返す
  - 異常系: 不正な形式の変数は無視

- `isValidVariableName()`
  - 正常系: 有効な変数名
  - 異常系: 空文字、特殊文字を含む変数名

- `mergeVariableConfigs()`
  - 正常系: 既存設定と新規変数のマージ
  - 正常系: 削除された変数の除外
  - 正常系: 変数なしの場合

#### 2. variableFormatter.test.ts

- `formatVariableSection()`
  - 正常系: 単一行の値
  - 正常系: 複数行の値
  - 正常系: 空の値（入力なし）
  - 正常系: 値なしの場合、変数セクション非生成

- `expandPrompt()`
  - 正常系: 変数セクション追加
  - 正常系: 値がない場合、元のプロンプトのまま

- `formatValue()`
  - 正常系: 単一行は `"value"` 形式
  - 正常系: 複数行は `"""value"""` 形式
  - エッジケース: 改行のみの値

#### 3. VariableInputDialog.test.tsx

- レンダリング
  - 変数の型に応じた入力欄の表示
  - デフォルト値の反映
  - 選択肢の表示

- ユーザー操作
  - 値の入力
  - フォーム送信
  - キャンセル

### E2Eテスト（将来的に）

- プロンプト編集 → 変数設定 → 保存 → 実行 → 変数入力 → AIサービスへ送信
- インポート/エクスポートで変数設定が保持される

## 実装状況

### ✅ 完了

- [x] 設計ドキュメント作成 (`docs/variables.md`)
- [x] CLAUDE.md への機能概要追記
- [x] CLAUDE.ja.md への機能概要追記
- [x] 型定義の追加 (`src/types/prompt.ts`)
  - [x] `VariableType` 型
  - [x] `SelectOptions` インターフェース
  - [x] `VariableConfig` インターフェース
  - [x] `VariableValues` インターフェース
  - [x] `Prompt` 型への `variables` フィールド追加
  - [x] `StoredPrompt` 型への `variables` フィールド追加
  - [x] `SaveDialogData` 型への `variables` フィールド追加
- [x] TDD: ユニットテスト作成
  - [x] `variableParser.test.ts` (10ケース)
  - [x] `variableFormatter.test.ts` (12ケース)
  - [x] `VariableInputDialog.test.tsx` (12ケース)
- [x] ユーティリティ関数実装
  - [x] `variableParser.ts`
    - [x] `parseVariables()`
    - [x] `isValidVariableName()`
    - [x] `mergeVariableConfigs()`
  - [x] `variableFormatter.ts`
    - [x] `formatValue()`
    - [x] `formatVariableSection()`
    - [x] `expandPrompt()`
- [x] コンポーネント実装
  - [x] `VariableInputDialog.tsx` - 変数入力ダイアログ

### 🚧 TODO

#### 1. EditDialog への変数設定UI追加

**ファイル**: `src/components/inputMenu/controller/EditDialog.tsx`

**作業内容**:

- [ ] プロンプト内容の変更を監視
- [ ] `parseVariables()` を使用して変数を自動検出
- [ ] 検出された変数ごとに設定UIを動的生成
  - [ ] 変数の型選択 (text/textarea/select/exclude)
  - [ ] デフォルト値入力
  - [ ] 選択肢入力（型がselectの場合）
- [ ] `mergeVariableConfigs()` を使用して既存設定とマージ
- [ ] 保存時に変数設定を `SaveDialogData` に含める
- [ ] VariableConfigField コンポーネントの作成（オプション）

**参考実装箇所**:

- 既存の EditDialog: `src/components/inputMenu/controller/EditDialog.tsx:44-219`
- 型定義: `src/types/prompt.ts`
- ユーティリティ: `src/utils/variables/variableParser.ts`

#### 2. ExecuteManager への統合

**ファイル**: `src/services/promptHistory/executeManager.ts`

**作業内容**:

- [ ] `executePrompt()` メソッドの拡張
  - [ ] プロンプトの変数設定をチェック
  - [ ] 変数が存在する場合、VariableInputDialog を表示
  - [ ] ダイアログからの入力値を受け取る
  - [ ] `expandPrompt()` を使用してプロンプトを展開
  - [ ] 展開後のプロンプトをAIサービスへ送信
- [ ] 変数入力ダイアログの状態管理
  - [ ] InputPopup コンポーネントへの統合も検討

**参考実装箇所**:

- 既存の ExecuteManager: `src/services/promptHistory/executeManager.ts:20-79`
- InputPopup: `src/components/inputMenu/InputPopup.tsx:136-151`
- ユーティリティ: `src/utils/variables/variableFormatter.ts`

#### 3. インポート/エクスポート機能への対応（必要に応じて）

**ファイル**: インポート/エクスポート関連のファイル

**作業内容**:

- [ ] エクスポート時に `variables` フィールドを含める
- [ ] インポート時に `variables` フィールドを復元
- [ ] 既存のインポート/エクスポート機能を調査
- [ ] 必要に応じて型定義の調整

#### 4. i18n対応

**ファイル**: 国際化リソースファイル

**作業内容**:

- [ ] 変数入力ダイアログのラベル・メッセージ追加
  - [ ] `dialogs.variables.title` - "変数の入力" / "Variable Input"
  - [ ] `placeholders.enterValue` - "値を入力" / "Enter value"
  - [ ] `placeholders.selectOption` - "選択してください" / "Select option"
  - [ ] `common.execute` - "実行" / "Execute" (既存の可能性あり)
- [ ] EditDialog の変数設定UI用のラベル追加
  - [ ] `dialogs.edit.variableSettings` - "変数設定" / "Variable Settings"
  - [ ] `common.variableType` - "変数の型" / "Variable Type"
  - [ ] `common.defaultValue` - "デフォルト値" / "Default Value"
  - [ ] `common.options` - "選択肢" / "Options"
  - [ ] `variableTypes.text` - "一行文字列" / "Single-line Text"
  - [ ] `variableTypes.textarea` - "複数行文字列" / "Multi-line Text"
  - [ ] `variableTypes.select` - "選択肢" / "Select"
  - [ ] `variableTypes.exclude` - "対象外" / "Exclude"

#### 5. テストの追加

**作業内容**:

- [ ] EditDialog の変数設定UI部分のユニットテスト
- [ ] ExecuteManager の変数展開フローのユニットテスト
- [ ] 統合テスト（E2E）の追加（任意）

## 注意事項

- 変数設定の保存時、既存のPrompt構造との互換性を保つこと
- 変数がない既存のプロンプトとの後方互換性を確保すること
- パフォーマンスを考慮し、変数解析は必要最小限に抑えること
