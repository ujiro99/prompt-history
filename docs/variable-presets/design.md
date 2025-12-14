# 変数プリセット機能 設計書

## 概要

変数プリセット機能は、再利用可能な変数定義をグローバルに管理し、プロンプト編集時に簡単に適用できるようにする機能です。ユーザーは事前に変数プリセットを定義し、プロンプト編集時にそれらを選択することで、変数の設定を効率化できます。また、入力補完との連携により、変数プリセットの値を直接展開することも可能です。

## 機能要件

### 1. 変数プリセット管理

#### 変数プリセットの構造

各変数プリセットは以下の情報を持ちます：

- **ID**: 一意識別子（UUID、内部管理用）
- **変数名**: 変数プリセットの表示名
- **変数型**:
  - 文字列型（複数行文字列）
  - 選択肢型
  - 辞書型
- **用途**: 使用目的の説明（オプション）
- **コンテンツ**（変数型により異なる）:
  - [文字列型のみ] コンテンツ（複数行文字列）
  - [選択肢型のみ] コンテンツ（カンマ区切り文字列のリスト）
  - [辞書型のみ] 項目のリスト
    - 項目ID（UUID、内部管理用）
    - 項目名
    - 項目内容（複数行文字列）

#### 変数プリセット編集ダイアログ

- 設定メニューから起動
- 2カラム構成:
  - 左カラム: 変数プリセット一覧
  - 右カラム: 変数編集画面
- **変数プリセット一覧**
  - 表示項目: 変数名、変数型、用途
  - 上部に「変数追加」ボタンを配置
  - プリセットをクリックして編集
- **変数編集画面**
  - 変数プリセットのプロパティを編集
  - 上部に「複製」、「削除」ボタンを配置
  - 入力時に自動保存（debounce）
  - 変数型に応じて入力フィールドを表示/非表示
  - 変数型を変更した場合、以前の型のデータは非表示だが保持される（以下の場合に削除）:
    - ダイアログを閉じる
    - 他の変数プリセットの編集を開始する

### 2. プロンプト編集との連携

#### 参照方式による関連付け

プロンプト編集ダイアログで変数プリセットを選択した場合:

- 変数設定には**プリセットへの参照**（プリセットID）を保存
- プリセットの変更がすべての使用プロンプトに反映される
- プリセット削除時の孤児参照の処理が必要

#### 拡張された VariableConfig

```typescript
interface VariableConfig {
  name: string
  type: VariableType | "preset"
  // 通常の変数の場合
  defaultValue?: string
  selectOptions?: SelectOptions
  // プリセット参照の場合
  presetId?: string // VariablePreset.id への参照
}
```

type が "preset" の場合:

- `presetId` にプリセットのIDが格納される
- その他のフィールド（defaultValue, selectOptions）は無視される
- 実際の設定は実行時にプリセットから解決される

#### 変数入力ダイアログの拡張

変数がプリセットを使用している場合:

- プリセットの設定を解決
- 辞書型の場合:
  - 項目名のドロップダウンを表示
  - ドロップダウンの下に項目内容のプレビューを表示
  - 選択された項目の内容が変数値として使用される

#### 孤児参照の処理

プリセットの削除ボタンを押下した場合:

1. **検出**: 削除対象のプリセットを参照しているプロンプトをチェック
2. **確認ダイアログ表示**:
   - 参照が存在しない場合: 通常の削除確認ダイアログ
   - 参照が存在する場合: 影響を受けるプロンプトのリストを含む警告ダイアログ
3. **ユーザーの選択肢**:
   - **キャンセル**: 削除を中止
   - **削除して変換**: プリセットを削除し、参照している変数をデフォルト型（text）に変換

### 3. 入力補完連携

#### 変数プリセットの入力補完

ユーザーが変数プリセット名を入力すると、補完候補が表示されます:

- **文字列型**: テキストコンテンツに展開
- **選択肢型**:
  - `プリセット名.` と入力すると選択肢リストを表示
  - 選択肢を選択するとその値に展開
- **辞書型**:
  - `プリセット名.` と入力すると項目名リストを表示
  - 項目を選択するとその内容に展開

#### UI上の区別

変数プリセットのマッチはプロンプトのマッチと視覚的に区別されます:

