# 0.66 干员资料

核对日期：2026-09-15。数值、回合持续时间、协同触发和费用均为本同人游戏设计，不代表原作参数。

- 牧羊人、比特、银翼：[Garena 官方干员目录](https://deltaforce.garena.com/zh_tw/?redirect=0)，并与本地 `assets/wiki-data.js` 已整理的官方技能资料交叉核对。
- 旅人：[S11 官方更新公告](https://deltaforce.garena.com/zh_tw/news/all/KX539B)，军犬协同、气雾针剂枪、刺激性烟雾、求生专家。

## 尚未下载的官方立绘

本机网络将官方游戏素材域名重定向至网络过滤页，HTTPS 连接被重置。未绕过网络限制，未将其他角色立绘冒用为新干员。
当前使用明确写有“官方立绘待补”的本地档案占位图；图标沿用项目 Lucide 图形，许可见 `assets/haff-war/icons/LICENSE`。

- 牧羊人：https://web.df.garena.com/02_h5/240923_official_website/zh_tw/pc/operator_list_02.jpg
- 比特：https://web.df.garena.com/02_h5/240923_official_website/zh_tw/pc/operator_list_013.jpg
- 银翼：https://web.df.garena.com/02_h5/240923_official_website/zh_tw/pc/operator_list_012.jpg
- 旅人：https://web.df.garena.com/03_news/news_banner/260905/image2.jpg

替换时先核对实际人物和图片尺寸，再更新 `haff-war-core.js` 的图片地址与裁切参数，移除 `portraitNote` 的待补标记。
