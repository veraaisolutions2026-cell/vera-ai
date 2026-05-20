import Link from "next/link"
import { VeraLogo } from "@/components/ui/vera-logo"

export function AuthHeader({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <Link href="/" aria-label="Go to Vera AI home">
        <VeraLogo width={140} height={45} />
      </Link>
      <h1 className="text-lg font-medium">{title}</h1>
    </div>
  )
}
