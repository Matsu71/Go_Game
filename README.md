# Go_Game

ブラウザで動く、シンプルな囲碁アプリとミニ詰碁です。

## 概要

このプロジェクトでは、詰碁データを「ブラウザアプリ専用の置き場」ではなく、別 UI、検証器、問題管理ツール、SGF 出力、AI 連携でも使える共通資産として扱います。

唯一の元データは `data/canonical/tsumego-canonical.json` で、ブラウザUI用・検証器用のデータはそこから生成します。

## ディレクトリ構成

- `data/canonical/tsumego-canonical.json`: 詰碁の正規データです。唯一のマスターです。
- `data/export/web/tsumego-data.js`: 現在のブラウザUIが読む派生データです。
- `data/export/solver/tsumego-problems.json`: 検証器や CLI が読む派生データです。
- `data/export/sgf/`: 必要に応じて SGF 出力を置くための拡張先です。
- `index.html`: 画面全体の構成と各 UI 要素です。
- `style.css`: 見た目とレイアウトです。
- `script.js`: 囲碁の進行、採点、詰碁の表示と判定ロジックです。
- `scripts/`: データ検証や export 生成の補助スクリプトです。

## データ方針

- 正規データの唯一の元は canonical です。
- 新しい詰碁は canonical を更新してから、各用途向け export を再生成します。
- UI 表示用の文言と、問題本体・検証情報は分離します。
- `solution` 1点だけに依存せず、複数の正解初手、分岐手順、最善応手、検証結果を持てる形にします。
- ブラウザ UI は web export を読むだけにして、元データの表現に依存しすぎないようにします。

## 機能

- `囲碁ミニアプリ` と `ミニ詰碁` をボタンで切り替えられます。
- `5路盤`、`6路盤`、`7路盤`、`8路盤`、`9路盤` に切り替えられます。
- `上下切り替え` ボタンで、盤面と文章ブロックの上下配置を切り替えられます。
- 黒番から開始し、黒白交互に着手できます。
- `パス`、`戻す`、`進める` に対応しています。
- 連続 `2回のパス` で終局します。
- 終局時は中国ルールの面積計算で形勢を表示します。
- コミは `5路盤=20目`、`6路盤=4目`、`7路盤=9目`、`8路盤=10目`、`9路盤=7目` です。
- 明らかに死んでいる石は、終局時に死石として扱うヒューリスティック判定を行います。
- ミニ詰碁には、`6路盤` の問題を `第1問` から `第11問` まで入れています。

## 操作

- 盤面の交点をクリックすると石を置けます。
- すでに石がある交点には置けません。
- 自殺手は禁止です。
- コウは実装済みです。
- `戻す` と `進める` で手順を前後できます。
- `リセット` で盤面、手番、履歴、アゲハマを初期化します。
- ミニ詰碁は1手詰めなら最初の1手で、3手詰めや5手詰めなら白の応手を自動で進めながら読み筋を判定したあとも、そのまま続きを打って確認できます。
- `問題をリセット` で詰碁を最初からやり直せます。
- `第7問` と `第8問` は黒先白死の1手詰めで、白の2眼をつぶす急所に打った時点で正解です。
- `第9問` は左上の端で、必要最小限の白石に包まれた黒が最小6石の2眼を作る黒生き問題で、外すと0.5秒後に白の応手が1手ずつ自動で進みます。
- `第10問` は黒先黒生きの3手詰めで、中央の急所に打ったあと白の応手が0.5秒後に自動で入り、最後の黒で2眼を完成させます。
- `第11問` は公開情報の典型形を参考にした、角の急所を打つ黒先白死の5手詰めです。

## ルール

- 中国ルールを採用しています。
- 形勢は `石数 + 地 + コミ` で評価します。
- 死石の判定は完全な対局解析ではなく、実装上のヒューリスティックです。
- 終局後の死石判定は、明らかに生きていない連結成分を対象にしています。
- 詰碁の正解判定は、問題ごとに `白を取る`、`白の2眼をつぶして殺す`、`黒が2眼を作る` のどれかで見ています。
- 詰碁は正解でも不正解でも判定マークを表示したまま、続きの読みを進められます。
- `黒生き` 問題では、不正解時に0.5秒ごとの白自動応手で、数手かけて黒が追い詰められる流れを確認できます。
- 3手詰めや5手詰めでは、正しい初手のあとに白の応手を自動で進めて、最後の黒まで読み筋を判定します。
- 問題によっては `solutions.wrongFirstMoveDefense` を使って、不正解の初手に対する白の決め手を0.5秒後に自動で再現できます。

## 制約

- 整地の手動編集はありません。
- 棋譜保存、AI対戦、オンライン対戦はありません。
- 完全な死活判定ではありません。
- 盤面評価は終局時の簡易判定です。
- 詰碁一覧は簡易版で、現在は `第1問` から `第11問` を切り替えて遊べます。

