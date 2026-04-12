import fs from 'node:fs/promises'
import path from 'node:path'

const redirectRules = `/api/* /.netlify/functions/:splat 200
/* /index.html 200
`

const outputPath = path.resolve('dist', '_redirects')

await fs.mkdir(path.dirname(outputPath), { recursive: true })
await fs.writeFile(outputPath, redirectRules, 'utf8')
