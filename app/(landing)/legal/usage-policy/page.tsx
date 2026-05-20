export default function UsagePolicyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-24 sm:px-8">
      <header className="mb-12">
        <h1 className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Usage Policy
        </h1>
        <p className="text-sm text-muted-foreground">Last updated: May 2026</p>
      </header>

      <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            1. Purpose
          </h2>
          <p>
            This Usage Policy defines the standards of acceptable and
            unacceptable behaviour on the Vera AI platform. It applies to all
            users regardless of plan or role. Vera AI is designed specifically
            for professional audit and compliance workflows. We maintain these
            standards to protect users, third parties, and the integrity of the
            platform.
          </p>
          <p className="mt-3">
            Violations of this policy may result in suspension or permanent
            termination of your account, without refund, at our sole discretion.
            In serious cases, we may refer matters to relevant authorities.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            2. Permitted Uses
          </h2>
          <p className="mb-3">
            The Vera AI platform is intended for the following professional
            purposes:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Reviewing, summarising, and analysing financial statements, audit
              evidence, and compliance documentation.
            </li>
            <li>
              Drafting audit observations, management letters, internal memos,
              and working papers.
            </li>
            <li>
              Cross-referencing audit evidence against regulatory criteria or
              internal standards.
            </li>
            <li>
              Building and using custom AI agents configured to assist with
              specific audit methodologies, client sectors, or regulatory
              frameworks.
            </li>
            <li>
              Uploading and querying PDF and Word documents as part of an audit
              engagement workflow.
            </li>
            <li>
              Using the platform for professional development, learning, and
              research into AI-assisted auditing.
            </li>
            <li>
              Exporting conversations and AI-generated outputs for inclusion in
              audit files, subject to professional review.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            3. Prohibited Uses
          </h2>
          <p className="mb-3">The following uses are strictly prohibited:</p>

          <h3 className="mb-2 text-sm font-semibold text-foreground">
            3.1 Illegal and Harmful Activity
          </h3>
          <ul className="mb-4 list-disc space-y-2 pl-5">
            <li>
              Using the platform to facilitate fraud, money laundering, tax
              evasion, or any other criminal activity.
            </li>
            <li>
              Generating content designed to deceive, defraud, or harm any
              person, organisation, or regulatory body.
            </li>
            <li>
              Creating or distributing false audit opinions, fabricated
              financial records, or misleading compliance documentation.
            </li>
            <li>
              Using AI outputs to misrepresent audit findings to clients,
              regulators, or any third party.
            </li>
          </ul>

          <h3 className="mb-2 text-sm font-semibold text-foreground">
            3.2 Data That Must Not Be Submitted
          </h3>
          <p className="mb-2">You must not upload or submit to the platform:</p>
          <ul className="mb-4 list-disc space-y-2 pl-5">
            <li>
              Personal data of individuals such as client staff records or
              identification documents unless you have a lawful basis for
              processing that data in accordance with applicable privacy law.
            </li>
            <li>
              Data belonging to other organisations that you have no right to
              process or disclose.
            </li>
            <li>
              Passwords, cryptographic keys, secret tokens, or authentication
              credentials of any system.
            </li>
            <li>
              Classified or government-restricted information unless explicitly
              authorised for use on commercial AI platforms.
            </li>
            <li>
              Content that infringes the intellectual property rights of any
              third party.
            </li>
          </ul>

          <h3 className="mb-2 text-sm font-semibold text-foreground">
            3.3 Platform Abuse
          </h3>
          <ul className="mb-4 list-disc space-y-2 pl-5">
            <li>
              Attempting to bypass plan limits, usage quotas, or billing
              controls through any technical or non-technical means.
            </li>
            <li>
              Sharing account credentials or allowing multiple individuals to
              access the platform under a single account simultaneously.
            </li>
            <li>
              Using automated bots, scripts, or programs to send requests to the
              platform at a rate exceeding normal human usage.
            </li>
            <li>
              Reselling, relicensing, or providing access to the platform to
              third parties without an authorised white-label or reseller
              agreement.
            </li>
            <li>
              Attempting to extract, clone, or reverse engineer the underlying
              AI models, system prompts of built-in agents, or platform source
              code.
            </li>
          </ul>

          <h3 className="mb-2 text-sm font-semibold text-foreground">
            3.4 Harmful and Offensive Content
          </h3>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Attempting to use the platform to generate content that is
              hateful, discriminatory, defamatory, or harassing toward any
              individual or group.
            </li>
            <li>
              Attempting to use the platform to produce sexual, violent, or
              otherwise harmful content.
            </li>
            <li>
              Deliberately crafting prompts intended to circumvent the safety
              guidelines of the underlying Claude AI models.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            4. Professional Standards
          </h2>
          <p className="mb-3">
            Users of Vera AI who are qualified audit or accounting professionals
            must adhere to the ethical obligations of their professional body
            even when using AI-generated outputs. Specifically:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              AI-generated analysis, observations, or opinions must be reviewed
              and validated by a qualified professional before being relied upon
              or communicated to clients or regulators.
            </li>
            <li>
              The platform is a tool to assist professional judgement, not
              replace it. You retain full professional responsibility for all
              work product that incorporates AI-generated content.
            </li>
            <li>
              Uploading client confidential information must comply with any
              confidentiality obligations in your engagement terms and
              applicable professional standards.
            </li>
            <li>
              You must not represent AI-generated content as the product of your
              own original analysis without appropriate disclosure where
              required by professional standards.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            5. AI Model Guidelines
          </h2>
          <p className="mb-3">
            Vera AI uses Claude models provided by Anthropic. All requests are
            also subject to Anthropic&apos;s usage policies. We pass requests
            through Anthropic&apos;s API and their content filtering and safety
            systems apply in addition to ours. We will not assist users in
            attempting to circumvent Anthropic&apos;s safety measures.
          </p>
          <p>
            By using the platform, you acknowledge that AI model outputs may
            vary, may contain errors, and are not a substitute for professional
            expertise. You accept responsibility for any use you make of
            AI-generated content in a professional context.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            6. Enforcement
          </h2>
          <p className="mb-3">
            We monitor platform usage for signals of policy violations. We may:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Issue a warning and require you to remedy the violation.</li>
            <li>Temporarily suspend your account pending investigation.</li>
            <li>
              Permanently terminate your account and cancel your subscription
              without refund.
            </li>
            <li>
              Report activity to law enforcement or regulatory bodies where
              required by law or in cases involving serious harm.
            </li>
          </ul>
          <p className="mt-3">
            You may appeal account actions by contacting info@veraaisolutions.com.au within
            30 days of the action. We will review appeals in good faith and
            respond within 10 business days.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            7. Reporting Violations
          </h2>
          <p>
            If you become aware of another user violating this policy, or if you
            observe content or behaviour on the platform that you believe is
            harmful, please report it to:{" "}
            <a
              href="mailto:info@veraaisolutions.com.au"
              className="text-foreground underline underline-offset-2 hover:opacity-70"
            >
              info@veraaisolutions.com.au
            </a>
            . We take all reports seriously and will investigate promptly.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            8. Changes to This Policy
          </h2>
          <p>
            We may update this Usage Policy to reflect changes in our platform
            capabilities, legal requirements, or industry standards. Material
            changes will be communicated via email or in-platform notice with at
            least 14 days notice. Continued use of the platform after the
            effective date of any change constitutes acceptance.
          </p>
        </section>
      </div>
    </article>
  )
}