- **アイコン/バッジ**: プリセット用の "P" アイコン vs 通常のプロンプトアイコン
- **セクションヘッダー**: 「プロンプト」 / 「変数プリセット」でグループ化

#### 入力補完フロー

```
ユーザー入力: "role"
  ↓
AutoCompleteManager.analyzeInput()
  ↓
プロンプトマッチング + プリセットマッチング
  ↓
結合された結果を表示（タイプ別にグループ化）
  ↓
ユーザー入力: "role."
  ↓
ドット記法を検出 → プリセット項目を表示
  ↓
ユーザーが項目を選択
  ↓
項目内容を直接テキストとして展開（{{variable}} ではない）
```

## アーキテクチャ

### データモデル

#### 新規型定義

```typescript
/**
 * 変数プリセットの型
 */
export type PresetVariableType = "text" | "select" | "dictionary"

/**
 * 辞書型プリセットの項目
 */
export interface DictionaryItem {
  /** 項目ID（UUID、内部管理用） */
  id: string
  /** 項目名（ドロップダウンに表示） */
  name: string
  /** 項目内容（複数行文字列、選択時に展開） */
  content: string
}

/**
 * 変数プリセット定義
 */
export interface VariablePreset {
  /** プリセットID（UUID） */
  id: string
  /** プリセット名（UI表示用） */
  name: string
  /** プリセット型 */
  type: PresetVariableType
  /** 用途説明（オプション） */
  description?: string
  /** [文字列型のみ] テキストコンテンツ */
  textContent?: string
  /** [選択肢型のみ] 選択肢リスト */
  selectOptions?: string[]
  /** [辞書型のみ] 辞書項目 */
  dictionaryItems?: DictionaryItem[]
  /** 作成日時 */
  createdAt: Date
  /** 更新日時 */
  updatedAt: Date
}

/**
 * ストレージ用変数プリセット（日付はISO文字列）
 */
export interface StoredVariablePreset
  extends Omit<VariablePreset, "createdAt" | "updatedAt"> {
  createdAt: string
  updatedAt: string
}
```

#### 既存型の拡張

```typescript
// VariableType に preset を追加（dictionary は追加しない）
export type VariableType = "text" | "select" | "exclude" | "preset"

// VariableConfig は前述の通り拡張
```

**重要**: 辞書型（`dictionary`）は `VariableType` には追加されません。辞書型はプリセット内でのみ使用され、プロンプトの変数設定では常にプリセット参照（`type: "preset"`）として扱われます。

### ストレージ

#### ストレージキー

- `local:variablePresets` - 変数プリセットのリスト

#### ストレージサービス

**ファイル**: `src/services/storage/variablePresetStorage.ts`

```typescript
/**
 * すべての変数プリセットを取得
 */
export async function getVariablePresets(): Promise<VariablePreset[]>

/**
 * 変数プリセットを保存（作成または更新）
 */
export async function saveVariablePreset(preset: VariablePreset): Promise<void>

/**
 * 変数プリセットを削除
 * 影響を受けるプロンプトIDのリストを返す
 */
export async function deleteVariablePreset(id: string): Promise<string[]>

/**
 * 変数プリセットを複製
 */
export async function duplicateVariablePreset(
  id: string,
): Promise<VariablePreset>

/**
 * 特定のプリセットを使用しているプロンプトを検索
 */
export async function findPromptsByPresetId(presetId: string): Promise<Prompt[]>

/**
 * 変数プリセットをエクスポート（JSON形式）
 */
export async function exportVariablePresets(
  presetIds: string[],
): Promise<string>

/**
 * 変数プリセットをインポート
 * @returns インポートされたプリセット数
 */
export async function importVariablePresets(
  jsonData: string,
  mode: "merge" | "replace",
): Promise<number>
```

### コンポーネント

#### 1. 変数プリセット編集ダイアログ（新規）

**ファイル**: `src/components/settings/variablePresets/VariablePresetDialog.tsx`

**機能**:

- 2カラムレイアウト
- 変数プリセット一覧（左カラム）
- 変数編集パネル（右カラム）
- debounce による自動保存
- 複製/削除機能
- 削除ボタン押下時の孤児参照検出と確認ダイアログ表示

#### 2. 変数プリセット一覧（新規）

**ファイル**: `src/components/settings/variablePresets/VariablePresetList.tsx`

