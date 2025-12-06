# テスト設計ドキュメント

## 概要

プロンプト自動整理機能（Prompt Organizer）のテスト設計を定義します。

**関連ドキュメント**:

- **01_requirements.md**: 機能要件と制約
- **02_architecture.md**: アーキテクチャとサービス層設計
- **03_data_model.md**: データモデルと検証仕様
- **04_ui_flow.md**: UIフローと状態遷移
- **05_api_design.md**: Gemini API統合

---

## 1. ユニットテストケース

### 1.1 PromptFilterService

**テスト対象**: `src/services/promptOrganizer/PromptFilterService.ts`

#### 1.1.1 filterPrompts()

```typescript
describe('PromptFilterService', () => {
  describe('filterPrompts', () => {
    it('should filter prompts by period (last 7 days)', async () => {
      // Given: プロンプトデータ（過去30日分）
      const prompts = createMockPrompts(30)
      const settings = { filterPeriodDays: 7, ... }

      // When: 7日間でフィルタリング
      const result = await promptFilterService.filterPrompts(settings)

      // Then: 7日以内のプロンプトのみ抽出
      expect(result.length).toBeLessThanOrEqual(prompts.length)
      result.forEach(p => {
        expect(p.lastExecutedAt).toBeGreaterThan(Date.now() - 7 * 24 * 60 * 60 * 1000)
      })
    })

    it('should filter by minimum execution count', async () => {
      // Given: 実行回数がバラバラのプロンプト
      const prompts = [
        { executionCount: 1, ... },
        { executionCount: 5, ... },
        { executionCount: 10, ... },
      ]
      const settings = { filterMinExecutionCount: 5, ... }

      // When: 最低実行回数5でフィルタリング
      const result = await promptFilterService.filterPrompts(settings)

      // Then: 実行回数5以上のプロンプトのみ抽出
      result.forEach(p => {
        expect(p.executionCount).toBeGreaterThanOrEqual(5)
      })
    })

    it('should exclude AI-generated prompts', async () => {
      // Given: AI生成と通常プロンプトが混在
      const prompts = [
        { isAIGenerated: false, ... },
        { isAIGenerated: true, ... },
      ]

      // When: フィルタリング実行
      const result = await promptFilterService.filterPrompts(settings)

      // Then: AI生成プロンプトは除外される
      result.forEach(p => {
        expect(p.isAIGenerated).toBeFalsy()
      })
    })

    it('should limit to max prompts count', async () => {
      // Given: 200件のプロンプト
      const prompts = createMockPrompts(200)
      const settings = { filterMaxPrompts: 100, ... }

      // When: 最大100件でフィルタリング
      const result = await promptFilterService.filterPrompts(settings)

      // Then: 100件以下に制限される
      expect(result.length).toBeLessThanOrEqual(100)
    })

    it('should sort by execution count (descending)', async () => {
      // Given: 実行回数が異なるプロンプト
      const prompts = createMockPromptsWithExecutionCount([3, 10, 1, 5])

      // When: フィルタリング実行
      const result = await promptFilterService.filterPrompts(settings)

      // Then: 実行回数降順でソートされている
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].executionCount).toBeGreaterThanOrEqual(
          result[i].executionCount
        )
      }
    })
  })
})
```

### 1.2 TemplateGeneratorService

**テスト対象**: `src/services/promptOrganizer/TemplateGeneratorService.ts`

#### 1.2.1 generateTemplates()

