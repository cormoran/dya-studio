---
name: pull-request
description: Create or revise DYA Studio pull requests using the repository PR template and a concise, human-readable description. Use when preparing a PR or improving its title or body.
---

# Pull request の作成・文章改善

初めて読む reviewer が、何が変わり、なぜ必要で、何を確認したかを短時間で把握できる PR にする。

## テンプレートと変更内容を確認する

- 作成・編集のどちらでも、[PR template](../../../.github/pull_request_template.md) を読み、見出し、release notes のチェック項目、CLA を使う。テンプレートを独自の文章で置き換えない。
- 対象 base との差分全体を読み、タイトルと説明を最終的な変更内容に合わせる。既存 PR の編集では、現在の body と CI 結果も確認する。
- [AGENTS.md](../../../AGENTS.md) の delivery と仕様更新の要件に従う。Release notes のチェックは実際の差分を確認して付ける。未追加を追加済みと扱わない。

## 重要な点を先に書く

- `Description` の冒頭は重要な変更点を簡潔な箇条書きにする。通常は 2〜4 項目を目安に、変更規模に合わせる。
- 1 項目で 1 つの要点を伝える。ユーザーに見える結果と必要な理由を優先し、長い段落や複数の話題を詰めた箇条書きを避ける。
- タイトルは具体的な変更を短く表す。略語、内部 symbol、実装用語はレビューの判断に必要な場合だけ使う。
- 互換性への影響、破壊的変更、重要な制約は冒頭で分かるようにする。
- 作業の時系列、試行錯誤、全ファイル一覧、同じ説明の繰り返しは省く。既存 PR の改善では、重要な事実や未検証条件を削らず、まとめ直す。

## 検証と詳細を下に置く

- 必要に応じて `Description` の箇条書きの下に `### Validation` を作り、実施した検証と結果を短く記載する。未実施・失敗・skip は成功と分ける。
- 細かい情報を伝える必要があれば、さらに下に `### Technical details` などの節を作る。計算式、モデルの前提、プロトコル、詳細な検証条件はここに置く。長くなる場合は `<details>` や既存仕様・CI へのリンクを使う。
- 詳細節もレビューに必要な情報に絞る。生ログ、全テスト名、長い commit hash、環境 ID をそのまま並べない。
- ソース比較、Demo、実機の証拠を区別し、CI の成功を実機動作や電源断後の永続化の証明にしない。

## 公開して確認する

- 公開前に、冒頭だけで主な変更が理解できるか、各箇条書きを一読できるか、詳細節と重複していないかを読み直す。
- `gh` を使う場合、本文を一時ファイルに書き、`gh pr create --body-file` / `gh pr edit --body-file` で改行と Markdown を保つ。
- 公開後に本文を再取得し、見出し・箇条書き・チェック項目を確認する。PR 作成後の CI 監視と失敗・競合の修正は AGENTS.md に従う。body だけの編集では、その変更で CI が再実行されたと推定しない。