**機能**:

- プリセット名、型、用途の表示
- 「変数追加」ボタン
- クリックで編集選択
- 選択中のプリセットの視覚的表示

#### 3. 変数プリセット編集パネル（新規）

**ファイル**: `src/components/settings/variablePresets/VariablePresetEditor.tsx`

**機能**:

- プリセットプロパティの編集
- 型に応じた入力フィールドの動的表示（文字列型、選択肢型、辞書型）
- 複製/削除ボタン
- 自動保存機能
- バリデーション

#### 4. EditDialog の拡張

**ファイル**: `src/components/inputMenu/controller/EditDialog.tsx`

**変更点**:

- 変数型セレクタに "preset" オプションを追加
- 型が "preset" の場合、プリセットドロップダウンを表示
- プリセット詳細のプレビュー表示
- VariableConfigField コンポーネントの更新

#### 5. VariableInputDialog の拡張

**ファイル**: `src/components/inputMenu/controller/VariableInputDialog.tsx`

**変更点**:

- プリセット参照の解決
- 辞書型を項目名 + プレビューで表示
- プリセット未発見（孤児参照）の処理

#### 6. 設定メニューの拡張

**ファイル**: `src/components/settings/*`

**変更点**:

- 「変数プリセット」メニュー項目を追加
- VariablePresetDialog の起動

### 入力補完の統合

#### 1. AutoComplete 型の拡張

**ファイル**: `src/services/autoComplete/types.ts`

```typescript
/**
 * 入力補完マッチの種類
 */
export type AutoCompleteMatchType = "prompt" | "preset" | "preset-item"

/**
 * 拡張された AutoCompleteMatch
 */
export interface AutoCompleteMatch {
  // 既存フィールド
  id: string
  name: string
  content: string
  isPinned: boolean
  matchStart: number
  matchEnd: number
  newlineCount: number
  searchTerm: string

  // 新規フィールド
  /** マッチの種類 */
  matchType: AutoCompleteMatchType
  /** プリセット型（matchType が "preset" または "preset-item" の場合） */
  presetType?: PresetVariableType
  /** 親プリセットID（matchType が "preset-item" の場合） */
  parentPresetId?: string
}
```

#### 2. 変数プリセットマッチャー（新規）

**ファイル**: `src/services/autoComplete/presetMatcher.ts`

**関数**:

```typescript
/**
 * 検索語に基づいてマッチする変数プリセットを検索
 */
export function matchPresets(
  searchTerm: string,
  presets: VariablePreset[],
  maxMatches: number,
): AutoCompleteMatch[]

/**
 * ドット記法のプリセット項目をマッチング（例: "role.customer"）
 */
export function matchPresetItems(
  searchTerm: string,
  presets: VariablePreset[],
  maxMatches: number,
): AutoCompleteMatch[]

/**
 * ドット記法を解析し、プリセット名と項目クエリを抽出
 */
export function parseDotNotation(searchTerm: string): {
  presetName: string
  itemQuery: string
} | null
```

#### 3. AutoCompleteManager の拡張

**ファイル**: `src/services/autoComplete/autoCompleteManager.ts`

**変更点**:

- `setPresets()` メソッドの追加
- `findMatches()` をプリセットマッチを含むように修正
- ドット記法の検出をサポート
- 結果を種類別にグループ化（プロンプト / プリセット）

### 実行フロー

#### 変数プリセット編集フロー

```
設定メニュー → 「変数プリセット」
  ↓
VariablePresetDialog を開く
  ↓
すべてのプリセットをロード → リストに表示
  ↓
ユーザーが「追加」をクリックまたはプリセットを選択
  ↓
VariablePresetEditor を表示
  ↓
ユーザーが編集 → 自動保存（debounce）
  ↓
削除ボタン押下 → 孤児参照をチェック
  ↓
確認ダイアログを表示:
  - 参照なし: 通常の削除確認
  - 参照あり: 影響を受けるプロンプトのリスト + 変換警告
  ↓
ユーザーの選択:
  - キャンセル: 処理中止
  - 削除して変換: プリセットを削除し、参照を text 型に変換
```

#### プリセット付きプロンプト編集フロー

