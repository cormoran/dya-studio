# Device session

## 範囲・根拠

- 種別: splash からの接続、page-load auto reconnect、disconnect、shared Studio unlock / retry、custom subsystem discovery の共通モジュール。通常画面の tab layout は [app shell](app-shell.md) を参照する。
- 利用者: [App](../../../src/App.tsx) の `AppRouter` / `AppContent`、[SplashScreen](../../../src/components/SplashScreen.tsx)、全 `useCustomSubsystem` consumer とその pages。
- 確認: 2026-09-20、`8627e4d`、コードと DeviceConnection / StudioUnlock context test の確認のみ。USB/BLE picker と実機 lock の UI 実測はしていない。

| 根拠 | ソース / symbol                                                                                                                                                             | 確認内容                                           |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| S1   | [App](../../../src/App.tsx): `AppRouter`, `AppContent`, `getTabs`                                                                                                           | provider 順序、splash / reconnect / connected gate |
| S2   | [DeviceConnection](../../../src/components/DeviceConnection.tsx): `DeviceConnectionProvider`, `handleConnect`, `handleDisconnect`, auto-reconnect effect                    | transport、cancel、telemetry の一回性              |
| S3   | [connectionSession](../../../src/lib/connectionSession.ts): `savedConnectionMethod`, `saveConnectionMethod`, `clearSavedConnectionMethod`                                   | sessionStorage の許可 method                       |
| S4   | [SplashScreen](../../../src/components/SplashScreen.tsx): `handleConnectClick`, `handleAgree`, `handleCancel`                                                               | notice と Demo bypass                              |
| S5   | [StudioUnlockContext](../../../src/contexts/StudioUnlockContext.tsx): `runWithUnlock`, `requireUnlock`, `retryAll`, `cancel`                                                | shared retry / cooldown                            |
| S6   | [DeviceConnection tests](../../../src/components/__tests__/DeviceConnection.test.tsx)、[unlock context tests](../../../src/contexts/__tests__/StudioUnlockContext.test.tsx) | reconnect、cancel、unlock retry の test 根拠       |

## 機能要求

| ID          | できるべきこと                                                                                           | 出典・確度                                        |
| ----------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| SESSION-R01 | USB、Bluetooth、Demo の明示接続と、安全に再開可能な session の自動再接続を区別する                       | S2–S4 から推定                                    |
| SESSION-R02 | 接続中・再接続中・失敗・切断中の画面を混在させず、ユーザーが中止または再試行できる                       | S1/S2 から推定                                    |
| SESSION-R03 | Studio lock で失敗した共有 RPC を一つの prompt へ集約し、unlock 後だけ元操作を再試行する                 | S5 から推定                                       |
| SESSION-R04 | 接続ごとに firmware が広告した capability を読み、feature availability をその時点の discovery に従わせる | S1/S2 と各 `useCustomSubsystem` consumer から推定 |

## 前提・状態

- splash / disconnected: `AppContent` は `SplashScreen` を表示し、USB、Bluetooth、`Try Demo Mode` を選べる。standalone Developer Guide / release notes は connection gate より前に選択されるため、この session を不要とする。
- connecting: `zmkApp.state.isLoading` 中は splash の全接続 button が無効。error は splash 内に表示する。
- reconnecting: page mount 時のみ saved session を検査し、overlay `Reconnecting to your keyboard...` を最低 600 ms 表示する。Cancel がある。
- connected: `isConnected` のときだけ AppLayout と normal tabs を mount する。capability は `zmkApp.state.customSubsystems` を consumer が読む。
- locked: `useStudioLockState` が locked、または gated RPC が unlock error を返すと共有 `UnlockPrompt`。背景機能の OS detection は gate opt-out で modal を開かない。
- error / cancelled: connect error は splash の error、unlock cancel は `StudioUnlockCancelledError` として caller に返る。すべての feature が同じ error presentation を持つとは限らない。

## 現行の機能仕様

