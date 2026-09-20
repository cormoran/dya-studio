# 標準と探索ガイドの改善記録

## Round 0: draft

コードの入口とキーマップの状態を調査し、要求/現状/実測の分離、仕様 ID、状態・永続化・エラーの明記、低コスト agent がコードなしで実行できることを gate にした。

以降の round は実施モデル/effort、アプリと仕様の版、実行証拠、仕様不足、変更内容、再試行結果を記録する。承認されていない不具合を既知の受け入れ済み不具合に分類しない。

## Round 1: キーマップへの適用による draft 修正

`db09841` の page → hook → selector と page tests を照合した。modal は適用 callback の直後に閉じる経路があり、floating と失敗時挙動が異なる。また default reset は binding を順に変更してから保存するため原子的ではない。これを踏まえ、同じ UI の見た目でも presentation ごとの結果、部分失敗、RAM/flash/ブラウザの保存範囲を分ける粒度にした。layer rename の失敗時 dialog 閉鎖も「正常」として要求に昇格せず未解決として残した。
