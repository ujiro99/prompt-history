# 変数プリセットAI生成機能 設計書

## 概要

変数プリセットAI生成機能は、Gemini APIを活用して、ユーザーが入力した変数名・用途・変数型とプロンプト履歴から、再利用可能な変数プリセットの内容をAIに自動生成させる機能です。ユーザーは「AIに考えてもらう」ボタンを押すだけで、変数の内容候補をAIから提案され、それをベースに編集・保存できます。

### 背景と目的

変数プリセット機能では、ユーザーが文字列型・選択肢型・辞書型の変数を手動で定義する必要があります。特に選択肢型や辞書型では、適切な選択肢や項目を考える作業が負担になる場合があります。AI生成機能により、ユーザーのプロンプト履歴から文脈を読み取り、変数の用途に合った内容を自動的に提案することで、変数プリセット作成の効率化と質の向上を図ります。

### Gemini APIを使用する理由

- **構造化出力のサポート**: Gemini APIは構造化出力（Structured Output）機能をサポートしており、JSONスキーマを指定することで、期待する形式のデータを安定的に取得できます。
- **API利用の容易性**: REST APIとして提供されており、フロントエンドから直接呼び出すことが可能です。

## 機能要件

### 1. AI生成のトリガー

#### 変数プリセット編集画面からの生成

**前提条件**:

- 変数名が入力されている
- 用途（description）が入力されている
- 変数型（text / select / dictionary）が選択されている

**トリガー**:

- 変数プリセット編集パネル（VariablePresetEditor）に「AIに考えてもらう」ボタンを配置
- ボタンを押下すると、AI生成ダイアログが起動

**入力データ**:

1. 変数名（`name`）
2. 変数の用途（`description`）
3. 変数型（`type`: text / select / dictionary）
4. プロンプト履歴（最新のN件、デフォルト: 200件）

#### 将来の拡張（プロンプト整理時の生成）

選択肢型・辞書型の変数プリセットについては、プロンプト整理機能からも生成可能にする想定です。プロンプト整理画面で「変数プリセットに追加の提案があれば作成してください」といったプロンプトを実行することで、複数のプリセット候補を一括生成します。

### 2. 生成物のパターン

#### 文字列型（text）

**生成内容**:

- 変数の用途に沿った、複数行の文字列コンテンツ
- ユーザーのプロンプト履歴から頻出するトーンやパターンを反映

**例**:

- 変数名: `background`
- 用途: プロジェクトの背景情報
- 生成内容: 「このプロジェクトは〇〇を目的として開始されました。主要なステークホルダーは…」

#### 選択肢型（select）

**生成内容**:

- 意味が重複せず、ユーザーが迷わず選べる粒度の選択肢リスト
- 最低3つ、最大10個程度の選択肢

**例**:

- 変数名: `tone`
- 用途: 文章のトーン
- 生成内容: `["フォーマル", "カジュアル", "親しみやすい", "ビジネスライク"]`

#### 辞書型（dictionary）

**生成内容**:

- 最低3つの項目（DictionaryItem）
- 各項目は以下を含む:
  - 項目名（`name`）: 選択肢として表示される名前
  - 項目内容（`content`）: 選択時に展開される複数行文字列

**例**:

- 変数名: `role`
- 用途: ユーザーの役割定義
- 生成内容:
  - 項目1: 名前=`顧客`, 内容=`あなたは初めて製品を評価する顧客として振る舞います。好奇心旺盛だが懐疑的な態度で…`
  - 項目2: 名前=`上司`, 内容=`あなたは経験豊富な上司として振る舞います。成果と効率を重視し…`
  - 項目3: 名前=`同僚`, 内容=`あなたは協力的な同僚として振る舞います。建設的なフィードバックを…`

### 3. UI/UX フロー

#### 「AIに考えてもらう」ボタン

**配置場所**:

- 変数プリセット編集パネル（VariablePresetEditor）内
- 変数型選択欄の下、またはコンテンツ入力欄の上部に配置
- ボタンラベル: 「AIに考えてもらう」

**活性化条件**:

- 変数名、用途、変数型がすべて入力・選択されている場合のみ、ボタンが有効化される
- いずれかが未入力の場合は、ボタンを無効化し、ツールチップで「変数名、用途、変数型を入力してください」と表示
- Gemini APIキーが未設定の場合もボタンを無効化し、ツールチップで「APIキーを設定してください」と表示

#### AI生成ダイアログ

**ダイアログの構成**:

1. **初期状態（確認画面）**:
   - タイトル: 「AIに変数を生成してもらいます」
   - 説明文: 「以下の情報とこれまでのプロンプト履歴から、変数の内容をAIに考えてもらいます。スタートを押してください。
     - 変数名: {変数名}
     - 用途: {用途}
     - 変数型: {変数型}
       」
   - ボタン: 「スタート」「キャンセル」

2. **生成中（ローディング画面）**:
   - タイトル: 「考え中…」
   - ローディングアニメーション（スピナー）
   - 説明文: 「AIが変数を生成しています。しばらくお待ちください。」
   - ボタン: 「キャンセル」（API実行を中断）

3. **生成完了（結果表示画面）**:
   - タイトル: 「変数を作成しました」
   - 説明文: 「AIが生成した内容は以下の通りです。必要に応じて編集してください。」
   - **AI解説セクション**:
     - 見出し: 「AIからの解説」
     - 内容: AIが生成した理由や意図の説明（Gemini APIから取得）
   - **生成内容プレビュー**:
     - 変数型に応じた内容のプレビュー表示
     - AI生成箇所には「AI生成」ラベルとグラデーションカラーのアウトラインを表示
   - ボタン: 「適用」「キャンセル」

4. **エラー画面**:
   - タイトル: 「生成に失敗しました」
   - 説明文: エラー内容の表示（API エラー、ネットワークエラーなど）
   - ボタン: 「再試行」「閉じる」

#### AI生成箇所の視覚的表示

**目的**: ユーザーが、どの部分がAIによって生成されたのかを一目で判別できるようにする。

**デザイン要素**:

- **ラベル**: 入力フィールドの近くに「AI生成」というバッジまたはラベルを表示
- **アウトライン**: AI生成された入力フィールドに、グラデーションカラー（例: 青から紫へのグラデーション）のアウトラインを適用
- **アイコン**: AI生成を示すアイコン（例: スパークル✨またはAIのラベル）を表示

**適用箇所**:

- 文字列型: `textContent` フィールド
- 選択肢型: `selectOptions` フィールド
- 辞書型: 各 `DictionaryItem` の `name` および `content` フィールド

### 4. メタプロンプト管理

#### メタプロンプトとは

メタプロンプトは、Gemini APIに送信するプロンプトのテンプレートです。ユーザーの変数名・用途・プロンプト履歴などの情報を動的に埋め込むことで、変数内容を生成します。

#### メタプロンプトの構成

**デフォルトのメタプロンプト**:

以下のプロンプトをデフォルトとして使用します:

```
# Role
あなたはプロンプト変数設計アシスタントです。

# Task
ユーザーの要求を表すInputを基に、再利用可能なプロンプト変数を設計してください。

# Instruction Steps(CoT)
1. **目的理解:** 変数名と用途から、ユーザーが制御・再利用したい要素を特定。
2. **履歴分析:** プロンプト履歴を参照し、ユーザーの要求に沿った頻出テーマやトーン、パターンを抽出。
3. **設計方針策定:** ユーザーの要求と、抽出する変数により便利になる場面を言語化、要約。
4. **型別設計:** 変数型に応じた形式で候補を生成。
    - 文字列型: 文脈に即したパターンを表す複数行文字列。
    - 選択肢型: 意味が重複せず、ユーザが迷わず選べる粒度の選択肢。
    - 辞書型: 最低3つの定義名(key)と、それぞれのパターンを表す複数行文字列(value)。
5. **品質チェック:** 候補の一貫性・実用性を評価し、最終構成を選定。

# Input
1. 変数名: {{variable_name}}
2. 変数の用途: {{variable_purpose}}
3. プロンプト履歴: {{prompt_history}}
4. 変数の型: {{variable_type}}
   - 文字列型: プロンプトに直接埋め込まれる複数行文字列。
   - 選択肢型: 入力時にユーザーが選択できる複数候補。
   - 辞書型: key-value 構造で、key は選択肢・value は複数行文字列。
```

