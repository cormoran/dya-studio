# Abyss OAuth callback

## 範囲・根拠

`/oauth/callback` の popup relay と full-page OAuth code exchange を対象にする。接続 gate を迂回する route 判定は[共通画面](../modules/app-shell.md)を参照する。コード確認: 2026-09-20、`8627e4d`。外部認証・browser 実測はしていない。

| 根拠 | ソース / symbol                                                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- |
| S1   | [App](../../../src/App.tsx): `AppContent`, `replacePath`                                                                        |
| S2   | [AbyssCallbackPage](../../../src/pages/AbyssCallbackPage.tsx): `AbyssCallbackPage`, `startedRef`                                |
| S3   | [OAuth plumbing](../../../src/lib/abyss/abyssOAuth.ts): `startAbyssLogin`, `relayAbyssCallback`, `takeReturnPath`               |
| S4   | [callback tests](../../../src/pages/__tests__/AbyssCallbackPage.test.tsx), [routing tests](../../../src/__tests__/App.test.tsx) |
| S5   | [Abyss client](../../../src/lib/abyss/abyssClient.ts): `getAbyssClient`, sessionStorage/transactionStorage configuration        |

## 機能要求

| ID        | できるべきこと                                                                                    | 出典・確度     |
| --------- | ------------------------------------------------------------------------------------------------- | -------------- |
| OAUTH-R01 | popup と full-page redirect で single-use authorization code を一度だけ正しい document が交換する | S2/S3 から推定 |
| OAUTH-R02 | state 不一致の別 tab が callback を横取りせず、callback query を route 正規化で失わない           | S1/S3 から推定 |
| OAUTH-R03 | provider/config/exchange failure を成功画面にせず、DYA Studio へ戻れる                            | S2/S4 から推定 |

## 前提・状態

この route は `DeviceConnectionProvider` 等を mount した後に、接続 UI gate より前で render される（guide と違い provider 自体の外ではない）。正常 popup は initiating tab が sessionStorage 内 PKCE transaction を使い code を交換する。callback window は BroadcastChannel を主、同 origin `window.opener.postMessage` を補助に relay し、ack を 1.5 秒待つ。full-page fallback は callback document 自身が exchange し、return path（なければ `/import-export`）を sessionStorage から consume して history replace で戻る。

| 状態              | 表示                                                    | 副作用 / 終了                                   |
| ----------------- | ------------------------------------------------------- | ----------------------------------------------- |
| working           | `Completing Abyss sign-in...`                           | relay または client exchange 中                 |
| relayed popup     | `Signed in to Abyss` / `You can close this window.`     | callback は exchange せず close を試行          |
| full-page success | callback UI を残さず onDone                             | token exchange 後、spent code の URL を replace |
| error             | `Abyss sign-in failed` と message、`Back to DYA Studio` | code は再利用せず、button で `/` に replace     |

## 現行の機能仕様

| ID        | 前提 → 操作                                                | 観測できる結果                                                                                           | 保存範囲・副作用                                                                      | 根拠        |
| --------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------- |
| OAUTH-001 | `/oauth/callback?code=…&state=…` を開く                    | App は Home に canonicalize せず callback を connection 無関係に mount                                   | query は callback が `window.location.href` として読む                                | S1/S4       |
| OAUTH-002 | originating popup login の callback → state が一致する ack | callback は relay 済み表示、`window.close()` を試行する                                                  | code exchange は opener だけ。PKCE verifier は opener tab の sessionStorage           | S2/S3/S4    |
| OAUTH-003 | popup が block され full-page redirect                     | callback は 1.5 秒後に自身で `handleRedirectCallback` し、stashed return path を一回 remove して replace | token/PKCE transaction は tab-scoped sessionStorage、history に spent code を残さない | S1/S2/S3/S5 |
| OAUTH-004 | callback component が StrictMode で effect 再実行          | `startedRef` により一つの relay/exchange だけを開始                                                      | second single-use-code exchange を防ぐ                                                | S2/S4       |
| OAUTH-005 | client 未設定または exchange reject                        | error title/message と `Back to DYA Studio`                                                              | 自動 retry/rollback はしない。戻る操作は `/` を replace                               | S2/S4       |

## 代表ユーザーフロー

1. initiating tab の Import/Export から login を始める。popup callback は relay 後に close message となり、callback 自身が exchange しないことを test または network log で確認する（OAUTH-002）。
2. popup blocker で full-page redirect にし、callback の success が `/import-export`（保存失敗時は既定 path）に replace することを確認する（OAUTH-003）。
3. provider error/state 欠落/client 未設定で error を確認し、`Back to DYA Studio` で Home へ戻る（OAUTH-005）。

## 不変条件

- OAUTH-I01: callback document と opener が同じ code を両方 exchange してはならない（S2/S3）。
- OAUTH-I02: state が initiating login の state と一致しない relay は claim されない（S3）。
- OAUTH-I03: OAuth callback の query は App の unknown route replacement で失われない（S1/S4）。

## エラーと復帰

relay failure は 1.5 秒後 full-page mode と区別できないため callback 自身が exchange を試みる。config 不足、provider error、network/error response は `abyssErrorMessageKey` の文言となり、再試行は Import/Export から新しい login を開始する。popup close が browser policy で拒否されても relayed 表示を残す。認証情報や provider account の変更はこの画面から行わない。

## 探索の観点

- BroadcastChannel 有/無、COOP により opener が使えない場合、state 不一致の別 tab。
- callback を手動 reload、StrictMode、timeout 境界、popup を先に閉じる場合。
- success/error の browser Back が code URL を再訪しないか、sessionStorage が拒否される private mode。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

provider 実環境での relay、COOP/third-party storage 制約、popup blocker の実 browser 挙動は未検証。ack timeout 後に遅延した opener が code を交換する race の望ましい扱いはコードからは保証できない。
