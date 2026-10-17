# Orca 組込みブラウザでの探索

[メインの探索ガイド](../EXPLORATORY_TESTING.md) と併せて、Orca 環境で組込みブラウザを使う場合だけ読む。他のブラウザツールには適用しない。

## 実行環境と worker への指示

- 利用可能な `orca-cli` skill を読み、CLI の選択と版に対応する browser reference に従う。subagent を監督する場合は `orchestration` skill も使う。以下の `orca` は skill で解決した実行ファイルに置き換える。
- worker にも **orca command は sandbox 外（`exec_command` の `sandbox_permissions: require_escalated`）で実行**と明記する。sandbox 内では runtime に到達できない場合がある。昇格が許可されなければ制約を報告し、回避しない。
- 並列 worker は専用タブを作り、返された `browserPageId` をすべての操作の `--page` に指定する。参照はそのタブの最新 snapshot から取り、画面変更後は再取得する。別タブだけでは storage は分離されないため、メインガイドの origin 分離も守る。

### Codex worker の model / reasoning effort 指定

探索 worker は新規 worktree を作らず、現在の worktree で起動する。`worktree create --agent codex` は Orca 設定の launcher を使うため、worker ごとの model / reasoning effort を渡せない。明示指定がある worker は `terminal create --worktree active --command` で Codex の argv を指定する。たとえば標準の luna / low worker は次のように起動する。

```sh
orca terminal create \\
  --worktree active \\
  --title "Codex" \\
  --command 'codex --profile orca --model gpt-5.6-luna -c model_reasoning_effort="low"' \\
  --json
```

`terminal create` の結果の `terminal.handle` に対し、prompt を送る前に次を実行する。

```sh
orca terminal wait --terminal <handle> --for tui-idle --timeout-ms 60000 --json
orca terminal read --terminal <handle> --json
```

`wait.satisfied: true` と、起動画面の `model: gpt-5.6-luna low` の両方を確認してから prompt を送る。別の指定値では `gpt-5.6-luna` と `low` を依頼された model / effort に置き換え、表示された実値も記録する。待機が timeout の場合は一度だけ時間を延長して再試行し、なお未起動なら prompt を送らず blocked と報告する。

新規 Codex worker は全て `--profile orca` を指定する。custom argv で作った terminal は orchestration 上 `external_terminal` になり得るため、coordinator が作成 receipt と handle を所有記録へ保存する。report・生ログの回収と settlement/release 後、release が `processAction: none` なら、この run 自身が作成した idle terminal だけを明示的に close し、`ptyKilled` と terminal list で確認する。他者の external terminal は閉じない。active worker は終了確認まで閉じず、版対応の orchestration 契約を守る。

## viewport と device emulation

Orca 組込みブラウザは viewport の変更と mobile device preset に対応している。レスポンシブ確認のためだけに Playwright へ切り替えず、対象タブの `browserPageId` を指定して次を使う。

```sh
# device preset（例: 390 x 844、deviceScaleFactor 3）
orca exec --page <id> --command 'set device "iPhone 12"' --json

# 任意の desktop viewport へ戻す／変更する
orca exec --page <id> --command "set viewport 1280 800" --json
```

`set device` / `set viewport` は agent-browser command であり、`orca set device ...` のような top-level command ではない。top-level で実行すると `Unknown command` になる。`orca exec --command ...` の成功応答に含まれる `width`、`height`、`mobile`、`deviceScaleFactor` を確認し、layout と要素参照が変わり得るため直後に snapshot を取り直す。

実表示の寸法は必要に応じて `orca eval` で `window.innerWidth` / `window.innerHeight`、対象要素の `getBoundingClientRect()`、`document.body.scrollWidth` を読む。レスポンシブ実装では desktop/mobile 両方の control が DOM に存在して片方だけ CSS で hidden になる場合があるため、`querySelectorAll` の件数だけで表示を判定しない。`getBoundingClientRect().height > 0` など実寸で可視要素を絞る。

## 観測と native dialog

static preview の事前 build は `VITE_BASE=/ npm run build` とし、nested guide URL の H1/active route が実際に描画されることを worker 起動前に確認する。defaultの相対asset baseで深いURLを直接開いた空画面を、製品のroute不具合と即断しない。build後は全session終了まで再生成しない。

`goto` 成功直後の snapshot は React の描画前で空の場合がある。期待する見出し等を現在版で対応する wait で待ってから fresh snapshot とURLを読む。Developer Guideは共通の`h1`の存在だけでなく各route固有の見出しと`aria-current`を確認する。接続中の編集ページ間はアプリ内tabで移動し、document navigationを保存後Reloadの代わりにしない。

`screenshot --json` が `result.data` のbase64と`result.format`を返す版では、成功確認後にローカル画像へdecodeできる。外部artifact公開は不要。たとえば取得JSONを一時ディレクトリの`shot.json`に保存した場合:

```sh
python3 - <<'PY'
import base64, json
from pathlib import Path
capture = Path('/private/tmp/your-run/shot.json')
reply = json.loads(capture.read_text())
assert reply['ok'], reply.get('error')
assert reply['result']['format'] == 'png'
capture.with_suffix('.png').write_bytes(base64.b64decode(reply['result']['data'], validate=True))
PY
```

実際の応答形式を確認し、存在する画像だけをreportへリンクする。画像と同じpageのURL、言語、theme選択値、viewportと必要なcomputed styleを新しく記録し、対応しなければvisual passを保留する。

CLI の JSON 応答は最初に `ok` を確認する。低コスト実行では refs と tree が重複する JSON 全体を毎回読む代わりに、画面情報を抽出する。jq が利用可能なら次の例を使える。

```sh
orca snapshot --page <id> --json | jq -r 'if .ok then .result.snapshot else .error end'
```

さらに期待語だけに絞って空になった場合は、絞り込みなしの `result.snapshot` と URL を確認する。接続画面への遷移や stale ref をブラウザ停止と誤認しない。

`wait --text` は画面に描画された text を待つ用途に使う。目的の文言が `aria-label` にしかない場合は一致しないことがあるため、最新 snapshot の accessible name、`wait --selector`、または対象を絞った `eval` で確認する。長いページの snapshot が出力上限で途中までになる場合も、後半の要素が存在しないと判断せず、snapshot の出力を絞るか `eval` で対象だけを読む。

native confirm/alert は HTML dialog と別である。CLI 1.4.205 で利用した操作は次の通りだが、使用前に現在の `--help` を確認する。

```sh
orca dialog accept --page <id> --json
orca dialog dismiss --page <id> --json
```

クリック後の dialog を処理し、確認文、成功応答、再 snapshot を証拠に残す。保留 dialog がない等の失敗応答は承認の証拠にならない。確認を観測/操作できなければ承認後の経路は blocked とする。

## 到達できない場合

`runtime_unavailable` や localhost 接続失敗では、許可された sandbox 外実行で `orca status --json` と指定 URL の HTTP 到達性を再確認する。ブラウザの実行ホスト、サーバーの実 URL/ポートも確認する。sandbox 内で起動した local dev server に paired desktop browser から到達できない場合は、許可を得て server も sandbox 外で明示的な host/port（例: `--host 127.0.0.1 --port 5174`）に起動し直す。ブラウザツールを切り替えて制約を隠さない。worker は独自に runtime の serve/restart を繰り返さず、具体的エラーを coordinator へ送る。復帰できるまでアプリの不具合や pass と判定しない。
