# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code) へのガイダンスを提供します。

## プロジェクト概要

これは WXT（Web Extension Toolkit）と React で構築されたブラウザ拡張機能です。このプロジェクトは、ブラウザ拡張機能開発のための WXT の規約ベースの構造に従っています。

## 開発コマンド

- `pnpm dev` - Chrome用開発サーバーを起動
- `pnpm dev:firefox` - Firefox用開発サーバーを起動
- `pnpm build` - Chrome用拡張機能をビルド
- `pnpm build:firefox` - Firefox用拡張機能をビルド
- `pnpm zip` - Chrome用配布可能なZIPを作成
- `pnpm zip:firefox` - Firefox用配布可能なZIPを作成
- `pnpm compile` - ファイル出力なしで型チェックを実行

## アーキテクチャ

**WXTフレームワーク**: ファイルベースのルーティングと設定よりも規約を重視するWXTのアプローチを使用しています。主要なディレクトリ：

- `entrypoints/` - 拡張機能のエントリーポイント（バックグラウンド、コンテンツスクリプト、ポップアップ）
  - `background.ts` - サービスワーカー/バックグラウンドスクリプト
  - `content.ts` - Googleドメインで実行されるコンテンツスクリプト
  - `popup/` - 拡張機能ポップアップインターフェース（Reactアプリ）
- `public/` - 静的アセットとアイコン
- `assets/` - コード内で参照されるビルド時アセット

**拡張機能の構造**:
- バックグラウンドスクリプトが拡張機能のライフサイクルを処理
- コンテンツスクリプトは現在Googleドメイン（`*://*.google.com/*`）をターゲットとしている
- ポップアップは標準的なカウンターの例を持つReactベースのUIを提供

**ビルドシステム**:
- React JSXサポート付きTypeScript
- WXTがマニフェスト生成とブラウザ固有のビルドを処理
- `.wxt/tsconfig.json`からベースのtsconfigを拡張

## 主要ファイル

- `wxt.config.ts` - Reactモジュール付きWXT設定
- `entrypoints/popup/App.tsx` - メインポップアップコンポーネント
- `entrypoints/popup/main.tsx` - Reactルートの初期化