| ID          | 前提 → 操作                                        | 観測できる結果                                                                                                                                                  | 保存範囲・副作用                                                                                 | 根拠                                        |
| ----------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| SESSION-001 | splash → USB / BLE を選ぶ                          | 初回 notice 未承諾なら notice dialog。Agree 後に serial / gatt transport を `zmkApp.connect` へ渡す                                                             | notice acceptance の保存は Splash の外部 storage module。BLE picker は user gesture で開く       | S2/S4                                       |
| SESSION-002 | splash → `Try Demo Mode`                           | notice を通らず demo transport 接続を開始する                                                                                                                   | 接続成功後 `demo` を sessionStorage に保存可能                                                   | S2–S4                                       |
| SESSION-003 | explicit connect 成功                              | device info name を持つ connected session を AppLayout に表示し、serial / demo だけ connection method を tab の sessionStorage に保存する                       | `dya-studio:connection-method`。BLE は再開対象外                                                 | S1–S3                                       |
| SESSION-004 | page mount → saved method が demo                  | overlay 後に demo transport で一回 auto reconnect を試す                                                                                                        | sessionStorage は tab 単位。失敗 / cancel で splash へ戻るが saved method をこの経路では消さない | S2/S3                                       |
| SESSION-005 | page mount → saved method が serial                | paired serial port があれば一回 `connectToPairedSerial` を試す。port なしなら splash                                                                            | port picker を開かない。saved `ble` / 不明値は再試行しない                                       | S2/S3                                       |
| SESSION-006 | reconnect 中 → `Cancel`                            | overlay を閉じ、in-flight transport を abort し、`zmkApp.disconnect()` で loading/error を idle disconnected に戻す                                             | storage key は保持されるため、後の reload では再試行し得る                                       | S2                                          |
| SESSION-007 | connected → app shell の Disconnect                | storage key を消してから `zmkApp.disconnect()`                                                                                                                  | serial/demo auto reconnect の記憶を消す。BLE は元から保存しない                                  | S2/S3                                       |
| SESSION-008 | gated RPC が unlock-required                       | request を park し shared UnlockPrompt を開く。実際に unlocked になると元 request を retry し promise を実結果で resolve                                        | browser / device 値を書かない操作もある。non-unlock error はそのまま reject                      | S5/S6                                       |
| SESSION-009 | locked editor action → `requireUnlock(onUnlocked)` | request を送らず prompt を開き、unlock 後に callback を best-effort replay。unlocked なら caller が直ちに進む                                                   | Cancel は pending action を捨てる                                                                | S5                                          |
| SESSION-010 | unlock prompt → Cancel / overlay close             | parked RPC を `StudioUnlockCancelledError` で reject、pending editor action を破棄。約 1 秒の quiet cooldown 中の後続 unlock error は modal を再表示せず cancel | cooldown は実際の unlock で解除                                                                  | S5/S6                                       |
| SESSION-011 | 接続後に custom subsystem list が得られる          | custom subsystem identifier/index を consumer が availability 判定に使用する。Demo の toggle 変更は reconnect 後に初めて list へ反映                            | capability は connection-scoped。前 session の availability を継続保証しない                     | S1/S2、[Subsystems](../pages/subsystems.md) |

## 代表ユーザーフロー

### F1: explicit Demo 接続と切断（SESSION-002/003/007）

1. splash で `Try Demo Mode` を選ぶ。notice を出さず loading から connected layout に遷移することを確認する。
2. Subsystems で Demo が表示され、advertised capability を確認する。
3. Disconnect を選び splash に戻る。reload 後に Demo auto reconnect をしないことを確認する（storage clear）。

### F2: page-load reconnect を中止する（SESSION-004–006）

1. serial または Demo の成功接続後、明示 Disconnect をせず reload する。
2. `Reconnecting to your keyboard...` を最低限視認でき、paired serial / Demo の一回試行になることを確認する。
3. `Cancel` を直ちに選び、loading の残留なしに splash へ戻ることを確認する。
4. BLE は reload auto reconnect の対象ではない。実機 Bluetooth の picker を page-load 時に期待しない。

### F3: lock から操作を復帰する（SESSION-008–010）

1. lock された実機または test harness で gated editor 操作を行い `Keyboard Unlock Required` を確認する。
2. 指示の unlock key を実行後、device が unlocked を通知するか `Retry` を選ぶ。元の読み込み/編集が一回だけ再試行されることを確認する。
3. Cancel / Escape / overlay close を選び、元操作は実行されず、直後の同一 burst が modal を連打しないことを確認する。

## 不変条件

- SESSION-I01: BLE を sessionStorage へ保存も page-load auto reconnect もしない。browser picker は user gesture に依存する（S2/S3）。
- SESSION-I02: explicit Disconnect は保存済み serial/demo method を消すが、reconnect Cancel は消さない（S2/S3）。
- SESSION-I03: auto reconnect は mount ごとの一回試行で、port なし・transport null・failure 時に connected UI を表示しない（S1/S2）。
- SESSION-I04: unlock Cancel は parked request と proactive pending action を再送しない。unlock success 前の Retry も action を失わせない（S5/S6）。
- SESSION-I05: capability は current connection の advertised list に基づき、Demo toggle だけで既存 session の機能状態を更新したと扱わない（S2、[Subsystems](../pages/subsystems.md)）。

## エラーと復帰

- connect promise throw と `zmkApp.state.error` の双方を connection failure として扱い、同一 attempt の analytics 重複を避ける。ユーザーには splash error が表示される。
- auto reconnect の failure は console warning で、overlay を閉じ splash に戻る。個別の失敗理由を必ず画面表示する保証はない。
- unlock error 以外は shared gate が retry / rollback しない。feature 固有 error と Retry は各 page / hook の責務。
- capability discovery が失敗・遅延した場合、consumer の unavailable / empty が permanent 非対応を意味するとは限らない。Reconnect / feature Reload と実機検証が必要である。

## 探索の観点

1. USB / BLE / Demo × notice 初回・承諾済み・Cancel × picker cancel / connect failure。
2. serial / Demo saved session × paired port あり・なし・無応答 timeout × reconnect Cancel のタイミング。
3. lock の proactive action、reactive RPC error、Retry while still locked、Cancel cooldown、actual unlock notification。
4. reconnect ごとに custom subsystem の有無を切替え、既存 tab の stale availability や pending operation を確認する。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

実ブラウザの Web Serial / Web Bluetooth picker、BLE non-Linux unlock、auto reconnect の実機 timeout、接続中の physical unplug、custom subsystem discovery の順序、unlock prompt の全 feature consumer は未検証。sessionStorage が利用不能なら normal explicit connect は動作し得るが、再開記憶は保証しない。