## 起動方法

`index.html` をブラウザで開くだけで動きます。

## 正規データ

canonical は問題の唯一の元データです。UI や検証の都合で形を変えず、将来の再利用を優先して設計します。

### 必須フィールド

- `id`: 表示問題番号と一致する `problem-N`
- `title`: 表示問題番号と一致する `第N問`
- `boardSize`: 盤サイズ
- `initialPosition`: 初期盤面
- `turn`: 手番
- `goalType`: `capture` / `live` / `kill`
- `target`: 対象石または対象グループ
- `constraints`: コウ有無、深さ上限などの制約
- `solutions`: `winningFirstMoves`、必要なら `successCondition`、`principalVariation`、`alternativeLines`、`isUniqueFirstMove`、`wrongFirstMoveDefense`、`wrongGuidedMoveDefenses`
- `verification`: `status`、`shortestWinLength`、`nodeCount`、`bestDefenseLine`、必要なら `expectedFinalRows`、`verifiedAt`、`solverVersion`
- `metadata`: `difficulty`、`tags`、`source`、`author`、`createdAt`、`updatedAt`
- `ui`: `prompt`、`subtitle`、`note`、`hint`、`explanation`

### 設計ルール

- `ui` には表示文言だけを置きます。
- `metadata` には問題の本体情報や検証情報を混ぜません。
- `verification` は未検証でもよく、その場合は未検証であることを明示します。
- 主変化後の終形を固定したい問題は、`verification.expectedFinalRows` に6路盤の行文字列を置き、検証器で再現盤面と照合します。
- ブラウザで表示される問題番号を正とし、canonical 配列順、`id`、`title` を必ず一致させます。
- `target` は色だけでなく、座標群やグループ識別情報も持てる形にします。
- `solutions` は単一座標に固定せず、複数の初手や分岐に拡張できる形にします。
- 白の2眼をつぶした時点で死が確定する黒先白死は、`solutions.successCondition: "prevent-white-two-eyes"` を入れ、`principalVariation` を置かずに1手で正解にします。
- 誤答時に白の強制応手を UI で再現したい場合は、`solutions.wrongFirstMoveDefense` にその白手を入れます。
- `solutions.wrongFirstMoveDefense` を使う場合は、誤答直後に必ず合法で、狙った帰結を再現できる決め手だけを入れます。
- 主変化の途中で黒が外した時の白応手が汎用自動応手では足りない場合は、`solutions.wrongGuidedMoveDefenses` に `lineProgress` と白手を入れます。
- `initialPosition` は文字列配列または 2 次元配列で持ち、用途側で変換します。
- ブラウザ UI 用の状態値は canonical に入れません。

## 追加手順

1. `data/canonical/tsumego-canonical.json` を更新します。
2. 必要なら `verification` を更新し、未検証なら未検証として残します。
3. `data/export/web/tsumego-data.js` を再生成します。
4. `data/export/solver/tsumego-problems.json` を再生成します。
5. 必要に応じて `data/export/sgf/` を再生成します。
6. 検証スクリプトを回して、UI と solver の両方で破綻がないか確認します。

### 実行コマンド

```bash
node scripts/build-tsumego-exports.js
node scripts/validate-tsumego.js
```

## 再生成フロー

canonical を更新したら、まず export を作り直し、その後に検証します。

```text
data/canonical/tsumego-canonical.json
  -> data/export/web/tsumego-data.js
  -> data/export/solver/tsumego-problems.json
  -> 必要なら data/export/sgf/
```

この順番にしておくと、派生データが常に canonical と一致し、ブラウザ UI と検証器の結果がずれにくくなります。

## Export の役割

- `data/export/web/tsumego-data.js`: 現在のブラウザ UI が読む形式です。`script.js` はこの export を前提に動きます。
- `data/export/solver/tsumego-problems.json`: CLI、検証器、将来の AI 連携や問題管理ツールで使う形式です。
- `data/export/sgf/`: SGF 出力が必要になったときの拡張先です。

## 後方互換性

- 既存の問題 ID は変更しません。
- ブラウザ UI が必要とする最低限の情報は web export に残します。
- canonical の表現が増えても、web export 側で吸収して現行 UI を壊さない方針にします。
- 新規問題は web export への直接追記ではなく、canonical への追加を起点にします。

## 検証メモ

- 手早く見るだけなら `index.html` を直接ブラウザで開けば動きます。
- 継続的に確認するなら、プロジェクトのルートで `python3 -m http.server 4173` を実行して、`http://127.0.0.1:4173/` を開く運用が安定です。
- export の再生成は `node scripts/build-tsumego-exports.js` で行えます。
- データ整合性の確認は `node scripts/validate-tsumego.js` で行えます。
- ブラウザ確認では、正解表示、誤答表示、`黒生き` の自動応手、3手詰めの読み筋判定、問題切り替えの自然さを重点的に見ます。
