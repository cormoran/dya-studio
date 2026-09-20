# Playwright CLI での探索

[メインの探索ガイド](../EXPLORATORY_TESTING.md) と併せて、`playwright-cli` でブラウザを操作する場合だけ読む。Playwright Test の `npx playwright test` とは別のセッション型 CLI であり、Orca のコマンドや応答形式は流用しない。

## 開始前の確認

```sh
command -v playwright-cli
playwright-cli --version
playwright-cli --help
```

対象環境で表示される help を優先する。コマンドがない場合は、インストールを勝手に行わず coordinator に報告する。リポジトリ内の Playwright が CLI mode を持つと確認できた場合は、`npx playwright cli` が代替になる。

coordinator が先にアプリを起動し、worker には表示された実 URL を渡す。例の `5173` が使用中なら Vite は別 port に退避するため、依頼文の URL を推測で固定しない。

## セッションと dashboard

worker ごとに短く固有の session 名を決め、すべてのコマンドに `-s=<session>` を付ける。セッションを作った直後に dashboard を表示し、依頼者が操作を見られる状態にしてからテストを始める。`show` は継続実行することがあるため、別 terminal / 継続プロセスとして開く。

```sh
playwright-cli -s=<session> open <url>
playwright-cli -s=<session> show
playwright-cli -s=<session> resize 1280 720
playwright-cli -s=<session> snapshot
```

`open` が成功時に標準出力を出さない版がある。出力の空だけで失敗と判定せず、`tab-list`、`eval 'location.href'`、`snapshot` で実状態を確認する。`show` も exit 0 のまま標準出力が空になることがあり、それだけで dashboard が見えているとは判定しない。実行環境の継続プロセス状態を確認し、依頼者から見えないと申告があれば操作を止める。dashboard を表示できない環境では、その制約を開始前に報告する。

既定の non-persistent session は session ごとに独立した browser context を使う。並列 worker は別 session を使い、同じ session を複数 worker で操作しない。`--persistent` や `--profile` は、保存済みブラウザ状態が必要と明示された場合だけ使う。別 session でもアプリの Demo backend 等が共有される可能性はあるため、破壊的なケースは並列化しない。

## 操作と証拠

snapshot が返す `ref` を基本の操作対象にする。画面変化後は新しい snapshot か `find` で再取得し、古い ref を使い続けない。

```sh
playwright-cli -s=<session> snapshot --depth=5
playwright-cli -s=<session> find "Save"
playwright-cli -s=<session> click <ref>
playwright-cli -s=<session> eval '({url: location.href, width: innerWidth, height: innerHeight})'
```

- `--json` は command ごとに `snapshot` や `result` 等の異なる形を返す。Orca 向けの `.ok` / `.result.snapshot` を前提にしない。コマンドの exit status と未加工の応答を確認してから値を抽出する。
- `goto` や操作コマンドが snapshot を `.playwright-cli/` の file path で返すことがある。必要ならその file を読み、詳細な再観測は `snapshot` を明示的に実行する。
- `snapshot --depth=<n>` を浅くしすぎると dialog や子 control の ref が省略される。クリック対象が見えないときは、ツール障害と決めつける前に depth 無指定の snapshot、対象 subtree、または `find` を使う。
- screenshot、snapshot、console log、trace は通常 `.playwright-cli/` へ作られ、リポジトリでは ignore される。報告から実在する file だけ参照し、通常は commit しない。
- `eval` / `run-code` は readback や viewport 確認に使えるが、DOM、storage、React 状態を書き換えて UI 操作の代わりにしない。storage は復帰確認の readback に `localstorage-list` 等を使える。
- combobox は表示ラベルと DOM option value が異なることがある。順番だけに依存した locator で別 control を操作せず、snapshot のラベル、対象 ref、操作後の表示値を組み合わせて確認する。

HTML dialog は snapshot 内の `dialog` と button ref を使って通常の UI として観測・操作する。native confirm/alert/prompt は snapshot に現れないため、クリックで開いた直後に次の専用コマンドを使う。

```sh
playwright-cli -s=<session> dialog-accept
playwright-cli -s=<session> dialog-dismiss
```

dialog の文言が CLI の応答や dashboard で観測できたかを記録する。dialog が存在しないときの失敗応答は accept/dismiss 成功の証拠ではない。

## sandbox と到達性

macOS の制限付き実行環境では、初回起動時に `~/Library/Caches/ms-playwright/daemon` を作る処理が `EPERM` になることがある。その場合は、許可された方法で `playwright-cli` を sandbox 外実行する承認を取る。権限エラーをアプリや localhost の障害と判定しない。承認できなければ UI の結果を `blocked` とし、実際の error path を残す。

URL に到達できない場合は、次の順で切り分ける。

1. coordinator が報告した Vite の実 URL/port と、サーバープロセスの継続を確認。
2. `playwright-cli -s=<session> list` または `playwright-cli list --all` で session の open/compatible を確認。
3. `tab-list` と `eval 'location.href'` で実際の tab/URL を確認。
4. 絞り込みなしの `snapshot` と `console` を取り、接続画面、再接続 overlay、アプリ error、CLI error を分ける。

worker は自分で Vite や Playwright daemon を kill/restart せず、対象 session、URL、コマンド、exit status、error を coordinator に送る。

## 終了と後始末

値、言語、theme、selector mode を初期状態へ戻し、UI と必要な storage readback の両方で確認する。その後に worker 自身の session だけを閉じる。

```sh
playwright-cli -s=<session> close
playwright-cli list --all
```

`close-all` / `kill-all` は他 worker や依頼者の session も止め得るため使わない。dashboard が別の継続プロセスなら自分のものだけ終了する。一時 report と `.playwright-cli/` 内の証拠はメインガイドの保存ルールに従う。
