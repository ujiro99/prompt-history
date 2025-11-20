# Gemini API 統合設計

## 概要

Gemini API を使用してプロンプトの自動整理を行うための API 設計。構造化出力機能を活用し、安定的で予測可能なレスポンスを得る。

**実装方針**: 既存の `GeminiClient` クラス（`src/services/genai/GeminiClient.ts`）を拡張し、`generateStructuredContent()` メソッドを追加することで構造化出力に対応する。直接 Fetch API を使用せず、既存のクライアントを活用する。

**関連ドキュメント**:

- **02_architecture.md**: アーキテクチャ設計とサービス層設計
- **03_data_model.md**: データ構造、型定義、プロンプト定義（SYSTEM_INSTRUCTION 等）

---

## 1. 使用する Gemini モデル

### 1.1 推奨モデル

**Gemini 2.5 Flash**

- **コンテキスト長**: 最大 1,000,000 トークン
- **料金** (2025年1月時点):
  - 標準モード:
    - 入力: $0.30 / 100万トークン（テキスト/画像/動画）
    - 出力: $2.50 / 100万トークン
  - バッチモード（50%割引）:
    - 入力: $0.15 / 100万トークン（テキスト/画像/動画）
    - 出力: $1.25 / 100万トークン
  - **価格詳細**: https://ai.google.dev/gemini-api/docs/pricing?hl=ja#gemini-2.5-flash
- **特徴**:
  - 高速レスポンス
  - 構造化出力に対応
  - 高い推論能力

### 1.2 想定トークン数

**入力トークン数の見積もり**:

```
システムインストラクション (固定): 200 tokens
整理用プロンプト: 300 tokens
既存カテゴリリスト: 200 tokens
対象プロンプト (100件):
  - 1件あたり平均: 150 tokens
  - 合計: 15,000 tokens

総入力トークン: 約 15,700 tokens
```

**出力トークン数の見積もり**:

```
テンプレート (3件):
  - 1件あたり平均: 500 tokens
  - 合計: 1,500 tokens

総出力トークン: 約 1,500 tokens
```

**概算コスト（標準モード）**:

```
入力: 15,700 tokens × $0.30 / 100万 = $0.00471 ≈ ¥0.71 (為替150円)
出力:  1,500 tokens × $2.50 / 100万 = $0.00375 ≈ ¥0.56 (為替150円)
合計: ¥1.27 / 回
```

**参考: バッチモード（50%割引）**:

```
入力: 15,700 tokens × $0.15 / 100万 = $0.002355 ≈ ¥0.35 (為替150円)
出力:  1,500 tokens × $1.25 / 100万 = $0.001875 ≈ ¥0.28 (為替150円)
合計: ¥0.63 / 回
```

---

## 2. API エンドポイント

### 2.1 エンドポイント URL

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
```

### 2.2 認証

API キーをクエリパラメータで渡す：

```
?key={API_KEY}
```

API キーは `genaiApiKeyStorage` から取得：

```typescript
const apiKey = await genaiApiKeyStorage.getValue()
```

---

## 3. リクエスト形式

### 3.1 リクエストボディ

```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "{整理用プロンプト}\n\n# 既存カテゴリ\n{カテゴリJSON}\n\n# 対象プロンプト\n{プロンプトJSON}"
        }
      ]
    }
  ],
  "systemInstruction": {
    "parts": [
      {
        "text": "{固定のシステムインストラクション}"
      }
    ]
  },
  "generationConfig": {
    "responseMimeType": "application/json",
    "responseSchema": {
      "type": "object",
      "properties": {
        "templates": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "title": { "type": "string" },
              "content": { "type": "string" },
              "useCase": { "type": "string" },
              "categoryId": { "type": "string", "nullable": true },
              "newCategoryName": { "type": "string" },
              "newCategoryDescription": { "type": "string" },
              "variables": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "name": { "type": "string" },
                    "description": { "type": "string" }
                  },
                  "required": ["name"]
                }
              },
              "sourcePromptIds": {
                "type": "array",
                "items": { "type": "string" }
              }
            },
            "required": [
              "title",
              "content",
              "useCase",
              "variables",
              "sourcePromptIds"
            ]
          }
        }
      },
      "required": ["templates"]
    }
  }
}
```

### 3.2 リクエスト構築例

```typescript
/**
 * Gemini API用のプロンプトテキストを構築
 *
 * 注意: システムインストラクション（SYSTEM_INSTRUCTION）はここには含めず、
 * GeminiClient.generateStructuredContent()のconfigパラメータで別途渡します。
 *
 * @param request 組織化リクエスト
 * @returns プロンプトテキスト（organizationPrompt + カテゴリ + プロンプト）
 */
