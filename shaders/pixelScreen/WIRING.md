# pixelScreen (Shadertoy `XdG3Wc`) — 通道接线表

作者：Dmitry Andreev (and'2016)
许可：CC BY-NC-SA 3.0

5 个 pass：**Buf A → Buf B → Buf C → Buf D**，外加 **Image** 合成。
所有 buffer 必须与画布**同分辨率**（代码靠「只用左上角」来省填充率，不能给 buffer 设缩放）。

| Pass | iChannel0 | iChannel1 | iChannel2 | iChannel3 |
|---|---|---|---|---|
| **Image** | Buf A | Buf B | Buf C | Buf D |
| **Buf A** | 音源 (Music/Sound) | **Buf A 自身**（反馈/上一帧） | 噪声贴图 | — |
| **Buf B** | Buf A | — | — | — |
| **Buf C** | Buf B | — | — | — |
| **Buf D** | Buf C | — | — | — |

补充设置：
- Buf A / B / C / D 都必须是**浮点 RT**（会存 >1 的值，如 `pow(y,12)*14`）。
- 采样 Filter 用 **Linear**，Wrap 用 **Clamp**。（Buf A 的 `iChannel1` 自反馈尤其不能开 mipmap。）
- Buf A 的 `iChannel0` 是 Shadertoy 音乐通道：512×2 纹理，`v=0.25` 行是 FFT，`v=0.75` 行是波形。本 shader 只用波形行。

## 各 buffer 的通道语义

- **Buf A `.x`** — 64×64 音频场（Hilbert 曲线排布）+ 第 70 行存元数据（分辨率 x/y、`fract(iTime)`）
- **Buf A `.y`** — 屏幕实际亮度（时间平滑后的像素屏画面）
- **Buf A `.z`** — `pow(.y, 12) * 14`，高光遮罩，供 anamorphic flare 用
- **Buf A `.w`** — 像素掩膜 + 黑位噪声
- **Buf B/C/D `.y`** — 常规 bloom（4× / 16× / 64× 降采样，5×5 盒滤）
- **Buf B/C/D `.z`** — anamorphic flare（只做水平模糊 → 横向拉丝）

## 降采样布局（关键坑）

B/C/D 输出仍是全画布尺寸，但只有左上角有效，且 flare 与 bloom 的有效区不同：

| Buffer | flare 有效区 | bloom 有效区 | 对应 `min()` 钳位 |
|---|---|---|---|
| Buf B | `x < W/4`，`y` 全高 | `[0,W/4] × [0,H/4]` | `vec2(1.0, 1.0)` / `vec2(1.0)` |
| Buf C | `x < W/16`，`y` 全高 | `[0,W/16] × [0,H/16]` | `vec2(1/4, 1.0)` / `vec2(1/4)` |
| Buf D | `x < W/64`，`y` 全高 | `[0,W/64] × [0,H/64]` | `vec2(1/16, 1.0)` / `vec2(1/16)` |

flare 只做水平 4× 降采样、垂直保持原分辨率（这就是「变形宽银幕」挤压），
Image pass 里用 `fragCoord / (vec2(4,1) * res)`（C 是 16、D 是 64）再横向拉回来。

## 时间轴

- `sin((iTime + 10.0) / 9.6)` 周期约 60.3 s，控制**侧屏（反射）淡入淡出**；
  同一信号取反后控制角落 **AND'16 logo** 的显示。
- `iTime * 0.15` 驱动 RGB gamma 循环 → 画面持续换色。

## 移植到 WebGL / Three.js

1. 建 5 个 RGBA16F render target，Buf A 需要 **ping-pong 双份**（读上一帧写下一帧）。
2. 每帧顺序：BufA(读 prevA) → BufB(读 A) → BufC(读 B) → BufD(读 C) → Image(读 A,B,C,D) → 交换 A。
3. 音频用 Web Audio `AnalyserNode.getByteTimeDomainData()` 写一张 512×2 的 `R8`/`Luminance` 纹理，
   第 1 行（v=0.75）放波形，第 0 行（v=0.25）放频谱；每帧更新。
4. `iChannelResolution[n]` 要如实传各自 RT 的像素尺寸。
5. B/C/D 里的 `discard` 是纯性能优化，移植时可保留。
