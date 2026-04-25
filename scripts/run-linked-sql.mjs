import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { spawnSync } from "node:child_process"

const inputFile = process.argv[2]

if (!inputFile) {
  console.error("Usage: pnpm db:apply <sql-file-path>")
  process.exit(1)
}

const filePath = resolve(process.cwd(), inputFile)

if (!existsSync(filePath)) {
  console.error(`SQL file not found: ${filePath}`)
  process.exit(1)
}

const sql = readFileSync(filePath, "utf8")
if (!sql.trim()) {
  console.error(`SQL file is empty: ${filePath}`)
  process.exit(1)
}

const result = spawnSync("supabase", ["db", "query", "--linked"], {
  cwd: process.cwd(),
  input: sql,
  stdio: ["pipe", "inherit", "inherit"],
  encoding: "utf8",
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1)
}

console.log(`Applied SQL file: ${inputFile}`)
