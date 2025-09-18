# Firefoxの拡張機能テストを実装するために必要な作業：

1. Firefox用の拡張機能ビルド確認

- .output/firefox-mv2 ディレクトリが存在することを確認
- pnpm build:firefox でFirefox用の拡張機能がビルドされていることを確認

2. Firefox用のPlaywrightフィクスチャ作成

- e2e/fixtures/firefox-extension.ts を作成
- Firefoxブラウザの起動とアドオンのロード設定を実装
- web-ext APIまたは一時的なFirefoxプロファイルを使用

3. playwright.config.ts の Firefox設定更新

- 42行目のコメントを削除
- Firefox用の launchOptions を追加
- 必要に応じて webExtension 設定を追加

4. Firefox用のテストフィクスチャ設定

- ChromiumとFirefoxで異なる拡張機能ロード方法に対応
- サービスワーカー検出ロジックをFirefoxのバックグラウンドスクリプトに対応

5. 既存テストのブラウザ対応確認

- 現在のテストがChromium専用の機能を使用していないか確認
- 必要に応じてブラウザ固有の条件分岐を追加

6. CI/CD設定の更新

- Firefox用のテスト実行を追加
- Firefoxブラウザのインストールと設定

最も重要なのは、ChromiumのManifest V3とFirefoxのManifest
V2の違いに対応した拡張機能ロード方法の実装です。
