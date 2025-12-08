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

### 2.1 エンドポイント

`GeminiClient` クラスへ `generateStructuredContent()` メソッドを追加。
これにより構造化出力に対応する。

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

### 3.1 整理用プロンプトの構築例

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

### 6.2 トークン見積もりメソッド

```typescript
/**
 * Estimate token count for a given prompt
 * @param prompt - Input prompt to estimate
 * @returns Estimated token count
 */
public async estimateTokens(prompt: string): Promise<number> {
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

---

## 7. トークン数の見積もり

### 7.1 見積もりロジック

以下を使用する

https://ai.google.dev/gemini-api/docs/tokens?hl=ja&lang=python

例):

```javascript
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const prompt = "The quick brown fox jumps over the lazy dog."
const countTokensResponse = await ai.models.countTokens({
  model: "gemini-2.0-flash",
  contents: prompt,
})
console.log(countTokensResponse.totalTokens)
```

### 7.2 コンテキスト使用率の計算

Gemini 2.5 Flash の入力トークン上限: 1,048,576 tokens

参照:
https://console.cloud.google.com/vertex-ai/publishers/google/model-garden/gemini-2.5-flash

```typescript
const GEMINI_CONTEXT_LIMIT = 1048576 // 1M tokens

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

### 9.2 リトライロジック

```typescript
/**
 * リトライ設定
 */
const RETRY_CONFIG = {
  maxRetries: 3, // 最大リトライ回数
  baseDelay: 1000, // 初回待機時間（ミリ秒）
  maxDelay: 8000, // 最大待機時間（ミリ秒）
  retryableErrors: ["RATE_LIMIT", "NETWORK_ERROR"] as GeminiErrorCode[],
}

/**
 * 指数バックオフでリトライを実行
 *
 * @param fn 実行する関数
 * @param errorCode エラーコード（リトライ判定用）
 * @returns 関数の実行結果
 */
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  errorCode?: GeminiErrorCode,
): Promise<T> {
  let lastError: any

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // リトライ対象外のエラーはすぐに投げる
      if (errorCode && !RETRY_CONFIG.retryableErrors.includes(errorCode)) {
        throw error
      }

      // 最後の試行ならリトライせず投げる
      if (attempt === RETRY_CONFIG.maxRetries) {
        throw error
      }

      // 指数バックオフで待機
      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
        RETRY_CONFIG.maxDelay,
      )

      console.log(
        `Retrying after ${delay}ms (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries})`,
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}
```

### 9.3 タイムアウト仕様

```typescript
/**
 * APIタイムアウト設定（30秒）
 */
const API_TIMEOUT_MS = 30000

/**
 * タイムアウト付きでPromiseを実行
 *
 * @param promise 実行するPromise
 * @param timeoutMs タイムアウト時間（ミリ秒）
 * @returns Promiseの実行結果
 * @throws タイムアウト時はエラー
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = API_TIMEOUT_MS,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), timeoutMs),
    ),
  ])
}
```

### 9.4 部分的失敗の処理

```typescript
/**
 * 最小成功基準: 最低1つのテンプレートが必要
 */
const MIN_TEMPLATES_REQUIRED = 1

/**
 * レスポンス検証
 *
 * @param response Gemini APIからのレスポンス
 * @returns 検証結果と警告メッセージ
 */
function validateResponse(response: OrganizePromptsResponse): {
  isValid: boolean
  warnings: string[]
} {
  const warnings: string[] = []

  // テンプレート数チェック
  if (response.templates.length === 0) {
    return { isValid: false, warnings: ["No templates generated"] }
  }

  if (response.templates.length < MIN_TEMPLATES_REQUIRED) {
    warnings.push(`Only ${response.templates.length} template(s) generated`)
  }

  // 各テンプレートの検証
  response.templates.forEach((template, index) => {
    if (!template.title || template.title.length > 20) {
      warnings.push(`Template ${index + 1}: Invalid title length`)
    }
    if (!template.content) {
      warnings.push(`Template ${index + 1}: Empty content`)
    }
    if (!template.useCase || template.useCase.length > 40) {
      warnings.push(`Template ${index + 1}: Invalid use case length`)
    }
    if (!template.sourcePromptIds || template.sourcePromptIds.length === 0) {
      warnings.push(`Template ${index + 1}: No source prompts`)
    }
  })

  return {
    isValid: response.templates.length >= MIN_TEMPLATES_REQUIRED,
    warnings,
  }
}
```

