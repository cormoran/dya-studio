# キーマップ共有（Keyboard Abyss / JSON）

## 範囲・根拠

入口は `/keymap` の Save 左の `Keymap sharing`（キーマップ共有）ドロップダウン。2026-10-16 のユーザー明示要求に基づく。独立 Import/Export タブは廃止し、旧 `/import-export` は Keymap として扱う。以下はコード根拠であり実サービス・実機の検証済みを意味しない。

| 根拠 | ソースと symbol                                                                                                                                                                                     |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1   | [KeymapPage](../../../src/pages/KeymapPage.tsx): `KeymapSharingMenu`、[App](../../../src/App.tsx): `getTabs`、[useUrlTab](../../../src/hooks/useUrlTab.ts): `tabIdFromPathname`                     |
| S2   | [共有メニュー](../../../src/components/importExport/KeymapSharingMenu.tsx): `KeymapSharingMenu`、[差分モーダル](../../../src/components/importExport/JsonDiffModal.tsx): `JsonDiffModal`            |
| S3   | [共有 hook](../../../src/hooks/useKeymapSharing.ts): `capture`, `refreshList`, `prepare`, `confirm`, `associate`, `create`, `saveFile`                                                              |
| S4   | [identity](../../../src/lib/abyss/keymapIdentity.ts): `keymapIdentifier`, `rememberKeymap`、[RPC](../../../proto/cormoran/fast_keymap/fast_keymap.proto)                                            |
| S5   | [payload](../../../src/lib/abyss/keymapSharing.ts): `parseSharedKeymap`, `buildApplyTarget`、[preflight](../../../src/lib/abyss/abyssPreflight.ts): `runPreflight`                                  |
| S6   | [auth](../../../src/hooks/useAbyssAuth.ts)、[client](../../../src/lib/abyss/abyssClient.ts)、[renewal](../../../src/hooks/useAbyssSessionRenewal.ts)、[OAuth](../../../src/lib/abyss/abyssOAuth.ts) |
| S7   | [hook tests](../../../src/hooks/__tests__/useKeymapSharing.test.tsx)                                                                                                                                |
| S8   | 旧 [ImportExportPage](../../../src/pages/ImportExportPage.tsx) と旧 hooks/components は残るが、通常の route/tab には登録しない                                                                      |

## 機能要求

| ID     | できるべきこと                                                                                                                                   | 出典・確度                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| IE-R01 | 廃止: 旧ページの部分 export。後継は IE-R04                                                                                                       | 2026-10-16 明示要求                                                        |
| IE-R02 | keyboard を変える import は対象・差分・互換性を確認して実行する                                                                                  | 継続要件                                                                   |
| IE-R03 | 認証・read・書込みの失敗を成功・永続化済みと誤認しない                                                                                           | 継続要件                                                                   |
| IE-R04 | Save 左の短い名称のメニューで、現在・所有キーマップの適用/保存、検索、新規保存、JSON の出し入れを行う。未認証では login/search/file だけ表示する | 2026-10-16 ユーザー明示要求                                                |
| IE-R05 | fast-keymap PR #5 の識別子で現在のキーマップを判定し、未対応機では判定不能の注意を表示する                                                       | 同上、[RPC PR](https://github.com/cormoran/zmk-feature-fast-keymap/pull/5) |

## 前提・状態

接続済みまたは Demo の Keymap が対象。Keymap 読込・Save/Reset/Discard 中は入口を無効化する。Studio locked 時は既存の unlock 操作を優先し、Save と共有メニューを隠す。メニューは画面幅内に収まり、長い一覧はスクロールする。狭い画面の入口はアイコンと accessible name を維持する。

未認証・認証読込中はアカウント/現在/所有一覧/新規保存を出さない。OAuth client 未設定では login を無効化し理由を表示するが、file/search は利用可能。認証後メニューを開くと keyboard snapshot、layout resolve、一覧、識別子を読取り、`Loading...` 中は書込み系操作を無効化する。空一覧とエラーを区別する。

