import fs from 'node:fs'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { generateText, gateway } from 'ai'

const LARGE_FILE_THRESHOLD_BYTES = 512 * 1024
const MAX_SUMMARY_OUTPUT_TOKENS = 1800
const MAX_SUMMARY_CHARS = 12_000
const SUMMARY_MODEL_ID = 'claude-sonnet-4.6'
const SUMMARY_GATEWAY_MODEL_ID = 'anthropic/claude-sonnet-4.6'
const SUMMARY_FALLBACK_MODELS = ['google/gemini-3.5-flash']

function loadEnvFiles() {
  for (const file of ['.env.local', '.env']) {
    if (!fs.existsSync(file)) continue

    for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue

      const eq = line.indexOf('=')
      if (eq === -1) continue

      const key = line.slice(0, eq).trim()
      let value = line.slice(eq + 1).trim()

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      if (!(key in process.env)) {
        process.env[key] = value
      }
    }
  }
}

function parseArgs(argv) {
  const options = {
    limit: Number.POSITIVE_INFINITY,
    linkedOnly: false,
    dryRun: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === '--linked-only') {
      options.linkedOnly = true
      continue
    }

    if (arg === '--dry-run') {
      options.dryRun = true
      continue
    }

    if (arg === '--limit') {
      const value = argv[i + 1]
      const parsed = Number.parseInt(value ?? '', 10)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error('Expected a positive integer after --limit')
      }

      options.limit = parsed
      i += 1
      continue
    }
  }

  return options
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim()
  const gatewayApiKey = process.env.AI_GATEWAY_API_KEY?.trim()

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase service credentials in environment')
  }

  if (!gatewayApiKey) {
    throw new Error('Missing AI_GATEWAY_API_KEY in environment')
  }

  return { url, serviceKey }
}

function createSupabase() {
  const { url, serviceKey } = getSupabaseConfig()

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function trimSummary(text) {
  const normalized = text.trim().replace(/\n{3,}/g, '\n\n')
  if (normalized.length <= MAX_SUMMARY_CHARS) {
    return normalized
  }

  return `${normalized.slice(0, MAX_SUMMARY_CHARS - 3).trimEnd()}...`
}

function sortFilesForBackfill(files) {
  return [...files].sort((left, right) => {
    const linkedDelta = Number(right.link_status === 'linked-to-agent') - Number(left.link_status === 'linked-to-agent')
    if (linkedDelta !== 0) return linkedDelta

    const sizeDelta = right.size_bytes - left.size_bytes
    if (sizeDelta !== 0) return sizeDelta

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  })
}

async function listTargetFiles(supabase, options) {
  const { data, error } = await supabase
    .from('knowledge_base_files')
    .select('*')
    .eq('mime_type', 'application/pdf')
    .gte('size_bytes', LARGE_FILE_THRESHOLD_BYTES)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const filtered = (data ?? []).filter((file) => {
    if (options.linkedOnly && file.link_status !== 'linked-to-agent') {
      return false
    }

    return !file.summary_text?.trim()
  })

  return sortFilesForBackfill(filtered).slice(0, options.limit)
}

async function getSignedUrl(supabase, file) {
  const { data, error } = await supabase.storage
    .from(file.bucket)
    .createSignedUrl(file.storage_path, 60 * 60)

  if (error || !data?.signedUrl) {
    throw error ?? new Error(`Could not sign ${file.id}`)
  }

  return data.signedUrl
}

async function generateSummaryForFile(file, signedUrl) {
  const result = await generateText({
    model: gateway(SUMMARY_GATEWAY_MODEL_ID),
    providerOptions: {
      gateway: {
        apiKey: process.env.AI_GATEWAY_API_KEY,
        models: SUMMARY_FALLBACK_MODELS,
      },
    },
    maxRetries: 2,
    timeout: 120_000,
    maxOutputTokens: MAX_SUMMARY_OUTPUT_TOKENS,
    system:
      'You summarise audit knowledge-base documents for downstream agent use. Be concise, faithful, and specific. Do not invent facts or use filler.',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Summarise the attached document "${file.name}" for later agent reasoning. Produce a compact but information-dense briefing with these sections: Overview, Key Topics, Important Definitions, Notable Rules or Exceptions, Search Terms, and Likely Question Areas. Keep the response under 1,200 words.`,
          },
          {
            type: 'file',
            mediaType: file.mime_type,
            filename: file.name,
            data: signedUrl,
          },
        ],
      },
    ],
  })

  return trimSummary(result.text)
}

async function persistSummary(supabase, fileId, summaryText) {
  const { error } = await supabase
    .from('knowledge_base_files')
    .update({
      summary_text: summaryText,
      summary_model: SUMMARY_MODEL_ID,
      summary_generated_at: new Date().toISOString(),
    })
    .eq('id', fileId)

  if (error) {
    throw error
  }
}

async function main() {
  loadEnvFiles()
  const options = parseArgs(process.argv.slice(2))
  const supabase = createSupabase()
  const files = await listTargetFiles(supabase, options)

  console.log(
    JSON.stringify(
      {
        phase: 'discover',
        candidates: files.length,
        linkedOnly: options.linkedOnly,
        dryRun: options.dryRun,
        limit: Number.isFinite(options.limit) ? options.limit : null,
      },
      null,
      2
    )
  )

  if (options.dryRun || files.length === 0) {
    return
  }

  let successCount = 0
  const failures = []

  for (const [index, file] of files.entries()) {
    try {
      const signedUrl = await getSignedUrl(supabase, file)
      const summary = await generateSummaryForFile(file, signedUrl)

      if (!summary) {
        throw new Error('Empty summary generated')
      }

      await persistSummary(supabase, file.id, summary)
      successCount += 1

      console.log(
        JSON.stringify(
          {
            phase: 'backfill',
            position: index + 1,
            total: files.length,
            fileId: file.id,
            fileName: file.name,
            linkStatus: file.link_status,
            summaryLength: summary.length,
          },
          null,
          2
        )
      )
    } catch (error) {
      failures.push({
        fileId: file.id,
        fileName: file.name,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  console.log(
    JSON.stringify(
      {
        phase: 'complete',
        attempted: files.length,
        succeeded: successCount,
        failed: failures.length,
        failures,
      },
      null,
      2
    )
  )

  if (failures.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        phase: 'fatal',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2
    )
  )
  process.exitCode = 1
})