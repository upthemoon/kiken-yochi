# 朝の KY

鉄塔工事の朝の危険予知 (KY) を、ベテランの職長の聞き方で作る道具です。
Built with Claude: Japan 2026 (2026-11-02〜11-08) の期間中に作りました。

現場の責任者がその日の作業を話すと、Claude が足りない情報を聞き返し、天気予報と過去のヒヤリハットを引いてから、
「危険・対策・確認する人」の形の KY 用紙と、やさしい日本語の読み上げ版を作ります。
夕方にヒヤッとしたことを記録すると、次に同じ作業をするときの用紙に入ります。

作業の中止・続行の最後の判断は、現場の責任者が行います。この道具は判断を代わりにしません。

## 動かし方

```
npm install
cp .env.example .env   # ANTHROPIC_API_KEY を書く
npm run dev            # http://localhost:8787
```

## 中身

- `src/ky.ts` 聞き取りと用紙づくり (Claude API・tool use・構造化出力)
- `src/weather.ts` 天気予報 (Open-Meteo・キー不要)。10 分間の平均風速 10m/s 以上の時間を知らせる
- `src/nearMiss.ts` ヒヤリハットの記録 (手元の JSON)。`data/near_misses.sample.json` の例はすべて架空です
- `public/` 画面

## ライセンス

MIT
