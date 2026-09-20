# Release Notes

## 範囲・根拠

`/release-notes` の接続不要なリリース一覧、locale 表示、version hash anchor、PR link と Back を対象にする。route の接続 gate 例外は[共通画面](../modules/app-shell.md)を参照する。コード確認: 2026-09-20、`8627e4d`。UI 実測は未実施。

| 根拠 | ソース / symbol                                                                                                                                                         |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1   | [ReleaseNotesPage](../../../src/pages/ReleaseNotesPage.tsx): `ReleaseNotesPage`, `ReleaseSection`, `CategoryGroup`                                                      |
| S2   | [release notes data/helpers](../../../src/i18n/releaseNotes.ts), [releaseNotes.json](../../../src/i18n/releaseNotes.json): `getReleases`, `localizeChange`, `prNumbers` |
| S3   | [App](../../../src/App.tsx): `RELEASE_NOTES_PATH`, `navigatePath`                                                                                                       |
| S4   | [routing tests](../../../src/__tests__/App.test.tsx), [version helper tests](../../../src/lib/__tests__/releaseVersioning.test.ts)                                      |

## 機能要求

| ID      | できるべきこと                                                                                     | 出典・確度     |
| ------- | -------------------------------------------------------------------------------------------------- | -------------- |
| REL-R01 | 接続・Web Serial/Web Bluetooth の有無に関係なく、current data source の release を新しい順に読める | S1/S2 から推定 |
| REL-R02 | version deep link と PR references が目的の release/change に到達できる                            | S1/S2 から推定 |
| REL-R03 | empty/upcoming と実リリース、カテゴリ、選択 language を混同しない                                  | S1/S2 から推定 |

## 前提・状態

route は AppContent の connection gate より前で return され、`/release-notes` の path は維持される。データは build に import された JSON で、network fetch/search/filter input はない。`#<version>` は render 後一度 `decodeURIComponent` して element ID を `scrollIntoView` する。

接続不要とは表示の条件であり provider 非 mount を意味しない。ページ自体は connect を要求しないが、保存済み Demo/serial session の provider による再接続は別契約（[device session](../modules/device-session.md)）。

| 状態               | 表示                                                    | 保存・副作用                                 |
| ------------------ | ------------------------------------------------------- | -------------------------------------------- |
| data present       | release cards newest first                              | JSON は build artifact。画面操作で変更しない |
| upcoming / empty   | `Upcoming` と `No upcoming changes yet.`                | `date:null`。release は保存しない            |
| released empty     | version/date と `No changes recorded for this release.` | 同上                                         |
| hash target absent | card は通常表示                                         | no-op。error/notification はない             |

## 現行の機能仕様

REL-007: モバイル幅でBackの文字を隠してもaccessible name `Back`（翻訳に追従）を保持し、戻る操作を識別できる（S1のheader）。

| ID      | 前提 → 操作                         | 観測できる結果                                                                          | 保存範囲・副作用                           | 根拠     |
| ------- | ----------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------ | -------- |
| REL-001 | `/release-notes` を直接開く         | standalone page、brand、Back、LanguageToggle、全 release card                           | connection を開始せず、Back は `/` を push | S1/S3/S4 |
| REL-002 | nonempty release                    | optional summary lead/highlights の後に `Major`→`Minor`→`Patch`。空 category は出さない | JSON data を読むのみ                       | S1/S2    |
| REL-003 | `upcoming` / summary・change とも空 | `Upcoming` と empty 文言。released empty は別文言                                       | data の `version`/date を変えない          | S1/S2    |
| REL-004 | `#<version>` を持つ URL             | matching `<section id={version}>` を render 後 scroll                                   | browser scroll のみ。invalid hash は無視   | S1       |
| REL-005 | change に `pr` number または array  | `#N` external link を new tab、`noopener noreferrer` で表示                             | GitHub は開くが app data は変更しない      | S1/S2    |
| REL-006 | language toggle                     | localizeText/change が active language（欠ければ en）を表示                             | language persistence は app-shell の契約   | S1/S2    |

## 代表ユーザーフロー

1. 未接続で `/release-notes` を開き、connection UI ではなく一覧が表示されることを確認する（REL-001）。
2. data にある released version を `#version` として開き、該当 card へ scroll することを確認する（REL-004）。
3. PR link を開き、current tab を遷移させず external new tab になることを確認する（REL-005）。
4. upcoming/empty release と summary を含む release を両方確認し、言語切替後の fallback を記録する（REL-002/003/006）。

## 不変条件

- REL-I01: release の表示・Back・hash scroll は keyboard 接続を要求しない（S1/S3）。
- REL-I02: JSON の declaration order を新しい順としてそのまま render し、UI search/filter で隠さない（S1/S2）。
- REL-I03: category order は常に major/minor/patch、空 category は card に空見出しを作らない（S1/S2）。

## エラーと復帰

runtime の data fetch・検索 API・明示 error state は存在しない。decode 可能だが存在しない hash は no-op。壊れた percent encoding（例 `%ZZ`）は `decodeURIComponent` が例外を投げ得て、この effect 内に catch はない。REL-004 の無視は「存在しない ID」の範囲であり、不正 encoding の安全な復帰は未検証。外部 PR link の network failure は browser の責務でアプリ内の復帰 UI はない。JSON import failure は build/runtime failure でありこの page が捕捉しない。

## 探索の観点

- encoded hash、存在しない hash、先頭/末尾 version、Back/Forward。
- en/ja/zh の data 欠落時 fallback、長い summary/PR array、狭幅の sticky header。
- empty upcoming と empty released、カテゴリが一つだけの release。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

hash scroll の layout/animation 後の位置、external link、全 locale と狭幅 UI は未実測。ユーザーが入力して絞り込む search/filter control は現行実装にないため、その要件は未定義である。

不具合候補（REL-R02 / REL-004、受け入れ根拠なし・未修正）: 2026-09-20、app source `bcfa786`、ローカル Vite / Orca / JA で `/release-notes#%ZZ` を初回表示または browser Reload すると、body text が空になり console に `An error occurred in the <ReleaseNotesPage> component.` が出ることを2回確認した。同一 document の hash 変更のみでは再現しなかった。mount effect の未捕捉 `decodeURIComponent` がコード上の根拠。hash なし `/release-notes` への遷移で一覧に復帰できる。修正時は同条件の初回表示・Reload・hash変更を再検証する。
