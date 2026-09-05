// synth.js — 顶替 Shadertoy 音乐通道的程序合成信号源。
//
// 原 shader 的 Buf A 从 iChannel0（512×2 音频纹理）的 v=0.75 行读波形。
// 这里每帧用几条正弦 + 慢速节拍包络合成 512 个采样写进 R8 纹理，
// GLSL 一行不用改；波形的高通滤波由 Buf A 自己完成，所以 0.5 中点偏置无害。
//
// 第 0 行（v=0.25，FFT 行）本 shader 不读，随便填个像样的包络占位。

const SIZE = 512;
const TAU = Math.PI * 2;

export class SynthWave {
  constructor() {
    this.data = new Uint8Array(SIZE * 2);
    // 频率/幅度/速度/相位四条分量，叠加出有机但平滑的波形
    this.comps = [
      { f: 3, a: 0.5, sp: 0.13, ph: 0.0 },
      { f: 7, a: 0.28, sp: -0.21, ph: 1.7 },
      { f: 13, a: 0.16, sp: 0.34, ph: 4.1 },
      { f: 23, a: 0.08, sp: -0.47, ph: 2.3 },
    ];
  }

  upload(gl, tex, t) {
    const d = this.data;
    // 慢节拍：能量整体呼吸，周期 ~3s，避免画面长亮不变化
    const beat = 0.55 + 0.45 * Math.pow(0.5 + 0.5 * Math.sin(t * 2.1), 6.0);
    for (let i = 0; i < SIZE; i++) {
      const x = i / SIZE;
      let v = 0;
      for (let k = 0; k < this.comps.length; k++) {
        const c = this.comps[k];
        v += c.a * Math.sin(TAU * (c.f * x + c.sp * t) + c.ph);
      }
      v *= beat;
      v = v > 1 ? 1 : v < -1 ? -1 : v;
      // 内存第二行 = 纹理 v=0.75 行（波形）；第一行 = v=0.25 行（FFT，未使用）
      d[SIZE + i] = Math.round(128 + v * 127);
      d[i] = Math.round(Math.min(1, Math.abs(v) * 1.4) * 255);
    }
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, SIZE, 2, gl.RED, gl.UNSIGNED_BYTE, d);
  }
}

// Buf A 的 iChannel2 原是 Shadertoy 内置噪声贴图，这里用静态随机纹理顶替。
// 坐标加了时间偏移且会越界，所以必须 REPEAT 包裹（createByteTexture 已配置）。
export function fillNoiseTexture(gl, tex, size) {
  const data = new Uint8Array(size * size);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 256) | 0;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, size, size, gl.RED, gl.UNSIGNED_BYTE, data);
}
