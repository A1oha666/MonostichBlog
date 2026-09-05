// renderer.js — pixelScreen 五通道管线：A(自反馈) → B → C → D → Image。
//
// 要点（详见 shaders/pixelScreen/WIRING.md）：
//  - 所有 render target 与画布同尺寸，降采样靠 shader 内部 discard 裁剪；
//  - Buf A 读自己上一帧，必须 ping-pong 两份纹理交替；
//  - iChannelResolution 如实传各来源纹理的像素尺寸，shader 全靠它定位有效区。

import {
  compilePass,
  destroyPass,
  createTarget,
  destroyTarget,
  createByteTexture,
  createFullscreenDraw,
} from "./gl-core.js";
import { SynthWave, fillNoiseTexture } from "./synth.js";

import fragBufA from "../../../shaders/pixelScreen/BufA.glsl?raw";
import fragBufB from "../../../shaders/pixelScreen/BufB.glsl?raw";
import fragBufC from "../../../shaders/pixelScreen/BufC.glsl?raw";
import fragBufD from "../../../shaders/pixelScreen/BufD.glsl?raw";
import fragImage from "../../../shaders/pixelScreen/Image.glsl?raw";

// —— 站点定制：单色（琥珀）。shaders/pixelScreen/*.glsl 保持原作原样，
// 改写全部在这里定点进行；锚点失配时直接抛错，上游源文件变动能立刻察觉。
// 1) RGB 循环 gamma（画面随时间换色的来源）→ 固定 gamma，保留原色调曲线
// 2) mainImage 末尾追加 亮度→琥珀 映射，辉光/拉丝/logo 统一成站点强调色
const GAMMA_ORIG =
  "vec3  gamma = 2.4 + vec3(1.3 * sin(t), 1.0 * sin(t * 2.0 + 0.75), 1.3 * sin(t + 3.0));";
const GAMMA_MONO = "vec3  gamma = vec3(2.2); // monostich: fixed, no color cycling";
const BLOOM_ORIG = "fragColor.rgb += 0.2 * vec3(level1 + level2 + level3);";
const BLOOM_MONO = "fragColor.rgb += 0.12 * vec3(level1 + level2 + level3); // monostich: softer bloom, keep grid definition";
const TAIL_ORIG = "fragColor.b = mix(fragColor.b, sclr.b, 1.0);\n}";
const TAIL_MONO = `fragColor.b = mix(fragColor.b, sclr.b, 1.0);
  // monostich: monochrome amber tint（深琥珀阴影 → 亮琥珀高光，保饱和）
  float _lum = dot(fragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 _amber = mix(vec3(1.0, 0.42, 0.02), vec3(1.0, 0.72, 0.22), _lum);
  fragColor.rgb = min(_lum * 1.35, 1.0) * _amber;
}`;

function toMonochromeAmber(src) {
  if (!src.includes(GAMMA_ORIG)) throw new Error("pixelScreen Image.glsl: gamma anchor not found");
  if (!src.includes(BLOOM_ORIG)) throw new Error("pixelScreen Image.glsl: bloom anchor not found");
  if (!src.includes(TAIL_ORIG)) throw new Error("pixelScreen Image.glsl: tail anchor not found");
  return src.replace(GAMMA_ORIG, GAMMA_MONO).replace(BLOOM_ORIG, BLOOM_MONO).replace(TAIL_ORIG, TAIL_MONO);
}

// 站点定制：降低对比度 + 加快亮度衰减，高亮方块更少、停留更短；anchor 失配即抛错。
const BUF_A_REWRITES = [
  // 6 次 smoothstep + pow(y, 3.0) 太极端，改为 3 次 + pow(y, 1.5)
  ["fragColor.y = smoothstep(0.0, 1.0, fragColor.y);\n" +
   "    fragColor.y = smoothstep(0.0, 1.0, fragColor.y);\n" +
   "    fragColor.y = smoothstep(0.0, 1.0, fragColor.y);\n" +
   "    fragColor.y = smoothstep(0.0, 1.0, fragColor.y);\n" +
   "    fragColor.y = smoothstep(0.0, 1.0, fragColor.y);\n" +
   "    fragColor.y = smoothstep(0.0, 1.0, fragColor.y);\n" +
   "    fragColor.y = pow(fragColor.y, 3.0);",
   "fragColor.y = smoothstep(0.0, 1.0, fragColor.y);\n" +
   "    fragColor.y = smoothstep(0.0, 1.0, fragColor.y);\n" +
   "    fragColor.y = smoothstep(0.0, 1.0, fragColor.y);\n" +
   "    fragColor.y = pow(fragColor.y, 1.5);"],
  // 指数平滑更灵敏：exp_n 27.57 → 8.0，高亮衰减更快
  ["float exp_n_at_60fps = 27.57142;", "float exp_n_at_60fps = 8.0; // monostich: faster decay"],
];

