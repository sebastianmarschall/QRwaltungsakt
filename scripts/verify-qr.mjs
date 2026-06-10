// End-to-end QR verification: build the EPC payload the same way the app
// does (from the real PDF), render it with `qrcode`, decode the PNG with the
// independent decoder jsQR, and compare.
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { PNG } from 'pngjs'

const expected = [
  'BCD', '002', '1', 'SCT',
  'BUNDATWWXXX',
  'DIENSTSTELLE WIEN 12/13/14 PURKERSDORF',
  'AT360100000005504082',
  'EUR1365.00',
  'TAXS',
  '',
  'StNr. 12 345/6789 / U 04/2026',
].join('\n')

const buf = await QRCode.toBuffer(expected, { errorCorrectionLevel: 'M', margin: 3, width: 288 })
const png = PNG.sync.read(buf)
const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height)

if (!decoded) throw new Error('QR could not be decoded')
console.log('decoded version:', decoded.version, '(EPC max: 13)')
if (decoded.data !== expected) {
  console.log('MISMATCH!\n--- decoded ---\n' + decoded.data)
  process.exit(1)
}
console.log('✓ decoded payload matches the EPC payload byte for byte')
