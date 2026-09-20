# Orca 組込みブラウザでの探索

[メインの探索ガイド](../EXPLORATORY_TESTING.md) と併せて、Orca 環境で組込みブラウザを使う場合だけ読む。他のブラウザツールには適用しない。

## 実行環境と worker への指示

- 利用可能な `orca-cli` skill を読み、CLI の選択と版に対応する browser reference に従う。subagent を監督する場合は `orchestration` skill も使う。以下の `orca` は skill で解決した実行ファイルに置き換える。
- worker にも **orca command は sandbox 外（`exec_command` の `sandbox_permissions: require_escalated`）で実行**と明記する。sandbox 内では runtime に到達できない場合がある。昇格が許可されなければ制約を報告し、回避しない。
- 並列 worker は専用タブを作り、返された `browserPageId` をすべての操作の `--page` に指定する。参照はそのタブの最新 snapshot から取り、画面変更後は再取得する。別タブだけでは storage は分離されないため、メインガイドの origin 分離も守る。

## 観測と native dialog

CLI の JSON 応答は最初に `ok` を確認する。低コスト実行では refs と tree が重複する JSON 全体を毎回読む代わりに、画面情報を抽出する。jq が利用可能なら次の例を使える。

```sh
orca snapshot --page <id> --json | jq -r 'if .ok then .result.snapshot else .error end'
```

さらに期待語だけに絞って空になった場合は、絞り込みなしの `result.snapshot` と URL を確認する。接続画面への遷移や stale ref をブラウザ停止と誤認しない。

native confirm/alert は HTML dialog と別である。CLI 1.4.205 で利用した操作は次の通りだが、使用前に現在の `--help` を確認する。

```sh
orca dialog accept --page <id> --json
orca dialog dismiss --page <id> --json
```

クリック後の dialog を処理し、確認文、成功応答、再 snapshot を証拠に残す。保留 dialog がない等の失敗応答は承認の証拠にならない。確認を観測/操作できなければ承認後の経路は blocked とする。

## 到達できない場合

`runtime_unavailable` や localhost 接続失敗では、許可された sandbox 外実行で `orca status --json` と指定 URL の HTTP 到達性を再確認する。ブラウザの実行ホスト、サーバーの実 URL/ポートも確認する。worker は独自に runtime の serve/restart を繰り返さず、具体的エラーを coordinator へ送る。復帰できるまでアプリの不具合や pass と判定しない。