function buildPromptText(request: OrganizePromptsRequest): string {
  return `${request.organizationPrompt}

# 既存カテゴリ
以下のカテゴリから適切なものを選択してください。該当するカテゴリがない場合は新規カテゴリを提案してください。

${JSON.stringify(request.existingCategories, null, 2)}

# 対象プロンプト
以下のプロンプト履歴から、再利用可能なテンプレートを作成してください。

${JSON.stringify(request.prompts, null, 2)}
`
}
```

---

## 4. レスポンス形式

### 4.1 成功レスポンス

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "{構造化JSONテキスト}"
          }
        ],
        "role": "model"
      },
      "finishReason": "STOP",
      "index": 0
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 15700,
    "candidatesTokenCount": 1500,
    "totalTokenCount": 17200
  }
}
```

### 4.2 構造化JSON（text フィールドの内容）

```json
{
  "templates": [
    {
      "title": "取引先へ謝罪メールを作成",
      "content": "件名: {{subject}} のご報告とお詫び\n\n{{client_name}}様\n\n平素より大変お世話になっております。\nこの度は {{issue}} につきまして、多大なるご迷惑をおかけし誠に申し訳ございません。\n\n...",
      "useCase": "取引先へ謝罪のメールを作る",
      "categoryId": "abc-123-def",
      "newCategoryName": null,
      "newCategoryDescription": null,
      "variables": [
        {
          "name": "subject",
          "description": "報告対象の件名"
        },
        {
          "name": "client_name",
          "description": "取引先名"
        },
        {
          "name": "issue",
          "description": "発生した問題の詳細"
        }
      ],
      "sourcePromptIds": [
        "prompt-001",
        "prompt-015",
        "prompt-023",
        "prompt-042",
        "prompt-056",
        "prompt-078",
        "prompt-091"
      ]
    },
    {
      "title": "社内報告書を作成",
      "content": "{{report_type}} 報告書\n\n報告日: {{date}}\n報告者: {{reporter_name}}\n\n# 概要\n{{summary}}\n\n# 詳細\n{{details}}\n\n# 今後の対応\n{{next_steps}}",
      "useCase": "目標達成と顧客フィードバックを伝える社内報告書を作成",
      "categoryId": null,
      "newCategoryName": "プロジェクト管理",
      "newCategoryDescription": "プロジェクトの進捗や報告に関連するプロンプト",
      "variables": [
        {
          "name": "report_type",
          "description": "報告書の種類（週次、月次など）"
        },
        {
          "name": "date",
          "description": "報告日"
        },
        {
          "name": "reporter_name",
          "description": "報告者名"
        },
        {
          "name": "summary",
          "description": "報告の概要"
        },
        {
          "name": "details",
          "description": "報告の詳細内容"
        },
        {
          "name": "next_steps",
          "description": "今後の対応計画"
        }
      ],
      "sourcePromptIds": [
        "prompt-003",
        "prompt-012",
        "prompt-034",
        "prompt-045",
        "prompt-067",
        "prompt-089",
        "prompt-092",
        "prompt-095",
        "prompt-096",
        "prompt-097",
        "prompt-098",
        "prompt-099"
      ]
    }
  ]
}
```

---

## 5. 構造化出力スキーマ定義

### 5.1 TypeScript での定義

```typescript
/**
 * Gemini API レスポンススキーマ
 */
export const ORGANIZER_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    templates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "テンプレート名（20文字以内）",
          },
          content: {
            type: "string",
            description: "テンプレート本文（変数は {{variable_name}} 形式）",
          },
          useCase: {
            type: "string",
            description: "ユースケース（最大40文字、状況＋目的）",
          },
          categoryId: {
            type: "string",
            nullable: true,
            description: "既存カテゴリID（マッチする場合）",
          },
          newCategoryName: {
            type: "string",
            description: "新規カテゴリ名（既存カテゴリにマッチしない場合）",
          },
          newCategoryDescription: {
            type: "string",
            description: "新規カテゴリの説明",
          },
          variables: {
            type: "array",
            description: "抽出された変数の一覧",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "変数名（有効な変数名形式）",
                },
                description: {
                  type: "string",
                  description: "変数の説明",
                },
              },
              required: ["name"],
            },
          },
          sourcePromptIds: {
            type: "array",
            description: "参照元プロンプトのID一覧",
            items: { type: "string" },
          },
        },
        required: [
          "title",
          "content",
          "useCase",
          "variables",
          "sourcePromptIds",
        ],
      },
    },
  },
  required: ["templates"],
} as const
```

---

## 6. GeminiClient 実装詳細

### 6.1 構造化出力メソッド

既存の `GeminiClient` (`src/services/genai/GeminiClient.ts`) に以下のメソッドを追加：