### 9.5 ユーザー向けエラーガイダンス

```typescript
/**
 * エラーコード別のユーザーガイダンス（i18nキー）
 */
const ERROR_USER_GUIDANCE: Record<GeminiErrorCode, string> = {
  API_ERROR: "organizer.error.apiError",
  NETWORK_ERROR: "organizer.error.networkError",
  QUOTA_EXCEEDED: "organizer.error.quotaExceeded",
  INVALID_RESPONSE: "organizer.error.invalidResponse",
  INVALID_API_KEY: "organizer.error.invalidApiKey",
}

/**
 * クォータ超過時の詳細ガイダンス
 */
interface QuotaExceededGuidance {
  title: string
  message: string
  actions: Array<{
    label: string
    description: string
    link?: string
  }>
}

const QUOTA_EXCEEDED_GUIDANCE: QuotaExceededGuidance = {
  title: "organizer.error.quotaExceeded.title",
  message: "organizer.error.quotaExceeded.message",
  actions: [
    {
      label: "organizer.error.quotaExceeded.action.waitAndRetry",
      description: "organizer.error.quotaExceeded.action.waitAndRetryDesc",
    },
    {
      label: "organizer.error.quotaExceeded.action.checkQuota",
      description: "organizer.error.quotaExceeded.action.checkQuotaDesc",
      link: "https://aistudio.google.com/app/apikey",
    },
    {
      label: "organizer.error.quotaExceeded.action.reducePrompts",
      description: "organizer.error.quotaExceeded.action.reducePromptsDesc",
    },
  ],
}

/**
 * エラーにユーザーガイダンスを付加
 */
function enrichErrorWithGuidance(
  error: GeminiError,
): GeminiError & { userGuidance?: QuotaExceededGuidance } {
  if (error.code === "QUOTA_EXCEEDED") {
    return {
      ...error,
      userGuidance: QUOTA_EXCEEDED_GUIDANCE,
    }
  }

  return error
}
```

### 9.6 統合エラーハンドリング例

```typescript
/**
 * PromptOrganizerService内での統合例
 */
async function executeOrganization(
  settings: PromptOrganizerSettings,
): Promise<PromptOrganizerResult> {
  try {
    // タイムアウト付きでリトライ実行
    const response = await executeWithRetry(() =>
      withTimeout(
        callGeminiAPI(request),
        30000, // 30秒タイムアウト
      ),
    )

    // レスポンス検証
    const { isValid, warnings } = validateResponse(response)

    if (!isValid) {
      throw {
        code: "INVALID_RESPONSE",
        message: "Invalid response: no templates generated",
      } as GeminiError
    }

    // 警告がある場合はログ出力
    if (warnings.length > 0) {
      console.warn("Template generation warnings:", warnings)
    }

    return convertToResult(response)
  } catch (error) {
    // エラーにガイダンスを付加
    const enrichedError = enrichErrorWithGuidance(error as GeminiError)
    throw enrichedError
  }
}
```

**注意**: エラーハンドリングの詳細な実装は、セクション6.1の`generateStructuredContent()`メソッド内で行われます。既存の`GeminiClient`のエラー処理パターンを踏襲します。

### 9.7 入力検証の統合

**検証フローの全体像**:

```typescript
/**
 * テンプレート生成時の検証フロー
 */
async function generateTemplatesWithValidation(
  request: OrganizePromptsRequest,
): Promise<{ templates: TemplateCandidate[]; usage: TokenUsage }> {
  // 1. リクエストパラメータの事前検証
  validateOrganizationRequest(request)

  // 2. Gemini API 呼び出し
  const { data, usage } =
    await geminiClient.generateStructuredContent<OrganizePromptsResponse>(
      buildPromptText(request),
      ORGANIZER_RESPONSE_SCHEMA,
      {
        model: "gemini-2.5-flash",
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    )

  // 3. APIレスポンスの検証
  const responseValidation = validateGeminiResponse(data)
  if (!responseValidation.isValid) {
    throw {
      code: "INVALID_RESPONSE",
      message: "Invalid API response structure",
      details: responseValidation.errors,
    } as GeminiError
  }

  // 4. 各テンプレートの検証とサニタイゼーション
  const validatedTemplates: TemplateCandidate[] = []
  const validationErrors: string[] = []

  for (const [index, generated] of data.templates.entries()) {
    try {
      // 変数の検証
      for (const [varIndex, variable] of generated.variables.entries()) {
        const varErrors = validateVariable(variable, index, varIndex)
        if (varErrors.length > 0) {
          validationErrors.push(...varErrors)
          continue // このテンプレートはスキップ
        }
      }

      // テンプレート候補に変換
      const candidate = templateConverter.convertToCandidate(
        generated,
        request.periodDays,
      )

      // テンプレート候補の検証とサニタイゼーション
      const validation = await validateTemplateCandidate(candidate)
      if (validation.isValid) {
        validatedTemplates.push(candidate)
      } else {
        validationErrors.push(...validation.errors)
      }
    } catch (error) {
      console.error(`Template ${index + 1} validation failed:`, error)
      validationErrors.push(`Template ${index + 1}: ${error.message}`)
    }
  }

  // 5. 最小成功基準のチェック
  if (validatedTemplates.length < MIN_TEMPLATES_REQUIRED) {
    throw {
      code: "INVALID_RESPONSE",
      message: `Insufficient valid templates (got ${validatedTemplates.length}, required ${MIN_TEMPLATES_REQUIRED})`,
      details: {
        validTemplates: validatedTemplates.length,
        totalTemplates: data.templates.length,
        validationErrors,
      },
    } as GeminiError
  }

  // 6. 警告がある場合はログ出力
  if (validationErrors.length > 0) {
    console.warn("Template validation warnings:", validationErrors)
  }

  return {
    templates: validatedTemplates,
    usage,
  }
}
```

**リクエストパラメータの検証**:

```typescript
/**
 * 組織化リクエストの事前検証
 */
function validateOrganizationRequest(request: OrganizePromptsRequest): void {
  // プロンプト配列のチェック
  if (!Array.isArray(request.prompts) || request.prompts.length === 0) {
    throw new Error("At least one prompt is required")
  }

  // 組織化プロンプトの長さチェック
  if (
    !request.organizationPrompt ||
    request.organizationPrompt.trim().length === 0
  ) {
    throw new Error("Organization prompt is required")
  }

  // プロンプト数の上限チェック
  const MAX_PROMPTS_PER_REQUEST = 100
  if (request.prompts.length > MAX_PROMPTS_PER_REQUEST) {
    throw new Error(
      `Too many prompts (max ${MAX_PROMPTS_PER_REQUEST}, got ${request.prompts.length})`,
    )
  }
}
```

**検証結果の型定義**:

```typescript
/**
 * 検証結果
 */
interface ValidationResult {
  /** 検証が成功したか */
  isValid: boolean

  /** エラーメッセージ配列 */
  errors: string[]

  /** 警告メッセージ配列（オプション） */
  warnings?: string[]
}
```

**検証関数の配置**:

- `validateGeminiResponse()`: `03_data_model.md` セクション9.2.1で定義
- `validateTemplate()`: `03_data_model.md` セクション9.2.2で定義
- `validateVariable()`: `03_data_model.md` セクション9.2.3で定義
- `validateTemplateCandidate()`: `03_data_model.md` セクション9.2.7で定義
- `sanitizeTemplateContent()`: `03_data_model.md` セクション9.2.5で定義
- `normalizeString()`: `03_data_model.md` セクション9.2.5で定義

すべての検証ロジックの詳細は **`03_data_model.md` セクション9.2** を参照してください。

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