function toFineGrid(src) {
  let out = src;
  for (const [from, to] of BUF_A_REWRITES) {
    if (!out.includes(from)) throw new Error(`pixelScreen BufA.glsl: grid anchor not found: ${from}`);
    out = out.replace(from, to);
  }
  return out;
}

const NOISE_SIZE = 256;

export function createPixelScreen(gl) {
  const passA = compilePass(gl, toFineGrid(fragBufA));
  const passB = compilePass(gl, fragBufB);
  const passC = compilePass(gl, fragBufC);
  const passD = compilePass(gl, fragBufD);
  const passImage = compilePass(gl, toMonochromeAmber(fragImage));
  const draw = createFullscreenDraw(gl);

  const synth = new SynthWave();
  const synthTex = createByteTexture(gl, 512, 2);
  const noiseTex = createByteTexture(gl, NOISE_SIZE, NOISE_SIZE, { repeat: true });
  fillNoiseTexture(gl, noiseTex, NOISE_SIZE);

  let A0 = null; // Buf A 双份之一
  let A1 = null;
  let B = null;
  let C = null;
  let D = null;
  let W = 0;
  let H = 0;
  let frame = 0;
  const chRes = new Float32Array(12);

  function resize(w, h) {
    // 宽度取偶：mtc 的 normalize(length) 在 W、H 同为奇数时会命中 (0,0) 产生 NaN，
    // NaN 会经 bloom 扩散污染全屏。宽度为偶则 mtc.x 恒非零，规避。
    w = Math.max(96, Math.floor(w) & ~1);
    h = Math.max(96, Math.floor(h));
    if (w === W && h === H) return;
    W = w;
    H = h;
    for (const t of [A0, A1, B, C, D]) destroyTarget(gl, t);
    A0 = createTarget(gl, w, h);
    A1 = createTarget(gl, w, h);
    B = createTarget(gl, w, h);
    C = createTarget(gl, w, h);
    D = createTarget(gl, w, h);
    frame = 0; // iFrame=0 时 Buf A 自清缓冲
  }

  function runPass(pass, inputs, target, t, dt) {
    gl.useProgram(pass.prog);
    const u = pass.uniforms;
    gl.uniform3f(u.iResolution, target.w, target.h, 1);
    gl.uniform1f(u.iTime, t);
    gl.uniform1f(u.iTimeDelta, dt);
    gl.uniform1i(u.iFrame, frame);
    for (let i = 0; i < 4; i++) {
      const inp = inputs[i] || null;
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, inp ? inp.tex : null);
      gl.uniform1i(u["iChannel" + i], i);
      chRes[i * 3] = inp ? inp.w : 0;
      chRes[i * 3 + 1] = inp ? inp.h : 0;
      chRes[i * 3 + 2] = 1;
    }
    gl.uniform3fv(u.iChannelResolution, chRes);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.viewport(0, 0, target.w, target.h);
    draw();
  }

  const synthSrc = { tex: synthTex, w: 512, h: 2 };
  const noiseSrc = { tex: noiseTex, w: NOISE_SIZE, h: NOISE_SIZE };
  const screen = { tex: null, fbo: null, w: 0, h: 0 };

  function render(t, dt) {
    if (!A0) return;
    synth.upload(gl, synthTex, t);

    screen.w = W;
    screen.h = H;

    // read ← 上一帧的 A，write → 本帧写入
    const read = frame % 2 === 0 ? A0 : A1;
    const write = frame % 2 === 0 ? A1 : A0;

    runPass(passA, [synthSrc, read, noiseSrc, null], write, t, dt);
    runPass(passB, [write, null, null, null], B, t, dt);
    runPass(passC, [B, null, null, null], C, t, dt);
    runPass(passD, [C, null, null, null], D, t, dt);
    runPass(passImage, [write, B, C, D], screen, t, dt);

    frame++;
  }

  function destroy() {
    for (const p of [passA, passB, passC, passD, passImage]) destroyPass(gl, p);
    for (const tgt of [A0, A1, B, C, D]) destroyTarget(gl, tgt);
    gl.deleteTexture(synthTex);
    gl.deleteTexture(noiseTex);
    A0 = A1 = B = C = D = null;
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
  }

  return { resize, render, destroy };
}