```typescript
/**
 * Generate structured content from Gemini API with JSON schema
 * @param prompt - Input prompt
 * @param schema - JSON schema for structured output
 * @param config - Optional configuration overrides
 * @returns Structured response with usage metadata
 */
public async generateStructuredContent<T>(
  prompt: string,
  schema: object,
  config?: Partial<GeminiConfig>,
): Promise<{ data: T; usage: TokenUsage }> {
  if (!this.ai || !this.config) {
    throw new GeminiError(
      "Client not initialized. Call initialize() first.",
      GeminiErrorType.API_KEY_MISSING,
    )
  }

  const mergedConfig = {
    ...this.config,
    ...config,
  }

  try {
    const response = await this.ai.models.generateContent({
      model: mergedConfig.model,
      contents: [prompt],
      config: {
        systemInstruction: mergedConfig.systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        ...mergedConfig.generateContentConfig,
      },
    })

    // Parse structured JSON response
    const text = response.text
    const data = JSON.parse(text) as T

    // Extract token usage
    const usage: TokenUsage = {
      inputTokens: response.usageMetadata?.promptTokenCount || 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
    }

    return { data, usage }
  } catch (error) {
    // Reuse existing error handling logic
    if (error instanceof Error) {
      if (error.message.includes("network")) {
        throw new GeminiError(
          "Network error. Please check your connection.",
          GeminiErrorType.NETWORK_ERROR,
          error,
        )
      } else if (error.message.includes("API key")) {
        throw new GeminiError(
          "Invalid API key.",
          GeminiErrorType.API_KEY_MISSING,
          error,
        )
      } else {
        throw new GeminiError(
          `API error: ${error.message}`,
          GeminiErrorType.API_ERROR,
          error,
        )
      }
    }
    throw new GeminiError(
      "Unknown error occurred",
      GeminiErrorType.API_ERROR,
      error,
    )
  }
}
```

### 6.2 トークン見積もりメソッド

```typescript
/**
 * Estimate token count for a given prompt
 * @param prompt - Input prompt to estimate
 * @returns Estimated token count
 */
public async estimateTokens(prompt: string): Promise<number> {
  // Simple estimation: ~4 chars per token for Japanese, ~0.75 words for English
  // For more accurate estimation, consider using tiktoken or similar
  const chars = prompt.length
  const words = prompt.split(/\s+/).length

  // Conservative estimate (higher value)
  return Math.ceil(chars / 3.5)
}
```

### 6.3 型定義の追加

`src/services/genai/types.ts` に追加：

```typescript
/**
 * Token usage metadata
 */
export interface TokenUsage {
  inputTokens: number
  outputTokens: number
}
```

### 6.4 システムインストラクションとプロンプト

**SYSTEM_INSTRUCTION** と **DEFAULT_ORGANIZATION_PROMPT** の定義は `03_data_model.md` を参照。

これらは `src/services/promptOrganizer/defaultPrompts.ts` で定義され、以下のように使用：

```typescript
import { SYSTEM_INSTRUCTION } from "@/services/promptOrganizer/defaultPrompts"

// 使用例
const response = await geminiClient.generateStructuredContent<OrganizePromptsResponse>(
  buildPromptText(request), // organizationPrompt + カテゴリ + プロンプトのみ
  ORGANIZER_RESPONSE_SCHEMA,
  {
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION, // システムインストラクションは別途configで渡す
  },
)

const { data, usage } = response
```

---

## 7. トークン数の見積もり

### 7.1 見積もりロジック

```typescript
class TokenEstimator {
  /**
   * トークン数を見積もる
   * 1トークン ≈ 4文字（日本語の場合）
   * 1トークン ≈ 0.75単語（英語の場合）
   */
  estimate(request: OrganizePromptsRequest): number {
    const systemInstructionTokens = this.countTokens(SYSTEM_INSTRUCTION)
    const organizationPromptTokens = this.countTokens(
      request.organizationPrompt,
    )
    const categoriesTokens = this.countTokens(
      JSON.stringify(request.existingCategories),
    )

    let promptsTokens = 0
    for (const prompt of request.prompts) {
      promptsTokens += this.countTokens(JSON.stringify(prompt))
    }

    return (
      systemInstructionTokens +
      organizationPromptTokens +
      categoriesTokens +
      promptsTokens
    )
  }

  /**
   * 簡易的なトークン数カウント
   * より正確な見積もりが必要な場合は tiktoken などを使用
   */
  private countTokens(text: string): number {
    // 日本語と英語の混在を考慮した簡易計算
    const chars = text.length
    const words = text.split(/\s+/).length

    // 日本語が多い場合: 4文字 = 1トークン
    // 英語が多い場合: 0.75単語 = 1トークン
    // ここでは保守的に多めに見積もる
    return Math.ceil(chars / 3.5)
  }
}

export const tokenEstimator = new TokenEstimator()
```

### 7.2 コンテキスト使用率の計算

