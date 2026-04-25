BEGIN;

ALTER TABLE public.billing_tiers
  DROP CONSTRAINT IF EXISTS billing_tiers_plan_check;

UPDATE public.billing_tiers
SET
  plan = 'vera-coach',
  display_name = 'Vera Coach',
  updated_at = NOW()
WHERE plan = 'pro';

UPDATE public.billing_tiers
SET
  plan = 'vera-intelligence',
  display_name = 'Vera Intelligence',
  updated_at = NOW()
WHERE plan = 'enterprise';

DELETE FROM public.billing_tiers
WHERE plan = 'free';

ALTER TABLE public.billing_tiers
  ADD CONSTRAINT billing_tiers_plan_check
  CHECK (plan = ANY (ARRAY['vera-coach'::text, 'vera-intelligence'::text]));

COMMIT;