```typescript
describe('TemplateGeneratorService', () => {
  describe('generateTemplates', () => {
    it('should call Gemini API with correct parameters', async () => {
      // Given: リクエストデータ
      const request = {
        organizationPrompt: 'カテゴリごとにプロンプトを整理',
        prompts: createMockPrompts(10),
        periodDays: 7,
      }
      const mockGeminiClient = createMockGeminiClient()

      // When: テンプレート生成
      await templateGeneratorService.generateTemplates(request)

      // Then: GeminiClientが正しいパラメータで呼ばれる
      expect(mockGeminiClient.generateStructuredContent).toHaveBeenCalledWith(
        expect.stringContaining('カテゴリごとにプロンプトを整理'),
        ORGANIZER_RESPONSE_SCHEMA,
        expect.objectContaining({
          model: 'gemini-2.5-flash',
          systemInstruction: expect.any(String),
        })
      )
    })

    it('should convert GeneratedTemplate to TemplateCandidate', async () => {
      // Given: Gemini APIのレスポンス
      const mockResponse = {
        templates: [
          {
            title: 'テンプレート1',
            content: '{{variable1}}について説明してください',
            variables: [{ name: 'variable1', description: '説明対象' }],
            ...
          },
        ],
      }
      mockGeminiClient.generateStructuredContent.mockResolvedValue({
        data: mockResponse,
        usage: { inputTokens: 100, outputTokens: 50 },
      })

      // When: テンプレート生成
      const result = await templateGeneratorService.generateTemplates(request)

      // Then: TemplateCandidateに変換されている
      expect(result.templates).toHaveLength(1)
      expect(result.templates[0]).toMatchObject({
        id: expect.any(String),
        title: 'テンプレート1',
        content: '{{variable1}}について説明してください',
        variables: [
          {
            name: 'variable1',
            label: '説明対象',
            type: 'text',
            required: true,
          },
        ],
        aiMetadata: {
          confirmed: false,
          showInPinned: expect.any(Boolean),
        },
      })
    })

    it('should handle API errors', async () => {
      // Given: Gemini APIがエラーを返す
      mockGeminiClient.generateStructuredContent.mockRejectedValue(
        new Error('API_ERROR')
      )

      // When/Then: エラーが伝播する
      await expect(
        templateGeneratorService.generateTemplates(request)
      ).rejects.toThrow('API_ERROR')
    })
  })
})
```

### 1.3 CostEstimatorService

**テスト対象**: `src/services/promptOrganizer/CostEstimatorService.ts`

#### 1.3.1 calculateCost()

```typescript
describe('CostEstimatorService', () => {
  describe('calculateCost', () => {
    it('should calculate cost correctly', () => {
      // Given: トークン使用量
      const usage = {
        inputTokens: 1_000_000,  // 1M input tokens
        outputTokens: 500_000,   // 0.5M output tokens
      }

      // When: コスト計算
      const cost = costEstimatorService.calculateCost(usage)

      // Then: 正しい料金が計算される
      // Input: 1M * $0.075 = $0.075
      // Output: 0.5M * $0.30 = $0.15
      // Total: $0.225 * 150 (JPY) = ¥33.75
      expect(cost).toBeCloseTo(33.75, 2)
    })

    it('should return 0 for zero tokens', () => {
      // Given: トークン使用量ゼロ
      const usage = { inputTokens: 0, outputTokens: 0 }

      // When: コスト計算
      const cost = costEstimatorService.calculateCost(usage)

      // Then: コストは0
      expect(cost).toBe(0)
    })
  })

  describe('estimateExecution', () => {
    it('should estimate cost before execution', async () => {
      // Given: 設定とプロンプト
      const settings = createMockSettings()
      mockGeminiClient.estimateTokens.mockResolvedValue(5000)

      // When: 見積もり実行
      const estimate = await costEstimatorService.estimateExecution(settings)

      // Then: 見積もり結果が返される
      expect(estimate).toMatchObject({
        targetPromptCount: expect.any(Number),
        estimatedInputTokens: 5000,
        contextUsageRate: expect.any(Number),
        estimatedCost: expect.any(Number),
        model: 'gemini-2.5-flash',
      })
    })
  })
})
```

### 1.4 TemplateSaveService

**テスト対象**: `src/services/promptOrganizer/TemplateSaveService.ts`

#### 1.4.1 saveTemplates()

