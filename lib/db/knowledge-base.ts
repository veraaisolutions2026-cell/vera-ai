import { createServiceClient } from "@/lib/supabase/service"
import { getUserLayerAccess } from "@/lib/db/layer-access"
import type { Tables } from "@/types/supabase"

type ProfileRole = "admin" | "user" | "viewer"
export type KnowledgeBaseFile = Tables<"knowledge_base_files">
export type AgentKnowledgeBaseFile = Tables<"agent_knowledge_base_files">

type ActorContext = {
  userId: string
  role: ProfileRole
}

export type ListKnowledgeBaseFilesOptions = {
  scope?: KnowledgeBaseFile["scope"]
  ownerUserId?: string
  linkedToAgentId?: string
}

export type CreateKnowledgeBaseFileInput = {
  name: string
  mimeType: "application/pdf"
  sizeBytes: number
  storagePath: string
  bucket?: "knowledge-base-files"
  scope?: KnowledgeBaseFile["scope"]
  ownerUserId?: string | null
}

async function getActorContext(userId: string): Promise<ActorContext> {
  const service = createServiceClient()
  const { data, error } = await service
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single()

  if (error || !data) {
    throw new Error("Unable to resolve actor profile")
  }

  const role = data.role as ProfileRole
  return { userId, role }
}

function assertCanAccessFile(
  actor: ActorContext,
  file: Pick<KnowledgeBaseFile, "scope" | "owner_user_id">
): void {
  if (actor.role === "admin") return

  if (file.scope !== "user" || file.owner_user_id !== actor.userId) {
    throw new Error("Forbidden")
  }
}

async function assertCanManageAgent(
  actor: ActorContext,
  agentId: string
): Promise<void> {
  if (actor.role === "admin") return

  const service = createServiceClient()
  const { data, error } = await service
    .from("agents")
    .select("id")
    .eq("id", agentId)
    .eq("user_id", actor.userId)
    .eq("is_builtin", false)
    .single()

  if (error || !data) {
    throw new Error("Forbidden")
  }
}

async function assertCanManageKnowledgeBase(
  actor: ActorContext
): Promise<void> {
  if (actor.role === "admin") return

  const layerAccess = await getUserLayerAccess(actor.userId)
  if (!layerAccess.allowKnowledgeBaseManagement) {
    throw new Error("Forbidden")
  }
}

export async function listKnowledgeBaseFiles(
  actorUserId: string,
  options: ListKnowledgeBaseFilesOptions = {}
): Promise<KnowledgeBaseFile[]> {
  const actor = await getActorContext(actorUserId)
  await assertCanManageKnowledgeBase(actor)
  const service = createServiceClient()

  let query = service
    .from("knowledge_base_files")
    .select("*")
    .order("created_at", { ascending: false })

  if (actor.role !== "admin") {
    query = query.eq("scope", "user").eq("owner_user_id", actor.userId)
  } else {
    if (options.scope) {
      query = query.eq("scope", options.scope)
    }

    if (options.ownerUserId) {
      query = query.eq("owner_user_id", options.ownerUserId)
    }
  }

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as KnowledgeBaseFile[]
}

export async function createKnowledgeBaseFile(
  actorUserId: string,
  input: CreateKnowledgeBaseFileInput
): Promise<KnowledgeBaseFile> {
  const actor = await getActorContext(actorUserId)
  await assertCanManageKnowledgeBase(actor)
  const service = createServiceClient()

  if (input.mimeType !== "application/pdf") {
    throw new Error("Only PDF uploads are supported")
  }

  const scope = actor.role === "admin" ? (input.scope ?? "admin") : "user"
  const ownerUserId =
    actor.role === "admin"
      ? scope === "admin"
        ? null
        : (input.ownerUserId ?? actor.userId)
      : actor.userId

  const row = {
    name: input.name,
    mime_type: "application/pdf" as const,
    size_bytes: input.sizeBytes,
    storage_path: input.storagePath,
    bucket: input.bucket ?? "knowledge-base-files",
    scope,
    owner_user_id: ownerUserId,
    uploaded_by_user_id: actor.userId,
  }

  const { data, error } = await service
    .from("knowledge_base_files")
    .insert(row)
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create knowledge base file")
  }

  return data as KnowledgeBaseFile
}

export async function deleteKnowledgeBaseFile(
  actorUserId: string,
  fileId: string
): Promise<void> {
  const actor = await getActorContext(actorUserId)
  await assertCanManageKnowledgeBase(actor)
  const service = createServiceClient()

  const { data: file, error: fileError } = await service
    .from("knowledge_base_files")
    .select("id, scope, owner_user_id")
    .eq("id", fileId)
    .single()

  if (fileError || !file) {
    throw new Error("File not found")
  }

  assertCanAccessFile(actor, file)

  const { error } = await service
    .from("knowledge_base_files")
    .delete()
    .eq("id", fileId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function listAgentKnowledgeBaseLinks(
  actorUserId: string,
  agentId: string
): Promise<AgentKnowledgeBaseFile[]> {
  const actor = await getActorContext(actorUserId)
  await assertCanManageKnowledgeBase(actor)
  await assertCanManageAgent(actor, agentId)

  const service = createServiceClient()
  let query = service
    .from("agent_knowledge_base_files")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })

  if (actor.role !== "admin") {
    query = query.eq("linked_by_user_id", actor.userId)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as AgentKnowledgeBaseFile[]
}

export async function linkKnowledgeBaseFileToAgent(
  actorUserId: string,
  params: { agentId: string; fileId: string }
): Promise<AgentKnowledgeBaseFile> {
  const actor = await getActorContext(actorUserId)
  await assertCanManageKnowledgeBase(actor)
  const service = createServiceClient()

  await assertCanManageAgent(actor, params.agentId)

  const { data: file, error: fileError } = await service
    .from("knowledge_base_files")
    .select("id, scope, owner_user_id")
    .eq("id", params.fileId)
    .single()

  if (fileError || !file) {
    throw new Error("File not found")
  }

  assertCanAccessFile(actor, file)

  const { data, error } = await service
    .from("agent_knowledge_base_files")
    .upsert(
      {
        agent_id: params.agentId,
        file_id: params.fileId,
        linked_by_user_id: actor.userId,
      },
      { onConflict: "agent_id,file_id" }
    )
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to link file to agent")
  }

  return data as AgentKnowledgeBaseFile
}

export async function unlinkKnowledgeBaseFileFromAgent(
  actorUserId: string,
  params: { agentId: string; fileId: string }
): Promise<void> {
  const actor = await getActorContext(actorUserId)
  await assertCanManageKnowledgeBase(actor)
  const service = createServiceClient()

  await assertCanManageAgent(actor, params.agentId)

  if (actor.role !== "admin") {
    const { data: file, error: fileError } = await service
      .from("knowledge_base_files")
      .select("id, scope, owner_user_id")
      .eq("id", params.fileId)
      .single()

    if (fileError || !file) {
      throw new Error("File not found")
    }

    assertCanAccessFile(actor, file)
  }

  const { error } = await service
    .from("agent_knowledge_base_files")
    .delete()
    .eq("agent_id", params.agentId)
    .eq("file_id", params.fileId)

  if (error) {
    throw new Error(error.message)
  }
}
