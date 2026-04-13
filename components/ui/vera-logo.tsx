import Image from "next/image"
import { cn } from "@/lib/utils"

// Wide logo ratio: 590×160 = 3.6875:1
// Short logo: 500×500 (square)
// Uses CSS dark-mode classes — no client component needed, no hydration flash.

type Props = {
  width: number
  height: number
  className?: string
  priority?: boolean
  variant?: "wide" | "short"
}

export function VeraLogo({
  width,
  height,
  className,
  priority = true,
  variant = "wide",
}: Props) {
  const light =
    variant === "short" ? "/vera-black-short.png" : "/vera-black.png"
  const dark = variant === "short" ? "/vera-white-short.png" : "/vera-white.png"

  return (
    <span className={cn("inline-flex shrink-0", className)}>
      {/* Light mode */}
      <Image
        src={light}
        alt="Vera AI"
        width={width}
        height={height}
        className="object-contain dark:hidden"
        priority={priority}
      />
      {/* Dark mode */}
      <Image
        src={dark}
        alt="Vera AI"
        width={width}
        height={height}
        className="hidden object-contain dark:block"
        priority={priority}
      />
    </span>
  )
}