```typescript
const GEMINI_CONTEXT_LIMIT = 2_000_000 // 2M tokens

function calculateContextUsage(inputTokens: number): number {
  return inputTokens / GEMINI_CONTEXT_LIMIT
}
```

---

## 8. コスト計算

### 8.1 料金テーブル

```typescript
/**
 * Gemini 2.5 Flash の料金（2025年1月時点）
 * 参照: https://ai.google.dev/gemini-api/docs/pricing?hl=ja#gemini-2.5-flash
 */
const GEMINI_PRICING = {
  // 標準モード
  standard: {
    input: 0.3 / 1_000_000, // $0.30 per 1M tokens
    output: 2.5 / 1_000_000, // $2.50 per 1M tokens
  },
  // バッチモード（50%割引）
  batch: {
    input: 0.15 / 1_000_000, // $0.15 per 1M tokens
    output: 1.25 / 1_000_000, // $1.25 per 1M tokens
  },
  usd_to_jpy: 150, // 為替レート（定期的に更新が必要）
}

interface TokenUsage {
  inputTokens: number
  outputTokens: number
}

function calculateCost(
  usage: TokenUsage,
  mode: "standard" | "batch" = "standard",
): number {
  const pricing = GEMINI_PRICING[mode]

  // 入力コスト
  const inputCost = usage.inputTokens * pricing.input

  // 出力コスト
  const outputCost = usage.outputTokens * pricing.output

  // USD → JPY 変換
  const totalUsd = inputCost + outputCost
  return totalUsd * GEMINI_PRICING.usd_to_jpy
}
```

---

## 9. エラーハンドリング

### 9.1 エラータイプ

```typescript
export type GeminiErrorCode =
  | "API_ERROR" // API からのエラーレスポンス
  | "NETWORK_ERROR" // ネットワーク接続エラー
  | "QUOTA_EXCEEDED" // API クォータ超過
  | "INVALID_RESPONSE" // レスポンス形式不正
  | "INVALID_API_KEY" // API キー無効

export interface GeminiError {
  code: GeminiErrorCode
  message: string
  details?: any
}
```

**注意**: エラーハンドリングの詳細な実装は、セクション6.1の`generateStructuredContent()`メソッド内で行われます。既存の`GeminiClient`のエラー処理パターンを踏襲します。

---

## 10. レート制限対策

### 10.1 Gemini API のレート制限

**Gemini 2.5 Flash**:

レート制限の詳細は以下を参照：

- 公式レート制限ドキュメント: https://ai.google.dev/gemini-api/docs/rate-limits

一般的な制限:

- 無料プラン: RPM、TPM、RPD に制限あり
- 有料プラン: より高いレート制限

### 10.2 実装での対策

現時点では**手動実行のみ**のため、レート制限に引っかかる可能性は低い。

将来的に自動実行を実装する場合の対策：

- 指数バックオフによるリトライ
- リクエストキューイング
- ユーザーへのレート制限通知

---

## 11. セキュリティ考慮

### 11.1 API キーの保護

- API キーは `genaiApiKeyStorage` に保存
- Chrome Storage API により暗号化されない（注意が必要）
- ユーザーに API キーの取り扱いについて説明を提供

### 11.2 送信データの最小化

- プロンプトの `name` は送信しない（個人情報が含まれる可能性）
- `PromptForOrganization` 型で最小限のデータのみ送信
- ユーザーがプレビュー画面で内容を確認してから保存

---

## 12. テスト戦略

### 12.1 モックレスポンス

```typescript
export const MOCK_GEMINI_RESPONSE: OrganizePromptsResponse = {
  templates: [
    {
      title: "取引先へ謝罪メールを作成",
      content: "件名: {{subject}} のご報告とお詫び...",
      useCase: "取引先へ謝罪のメールを作る",
      categoryId: "abc-123",
      newCategoryName: null,
      newCategoryDescription: null,
      variables: [
        { name: "subject", description: "報告対象の件名" },
        { name: "client_name", description: "取引先名" },
      ],
      sourcePromptIds: ["prompt-001", "prompt-015"],
    },
  ],
  usage: {
    inputTokens: 15700,
    outputTokens: 1500,
  },
}
```

### 12.2 統合テスト

- 実際の Gemini API を呼び出すテスト（E2E）
- テスト用 API キーを環境変数で管理
- CI/CD では実行しない（手動実行のみ）

---

## 13. まとめ

Gemini API 統合のポイント：

1. **構造化出力**: 予測可能で安定したレスポンス
2. **コスト可視化**: ユーザーに事前にコストを提示
3. **エラーハンドリング**: 各種エラーに適切に対応
4. **セキュリティ**: 最小限のデータ送信、API キーの保護
5. **テスト容易性**: モックを活用した開発とテスト