```typescript
describe('TemplateSaveService', () => {
  describe('saveTemplates', () => {
    it('should save templates with userAction="save"', async () => {
      // Given: 保存対象のテンプレート候補
      const candidates = [
        { userAction: 'save', title: 'テンプレート1', ... },
        { userAction: 'pending', title: 'テンプレート2', ... },
      ]
      const mockPromptsService = createMockPromptsService()

      // When: 保存実行
      await templateSaveService.saveTemplates(candidates)

      // Then: userAction="save"のテンプレートのみ保存される
      expect(mockPromptsService.savePrompt).toHaveBeenCalledTimes(1)
      expect(mockPromptsService.savePrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'テンプレート1',
          isAIGenerated: true,
        })
      )
    })

    it('should pin templates with userAction="save_and_pin"', async () => {
      // Given: ピン留め保存対象のテンプレート
      const candidates = [
        { userAction: 'save_and_pin', title: 'テンプレート1', ... },
      ]
      const mockPinsService = createMockPinsService()

      // When: 保存実行
      await templateSaveService.saveTemplates(candidates)

      // Then: 保存とピン留めが実行される
      expect(mockPromptsService.savePrompt).toHaveBeenCalledTimes(1)
      expect(mockPinsService.pinPrompt).toHaveBeenCalledTimes(1)
    })

    it('should not save templates with userAction="discard"', async () => {
      // Given: 破棄対象のテンプレート
      const candidates = [
        { userAction: 'discard', title: 'テンプレート1', ... },
      ]

      // When: 保存実行
      await templateSaveService.saveTemplates(candidates)

      // Then: 保存されない
      expect(mockPromptsService.savePrompt).not.toHaveBeenCalled()
    })
  })
})
```

### 1.5 CategoryService

**テスト対象**: `src/services/promptOrganizer/CategoryService.ts`

#### 1.5.1 delete()

```typescript
describe('CategoryService', () => {
  describe('delete', () => {
    it('should delete category and update prompts', async () => {
      // Given: カテゴリとそれを参照するプロンプト
      const categoryId = 'custom-category-1'
      const prompts = [
        { id: '1', categoryId: 'custom-category-1', ... },
        { id: '2', categoryId: 'default-category', ... },
      ]

      // When: カテゴリ削除
      await categoryService.delete(categoryId)

      // Then: カテゴリが削除され、参照プロンプトのcategoryIdがnullになる
      expect(categoriesStorage.getValue).toHaveBeenCalled()
      expect(mockPromptsService.updatePrompt).toHaveBeenCalledWith('1', {
        categoryId: null,
      })
      expect(mockPromptsService.updatePrompt).not.toHaveBeenCalledWith('2', ...)
    })

    it('should throw error when deleting default category', async () => {
      // Given: デフォルトカテゴリ
      const defaultCategoryId = 'external-communication'

      // When/Then: 削除時にエラーが発生
      await expect(
        categoryService.delete(defaultCategoryId)
      ).rejects.toThrow('Cannot delete default category')
    })

    it('should throw error when category not found', async () => {
      // Given: 存在しないカテゴリID
      const nonExistentId = 'non-existent'

      // When/Then: 削除時にエラーが発生
      await expect(
        categoryService.delete(nonExistentId)
      ).rejects.toThrow('Category not found')
    })
  })

  describe('rename', () => {
    it('should rename category successfully', async () => {
      // Given: カテゴリとリネーム
      const categoryId = 'custom-category-1'
      const newName = '新しいカテゴリ名'

      // When: リネーム実行
      const result = await categoryService.rename(categoryId, newName)

      // Then: カテゴリ名が更新される
      expect(result.name).toBe('新しいカテゴリ名')
      expect(result.updatedAt).toBeInstanceOf(Date)
    })

    it('should throw error for empty name', async () => {
      // Given: 空のカテゴリ名
      const categoryId = 'custom-category-1'

      // When/Then: エラーが発生
      await expect(
        categoryService.rename(categoryId, '')
      ).rejects.toThrow('Category name cannot be empty')
    })

    it('should throw error for name too long', async () => {
      // Given: 31文字のカテゴリ名
      const categoryId = 'custom-category-1'
      const longName = 'a'.repeat(31)

      // When/Then: エラーが発生
      await expect(
        categoryService.rename(categoryId, longName)
      ).rejects.toThrow('Category name must be 30 characters or less')
    })
  })
})
```

### 1.6 TemplateConverter

**テスト対象**: `src/services/promptOrganizer/TemplateConverter.ts`

#### 1.6.1 convertToVariableConfig()

