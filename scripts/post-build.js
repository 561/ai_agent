#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const releaseDir = path.join(__dirname, '..', 'release')

if (!fs.existsSync(releaseDir)) {
  console.log('\nBuild output directory not found.')
  process.exit(0)
}

const exts = ['.deb', '.appimage', '.exe', '.dmg', '.rpm']

// For each extension, pick the most recently modified file
const latest = new Map()
for (const f of fs.readdirSync(releaseDir)) {
  const ext = path.extname(f).toLowerCase()
  if (!exts.includes(ext)) continue
  const full = path.join(releaseDir, f)
  const mtime = fs.statSync(full).mtimeMs
  if (!latest.has(ext) || mtime > latest.get(ext).mtime) {
    latest.set(ext, { file: f, mtime })
  }
}

const files = [...latest.entries()].map(([ext, { file }]) => ({ file, ext }))

if (files.length === 0) {
  console.log('\nNo installable artifacts found in release/.')
  process.exit(0)
}

console.log('\n\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m')
console.log('\x1b[32m  Build complete. Install commands:\x1b[0m')
console.log('\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m')

for (const { file, ext } of files) {
  const filePath = `release/${file}`

  switch (ext) {
    case '.deb':
      console.log(`\n  \x1b[33m.deb\x1b[0m`)
      console.log(`  \x1b[36msudo dpkg -i ${filePath}\x1b[0m`)
      break
    case '.appimage':
      console.log(`\n  \x1b[33m.AppImage\x1b[0m`)
      console.log(`  \x1b[36mchmod +x ${filePath} && ./${filePath}\x1b[0m`)
      break
    case '.rpm':
      console.log(`\n  \x1b[33m.rpm\x1b[0m`)
      console.log(`  \x1b[36msudo rpm -i ${filePath}\x1b[0m`)
      break
    case '.exe':
      console.log(`\n  \x1b[33m.exe\x1b[0m`)
      console.log(`  \x1b[36m${filePath}\x1b[0m`)
      break
    case '.dmg':
      console.log(`\n  \x1b[33m.dmg\x1b[0m`)
      console.log(`  \x1b[36mopen ${filePath}\x1b[0m`)
      break
  }
}

console.log('\n\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n')