```
EditDialog を開く
  ↓
プロンプト内の {{variables}} を検出
  ↓
各変数について:
  type == "preset" の場合:
    IDでプリセットをロード
    プリセット名 + プレビューを表示
  それ以外:
    通常の変数設定を表示
  ↓
ユーザーがドロップダウンからプリセットを選択
  ↓
presetId 付きの VariableConfig を保存
```

#### プリセット付きプロンプト実行フロー

```
ExecuteManager.executePrompt()
  ↓
presetId を持つ変数をチェック
  ↓
プリセットを解決 → 実際の設定を取得
  ↓
VariableInputDialog を表示
  ↓
辞書型の場合:
  ドロップダウンに項目名を表示
  項目内容のプレビューを表示
  ↓
ユーザーが値を選択/入力
  ↓
展開された変数でプロンプトを実行
```

#### プリセット付き入力補完フロー

```
ユーザーが入力フィールドに入力
  ↓
AutoCompleteManager.handleContentChange()
  ↓
カーソル前の入力を解析
  ↓
ドット記法をチェック（例: "role."）
  ↓
ドット記法の場合:
  matchPresetItems()
それ以外:
  matchPresets() + 既存のプロンプトマッチング
  ↓
グループ化された結果を表示:
  - プロンプト（プロンプトアイコン付き）
  - 変数プリセット（プリセットアイコン付き）
  ↓
ユーザーが選択 → 内容を直接テキストとして展開
```

## UI/UX フロー

### 変数プリセット編集ダイアログ

```
+----------------------------------------------------------+
| 変数プリセット                                      [×]  |
+----------------------------------------------------------+
|                                                          |
| +--------------------+  +------------------------------+ |
| | 変数プリセット     |  | 変数編集                     | |
| | [+ 変数追加]       |  |               [複製]  [削除] | |
| |                    |  |                              | |
| | > 役割             |  | 変数名: [役割______________] | |
| |   辞書型           |  | 変数型: [辞書型 ▼]           | |
| |   ユーザーの役割.. |  | 用途:                        | |
| |                    |  | [ユーザーの役割定義________] | |
| | • 背景             |  |                              | |
| |   文字列型         |  | 項目:                        | |
| |   プロジェクト背.. |  | +--------------------------+ | |
| |                    |  | | • 顧客                   | | |
| |                    |  | |   [詳細な説明...         | | |
| |                    |  | | • 上司                   | | |
| |                    |  | |   [詳細な説明...         | | |
| |                    |  | +--------------------------+ | |
| |                    |  | [+ 項目追加]                 | |
| +--------------------+  +------------------------------+ |
+----------------------------------------------------------+
```

### プリセット付きプロンプト編集ダイアログ

```
+------------------------------------------+
| プロンプト編集                           |
+------------------------------------------+
| 名前: [顧客挨拶____________________]     |
|                                          |
| 内容:                                    |
| [________________________________]       |
| [  こんにちは{{role}}さん、      ]       |
| [  サービスへようこそ。          ]       |
| [________________________________]       |
|                                          |
| --- 変数設定 ---                         |
|                                          |
| 変数: role                               |
|   型: [プリセット ▼]                     |
|   プリセット: [役割 ▼]                   |
|   プレビュー: 辞書型（2項目）            |
|                                          |
| [キャンセル]                   [保存]    |
+------------------------------------------+
```

### 辞書型の変数入力ダイアログ

```
+------------------------------------------+
| 変数入力                                 |
+------------------------------------------+
| role: (プリセット: 役割)                 |
| [顧客 ▼]                                 |
|   - 顧客                                 |
|   - 上司                                 |
|                                          |
| プレビュー:                              |
| +--------------------------------------+ |
| | あなたは初めて製品を評価する顧客とし | |
| | て振る舞います。好奇心旺盛だが懐疑的 | |
| | な態度で...                          | |
| +--------------------------------------+ |
|                                          |
| [キャンセル]                   [実行]    |
+------------------------------------------+
```

### プリセット付き入力補完