```typescript
describe('TemplateConverter', () => {
  describe('convertToVariableConfig', () => {
    it('should convert ExtractedVariable to VariableConfig', () => {
      // Given: Gemini APIから抽出された変数
      const extracted: ExtractedVariable = {
        name: 'client_name',
        description: '取引先名',
      }

      // When: 変換実行
      const result = templateConverter.convertToVariableConfig(extracted)

      // Then: VariableConfigに変換される
      expect(result).toEqual({
        name: 'client_name',
        label: '取引先名',
        type: 'text',
        defaultValue: '',
        required: true,
        options: undefined,
      })
    })

    it('should infer type as textarea for detail-related variables', () => {
      // Given: 詳細系の変数
      const extracted: ExtractedVariable = {
        name: 'issue_detail',
        description: '問題の詳細',
      }

      // When: 変換実行
      const result = templateConverter.convertToVariableConfig(extracted)

      // Then: typeがtextareaになる
      expect(result.type).toBe('textarea')
    })
  })

  describe('shouldShowInPinned', () => {
    it('should return true when sourceCount >= 3 and variables >= 2', () => {
      // Given: ソース3件以上、変数2つ以上
      const generated: GeneratedTemplate = {
        sourcePromptIds: ['1', '2', '3'],
        variables: [
          { name: 'var1', description: 'Var 1' },
          { name: 'var2', description: 'Var 2' },
        ],
        ...
      }

      // When: チェック実行
      const result = templateConverter.shouldShowInPinned(generated)

      // Then: trueが返される
      expect(result).toBe(true)
    })

    it('should return false when sourceCount < 3', () => {
      // Given: ソース2件
      const generated: GeneratedTemplate = {
        sourcePromptIds: ['1', '2'],
        variables: [
          { name: 'var1', description: 'Var 1' },
          { name: 'var2', description: 'Var 2' },
        ],
        ...
      }

      // When: チェック実行
      const result = templateConverter.shouldShowInPinned(generated)

      // Then: falseが返される
      expect(result).toBe(false)
    })

    it('should return false when variables < 2', () => {
      // Given: 変数1つ
      const generated: GeneratedTemplate = {
        sourcePromptIds: ['1', '2', '3'],
        variables: [{ name: 'var1', description: 'Var 1' }],
        ...
      }

      // When: チェック実行
      const result = templateConverter.shouldShowInPinned(generated)

      // Then: falseが返される
      expect(result).toBe(false)
    })
  })
})
```

### 1.7 検証関数

**テスト対象**: `src/services/promptOrganizer/validation.ts`

#### 1.7.1 validateTemplate()

```typescript
describe('validation', () => {
  describe('validateTemplate', () => {
    it('should pass validation for valid template', () => {
      // Given: 有効なテンプレート
      const template: GeneratedTemplate = {
        title: '有効なテンプレート',
        content: 'テンプレートの内容',
        useCase: 'ユースケース',
        categoryId: 'external-communication',
        sourcePromptIds: ['1', '2'],
        variables: [],
      }

      // When: 検証実行
      const errors = validateTemplate(template, 0)

      // Then: エラーなし
      expect(errors).toHaveLength(0)
    })

    it('should truncate title if exceeds 20 characters', () => {
      // Given: 21文字のタイトル
      const template: GeneratedTemplate = {
        title: 'あ'.repeat(21),
        content: '内容',
        ...
      }

      // When: 検証実行
      const errors = validateTemplate(template, 0)

      // Then: 20文字に切り詰められる（警告のみ）
      expect(template.title).toHaveLength(20)
      expect(errors).toHaveLength(0)
    })

    it('should return error for empty content', () => {
      // Given: 空のコンテンツ
      const template: GeneratedTemplate = {
        title: 'タイトル',
        content: '',
        ...
      }

      // When: 検証実行
      const errors = validateTemplate(template, 0)

      // Then: エラーが返される
      expect(errors).toContain('Template 1: content is required')
    })
  })

  describe('validateVariable', () => {
    it('should pass validation for valid variable name', () => {
      // Given: 有効な変数名
      const variable: ExtractedVariable = {
        name: 'valid_variable_123',
        description: '説明',
      }

      // When: 検証実行
      const errors = validateVariable(variable, 0, 0)

      // Then: エラーなし
      expect(errors).toHaveLength(0)
    })

    it('should return error for invalid variable name', () => {
      // Given: 無効な変数名（数字始まり）
      const variable: ExtractedVariable = {
        name: '123invalid',
        description: '説明',
      }

      // When: 検証実行
      const errors = validateVariable(variable, 0, 0)

      // Then: エラーが返される
      expect(errors).toContain(
        expect.stringContaining('invalid variable name')
      )
    })
  })

  describe('sanitizeTemplateContent', () => {
    it('should escape HTML but preserve variable syntax', () => {
      // Given: HTMLタグと変数を含むコンテンツ
      const content = '<script>alert("XSS")</script>{{variable1}}'

      // When: サニタイゼーション実行
      const result = sanitizeTemplateContent(content)

      // Then: HTMLはエスケープ、変数は保持
      expect(result).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;{{variable1}}'
      )
    })
  })
})
```

