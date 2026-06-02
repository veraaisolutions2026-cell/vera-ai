export default function TermsOfServicePage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-24 sm:px-8">
      <header className="mb-12">
        <h1 className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground">Last updated: May 2026</p>
      </header>

      <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            1. Acceptance of Terms
          </h2>
          <p>
            These Terms of Service govern your access to and use of the Vera AI
            platform, including the web application, API, and all associated
            services operated by Vera AI Solutions. By creating an account,
            subscribing to a plan, or using any feature of the platform, you
            agree to be bound by these terms. If you are using the platform on
            behalf of an organisation, you represent that you have the authority
            to bind that organisation to these terms.
          </p>
          <p className="mt-3">
            If you do not agree to these terms, do not access or use the
            platform. We reserve the right to modify these terms at any time.
            Material changes will be notified by email or in-platform notice
            with at least 14 days notice. Continued use after the effective date
            constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            2. Accounts and Registration
          </h2>
          <p className="mb-3">
            To access the platform, you must register for an account using a
            valid email address and password, or via Google OAuth. You are
            responsible for:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Providing accurate and complete registration information.</li>
            <li>Maintaining the confidentiality of your login credentials.</li>
            <li>All activity that occurs under your account.</li>
            <li>
              Notifying us immediately at info@veraaisolutions.com.au if you
              suspect unauthorised access to your account.
            </li>
          </ul>
          <p className="mt-3">
            You may not create accounts on behalf of others without their
            explicit consent. Accounts are personal and non-transferable unless
            you are an administrator managing an organisational workspace.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            3. Platform Plans and Features
          </h2>
          <p className="mb-3">
            Vera AI offers the following subscription tiers:
          </p>
          <ul className="list-disc space-y-3 pl-5">
            <li>
              <span className="font-medium text-foreground">Vera Coach</span> -
              provides access to the chat workspace and built-in audit agents
              with approximately 500 AI requests per month. Custom agent
              creation is not available on this plan.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Vera Intelligence
              </span>{" "}
              - provides unlimited custom agent creation, knowledge-base tooling
              with agent-to-file linking, approximately 1,500 AI requests per
              month, and priority support.
            </li>
          </ul>
          <p className="mt-3">
            Usage limits are approximate and subject to the underlying cost
            budget for each plan. If your usage approaches the allocated budget,
            we will notify you. Exceeding plan limits may result in temporary
            throttling of AI request capacity until the next billing cycle. We
            reserve the right to adjust plan features and limits with reasonable
            notice.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            4. Subscriptions, Billing, and Cancellation
          </h2>
          <p className="mb-3">
            Paid plans are billed as subscriptions through Stripe. By
            subscribing:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              You authorise Vera AI Solutions to charge your payment method on a
              monthly or annual basis depending on the billing interval you
              selected.
            </li>
            <li>
              Subscriptions renew automatically unless cancelled before the
              renewal date.
            </li>
            <li>Annual plans are charged upfront for the full year.</li>
            <li>
              You may cancel at any time from your billing settings.
              Cancellation takes effect at the end of the current billing
              period. Access to paid features continues until that date.
            </li>
            <li>
              We do not provide prorated refunds for unused time on monthly
              plans. Annual plans cancelled within 14 days of initial purchase
              may be eligible for a prorated refund at our discretion. Contact
              support to request a refund.
            </li>
            <li>
              All prices are exclusive of applicable taxes, which may be added
              at checkout depending on your jurisdiction.
            </li>
            <li>
              We reserve the right to change subscription pricing. Any changes
              will be communicated with at least 30 days notice and will take
              effect at your next renewal.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            5. Acceptable Use
          </h2>
          <p className="mb-3">
            The Vera AI platform is intended for professional audit and
            compliance workflows. You agree to use the platform only for lawful
            purposes and in accordance with our Usage Policy. Prohibited uses
            include but are not limited to:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Attempting to bypass, circumvent, or tamper with authentication,
              authorisation, or billing controls.
            </li>
            <li>
              Uploading malicious files, code, or content designed to exploit
              the platform or its users.
            </li>
            <li>
              Using the platform to generate content that is illegal,
              defamatory, fraudulent, or harmful.
            </li>
            <li>
              Sharing account credentials or allowing unauthorised third parties
              to access your account.
            </li>
            <li>
              Reselling, sublicensing, or white-labelling platform access
              without a separate written agreement.
            </li>
            <li>
              Reverse engineering, decompiling, or attempting to extract
              proprietary source code or AI model weights.
            </li>
            <li>
              Using automated scripts to scrape, bulk-export, or mirror platform
              data without authorisation.
            </li>
            <li>
              Using the platform in a manner that places excessive or
              unreasonable load on infrastructure.
            </li>
          </ul>
          <p className="mt-3">
            We reserve the right to suspend or terminate any account found to be
            in violation of these terms without notice.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            6. Your Content
          </h2>
          <p className="mb-3">
            You retain ownership of all content you submit to the platform,
            including messages, uploaded documents, agent system prompts, and
            knowledge-base files. By using the platform, you grant Vera AI
            Solutions a limited, non-exclusive, royalty-free licence to process,
            store, and transmit your content solely for the purpose of providing
            the service to you.
          </p>
          <p className="mb-3">You represent and warrant that:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              You have all necessary rights, permissions, and consents to submit
              the content you upload.
            </li>
            <li>
              Your content does not violate the intellectual property rights of
              any third party.
            </li>
            <li>
              Your content does not contain personal data of third parties
              submitted without their knowledge or appropriate legal basis.
            </li>
            <li>
              Uploading confidential client documents does not violate any
              professional obligation, confidentiality agreement, or applicable
              law.
            </li>
          </ul>
          <p className="mt-3">
            We do not use your content to train AI models. AI-generated
            responses produced by the platform in response to your inputs are
            provided to you under the ownership framework described by the
            applicable Vercel AI Gateway and underlying model-provider usage
            policies.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            7. AI-Generated Content and Reliance
          </h2>
          <p>
            Vera AI is a productivity and research tool. AI-generated outputs
            are produced by large language models and may contain errors,
            omissions, or inaccuracies. You are solely responsible for
            reviewing, validating, and approving any AI-generated output before
            relying on it in a professional, legal, or regulatory context.
            Nothing produced by the platform constitutes legal, financial,
            accounting, or regulatory advice. Vera AI Solutions is not liable
            for any loss, liability, or damage arising from your reliance on
            AI-generated content.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            8. Intellectual Property
          </h2>
          <p>
            All elements of the Vera AI platform including the software, design,
            branding, user interface, documentation, and proprietary AI agent
            configurations are the intellectual property of Vera AI Solutions or
            its licensors. Nothing in these terms transfers ownership of any
            intellectual property to you. You are granted a limited, revocable,
            non-transferable right to use the platform for the duration of your
            subscription in accordance with these terms.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            9. Service Availability and Modifications
          </h2>
          <p>
            We aim to maintain high platform availability but do not guarantee
            uninterrupted access. We may perform scheduled maintenance, deploy
            updates, or modify, suspend, or discontinue features with reasonable
            notice where possible. We are not liable for any downtime, data
            loss, or disruption caused by circumstances outside our reasonable
            control including third-party infrastructure failures from Vercel AI
            Gateway, underlying model providers, Supabase, Vercel, or Stripe,
            natural disasters, or network outages.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            10. Termination
          </h2>
          <p className="mb-3">
            You may delete your account at any time from your account settings.
            Upon deletion, your data will be permanently removed in accordance
            with our Privacy Policy.
          </p>
          <p>
            We may suspend or terminate your account immediately if you breach
            these terms, engage in abusive behaviour, attempt to compromise
            platform security, or if required by law. Upon termination, your
            right to access the platform ceases. Sections relating to
            intellectual property, limitation of liability, and dispute
            resolution survive termination.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            11. Limitation of Liability
          </h2>
          <p className="mb-3">
            To the maximum extent permitted by applicable law:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Vera AI Solutions provides the platform on an &quot;as is&quot;
              and &quot;as available&quot; basis without warranties of any kind,
              express or implied, including fitness for a particular purpose or
              non-infringement.
            </li>
            <li>
              In no event will Vera AI Solutions be liable for indirect,
              incidental, consequential, or punitive damages, including loss of
              profits, data, or business opportunity, even if we have been
              advised of the possibility of such damages.
            </li>
            <li>
              Our total aggregate liability to you for any claim arising from or
              related to the platform will not exceed the total fees paid by you
              in the 12 months preceding the event giving rise to the claim.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            12. Governing Law
          </h2>
          <p>
            These terms are governed by and construed in accordance with the
            laws of the jurisdiction in which Vera AI Solutions is incorporated.
            Any disputes arising from these terms will be subject to the
            exclusive jurisdiction of the courts in that jurisdiction.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            13. Contact
          </h2>
          <p>
            For questions about these Terms of Service, contact us at:{" "}
            <a
              href="mailto:info@veraaisolutions.com.au"
              className="text-foreground underline underline-offset-2 hover:opacity-70"
            >
              info@veraaisolutions.com.au
            </a>
            .
          </p>
        </section>
      </div>
    </article>
  )
}