```
+------------------------------------------+
| 入力フィールド: "role"                   |
|                    |                     |
|                    +-------------------+ |
|                    | === プロンプト === | |
|                    | 📄 Role Assignment| |
|                    | 📌 Role Play      | |
|                    |                   | |
|                    | === プリセット === | |
|                    | 🏷️  役割          | |
|                    | 🏷️  ロールリスト  | |
|                    +-------------------+ |
+------------------------------------------+

"role." と入力後（ドット記法）:

+------------------------------------------+
| 入力フィールド: "role."                  |
|                     |                    |
|                     +------------------+ |
|                     | === 役割 ===     | |
|                     | • 顧客           | |
|                     | • 上司           | |
|                     +------------------+ |
+------------------------------------------+
```

## データ整合性

### プリセット削除

プリセットの削除ボタンを押下した場合:

1. **参照の検索**: `findPromptsByPresetId(id)` で参照しているプロンプトを検索
2. **確認ダイアログの表示**:
   - 参照なし: 「このプリセットを削除しますか？」
   - 参照あり: 「このプリセットは N 個のプロンプトで使用されています。削除すると、それらの変数は text 型に変換されます。」+ 影響を受けるプロンプトのリスト
3. **ユーザーオプション**:
   - **キャンセル**: 削除を中止
   - **削除して変換**: プリセットを削除し、参照している変数をデフォルト変数型（text）に変換

### プリセット更新

プリセットを更新する場合:

- プリセットを使用しているすべてのプロンプトに自動的に変更が反映される
- マイグレーション不要（参照ベース）

### インポート/エクスポート

#### 変数プリセットのインポート/エクスポート

- **個別エクスポート**: 変数プリセットを個別にエクスポートする機能を提供
  - JSON形式でエクスポート
  - 複数のプリセットを一括エクスポート可能
- **個別インポート**: 変数プリセットを個別にインポートする機能を提供
  - 同じIDを持つ既存のプリセットをチェック
  - マージまたは置換のオプションを提供

#### プロンプトのインポート時の処理

プリセット参照付きプロンプトをインポートする場合:

1. **参照チェック**: インポートされたプロンプトが参照しているプリセットが存在するかチェック
2. **存在しない場合**:
   - 警告ダイアログを表示
   - 参照している変数を `text` 型へ自動変換（fallback）
   - 変換された旨をユーザーに通知

## 国際化対応

### 新規翻訳キー

**変数プリセット編集**:

- `variablePresets.title`
- `variablePresets.addVariable`
- `variablePresets.duplicate`
- `variablePresets.delete`
- `variablePresets.name`
- `variablePresets.type`
- `variablePresets.description`
- `variablePresets.textContent`
- `variablePresets.selectOptions`
- `variablePresets.dictionaryItems`
- `variablePresets.addItem`
- `variablePresets.itemName`
- `variablePresets.itemContent`

**変数型**:

- `variableType.text` (変数プリセットの文字列型として表示)
- `variableType.select`
- `variableType.dictionary`
- `variableType.preset`

**削除確認ダイアログ**:

- `variablePresets.deleteConfirm.title`
- `variablePresets.deleteConfirm.message`
- `variablePresets.deleteConfirm.affectedPrompts`
- `variablePresets.deleteConfirm.cancel`

**インポート警告**:

- `variablePresets.importWarning.title`
- `variablePresets.importWarning.missingPresets`
- `variablePresets.importWarning.convertedToText`

**入力補完**:

- `autoComplete.section.prompts`
- `autoComplete.section.presets`

## テスト設計

### ユニットテスト

#### 1. variablePresetStorage.test.ts

**ストレージ操作**:

- すべてのプリセットを取得（空、データあり）
- プリセットを保存（作成、更新）
- プリセットを削除
- プリセットを複製
- プリセットIDでプロンプトを検索

#### 2. presetMatcher.test.ts

**マッチングロジック**:

- 名前でプリセットをマッチング（大文字小文字を区別しない）
- ドット記法でプリセット項目をマッチング
- ドット記法の解析（有効、無効）
- 特殊文字の処理
- 最大マッチ数制限

#### 3. VariablePresetDialog.test.tsx

**ダイアログ機能**:

- プリセットリスト付きダイアログのレンダリング
- 新規プリセット追加
- プリセット選択と編集
- 自動保存動作
- プリセット複製
- プリセット削除（参照なし、参照ありの両ケース）
- 削除確認ダイアログの表示と選択肢（キャンセル、削除して変換）

#### 4. VariablePresetEditor.test.tsx

**編集パネル**:

- 異なるプリセット型（文字列型、選択肢型、辞書型）でのレンダリング
- 型切り替え時の入力フィールドの動的表示
  - 文字列型: テキストコンテンツ入力欄
  - 選択肢型: 選択肢入力欄（カンマ区切り）
  - 辞書型: 項目リスト（項目名、項目内容）
- フィールド編集と自動保存のトリガー
- 辞書項目の追加/削除
- バリデーション（必須項目チェック）

#### 5. EditDialog.test.tsx（拡張）

**プリセット統合**:

- 変数にプリセット型を選択
- ドロップダウンからプリセットを選択
- プリセットプレビューの表示
- プリセット参照付きで保存

#### 6. VariableInputDialog.test.tsx（拡張）

**辞書型サポート**:

- プリセット参照の解決
- 辞書項目の表示
- 項目プレビューの表示
- 孤児参照の処理

#### 7. AutoCompleteManager.test.ts（拡張）

**プリセット入力補完**:

- プリセットとプロンプトのマッチング
- ドット記法の検出
- プリセット項目のマッチング
- 種類別の結果グループ化

### E2E テスト

**フルワークフロー**:

1. 変数プリセット作成（辞書型）
2. プリセット参照付きプロンプト作成
3. プロンプト実行と変数入力
4. ドット記法での入力補完
5. プリセット付きエクスポート/インポート
6. 参照付きプリセット削除

## 実装フェーズ

### フェーズ1: コアデータ & ストレージ

- 型定義（`VariablePreset` など）
- ストレージサービス（`variablePresetStorage.ts`）
- ストレージのユニットテスト

### フェーズ2: 変数プリセット編集

- `VariablePresetDialog` コンポーネント
- `VariablePresetList` コンポーネント
- `VariablePresetEditor` コンポーネント
- 設定メニュー統合
- コンポーネントのユニットテスト

### フェーズ3: プロンプト統合

- プリセット参照による `VariableConfig` の拡張
- プリセット選択用の `EditDialog` 更新
- 辞書型用の `VariableInputDialog` 更新
- 孤児参照の処理
- ユニットテスト

### フェーズ4: 入力補完統合

- `AutoCompleteMatch` 型の拡張
- `presetMatcher.ts` の実装
- `AutoCompleteManager` の更新
- ドット記法サポート
- プリセットマッチのUI区別
- ユニットテスト

### フェーズ5: インポート/エクスポート & 仕上げ

- プリセット付きエクスポート/インポート
- i18n サポート
- E2E テスト
- ドキュメント更新

## 備考

### 後方互換性

- プリセット参照を使用しない既存のプロンプトは引き続き動作
- 新しい "preset" 型は `VariableType` に追加的に追加される
- "dictionary" 型は `VariableType` には追加されず、プリセット内でのみ使用される
- ストレージ形式は後方互換性あり
- 既存の変数設定（text, select, exclude）はそのまま動作

### パフォーマンス考慮事項

- プリセット解決は実行時にキャッシュ
- 入力補完マッチングは同じdebounce戦略を使用
- プリセットリストは一度ロードされ、メモリにキャッシュ

### 将来の拡張

- プリセットの共有/URLからのインポート
- プリセットテンプレートギャラリー
- プリセットバージョニング
- 多言語プリセットコンテンツ
- プリセット使用状況分析

## 実装TODO

### ✅ フェーズ1: コアデータ & ストレージ（完了）

- [x] 型定義の追加（`src/types/prompt.ts`）
  - [x] `PresetVariableType` 型の定義
  - [x] `DictionaryItem` インターフェース
  - [x] `VariablePreset` インターフェース
  - [x] `StoredVariablePreset` インターフェース
  - [x] `VariableConfig` の拡張（`presetId` フィールド追加）
  - [x] `StorageData` の拡張（`variablePresets` フィールド追加）
- [x] ストレージ定義の追加（`src/services/storage/definitions.ts`）
  - [x] `variablePresetsStorage` の定義
- [x] ストレージサービスの実装（`src/services/storage/variablePresetStorage.ts`）
  - [x] `getVariablePresets()` - すべてのプリセット取得
  - [x] `saveVariablePreset()` - プリセット保存（作成・更新）
  - [x] `deleteVariablePreset()` - プリセット削除
  - [x] `duplicateVariablePreset()` - プリセット複製
  - [x] `findPromptsByPresetId()` - プリセット使用プロンプト検索
  - [x] `exportVariablePresets()` - JSON形式エクスポート
  - [x] `importVariablePresets()` - JSON形式インポート
  - [x] 日付変換ヘルパー関数