**変数置換**:

- `{{variable_name}}`: 変数名
- `{{variable_purpose}}`: 変数の用途
- `{{prompt_history}}`: プロンプト履歴（最新N件を結合したテキスト）
- `{{variable_type}}`: 変数の型（文字列型 / 選択肢型 / 辞書型）

#### カスタマイズ可能なメタプロンプト

**目的**: 上級ユーザーが独自のメタプロンプトを定義できるようにする。

**設定方法**:

- 設定画面に「変数生成設定」セクションを追加
- デフォルトプロンプトと、カスタムプロンプトの切り替え機能を提供
- カスタムプロンプトを編集できるテキストエリアを配置
  - Inputセクションは、プロンプト末尾に自動的に追加されることを明示する
- プロンプト履歴の件数設定も可能(例: 50件、100件、200件、500件、無制限)

**データ保存**:

- ストレージに `variableGenerationSettings` キーで保存
- デフォルト値として上記のプロンプトテンプレートと履歴件数200件を設定
- ユーザーがカスタマイズした場合は、その内容を保存

## アーキテクチャ

### Gemini API統合

#### 既存のクライアントを使用

**使用するクライアント**:

- 既存の `GeminiClient` クラス（`src/services/genai/GeminiClient.ts`）を使用
- `generateStructuredContentStream` メソッドで構造化出力を取得
- モデル: `gemini-2.5-flash`（デフォルト設定）

**認証**:

- APIキーは既存の `genaiApiKey` を使用（`useAiModel` フック経由でアクセス）
- APIキーは拡張機能のストレージに既に保存されている

#### 構造化出力のスキーマ定義

**文字列型（text）のスキーマ**:

```json
{
  "type": "object",
  "properties": {
    "textContent": {
      "type": "string",
      "description": "生成されたテキストコンテンツ"
    },
    "explanation": {
      "type": "string",
      "description": "生成内容の解説",
      "maxLength": 100
    }
  },
  "required": ["textContent", "explanation"]
}
```

**選択肢型（select）のスキーマ**:

```json
{
  "type": "object",
  "properties": {
    "selectOptions": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "生成された選択肢のリスト",
      "minItems": 3,
      "maxItems": 10
    },
    "explanation": {
      "type": "string",
      "description": "生成内容の解説",
      "maxLength": 100
    }
  },
  "required": ["selectOptions", "explanation"]
}
```

**辞書型（dictionary）のスキーマ**:

```json
{
  "type": "object",
  "properties": {
    "dictionaryItems": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "項目名"
          },
          "content": {
            "type": "string",
            "description": "項目の内容（複数行文字列）"
          }
        },
        "required": ["name", "content"]
      },
      "description": "生成された辞書項目のリスト",
      "minItems": 3
    },
    "explanation": {
      "type": "string",
      "description": "生成内容の解説",
      "maxLength": 100
    }
  },
  "required": ["dictionaryItems", "explanation"]
}
```

### データフロー

#### AI生成のフロー

