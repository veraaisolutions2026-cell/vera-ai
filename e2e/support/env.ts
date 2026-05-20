import fs from "node:fs"
import path from "node:path"

const ENV_FILE_NAMES = [".env.local", ".env"] as const

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}

export function loadLocalEnvFiles(): void {
  for (const fileName of ENV_FILE_NAMES) {
    const filePath = path.join(process.cwd(), fileName)
    if (!fs.existsSync(filePath)) {
      continue
    }

    const content = fs.readFileSync(filePath, "utf8")

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith("#")) {
        continue
      }

      const separatorIndex = line.indexOf("=")
      if (separatorIndex === -1) {
        continue
      }

      const key = line.slice(0, separatorIndex).trim()
      if (!key || key in process.env) {
        continue
      }

      const rawValue = line.slice(separatorIndex + 1).trim()
      process.env[key] = stripWrappingQuotes(rawValue)
    }
  }
}
