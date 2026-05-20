import Link from "next/link"
import { VeraLogo } from "@/components/ui/vera-logo"

const RESOURCES_LINKS = [
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
  { label: "Log in", href: "/login" },
  { label: "Sign up", href: "/register" },
]

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/legal/privacy-policy" },
  {
    label: "Responsible Disclosure Policy",
    href: "/legal/responsible-disclosure",
  },
  { label: "Terms of Service", href: "/legal/terms-of-service" },
  { label: "Usage Policy", href: "/legal/usage-policy" },
]

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-3 lg:grid-cols-4">
          {/* Brand col */}
          <div className="flex flex-col justify-between gap-8 sm:col-span-1 lg:col-span-2">
            <Link href="/" aria-label="Go to homepage" className="w-fit">
              <VeraLogo width={80} height={22} variant="wide" />
            </Link>

            <div className="flex flex-col gap-1.5">
              {/* "By Vera AI Solutions" SVG text */}
              <svg
                width="180"
                height="14"
                viewBox="0 0 180 14"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="text-muted-foreground/50"
              >
                <text
                  x="0"
                  y="12"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                  fontSize="11"
                  fontWeight="700"
                  letterSpacing="0.1em"
                  textAnchor="start"
                >
                  BY VERA AI SOLUTIONS
                </text>
              </svg>

              <span className="text-[11px] font-medium text-muted-foreground/40">
                © {new Date().getFullYear()} VERA AI SOLUTIONS
              </span>
            </div>
          </div>

          {/* Resources */}
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-semibold tracking-widest text-foreground/40 uppercase">
              Resources
            </p>
            <ul className="flex flex-col gap-2">
              {RESOURCES_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Terms & Policies */}
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-semibold tracking-widest text-foreground/40 uppercase">
              Terms &amp; Policies
            </p>
            <ul className="flex flex-col gap-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}