1. **ユーザー操作**: 「AIに考えてもらう」ボタンを押下
2. **入力検証**: 変数名、用途、変数型が入力されているかチェック
3. **APIキー確認**: `useAiModel` フックから `genaiApiKey` を取得し、設定されているかチェック
4. **ダイアログ表示**: AI生成ダイアログを開く（確認画面）
5. **スタートボタン押下**: ローディング画面に遷移
6. **プロンプト履歴取得**: ストレージから最新N件のプロンプトを取得
7. **メタプロンプト生成**: テンプレートに変数を埋め込み、最終的なプロンプトを生成
8. **GeminiClient呼び出し**: `generateStructuredContentStream` メソッドで構造化出力を取得
   - AbortController を使用してキャンセル可能に
9. **ストリーミング受信**: ストリーミングでレスポンスを受信し、進捗を表示
10. **データ変換**: 完了時にレスポンスを変数プリセットの形式に変換
11. **結果表示**: 生成完了画面に遷移、結果をプレビュー表示
12. **適用**: ユーザーが「適用」ボタンを押すと、変数プリセットに反映

**キャンセル処理**:

- ローディング画面の「キャンセル」ボタンを押すと、AbortController を使用してAPI呼び出しを中断
- キャンセル後はダイアログを閉じる

#### エラーハンドリング

**想定されるエラー**:

- APIキー未設定エラー
- ネットワークエラー
- GeminiError（API エラー、レスポンス形式エラーなど）
- キャンセルエラー

**エラー処理**:

- エラーが発生した場合、エラー画面に遷移
- エラーメッセージをユーザーに分かりやすく表示
- 「再試行」ボタンでリトライ可能にする
- APIキー未設定の場合、設定画面へのリンクを表示

### ストレージ管理

#### 保存するデータ

**Gemini APIキー**:

- 既存の `genaiApiKey` を使用（`useAiModel` フック経由でアクセス）
- 新規保存は不要

**変数生成設定**:

- ストレージキー: `variableGenerationSettings`
- データ型: `VariableGenerationSettings`（後述）
- デフォルト値:
  - メタプロンプト: 上記のデフォルトメタプロンプト
  - プロンプト履歴件数: 200件
  - デフォルトプロンプト使用: true

**AI生成フラグ**:

- 変数プリセットのデータ構造に `isAiGenerated` フラグを追加
- 辞書型の場合、各 `DictionaryItem` にも `isAiGenerated` フラグを追加

## 外部仕様

### GeminiClient の使用

#### 使用メソッド

既存の `GeminiClient` クラスの `generateStructuredContentStream` メソッドを使用:

```typescript
public async generateStructuredContentStream<T = unknown>(
  prompt: string,
  schema: Record<string, unknown>,
  config?: Partial<GeminiConfig>,
  options?: {
    signal?: AbortSignal
    onProgress?: (
      chunk: string | null,
      accumulated: string,
      tokenUsage: Usage,
    ) => void
  },
): Promise<T>
```

**パラメータ**:

- `prompt`: メタプロンプト（変数置換済み）
- `schema`: 変数型に応じた構造化出力スキーマ
- `config`: オプション設定（デフォルトで `gemini-2.5-flash` を使用）
- `options`:
  - `signal`: キャンセル用の AbortSignal
  - `onProgress`: ストリーミング進捗コールバック

**レスポンス**:

- 型パラメータ `T` に従った構造化JSONオブジェクト
- エラー時は `GeminiError` をスロー

### 入力パラメータ

#### 変数名（variable_name）

- データ型: `string`
- 必須: はい
- 説明: プリセット変数の名前

#### 変数の用途（variable_purpose）

- データ型: `string`
- 必須: はい
- 説明: 変数の使用目的や説明

#### 変数型（variable_type）

- データ型: `"text" | "select" | "dictionary"`
- 必須: はい
- 説明: 生成する変数の型

#### プロンプト履歴（prompt_history）

- データ型: `string`（複数プロンプトを結合したテキスト）
- 必須: いいえ（履歴がない場合は空文字列）
- 説明: ユーザーの過去のプロンプト履歴（最新N件を結合）

### 出力形式

#### 文字列型（text）

```json
{
  "textContent": "生成されたテキストコンテンツ（複数行可）",
  "explanation": "この内容を生成した理由や意図の説明"
}
```