- [x] ユニットテストの作成（`src/services/storage/__tests__/variablePresetStorage.test.ts`）
  - [x] 全21テストケースの実装と検証

### ✅ フェーズ2: 変数プリセット編集UI（完了）

#### コンポーネント実装

- [x] ディレクトリ作成: `src/components/settings/variablePresets/`
- [x] `VariablePresetEditor.tsx` の実装
  - [x] プリセットプロパティ編集フォーム
  - [x] 型に応じた動的フィールド表示
    - [x] 文字列型（text）: `textContent` 入力欄
    - [x] 選択肢型（select）: `selectOptions` 入力欄（カンマ区切り）
    - [x] 辞書型（dictionary）: `dictionaryItems` リスト編集
  - [x] 複製・削除ボタン
  - [x] onChange による自動保存機能
  - [x] 辞書項目の追加・削除機能
- [x] `VariablePresetList.tsx` の実装
  - [x] プリセット一覧表示（名前、型、用途）
  - [x] 「変数追加」ボタン
  - [x] クリックによる編集選択
  - [x] 選択中プリセットの視覚的表示
- [x] `VariablePresetDialog.tsx` の実装
  - [x] 2カラムレイアウト（一覧 + 編集パネル）
  - [x] ダイアログ開閉制御
  - [x] プリセット一覧とエディターの連携
  - [x] 孤児参照検出と確認ダイアログ（window.confirm使用）
    - [x] 削除時の影響を受けるプロンプトリスト表示
    - [x] 削除実行前の確認ダイアログ表示

#### 設定メニュー統合

- [x] 設定メニューに「変数プリセット」項目を追加
- [x] `VariablePresetDialog` の起動処理

#### i18n対応

- [x] `src/locales/en.yml` に翻訳キー追加
  - [x] `variablePresets.*` キー群
  - [x] `variableType.preset`, `variableType.dictionary` など
- [x] `src/locales/ja.yml` に翻訳キー追加

#### テスト

- [ ] `VariablePresetEditor.test.tsx`（後回し）
  - [ ] 型別のレンダリング
  - [ ] 型切り替え時のフィールド表示
  - [ ] 自動保存トリガー
  - [ ] バリデーション
- [ ] `VariablePresetList.test.tsx`（後回し）
  - [ ] プリセット一覧表示
  - [ ] 追加ボタン動作
  - [ ] 選択動作
- [ ] `VariablePresetDialog.test.tsx`（後回し）
  - [ ] ダイアログレンダリング
  - [ ] 新規追加フロー
  - [ ] 編集フロー
  - [ ] 複製フロー
  - [ ] 削除フロー（参照なし/あり）
  - [ ] 削除確認ダイアログ

### ✅ フェーズ3: プロンプト統合（完了）

#### コンポーネント拡張

- [x] `EditDialog.tsx` の拡張
  - [x] 変数型セレクタに "preset" オプション追加
  - [x] 型が "preset" の場合、プリセットドロップダウン表示
  - [x] プリセット詳細プレビュー表示
  - [x] `VariableConfigField` コンポーネント更新
  - [x] `variableEquals` 関数に `presetId` 比較追加
- [x] `VariableInputDialog.tsx` の拡張
  - [x] プリセット参照の解決処理
  - [x] 辞書型プリセットの場合
    - [x] 項目名ドロップダウン表示
    - [x] 項目内容プレビュー表示
  - [x] 孤児参照（プリセット未発見）の処理

#### データ処理

- [x] プリセット参照による変数解決ロジック
  - [x] 各プリセット型（text, select, dictionary）の初期値設定
  - [x] 辞書型の項目選択時に内容を値として設定
- [x] プリセット削除時の変数変換処理
  - [x] 影響を受けるプロンプトの検出
  - [x] `type: "preset"` → `type: "text"` への変換
  - [x] `deleteVariablePreset` 関数の実装

#### テスト

- [ ] `EditDialog.test.tsx`（拡張）（後回し）
  - [ ] プリセット型選択
  - [ ] プリセットドロップダウン表示
  - [ ] プレビュー表示
  - [ ] 保存時の `presetId` 設定