---

## 2. 統合テストシナリオ

### 2.1 エンドツーエンドのプロンプト整理フロー

```typescript
describe('Prompt Organization Integration', () => {
  it('should complete full organization workflow', async () => {
    // Given: 初期設定とプロンプトデータ
    const settings: PromptOrganizerSettings = {
      filterPeriodDays: 7,
      filterMinExecutionCount: 3,
      filterMaxPrompts: 50,
      organizationPrompt: 'カテゴリごとに整理',
    }

    // 1. フィルタリング
    const filteredPrompts = await promptFilterService.filterPrompts(settings)
    expect(filteredPrompts.length).toBeGreaterThan(0)

    // 2. テンプレート生成
    const { templates, usage } = await templateGeneratorService.generateTemplates({
      organizationPrompt: settings.organizationPrompt,
      prompts: filteredPrompts,
      periodDays: settings.filterPeriodDays,
    })
    expect(templates.length).toBeGreaterThan(0)

    // 3. コスト計算
    const cost = costEstimatorService.calculateCost(usage)
    expect(cost).toBeGreaterThan(0)

    // 4. ユーザーがテンプレートを選択（save）
    templates[0].userAction = 'save'

    // 5. 保存
    await templateSaveService.saveTemplates(templates)

    // 6. 保存されたプロンプトを確認
    const savedPrompts = await promptsService.getAllPrompts()
    const aiGeneratedPrompt = savedPrompts.find(
      p => p.name === templates[0].title && p.isAIGenerated
    )
    expect(aiGeneratedPrompt).toBeDefined()
    expect(aiGeneratedPrompt!.aiMetadata?.confirmed).toBe(false)
  })
})
```

### 2.2 エラー処理とリトライの統合

```typescript
describe('Error Handling Integration', () => {
  it('should retry on RATE_LIMIT error', async () => {
    // Given: Gemini APIが最初はRATE_LIMITエラーを返す
    let callCount = 0
    mockGeminiClient.generateStructuredContent.mockImplementation(() => {
      callCount++
      if (callCount < 3) {
        throw { code: 'RATE_LIMIT', message: 'Rate limit exceeded' }
      }
      return Promise.resolve({ data: mockResponse, usage: mockUsage })
    })

    // When: テンプレート生成実行
    const result = await templateGeneratorService.generateTemplates(request)

    // Then: リトライして成功
    expect(callCount).toBe(3)
    expect(result.templates).toBeDefined()
  })

  it('should not retry on INVALID_API_KEY error', async () => {
    // Given: Gemini APIがINVALID_API_KEYエラーを返す
    mockGeminiClient.generateStructuredContent.mockRejectedValue({
      code: 'INVALID_API_KEY',
      message: 'Invalid API key',
    })

    // When/Then: リトライせずにエラー
    await expect(
      templateGeneratorService.generateTemplates(request)
    ).rejects.toThrow('Invalid API key')
  })
})
```

### 2.3 カテゴリとプロンプトの連携

```typescript
describe('Category and Prompt Integration', () => {
  it('should handle category deletion and prompt cleanup', async () => {
    // Given: カテゴリと参照プロンプト
    const categoryId = 'custom-category-1'
    const category = await categoryService.create({
      name: 'テストカテゴリ',
      isDefault: false,
    })
    await promptsService.savePrompt({
      name: 'テストプロンプト',
      content: '内容',
      categoryId: category.id,
      ...
    })

    // When: カテゴリ削除
    await categoryService.delete(category.id)

    // Then: プロンプトのcategoryIdがnullになる
    const prompts = await promptsService.getAllPrompts()
    const prompt = prompts.find(p => p.name === 'テストプロンプト')
    expect(prompt?.categoryId).toBeNull()
  })
})
```

