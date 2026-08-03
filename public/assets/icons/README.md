# スキルアイコン画像の配置について

このフォルダに、各スキルIDと同じファイル名(`<スキルID>.png`)で画像を置くと、
スキル操作欄のボタンに自動で表示されます。ファイルが無いスキルはこれまで通り
テキスト表示のままになります(読み込みエラー時は自動でテキストへフォールバック)。

- 画像サイズの目安: 正方形(例: 64×64px 以上)。`object-fit: cover` で表示するため、
  正方形でない画像は中央基準でトリミングされます。
- 形式: `.png` 固定です(コードは `assets/icons/<スキルID>.png` を参照します)。
- 「置き換わり」対象のスキル(エクスジビトゥ、ヴォイドリーパーなど)は、
  ボタン自体は1つでも表示中の実体が切り替わるため、置き換わり先の画像も
  別途用意してください。

## 必要なファイル名一覧(スキルID.png)

### ウェポンスキル／スペル

| ファイル名 | スキル名 |
|---|---|
| slice.png | スライス |
| waxingSlice.png | ワクシングスライス |
| infernalSlice.png | インファナルスライス |
| shadowOfDeath.png | シャドウ・オブ・デス |
| soulSlice.png | ソウルスライス |
| gibbet.png | ジビトゥ |
| gallows.png | ギャロウズ |
| executionersGibbet.png | エクスジビトゥ（置き換わり先） |
| executionersGallows.png | エクスギャロウズ（置き換わり先） |
| voidReaping.png | ヴォイドリーパー（置き換わり先） |
| crossReaping.png | クロスリーパー（置き換わり先） |
| communio.png | コムニオ |
| perfectio.png | ペルフェクティオ（置き換わり先） |
| harpe.png | ハルパー |
| spinningScythe.png | スピニングサイズ |
| whorlOfDeath.png | ワーラル・オブ・デス |
| nightmareScythe.png | ナイトメアサイズ |
| soulScythe.png | ソウルサイズ |
| guillotine.png | ギロティン |
| executionersGuillotine.png | エクスギロティン（置き換わり先） |
| grimReaping.png | グリムリーパー（置き換わり先） |
| soulSow.png | ソウルソウ |
| harvestMoon.png | ハーベストムーン（置き換わり先） |
| plentifulHarvest.png | プレンティフルハーベスト |

### アビリティ

| ファイル名 | スキル名 |
|---|---|
| stalkSwathe.png | ストークスウェーズ |
| lemureSlice.png | レムールスライス（置き換わり先） |
| gluttony.png | グラトニー |
| sacrificium.png | サクリフィキウム（置き換わり先） |
| enshroud.png | レムールシュラウド |
| arcaneCircle.png | アルケインサークル |
| hellsIngress.png | ヘルズイングレス |
| hellsEgress.png | ヘルズイーグレス |
| arcaneCrest.png | アルケインクレスト |
| shiffSwathe.png | シーフスウェーズ |
| lemureScythe.png | レムールサイズ（置き換わり先） |
| gibbetClaw.png | ジビトゥクロウ |
| gallowsClaw.png | ギャロウズクロウ |
| returnAction.png | リターン |

### ロールアクション

| ファイル名 | スキル名 |
|---|---|
| secondWind.png | 内丹 |
| legSweep.png | レッグスウィープ |
| bloodbath.png | ブラッドバス |
| feint.png | 牽制 |
| armsLength.png | アームズレングス |
| trueNorth.png | トゥルーノース |