## 現行の機能仕様

IE-001〜IE-012 は旧独立ページの契約として廃止。認証保持は IE-023 へ、その他は以下へ移転する。番号は再利用しない。

| ID     | 前提 → 操作                                         | 観測できる結果 / 保存範囲・副作用                                                                                                                                                                                                                                                                                                                                                 | 根拠        |
| ------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| IE-013 | Keymap → `Keymap sharing`                           | Save の左のメニューを開く。閉じる/Escape/外側クリックは操作実行を伴わない。旧 Import/Export タブはない                                                                                                                                                                                                                                                                            | S1/S2       |
| IE-014 | 未認証 → `Sign in with Abyss`                       | popup OAuth。成功後は avatar（なければ cloud）、表示名、`@username`、小さい `Sign out`。search/file は認証に依存しない                                                                                                                                                                                                                                                            | S2/S6       |
| IE-015 | 認証済み → menu を開く / `Refresh`                  | 対応 layout の自分のキーマップ一覧。未一致 layout や広域 fallback の結果は一覧に出さない。先頭は identifier に一致する現在のキーマップ。差分なしなら `In sync`、ありなら Apply/Save                                                                                                                                                                                               | S2/S3/S4    |
| IE-016 | current/所有行 → `Save`                             | 最新 keyboard と Abyss record を読んで確認 modal。左は Abyss、右は保存予定。Confirm の `Save to Abyss` で当該 record を更新。行の Save は Apply より小さく暗い。keyboard binding は書かない。成功後 identity metadata を保存する                                                                                                                                                  | S2/S3       |
| IE-017 | current/所有行 → `Apply`                            | 差分 modal の左は現在の keyboard、右は適用予定。preflight の blocked は confirm 無効。`Apply to keyboard` だけが adapter 経由で即時書込み・保存し、再読取一致確認、identity 保存、Keymap/Combo 再読込を行う                                                                                                                                                                       | S1/S2/S3/S5 |
| IE-018 | `Find on Abyss`                                     | build の Abyss base URL の `/keymaps` を新しいタブで開く。未ログインでも表示                                                                                                                                                                                                                                                                                                      | S2          |
| IE-019 | 認証済み → `Save new to Abyss`                      | dialog で非空 name と private/public（初期 private）を入力。`Save to Abyss` で操作時点の keyboard を新規保存。成功した record の識別子も keyboard に保存。binding の変更はない。record 作成後の metadata/list エラーは新規作成失敗として再試行を促さない                                                                                                                          | S2/S3/S4    |
| IE-020 | `Save to file`                                      | 操作時点で keyboard を読取、schema URL を含む KeyboardHub JSON `keymap.json` を download。Abyss 通信・login は不要                                                                                                                                                                                                                                                                | S3/S5       |
| IE-021 | `Apply from file` → JSON 選択                       | 5 MB 以下、KeyboardHub schema で検証。無効 JSON は alert、書込なし。有効なら IE-017 と同じ差分・確認・readback。任意 section が未記載なら既存値を保持、明示 `[]` は削除を要求。余分な既存 layer/キー位置は保持した結果を preview する。成功時は Abyss identity を clear（対応機のみ）                                                                                             | S2/S3/S5    |
| IE-022 | confirm 前の Cancel / Close / Escape / 外側クリック | modal を閉じ、書込なし。処理中は閉じる要求を無視し confirm を無効化。新規 dialog の入力は処理中無効。失敗は dialog 内 alert と入力/差分を残して再試行可能                                                                                                                                                                                                                         | S2/S3       |
| IE-023 | browser 再起動 / `Sign out`                         | token は localStorage、PKCE は initiating tab の sessionStorage。起動・foreground・表示中5分ごとに near-expiry token 更新。sign out は best effort revoke 後 clear、cloud section 非表示。401 は token clear と logout。OAuth fallback の戻り先は `/keymap`                                                                                                                       | S6/S3       |
| IE-024 | identity RPC 非対応/空/未解決                       | 非対応なら専用の注意、空なら未保存、対応する record 不明なら判定不能。file/cloud 操作は引き続き使える。identifier の source は `abyss:<origin>/keymaps/<id>` の UTF-8、SHA-256 の先頭3 byteを4文字の padding なし Base64url にする。編集で変えない。元 id は origin ごとの browser localStorage と所有一覧から復元する。hash 衝突/別 browser の未所有 record は解決不能になり得る | S3/S4       |
| IE-025 | 確認中の変更/接続変更                               | Confirm 前に keyboard を再読取、cloud 保存なら record も再取得し、review の基準と変わっていればエラーで中止。接続/認証変更時に review/list を無効化し、古い非同期結果から書込みを開始しない                                                                                                                                                                                       | S3/S7       |