---

## 3. E2Eテストフロー

### 3.1 テストツール

- **Playwright**: ブラウザ自動化
- **Testing Library**: React コンポーネントテスト

### 3.2 E2Eテストシナリオ

#### 3.2.1 プロンプト整理の完全フロー

```typescript
describe('E2E: Prompt Organization Flow', () => {
  it('should complete full user journey', async ({ page, extensionId }) => {
    // 1. 拡張機能を開く
    await page.goto(`chrome-extension://${extensionId}/popup.html`)

    // 2. 設定画面に移動
    await page.click('[data-testid="settings-button"]')

    // 3. Gemini API キーを設定
    await page.fill('[data-testid="api-key-input"]', 'test-api-key')
    await page.click('[data-testid="save-api-key"]')

    // 4. プロンプト整理ダイアログを開く
    await page.click('[data-testid="organize-prompts-button"]')

    // 5. フィルタ設定を調整
    await page.selectOption('[data-testid="period-selector"]', '7')
    await page.fill('[data-testid="min-execution-input"]', '3')

    // 6. 実行想定を確認
    await page.waitForSelector('[data-testid="token-count"]')
    const tokenCount = await page.textContent('[data-testid="token-count"]')
    expect(parseInt(tokenCount!)).toBeGreaterThan(0)

    // 7. 整理を実行
    await page.click('[data-testid="execute-button"]')

    // 8. サマリーダイアログを確認
    await page.waitForSelector('[data-testid="summary-dialog"]')
    const templateCount = await page.textContent(
      '[data-testid="template-count"]'
    )
    expect(parseInt(templateCount!)).toBeGreaterThan(0)

    // 9. プレビューダイアログを開く
    await page.click('[data-testid="preview-button"]')

    // 10. テンプレート候補を選択
    await page.click('[data-testid="template-card-0"]')

    // 11. タイトルを編集
    const titleInput = await page.locator('[data-testid="title-input"]')
    await titleInput.fill('編集したタイトル')

    // 12. 保存
    await page.click('[data-testid="save-button"]')

    // 13. Pinned メニューで確認
    await page.click('[data-testid="pinned-menu-button"]')
    const aiTemplates = await page.locator(
      '[data-testid="ai-recommended-section"]'
    )
    await expect(aiTemplates).toContainText('編集したタイトル')

    // 14. キラキラアニメーションを確認
    const shimmerElement = await page.locator('.ai-generated-unconfirmed')
    await expect(shimmerElement).toBeVisible()

    // 15. クリックして確認済みにする
    await page.click('[data-testid="prompt-item-編集したタイトル"]')

    // 16. アニメーションが解除されることを確認
    await expect(shimmerElement).not.toBeVisible()
  })
})
```

#### 3.2.2 カテゴリ管理フロー

```typescript
describe('E2E: Category Management', () => {
  it('should create, rename, and delete category', async ({ page, extensionId }) => {
    // 1. 設定画面を開く
    await page.goto(`chrome-extension://${extensionId}/settings.html`)

    // 2. カテゴリ管理セクションに移動
    await page.click('[data-testid="category-management-tab"]')

    // 3. 新規カテゴリを作成
    await page.click('[data-testid="add-category-button"]')
    await page.fill('[data-testid="category-name-input"]', 'テストカテゴリ')
    await page.press('[data-testid="category-name-input"]', 'Enter')

    // 4. カテゴリが作成されたことを確認
    await expect(
      page.locator('[data-testid="category-list"]')
    ).toContainText('テストカテゴリ')

    // 5. カテゴリをリネーム
    await page.click('[data-testid="rename-category-button"]')
    await page.fill('[data-testid="category-name-input"]', 'リネームしたカテゴリ')
    await page.press('[data-testid="category-name-input"]', 'Enter')

    // 6. リネームされたことを確認
    await expect(
      page.locator('[data-testid="category-list"]')
    ).toContainText('リネームしたカテゴリ')

    // 7. カテゴリを削除
    await page.click('[data-testid="delete-category-button"]')
    await page.click('[data-testid="confirm-delete-button"]')

    // 8. カテゴリが削除されたことを確認
    await expect(
      page.locator('[data-testid="category-list"]')
    ).not.toContainText('リネームしたカテゴリ')
  })

  it('should prevent deletion of default category', async ({ page, extensionId }) => {
    // 1. 設定画面を開く
    await page.goto(`chrome-extension://${extensionId}/settings.html`)
    await page.click('[data-testid="category-management-tab"]')

    // 2. デフォルトカテゴリの削除ボタンが表示されないことを確認
    const defaultCategory = page.locator(
      '[data-testid="category-external-communication"]'
    )
    await expect(
      defaultCategory.locator('[data-testid="delete-button"]')
    ).not.toBeVisible()
  })
})
```

#### 3.2.3 エラーハンドリングフロー

```typescript
describe('E2E: Error Handling', () => {
  it('should display error dialog on API failure', async ({ page, extensionId }) => {
    // Given: Gemini APIがエラーを返すように設定
    await page.route('https://generativelanguage.googleapis.com/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      })
    })

    // When: プロンプト整理を実行
    await page.goto(`chrome-extension://${extensionId}/popup.html`)
    await page.click('[data-testid="organize-prompts-button"]')
    await page.click('[data-testid="execute-button"]')

    // Then: エラーダイアログが表示される
    await page.waitForSelector('[data-testid="error-dialog"]')
    const errorMessage = await page.textContent('[data-testid="error-message"]')
    expect(errorMessage).toContain('API')
  })

  it('should allow retry on network error', async ({ page, extensionId }) => {
    let requestCount = 0

    // Given: 最初はネットワークエラー、2回目は成功
    await page.route('https://generativelanguage.googleapis.com/**', route => {
      requestCount++
      if (requestCount === 1) {
        route.abort('failed')
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ templates: [] }),
        })
      }
    })

    // When: プロンプト整理を実行してエラー
    await page.goto(`chrome-extension://${extensionId}/popup.html`)
    await page.click('[data-testid="organize-prompts-button"]')
    await page.click('[data-testid="execute-button"]')

    // Then: エラーダイアログが表示され、再試行ボタンがある
    await page.waitForSelector('[data-testid="error-dialog"]')
    await page.click('[data-testid="retry-button"]')

    // Then: 再試行が成功する
    await page.waitForSelector('[data-testid="summary-dialog"]')
  })
})
```

---

## 4. モックデータ構造

### 4.1 モックプロンプト

```typescript
function createMockPrompts(count: number): Prompt[] {
  const now = Date.now()
  return Array.from({ length: count }, (_, i) => ({
    id: `prompt-${i}`,
    name: `テストプロンプト ${i}`,
    content: `プロンプトの内容 ${i}`,
    executionCount: Math.floor(Math.random() * 20) + 1,
    lastExecutedAt: new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000),
    isPinned: false,
    lastExecutionUrl: 'https://chatgpt.com',
    createdAt: new Date(now - 60 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(now - 10 * 24 * 60 * 60 * 1000),
    isAIGenerated: false,
    variables: [],
  }))
}
```

### 4.2 モック Gemini レスポンス

```typescript
const mockGeminiResponse: OrganizePromptsResponse = {
  templates: [
    {
      title: '社内報告用テンプレート',
      content: '{{date}}の{{event}}について報告いたします。\n\n{{detail}}',
      useCase: '社内の定期報告に使用',
      categoryId: 'internal-communication',
      sourcePromptIds: ['1', '2', '3'],
      variables: [
        { name: 'date', description: '報告日' },
        { name: 'event', description: 'イベント名' },
        { name: 'detail', description: '詳細内容' },
      ],
    },
    {
      title: '対外メール用テンプレート',
      content: '{{client}}様\n\nお世話になっております。{{company}}の{{name}}です。',
      useCase: '取引先への初回メール',
      categoryId: 'external-communication',
      sourcePromptIds: ['4', '5'],
      variables: [
        { name: 'client', description: '取引先名' },
        { name: 'company', description: '自社名' },
        { name: 'name', description: '自分の名前' },
      ],
    },
  ],
}
```

### 4.3 モックカテゴリ

```typescript
const mockCategories: Record<string, Category> = {
  'external-communication': {
    id: 'external-communication',
    name: '対外コミュニケーション',
    description: '社外とのやり取りに使用',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  'internal-communication': {
    id: 'internal-communication',
    name: '社内コミュニケーション',
    description: '社内報告や連絡に使用',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}
```

---

## 5. テストカバレッジ目標

### 5.1 ユニットテスト

- **目標カバレッジ**: 80%以上
- **重点対象**:
  - サービス層の全メソッド
  - 検証関数
  - データ変換ロジック

### 5.2 統合テスト

- **目標**: 主要な統合フロー10件以上
- **重点対象**:
  - サービス間連携
  - エラーハンドリングとリトライ
  - データ永続化

### 5.3 E2Eテスト

- **目標**: 主要ユーザーフロー5件以上
- **重点対象**:
  - プロンプト整理の完全フロー
  - カテゴリ管理
  - エラーハンドリング

---

## 6. パフォーマンステスト仕様

### 6.1 大量データテスト

```typescript
describe('Performance Tests', () => {
  it('should filter 1000 prompts within 1 second', async () => {
    // Given: 1000件のプロンプト
    const prompts = createMockPrompts(1000)
    const settings = createMockSettings()

    // When: フィルタリング実行（時間計測）
    const start = performance.now()
    const result = await promptFilterService.filterPrompts(settings)
    const duration = performance.now() - start

    // Then: 1秒以内に完了
    expect(duration).toBeLessThan(1000)
    expect(result.length).toBeGreaterThan(0)
  })

  it('should handle 100 templates conversion within 2 seconds', async () => {
    // Given: 100件のテンプレート
    const generated = createMockGeneratedTemplates(100)

    // When: 変換実行（時間計測）
    const start = performance.now()
    const candidates = generated.map(g =>
      templateConverter.convertToCandidate(g, 7)
    )
    const duration = performance.now() - start

    // Then: 2秒以内に完了
    expect(duration).toBeLessThan(2000)
    expect(candidates.length).toBe(100)
  })
})
```

### 6.2 メモリ使用量テスト

```typescript
describe('Memory Tests', () => {
  it('should not leak memory on repeated operations', async () => {
    // Given: 初期メモリ使用量
    const initialMemory = process.memoryUsage().heapUsed

    // When: 100回の操作を繰り返す
    for (let i = 0; i < 100; i++) {
      await promptFilterService.filterPrompts(settings)
    }

    // Then: メモリ使用量の増加が許容範囲内（初期の2倍以内）
    const finalMemory = process.memoryUsage().heapUsed
    const increase = finalMemory - initialMemory
    expect(increase).toBeLessThan(initialMemory)
  })
})
```

### 6.3 API呼び出しパフォーマンス

```typescript
describe('API Performance', () => {
  it('should complete Gemini API call within 10 seconds', async () => {
    // Given: 実際のGemini API（モックなし）
    const request = createRealOrganizerRequest()

    // When: API呼び出し（時間計測）
    const start = performance.now()
    const result = await templateGeneratorService.generateTemplates(request)
    const duration = performance.now() - start

    // Then: 10秒以内に完了（タイムアウト30秒より余裕を持つ）
    expect(duration).toBeLessThan(10000)
    expect(result.templates.length).toBeGreaterThan(0)
  })
})
```

---

## 7. テスト実行

### 7.1 コマンド

```bash
# ユニットテスト実行
pnpm test

# 統合テスト実行
pnpm test:integration

# E2Eテスト実行
pnpm e2e

# カバレッジレポート生成
pnpm test:coverage

# パフォーマンステスト実行
pnpm test:performance
```

### 7.2 CI/CD統合

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v3

  integration-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm test:integration

  e2e-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm pre-e2e
      - run: pnpm e2e
```

---

## 8. まとめ

このテスト設計ドキュメントは、Prompt Organizer機能の品質を保証するための包括的なテスト戦略を定義しています：

- **ユニットテスト**: 個別のサービスと関数の正確性を検証
- **統合テスト**: サービス間の連携とエラーハンドリングを検証
- **E2Eテスト**: ユーザー視点での完全なフロー動作を検証
- **パフォーマンステスト**: 大量データとAPI応答時間を検証

テストカバレッジ80%以上を目標とし、主要なユーザーフローとエッジケースをカバーすることで、堅牢で信頼性の高い機能を提供します。
