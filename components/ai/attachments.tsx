"use client"

import Image from "next/image"
import {
  FileTextIcon,
  GlobeIcon,
  ImageIcon,
  Music2Icon,
  PaperclipIcon,
} from "lucide-react"
import type { HTMLAttributes, ReactNode } from "react"
import { createContext, useContext, useMemo } from "react"
import { cn } from "@/lib/utils"

type AttachmentData = {
  id: string
  type: "file" | "source-document"
  filename?: string
  title?: string
  url?: string
  mediaType?: string
}

type AttachmentVariant = "grid" | "inline" | "list"

type AttachmentContextValue = {
  data: AttachmentData
  variant: AttachmentVariant
}

const AttachmentContext = createContext<AttachmentContextValue | null>(null)

function useAttachmentContext() {
  const context = useContext(AttachmentContext)
  if (!context) {
    throw new Error("Attachment subcomponents must be used inside <Attachment>")
  }
  return context
}

function getMediaCategory(
  data: AttachmentData
): "image" | "video" | "audio" | "document" | "source" | "unknown" {
  if (data.type === "source-document") return "source"

  const mediaType = data.mediaType?.toLowerCase() ?? ""
  if (mediaType.startsWith("image/")) return "image"
  if (mediaType.startsWith("video/")) return "video"
  if (mediaType.startsWith("audio/")) return "audio"
  if (mediaType.includes("pdf") || mediaType.includes("word")) return "document"

  return "unknown"
}

function getAttachmentLabel(data: AttachmentData): string {
  if (data.type === "source-document") {
    return data.title?.trim() || "Source"
  }

  if (data.filename?.trim()) {
    return data.filename
  }

  return "Attachment"
}

type AttachmentsProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AttachmentVariant
}

export function Attachments({
  variant = "inline",
  className,
  children,
  ...props
}: AttachmentsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        variant === "grid" && "grid grid-cols-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

type AttachmentProps = HTMLAttributes<HTMLDivElement> & {
  data: AttachmentData
  variant?: AttachmentVariant
}

export function Attachment({
  data,
  variant = "inline",
  className,
  children,
  ...props
}: AttachmentProps) {
  const contextValue = useMemo(() => ({ data, variant }), [data, variant])

  return (
    <AttachmentContext.Provider value={contextValue}>
      <div
        className={cn(
          "group/attachment flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 p-1.5",
          variant === "grid" && "relative aspect-square overflow-hidden p-0",
          variant === "inline" && "max-w-55",
          variant === "list" && "w-full",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AttachmentContext.Provider>
  )
}

type AttachmentPreviewProps = HTMLAttributes<HTMLDivElement> & {
  fallbackIcon?: ReactNode
}

export function AttachmentPreview({
  fallbackIcon,
  className,
  ...props
}: AttachmentPreviewProps) {
  const { data, variant } = useAttachmentContext()
  const mediaCategory = getMediaCategory(data)

  const iconSize = variant === "inline" ? "size-3" : "size-4"

  const renderIcon = (Icon: typeof ImageIcon) =>
    fallbackIcon ?? <Icon className={cn(iconSize, "text-muted-foreground")} />

  const renderImage = (
    url: string,
    filename: string | undefined,
    isGrid: boolean
  ) =>
    isGrid ? (
      <Image
        alt={filename || "Image"}
        className="size-full object-cover"
        height={96}
        src={url}
        width={96}
      />
    ) : (
      <Image
        alt={filename || "Image"}
        className="size-full rounded object-cover"
        height={20}
        src={url}
        width={20}
      />
    )

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden",
        variant === "grid" && "size-full bg-muted",
        variant === "inline" && "size-5 rounded bg-background",
        variant === "list" && "size-12 rounded bg-muted",
        className
      )}
      {...props}
    >
      {mediaCategory === "image" && data.type === "file" && data.url ? (
        renderImage(data.url, data.filename, variant === "grid")
      ) : mediaCategory === "video" && data.type === "file" && data.url ? (
        <video className="size-full object-cover" muted src={data.url} />
      ) : mediaCategory === "audio" ? (
        renderIcon(Music2Icon)
      ) : mediaCategory === "document" ? (
        renderIcon(FileTextIcon)
      ) : mediaCategory === "source" ? (
        renderIcon(GlobeIcon)
      ) : (
        renderIcon(PaperclipIcon)
      )}
    </div>
  )
}

type AttachmentInfoProps = HTMLAttributes<HTMLDivElement> & {
  showMediaType?: boolean
}

export function AttachmentInfo({
  showMediaType = false,
  className,
  ...props
}: AttachmentInfoProps) {
  const { data, variant } = useAttachmentContext()
  const label = getAttachmentLabel(data)

  if (variant === "grid") {
    return null
  }

  return (
    <div className={cn("min-w-0 flex-1", className)} {...props}>
      <span className="block truncate">{label}</span>
      {showMediaType && data.mediaType && (
        <span className="block truncate text-xs text-muted-foreground">
          {data.mediaType}
        </span>
      )}
    </div>
  )
}