## 代表ユーザーフロー

1. Demo の Keymap でメニューを開き、未認証では login/search/file のみ、閉じる→開くが可能なことを確認（IE-013/014）。
2. ファイル保存→JSON を別名で保持→キーを編集→ファイルから反映→diff で変更先を確認→Cancel、編集が残ることを確認。再度反映を確定し、ページ内 Reload 後に元の値が戻ることを確認（IE-017/020/021/022）。Demo は実機 flash の証拠ではない。
3. 認証環境で menu を開き current/所有一覧を確認。別 record の Save→Cancel、再確認→Save で Abyss の同 record を再取得し内容を確認（IE-015/016）。
4. 新規保存で private/public を選び保存、一覧更新/record 再取得、sign out 後 cloud section 非表示を確認（IE-019/023）。外部サービス書込みは検証用アカウントでのみ実施。
5. identity RPC の新旧 firmware を比較。対応機は適用後 identifier の get readback、編集後も同一、再接続後の判定、file 反映後 empty を確認。未対応機は注意表示と file/cloud 機能の継続を確認（IE-024）。

## 不変条件

- IE-I01: 読込中・保存中・blocked preflight では二重書込みを開始しない（S3）。
- IE-I02: cloud/file 保存は keyboard binding を書かない。cloud 保存後の identity metadata 書込みは別の副作用（S3/S4）。
- IE-I03: Cancel・preview・ファイル選択だけでは設定を書かない（S2/S3）。
- IE-I04: 書込み成功ラベルには keyboard 再読取一致を必要とする。device の power-cycle 永続性は実機で別途検証する（S3）。

## エラーと復帰

auth/list/read/export/import のエラーは alert に残る。menu は Refresh または同じ操作で再試行、modal は Cancel 後に再確認できる。read error で過去の snapshot を書込みに流用しない。401 は再 login が必要。新規作成成功後の metadata/list error は record 作成を再実行せず menu に残す。identity setter の成功 acknowledgement と get readback がない場合は注意する。

adapter は逐次書込みし原子的 rollback はない。途中失敗は混在状態になり得るので再読取してから再確認する。Confirm 前の検査と実際の書込間の外部変更を server-side CAS で防ぐ契約はない。

## 探索の観点

未設定 OAuth / 未認証 / 認証、空一覧 / read-list error、identity 非対応 / 空 / unknown / matched、同一 diff / 異なる diff、JSON 構文・schema・容量不正、Cancel と連打、確認中の接続変更、狭い画面のスクロールとタッチ到達性を区別する。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

RPC PR #5 は実装後に再確認し、`575411d` に同期。4文字 Base64url と unlock-required error を反映した。firmware get/set 実装も PR に追加されているが本作業の実機確認は未実施。OAuth 実サービスの一覧/更新/作成、実機 adapter の途中失敗/flash、identifier の電源断保持は自動テスト・Demo と区別して報告する。24-bit hash は衝突ゼロを保証しない。別 browser で未所有の record の source を復元する API は現 contract にない。