#### 選択肢型（select）

```json
{
  "selectOptions": ["選択肢1", "選択肢2", "選択肢3"],
  "explanation": "これらの選択肢を生成した理由や意図の説明"
}
```

#### 辞書型（dictionary）

```json
{
  "dictionaryItems": [
    {
      "name": "項目名1",
      "content": "項目内容1（複数行可）"
    },
    {
      "name": "項目名2",
      "content": "項目内容2（複数行可）"
    }
  ],
  "explanation": "これらの項目を生成した理由や意図の説明"
}
```

## 主要な型定義

### AI生成フラグの追加

#### VariablePreset の拡張

既存の `VariablePreset` インターフェースに以下のフィールドを追加:

- `isAiGenerated?: boolean` - この変数プリセット全体がAI生成されたかどうか
- `aiExplanation?: string` - AI生成時の解説（AIが生成理由を説明したテキスト）

#### DictionaryItem の拡張

既存の `DictionaryItem` インターフェースに以下のフィールドを追加:

- `isAiGenerated?: boolean` - この辞書項目がAI生成されたかどうか

### AI生成関連の新規型定義

#### AIGenerationRequest

AI生成リクエストのパラメータを表す型:

**プロパティ**:

- `variableName: string` - 変数名
- `variablePurpose: string` - 変数の用途
- `variableType: PresetVariableType` - 変数型（text / select / dictionary）
- `promptHistory: string` - プロンプト履歴（結合されたテキスト）
- `metaPrompt: string` - メタプロンプトテンプレート

#### AIGenerationResponse

AI生成レスポンスを表す型:

**共通プロパティ**:

- `explanation: string` - AI生成の解説

**変数型別プロパティ**:

- 文字列型の場合: `textContent: string`
- 選択肢型の場合: `selectOptions: string[]`
- 辞書型の場合: `dictionaryItems: { name: string; content: string }[]`

### 変数生成設定の型定義

#### VariableGenerationSettings

変数生成の設定を表す型:

**プロパティ**:

- `useDefault: boolean` - デフォルトプロンプトを使用するかどうか
- `customPrompt?: string` - カスタムプロンプトテンプレート（useDefault が false の場合）
- `promptHistoryCount: number` - 使用するプロンプト履歴の件数（デフォルト: 200）

### ストレージデータの拡張

#### StorageData の拡張

既存の `StorageData` インターフェースに以下のフィールドを追加:

- `variableGenerationSettings?: VariableGenerationSettings` - 変数生成設定

**注**: `genaiApiKey` は既に存在するため、追加不要

## テスト設計

### ユニットテスト

#### 1. メタプロンプト生成のテスト

**テストファイル**: `services/variableGeneration/__tests__/metaPromptGenerator.test.ts`

**テストケース**:

- デフォルトのメタプロンプトテンプレートが正しく読み込まれること
- 変数置換が正しく行われること（`{{variable_name}}` などが適切に置換される）
- カスタムプロンプトが設定されている場合、それが使用されること
- プロンプト履歴が空の場合でもエラーが発生しないこと

#### 2. 変数生成サービスのテスト

**テストファイル**: `services/variableGeneration/__tests__/variableGenerationService.test.ts`

**テストケース**:

- APIキーが設定されていない場合、エラーが発生すること
- 文字列型、選択肢型、辞書型それぞれのスキーマが正しく構築されること
- GeminiClient の `generateStructuredContentStream` が正しく呼び出されること
- ストリーミングレスポンスが正しくパースされること
- キャンセル処理が正しく動作すること（AbortController）
- GeminiError が適切にハンドリングされること

#### 3. データ変換のテスト

**テストファイル**: `services/variableGeneration/__tests__/responseConverter.test.ts`

**テストケース**:

- Gemini APIレスポンスから `VariablePreset` 形式への変換が正しく行われること
- `isAiGenerated` フラグが正しく設定されること
- 辞書型の場合、各 `DictionaryItem` に `isAiGenerated` フラグが設定されること
- `aiExplanation` が正しく設定されること
- レスポンス形式が不正な場合、エラーが発生すること

#### 4. AI生成ダイアログのテスト

**テストファイル**: `components/settings/variablePresets/__tests__/AIGenerationDialog.test.tsx`

**テストケース**:

- ダイアログが正しくレンダリングされること
- 確認画面、ローディング画面、結果表示画面、エラー画面が正しく表示されること
- 「スタート」ボタンを押すと、API呼び出しが行われること
- ローディング中はスピナーが表示されること
- ローディング中に「キャンセル」ボタンが表示されること
- 「キャンセル」ボタンを押すと、API呼び出しが中断されること
- 結果表示画面でAI解説が表示されること
- AI生成箇所に「AI生成」ラベルとグラデーションアウトラインが表示されること
- 「適用」ボタンを押すと、変数プリセットに反映されること
- エラー発生時、エラー画面が表示され、「再試行」ボタンが機能すること

#### 5. VariablePresetEditor の拡張テスト

**テストファイル**: `components/settings/variablePresets/__tests__/VariablePresetEditor.test.tsx`

**テストケース**:

- 「AIに考えてもらう」ボタンが正しく表示されること
- 変数名、用途、変数型が未入力の場合、ボタンが無効化されること
- すべて入力されている場合、ボタンが有効化されること
- APIキーが未設定の場合、ボタンが無効化されること
- ボタンを押すと、AI生成ダイアログが開くこと
- AI生成後、生成された内容がエディターに反映されること
- AI生成箇所に視覚的な区別が表示されること

### 統合テスト

#### 1. AI生成フルワークフローのテスト

**テストファイル**: `__tests__/integration/aiGeneration.test.ts`

**テストケース**:

- 変数プリセット編集画面を開く
- 変数名、用途、変数型を入力
- 「AIに考えてもらう」ボタンを押下
- AI生成ダイアログが開く
- 「スタート」ボタンを押下
- ローディング画面が表示される
- GeminiClient が呼び出される（モック）
- 結果表示画面が表示される
- 「適用」ボタンを押下
- 変数プリセットに反映される
- `isAiGenerated` フラグが設定される

#### 2. エラーハンドリングのテスト

**テストファイル**: `__tests__/integration/aiGenerationError.test.ts`

**テストケース**:

- APIキー未設定エラーが正しく処理されること
- ネットワークエラーが正しく処理されること
- GeminiError が正しく処理されること
- キャンセルエラーが正しく処理されること
- 「再試行」ボタンでリトライできること

### E2Eテスト

#### 1. AI生成機能のE2Eテスト

**テストファイル**: `e2e/tests/aiGeneration.spec.ts`

**テストケース**:

- 設定画面を開く
- Gemini APIキーを設定
- 変数プリセット編集画面を開く
- 新規変数プリセットを作成
- 変数名「role」、用途「ユーザーの役割定義」、変数型「辞書型」を入力
- 「AIに考えてもらう」ボタンを押下
- AI生成ダイアログで「スタート」を押下
- 生成完了を待つ
- 結果が表示されることを確認
- 「適用」ボタンを押下
- 変数プリセットに反映されることを確認
- AI生成箇所に「AI生成」ラベルが表示されることを確認
- プリセットを保存
- プロンプト編集画面で、生成したプリセットを使用できることを確認

#### 2. カスタムメタプロンプトのE2Eテスト

**テストファイル**: `e2e/tests/customMetaPrompt.spec.ts`

**テストケース**:

- 設定画面を開く
- 「変数生成設定」セクションを開く
- カスタムプロンプトを入力
- 保存
- 変数プリセット編集画面でAI生成を実行
- カスタムプロンプトが使用されることを確認（モック）

## 実装上の注意事項

### セキュリティ

**APIキーの取り扱い**:

- 既存の `genaiApiKey` を使用（`useAiModel` フック経由）
- APIキーは既に拡張機能のストレージに保存されている
- HTTPSを使用してAPIと通信
- 拡張機能のストレージは同じ拡張機能内でのみアクセス可能

**プロンプト履歴の取り扱い**:

- プロンプト履歴には機密情報が含まれる可能性があります
- ユーザーに、プロンプト履歴がAI生成に使用されることを明示します
- ユーザーの同意なしに外部に送信しないよう注意します

### パフォーマンス

**API呼び出しの最適化**:

- AbortController を使用してキャンセル可能に
- GeminiClient のデフォルト設定を使用（タイムアウト、エラーハンドリング）
- ストリーミングレスポンスで進捗を表示

**プロンプト履歴の件数制限**:

- デフォルトで最新200件のプロンプト履歴を使用
- ユーザーが設定画面で件数を変更可能（50件、100件、200件、500件、無制限）
- 履歴が多すぎる場合、トークン数が増加し、APIコストが上がる可能性があります

### ユーザビリティ

**ローディング時間の表示**:

- AI生成には数秒かかる場合があるため、ローディング画面で適切なフィードバックを提供します
- ストリーミングレスポンスにより、生成の進捗が分かるようにします

**エラーメッセージの分かりやすさ**:

- 技術的なエラーメッセージをそのまま表示せず、ユーザーにとって分かりやすい言葉に変換します
- 例: 「API_KEY_INVALID」→「APIキーが無効です。設定を確認してください。」

## 国際化対応

### 新規翻訳キー

**AI生成ボタン**:

- `variablePresets.aiGeneration.button` - 「AIに考えてもらう」

**AI生成ダイアログ**:

- `variablePresets.aiGeneration.dialog.title` - ダイアログタイトル
- `variablePresets.aiGeneration.dialog.description` - 説明文
- `variablePresets.aiGeneration.dialog.start` - 「スタート」ボタン
- `variablePresets.aiGeneration.dialog.loading` - 「考え中…」
- `variablePresets.aiGeneration.dialog.loadingDescription` - ローディング説明文
- `variablePresets.aiGeneration.dialog.success` - 「変数を作成しました」
- `variablePresets.aiGeneration.dialog.successDescription` - 成功時の説明文
- `variablePresets.aiGeneration.dialog.explanation` - 「AIからの解説」
- `variablePresets.aiGeneration.dialog.apply` - 「適用」ボタン
- `variablePresets.aiGeneration.dialog.retry` - 「再試行」ボタン

**AI生成ラベル**:

- `variablePresets.aiGeneration.label` - 「AI生成」

**エラーメッセージ**:

- `variablePresets.aiGeneration.error.apiKeyMissing` - 「Gemini APIキーが設定されていません」
- `variablePresets.aiGeneration.error.networkError` - 「ネットワークエラーが発生しました」
- `variablePresets.aiGeneration.error.apiError` - 「API呼び出しに失敗しました」
- `variablePresets.aiGeneration.error.invalidResponse` - 「不正なレスポンス形式です」
- `variablePresets.aiGeneration.error.cancelled` - 「生成がキャンセルされました」

**設定画面**:

- `settings.variableGeneration.title` - 「変数生成設定」
- `settings.variableGeneration.metaPrompt` - 「AI生成プロンプト設定」
- `settings.variableGeneration.useDefault` - 「デフォルトプロンプトを使用」
- `settings.variableGeneration.customPrompt` - 「カスタムプロンプト」
- `settings.variableGeneration.customPromptDescription` - 「カスタムプロンプトテンプレートを入力してください」
- `settings.variableGeneration.promptHistoryCount` - 「プロンプト履歴件数」
- `settings.variableGeneration.promptHistoryCountDescription` - 「変数生成に使用するプロンプト履歴の件数を選択してください」

## 将来の拡張

### プロンプト整理時のAI生成

