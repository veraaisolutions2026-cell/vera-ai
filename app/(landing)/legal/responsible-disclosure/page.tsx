export default function ResponsibleDisclosurePage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-24 sm:px-8">
      <header className="mb-12">
        <h1 className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Responsible Disclosure Policy
        </h1>
        <p className="text-sm text-muted-foreground">Last updated: May 2026</p>
      </header>

      <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            1. Our Commitment
          </h2>
          <p>
            Vera AI Solutions takes the security of its platform and the privacy
            of its users seriously. We recognise that independent security
            researchers play a valuable role in identifying vulnerabilities. If
            you have discovered what you believe to be a security issue in Vera
            AI, we encourage you to disclose it responsibly so we can
            investigate and address it promptly.
          </p>
          <p className="mt-3">
            We commit to working with you in good faith, acknowledging your
            report promptly, keeping you informed of our progress, and not
            taking legal action against researchers who act within the scope of
            this policy.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            2. Scope
          </h2>
          <p className="mb-3">
            This policy applies to the following systems and assets owned and
            operated by Vera AI Solutions:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              The Vera AI web application and all routes under app.vera.ai
            </li>
            <li>The Vera AI marketing website at vera.ai</li>
            <li>All API endpoints under app.vera.ai/api</li>
            <li>
              Authentication flows including email/password and Google OAuth
            </li>
            <li>File upload and storage infrastructure</li>
            <li>Billing and subscription management flows</li>
          </ul>
          <p className="mt-3">The following are explicitly out of scope:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Third-party services including Supabase, Anthropic, Stripe, and
              Vercel infrastructure (report those to the respective vendors)
            </li>
            <li>Social engineering attacks targeting Vera AI staff</li>
            <li>Physical security of any facility</li>
            <li>Denial of service attacks</li>
            <li>
              Automated or high-volume scanning that disrupts service
              availability
            </li>
            <li>
              Vulnerabilities in browsers, operating systems, or other software
              not controlled by Vera AI Solutions
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            3. What We Ask of Researchers
          </h2>
          <p className="mb-3">
            When investigating potential vulnerabilities, we ask that you:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Only test against accounts you own or have explicit permission to
              test.
            </li>
            <li>
              Avoid accessing, modifying, or deleting data belonging to other
              users.
            </li>
            <li>
              Do not exfiltrate, retain, or share user data discovered during
              testing.
            </li>
            <li>
              Do not exploit a vulnerability beyond the minimum necessary to
              confirm it exists.
            </li>
            <li>
              Do not perform denial of service testing, brute force attacks, or
              automated scanning at a rate that could affect platform
              availability.
            </li>
            <li>
              Do not disclose the vulnerability publicly until we have had a
              reasonable opportunity to investigate and patch it.
            </li>
            <li>
              Report your findings to us before disclosing to any third party.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            4. What to Include in Your Report
          </h2>
          <p className="mb-3">
            A high-quality report helps us triage and resolve issues faster.
            Please include:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              A clear description of the vulnerability and its potential impact.
            </li>
            <li>The affected URL, endpoint, parameter, or component.</li>
            <li>Step-by-step reproduction instructions.</li>
            <li>
              Any payloads, proof-of-concept code, or screenshots that
              demonstrate the issue without disclosing actual user data.
            </li>
            <li>
              Your assessment of severity such as a CVSS score if applicable.
            </li>
            <li>
              Whether you have tested this against a production environment or a
              local instance.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            5. Our Response Process
          </h2>
          <p className="mb-3">Upon receiving a report:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-medium text-foreground">
                Acknowledgement
              </span>{" "}
              - We will acknowledge receipt of your report within 3 business
              days.
            </li>
            <li>
              <span className="font-medium text-foreground">Triage</span> - We
              will assess the validity and severity of the reported issue within
              10 business days.
            </li>
            <li>
              <span className="font-medium text-foreground">Remediation</span> -
              Critical vulnerabilities such as authentication bypass, data
              exposure, or privilege escalation will be prioritised and patched
              as quickly as possible, typically within 30 days. Less critical
              issues will be addressed in our normal development cycle.
            </li>
            <li>
              <span className="font-medium text-foreground">Notification</span>{" "}
              - We will notify you when the issue has been resolved.
            </li>
            <li>
              <span className="font-medium text-foreground">Coordination</span>{" "}
              - We ask that you allow us at least 90 days from initial report
              before any public disclosure, to allow time for patching and user
              protection.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            6. Vulnerability Categories We Want to Hear About
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Authentication and session management flaws such as session
              fixation or broken authentication
            </li>
            <li>
              Authorisation issues including broken object-level or field-level
              access controls and IDOR vulnerabilities
            </li>
            <li>
              Injection vulnerabilities such as SQL injection or command
              injection
            </li>
            <li>Cross-site scripting (XSS) in any form</li>
            <li>Cross-site request forgery (CSRF)</li>
            <li>
              Insecure direct object references exposing user data across
              accounts
            </li>
            <li>Row-level security (RLS) bypass in our Supabase database</li>
            <li>
              Exposure of secret keys, service-role tokens, or API credentials
            </li>
            <li>
              File upload vulnerabilities allowing execution of arbitrary code
            </li>
            <li>
              Payment flow vulnerabilities including subscription bypass or
              billing manipulation
            </li>
            <li>
              Prompt injection or AI safety issues within the agent system that
              could cause harm to users
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            7. Safe Harbour
          </h2>
          <p>
            Researchers who follow this policy in good faith will not face legal
            action from Vera AI Solutions. We consider responsible security
            research to be a legitimate and valuable activity. We will not refer
            reports to law enforcement where the researcher has complied with
            this policy. If legal action is initiated by a third party against a
            researcher for conduct consistent with this policy, Vera AI
            Solutions will make it known that the research was conducted in
            accordance with our guidelines.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            8. How to Report
          </h2>
          <p>
            Send your report by email to:{" "}
            <a
              href="mailto:info@veraaisolutions.com.au"
              className="text-foreground underline underline-offset-2 hover:opacity-70"
            >
              info@veraaisolutions.com.au
            </a>
            . Please encrypt sensitive reports using PGP if possible and request
            our public key in your initial message. Do not report security
            vulnerabilities through public GitHub issues, social media, or the
            general contact form.
          </p>
        </section>
      </div>
    </article>
  )
}