- [ ] `VariableInputDialog.test.tsx`（拡張）（後回し）
  - [ ] プリセット参照解決
  - [ ] 辞書型項目表示
  - [ ] プレビュー表示
  - [ ] 孤児参照処理

### ✅ フェーズ4: 入力補完統合（完了）

#### 型定義拡張

- [x] `src/services/autoComplete/types.ts` の拡張
  - [x] `AutoCompleteMatchType` 型の定義
  - [x] `AutoCompleteMatch` インターフェースの拡張
    - [x] `matchType` フィールド
    - [x] `presetType` フィールド
    - [x] `parentPresetId` フィールド

#### マッチャー実装

- [x] `src/services/autoComplete/presetMatcher.ts` の実装
  - [x] `matchPresets()` - プリセット名マッチング
  - [x] `matchPresetItems()` - ドット記法による項目マッチング
  - [x] `parseDotNotation()` - ドット記法解析

#### AutoCompleteManager拡張

- [x] `src/services/autoComplete/autoCompleteManager.ts` の拡張
  - [x] `setPresets()` メソッド追加
  - [x] `findMatches()` にプリセットマッチ統合
  - [x] ドット記法検出サポート
  - [x] 結果のグループ化（プロンプト / プリセット）

#### UI拡張

- [x] 入力補完UI でのプリセット区別表示
  - [x] プリセット用アイコン ("P" バッジ)
  - [x] セクションヘッダー（「プロンプト」 / 「変数プリセット」）※UI実装済み（視覚的区別のみ実装）
- [x] ドット記法入力時のプリセット項目表示

#### テスト

- [ ] `presetMatcher.test.ts`（後回し）
  - [ ] プリセット名マッチング
  - [ ] ドット記法マッチング
  - [ ] ドット記法解析
  - [ ] 最大マッチ数制限
- [ ] `AutoCompleteManager.test.ts`（拡張）（後回し）
  - [ ] プリセットとプロンプトの統合マッチング
  - [ ] ドット記法検出
  - [ ] グループ化動作

### ✅ フェーズ5: インポート/エクスポート & 仕上げ（完了）

#### インポート/エクスポート機能

- [x] 変数プリセットのエクスポート機能
  - [x] UI実装（エクスポートボタンをダイアログヘッダーに追加）
  - [x] JSON形式でのファイル出力（全プリセットをエクスポート）
- [x] 変数プリセットのインポート機能
  - [x] UI実装（インポートボタンとファイル選択）
  - [x] マージ / 置換モード選択（confirm ダイアログで選択）
  - [x] 重複ID処理（マージモードでは既存を保持、置換モードでは上書き）
- [x] プロンプトインポート時のプリセット参照チェック
  - [x] 存在しないプリセット参照の検出（parseCSV 内で実装）
  - [x] 警告ダイアログ表示（ImportDialog に警告表示を追加）
  - [x] text型へのフォールバック変換（presetId が見つからない場合に自動変換）

#### i18n完成

- [x] すべての翻訳キーの追加・確認
  - [x] インポート/エクスポート関連（en.yml, ja.yml に追加）
  - [x] 警告メッセージ（variablePresets.importWarning）
  - [x] エラーメッセージ（exportDialog.error, importDialog.error）

#### E2Eテスト

- [ ] `e2e/tests/variablePresets.spec.ts` の作成（後回し）
  - [ ] 変数プリセット作成フロー（辞書型）
  - [ ] プリセット参照付きプロンプト作成
  - [ ] プロンプト実行と変数入力
  - [ ] ドット記法での入力補完
  - [ ] エクスポート/インポート
  - [ ] 参照付きプリセット削除

#### ドキュメント

- [x] README 更新
  - [x] 変数プリセット機能の説明追加（Features セクションに追加）
- [x] ユーザーガイド作成（README の Features セクションで対応）

### 実装順序の推奨

1. **フェーズ2** から開始（UI構築）
   - ユーザーが実際にプリセットを作成・編集できるようになる
2. **フェーズ3** でプロンプトとの連携
   - プリセットを実際に使用できるようになる
3. **フェーズ4** で入力補完機能
   - UX向上
4. **フェーズ5** で完成
   - データの移行・共有機能
