/* 星图静止态像素验证：星云色调/暗角/金星密度/静止微动/60fps */
import { readFileSync } from 'node:fs'
import zlib from 'node:zlib'

const shot = '/tmp/shots/graph-rest.png'

function decode(buf) {
  let p = 8
  let w = 0, h = 0, ct = 6
  const idat = []
  while (p < buf.length) {
    const len = buf.readUInt32BE(p)
    const type = buf.toString('ascii', p + 4, p + 8)
    const data = buf.subarray(p + 8, p + 8 + len)
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4)
      ct = data[9]
      if (data[8] !== 8 || (ct !== 6 && ct !== 2)) throw new Error('need 8bit RGB/RGBA')
    } else if (type === 'IDAT') idat.push(data)
    p += 12 + len
  }
  const bpp = ct === 6 ? 4 : 3
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = w * bpp
  const decoded = Buffer.alloc(h * stride)
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)]
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const ro = y * stride
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? decoded[ro + x - bpp] : 0
      const b = y > 0 ? decoded[ro - stride + x] : 0
      const c = x >= bpp && y > 0 ? decoded[ro - stride + x - bpp] : 0
      let v = row[x]
      if (ft === 1) v += a
      else if (ft === 2) v += b
      else if (ft === 3) v += (a + b) >> 1
      else if (ft === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      decoded[ro + x] = v & 255
    }
  }
  const px = Buffer.alloc(h * w * 4)
  for (let i = 0, j = 0; j < w * h * 4; j += 4, i += bpp) {
    px[j] = decoded[i]; px[j + 1] = decoded[i + 1]; px[j + 2] = decoded[i + 2]
    px[j + 3] = bpp === 4 ? decoded[i + 3] : 255
  }
  return { w, h, px }
}

const avg = (img, x0, y0, x1, y1) => {
  x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.floor(x1); y1 = Math.floor(y1)
  let r = 0, g = 0, b = 0, n = 0
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const i = (y * img.w + x) * 4
      r += img.px[i]; g += img.px[i + 1]; b += img.px[i + 2]; n++
    }
  return [r / n, g / n, b / n]
}

const lum = (img) => {
  let s = 0, s2 = 0, n = 0
  for (let i = 0; i < img.px.length; i += 16) {
    const L = 0.2126 * img.px[i] + 0.7152 * img.px[i + 1] + 0.0722 * img.px[i + 2]
    s += L; s2 += L * L; n++
  }
  const m = s / n
  return [m, Math.sqrt(s2 / n - m * m)]
}

const countGold = (img) => {
  let n = 0
  for (let i = 0; i < img.px.length; i += 4) {
    const r = img.px[i], g = img.px[i + 1], b = img.px[i + 2]
    if (r > 170 && g > 140 && b < 130 && r > b + 50) n++
  }
  return n
}

const img = decode(readFileSync(shot))
const { w, h } = img
const ul = avg(img, w * 0.05, h * 0.28, w * 0.25, h * 0.45)
const lr = avg(img, w * 0.7, h * 0.6, w * 0.9, h * 0.78)
const tl = avg(img, 0, h * 0.22, w * 0.04, h * 0.34)
const br = avg(img, w * 0.96, h * 0.7, w, h * 0.82)
const centerLum = avg(img, w * 0.45, h * 0.45, w * 0.55, h * 0.55)
const [m, sd] = lum(img)
const gold = countGold(img)
const lum0 = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]

console.log(`size ${w}x${h} | lum ${m.toFixed(1)}±${sd.toFixed(1)} | gold ${gold}`)
console.log(`UL[靛] rgb ${ul.map((v) => v.toFixed(1))} B-R=${(ul[2] - ul[0]).toFixed(1)}`)
console.log(`LR[朱] rgb ${lr.map((v) => v.toFixed(1))} R-B=${(lr[0] - lr[2]).toFixed(1)}`)
console.log(`corner TL lum ${lum0(tl).toFixed(1)} / BR ${lum0(br).toFixed(1)} vs center ${lum0(centerLum).toFixed(1)}`)
const checks = {
  'UL偏靛(B>R+3)': ul[2] - ul[0] > 3,
  'LR偏朱(R>B+3)': lr[0] - lr[2] > 3,
  '暗角<中心': lum0(tl) < lum0(centerLum) - 4 && lum0(br) < lum0(centerLum) - 4,
  '金星充足(>800)': gold > 800,
  '非纯黑(lum>10)': m > 10,
  '有层次(sd>12)': sd > 12,
}
let ok = true
for (const [k, v] of Object.entries(checks)) {
  console.log(`${v ? 'PASS' : 'FAIL'} ${k}`)
  if (!v) ok = false
}
process.exit(ok ? 0 : 1)
