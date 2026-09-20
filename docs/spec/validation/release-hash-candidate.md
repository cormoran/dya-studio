# Release Notes 不正 hash の確認

- 実施: coordinator、2026-09-20、app source `bcfa786` と同一（docs HEAD `7111e14`）、Orca / JA / Demo session 記憶あり。
- page: `66b39e56-688a-4680-9349-39d811a14825`、origin `http://127.0.0.1:5183`。
- 関連: REL-R02、REL-004、Release Notes のエラー節。受け入れ済みではない product-candidate。

## 再現と観測

1. `/release-notes#%ZZ` を document navigation で開く。snapshot は `- generic [ref=e1] clickable [onclick]` のみ。時間を置いた read-only DOM 読取でも `document.body.innerText` は空文字。console に `An error occurred in the <ReleaseNotesPage> component.`。
2. hash なし `/release-notes` を開くと `リリースノート` と JA の一覧が復帰。
3. 同じ document で hash だけを `%ZZ` に変える場合は一覧が残った。effect は mount 時のみなので、この操作だけでは再現しない。
4. その URL で **browser Reload** すると body text は再び空文字。初回表示/Reload の2回で再現。
5. hash なし URL に戻し、`h1=リリースノート`、`lang=ja` を確認して復帰。

期待: 壊れた deep link が通常の一覧閲覧まで失わせず復帰できること（REL-R02 からの推定要求。現行 REL-004 の「存在しないIDを無視」と不正 encoding は別条件）。実際: mount 時の不正 percent encoding でページ内容が消える。

コード根拠: `ReleaseNotesPage` の mount effect で `decodeURIComponent` を catch せず実行する。仕様作成時の「壊れた hash は無視」を修正し、ブラウザでも影響を確認できた例。製品コードの修正はこの文書タスクに含めていない。

探索仕様の価値: 「正常な hash」「存在しない ID」「decode 不能」「同一 document hash 変更」「browser Reload」を分けることで、同じ URL でも再現条件を特定できる。low tester の未実行を coordinator の追試で補ったもので、luna がこの不具合を発見したとは扱わない。
