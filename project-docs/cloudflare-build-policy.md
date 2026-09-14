# Cloudflare ビルド監視方針

2026-09-14、ユーザーの「サービスに関係しない変更でCloudflareビルドを使わない」という指示に基づき確認しました。

このリポジトリに対応する `go-mini-app-tsumego-storage` は共有保存用Workerです。Cloudflare Workers BuildsのネイティブなGitビルドトリガーは登録されていないことをAPIで確認しました。したがって通常のGitHub pushだけで、このWorkerのビルドが起動する設定ではありません。

## 維持する運用

共有保存用Workerは必要なときだけ既存の `npm run cloudflare:deploy` で公開します。研究用のcanonical、検証用export、運用資料の変更を理由に、Cloudflare用の新しい自動デプロイを追加しません。

将来CloudflareとのGit自動連携を追加する際は、README・AGENTS・方針・作業再開メモ・`project-docs/*` を除外候補とし、WorkerコードとWrangler設定は必ず監視対象へ残します。UI側の `data/export/web/` は公開用であり、研究用データと区別します。GitHub Pagesの公開制御はCloudflareとは別です。

## 確認記録

- 全Workerのトリガー確認: https://github.com/Matsu71/Climbing_Game/actions/runs/34796898970
- 結果: `no-native-git-build-trigger`

存在しないビルド設定を「更新済み」とは扱いません。Worker本体、R2、既存データ、管理トークン、API設定は変更していません。