プロンプト整理機能からも変数プリセットを一括生成できるようにします:

- プロンプト整理画面に「変数プリセット提案」ボタンを追加
- 複数のプロンプトから共通パターンを抽出し、複数のプリセット候補を生成
- ユーザーが選択して保存できるようにする

### 他のLLM APIのサポート

Gemini API以外のLLM APIもサポートできるようにします:

- OpenAI API（GPT-4など）
- Anthropic API（Claudeなど）
- 設定画面で使用するAPIを選択可能に

## 実装TODO

### フェーズ1: 変数生成サービス基盤

- [ ] 型定義の追加
  - [ ] `AIGenerationRequest`, `AIGenerationResponse`
  - [ ] `VariableGenerationSettings`
  - [ ] `VariablePreset`, `DictionaryItem` の拡張（`isAiGenerated`, `aiExplanation`）
- [ ] ストレージ定義の追加
  - [ ] `variableGenerationSettings`
- [ ] 変数生成サービスの実装
  - [ ] GeminiClient の統合
  - [ ] 構造化出力スキーマ定義
  - [ ] AbortController によるキャンセル処理
  - [ ] ストリーミングレスポンス処理
  - [ ] エラーハンドリング
- [ ] ユニットテスト
  - [ ] `variableGenerationService.test.ts`
  - [ ] `responseConverter.test.ts`

### フェーズ2: メタプロンプト管理

- [ ] メタプロンプトジェネレーターの実装
  - [ ] デフォルトプロンプトテンプレートの定義
  - [ ] 変数置換ロジック
  - [ ] カスタムプロンプト対応
- [ ] 設定画面の拡張
  - [ ] 変数生成設定セクションの追加
  - [ ] メタプロンプト編集UI
  - [ ] プロンプト履歴件数選択UI
- [ ] ユニットテスト
  - [ ] `metaPromptGenerator.test.ts`

### フェーズ3: AI変数生成UI

- [ ] AI変数生成ダイアログの実装
  - [ ] 確認画面、ローディング画面、結果表示画面、エラー画面
  - [ ] ローディング画面にキャンセルボタンを追加
  - [ ] AbortController によるキャンセル処理統合
  - [ ] AI解説セクション
  - [ ] 生成内容プレビュー
  - [ ] 「AI生成」ラベルとグラデーションアウトライン
- [ ] VariablePresetEditor の拡張
  - [ ] 「AIに考えてもらう」ボタンの追加
  - [ ] ボタンの活性化条件チェック（APIキー設定確認を含む）
  - [ ] AI生成ダイアログの起動
  - [ ] `useAiModel` フックの使用
- [ ] i18n対応
  - [ ] 翻訳キーの追加（en.yml, ja.yml）
- [ ] ユニットテスト
  - [ ] `AIGenerationDialog.test.tsx`
  - [ ] `VariablePresetEditor.test.tsx`（拡張）

### フェーズ4: 統合とテスト

- [ ] 統合テスト
  - [ ] `aiGeneration.test.ts`
  - [ ] `aiGenerationError.test.ts`
- [ ] E2Eテスト
  - [ ] `aiGeneration.spec.ts`
  - [ ] `customMetaPrompt.spec.ts`
- [ ] ドキュメント更新
  - [ ] README にAI生成機能の説明を追加
  - [ ] ユーザーガイドの作成

### フェーズ5: 将来の拡張（オプション）

- [ ] プロンプト整理時のAI生成
- [ ] 他のLLM APIサポート
- [ ] AI生成履歴管理
- [ ] プリセットテンプレートギャラリー

## 備考

### 実装の優先順位

フェーズ1〜3を優先的に実装し、基本的なAI生成機能を完成させます。フェーズ4で品質を担保し、フェーズ5は将来的な拡張として段階的に実装します。

### ユーザーフィードバック

初期リリース後、ユーザーからのフィードバックを収集し、メタプロンプトの改善や新機能の追加を検討します。
