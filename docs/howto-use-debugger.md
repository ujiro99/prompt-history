# Debuggerの使用方法

## 概要

`prompt-autocraft`の動作確認やデバッグを行うためのツールです。
process.env.NODE_ENV !== "production" の場合のみ有効になります。

## 使用方法

1. ブラウザコンソールでセレクターテスト

```javascript
// セレクターの動作確認
window.promptHistoryDebug?.testSelectors()
```

2. 要素情報の取得

```javascript
// 現在検出されている要素の情報
window.promptHistoryDebug?.getElementInfo()
```

3. サービス名の確認

```javascript
// 現在アクティブなサービス名
window.promptHistoryDebug?.getServiceName()
```

4. 入力内容の取得

```javascript
// 現在の入力内容
window.promptHistoryDebug?.extractPromptContent()
```
