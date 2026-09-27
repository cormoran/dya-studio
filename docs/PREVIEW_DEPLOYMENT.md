# 承認付き Cloudflare PR preview

PR の lint/test/build は `Test and Build Web UI` (`test.yml`) が secrets を必要とせず実行し、`dist` artifact を保存する。fork PR にも Cloudflare token を渡さない。

`Approved Cloudflare Preview` (`preview.yml`) は main に workflow が存在する場合、成功した PR build の `workflow_run` から起動する。ビルド元 repository・branch・SHA と一致する open PR を API で確認し、PR 番号と SHA をジョブ名および summary に表示する。関連 PR 配列が空の fork run も API で解決する。

PR 作成者が `cormoran` かつ source branch が本体 repository にある場合は、`preview-auto` Environment を使って手動承認なしで進める。他の PR は `approval-required` を使う。判定は PR 作成者と source repository に基づき、workflow の再実行者には基づかない。

## 管理者の設定と操作

1. Settings → Environments → `approval-required` に Required reviewers として管理者を登録する。承認なしで実行されないよう、この protection rule を維持する。他の人の PR は Required reviewers が未設定なら workflow が失敗してデプロイを止める。必要に応じて Prevent self-review / 管理者の bypass 制限を設定する。
2. `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を repository secrets または各 deployment environment の secrets に設定する。token は開発用 Cloudflare account に必要な最小権限とする。production release 用 token は使用しない。`preview-auto` を使う自動 deployment も同じ dev secrets を必要とする。`preview-auto` は reviewer rule を設定しなければ承認不要となる。
3. PR の差分と build run の SHA を確認する。Actions → `Approved Cloudflare Preview` → Review deployments で `approval-required` を選び Approve and deploy を実行する。
4. 承認後に PR が open で同じ SHA であることを再確認し、該当 build run の artifact だけをアップロードする。成功後、PR に preview URL と完全な SHA をコメントする。

PR 更新前の run は対象外。承認待ちの間に更新・close された場合はデプロイを失敗させる。アップロード中に PR が更新された場合、古い preview のコメントは投稿しない。失敗時は原因を修正して該当 workflow を再実行し、対象 SHA を再確認して承認する。新しいコミットは新しいビルドと承認が必要。

`preview.yml` は default branch にマージされるまで起動しない。マージ後、既存 fork PR の build を再実行して確認できる。初回 contributor の「Approve workflows」はビルド実行の許可であり、Cloudflare deployment の承認とは別である。

## secrets と成果物の境界

デプロイ側は実行中の trusted workflow commit の `wrangler.toml` だけを checkout し、PR の source/config/package.json を checkout しない。静的 `dist` を checkout/tooling と別の `${{ runner.temp }}/preview-assets` にダウンロードし、symlink/特殊ファイルを拒否する。Wrangler には `--assets` でこの静的ディレクトリを明示する。Wrangler は runner の一時ディレクトリに固定バージョンで `--ignore-scripts` インストールする。Cloudflare secrets は upload step のみへ渡し、PR の build/dependency/lifecycle script を実行しない。preview の内容自体はレビュー対象の PR が作成したものである。

`versions upload --env dev` は開発用 Worker の version preview を作り、稼働 version へ deploy しない。main push の dev deploy と release deployment は既存の workflow を維持する。

fork の build には `VITE_ABYSS_CLIENT_ID_DEV` secret も渡されないため、Import/Export tab は引き続き非表示になり得る。これは既存の build 条件であり、この変更では OAuth 設定を変更しない。

## GitHub Deployments への表示

承認と最新 SHA の確認後、Deployments API で PR の head SHA に紐づく `preview-pr-<PR番号>` deployment を作成する。アップロード中は `in_progress`、成功時は preview URL と Actions ログ URL を持つ `success`、失敗・キャンセル時は `failure` / `error` を記録する。PR ごとに Environment を分け、以前の preview は履歴として残す。成功時も他の deployment を自動的に inactive にしない。preview は transient、非 production として登録する。

secrets と承認には引き続き `preview-auto` / `approval-required` を使用する。これらの job Environment が自動作成する deployment は `workflow_run` の実行元である main に紐づくため、PR 用 deployment は別途明示的に登録する。PR 更新・close の検出で upload 前に停止した場合、PR 用 deployment は作成しない。マージ後の次の preview 実行から適用し、過去の deployment は書き換えない。
