/**
 * Launch switch: is the whole website free for everyone?
 *
 * While this is true, no signed-in user is asked to pay and no feature is
 * locked. Three places read it:
 *
 *   - `use-subscription.ts` treats every user as holding an active web pass
 *   - `web-quota.ts` stops gating feature paths, so AppLayout never renders
 *     the free-use banner or the paywall
 *   - `pricing.tsx` shows a "free access" page instead of payment buttons
 *
 * Set it to false to bring the web pass back exactly as it was — no gating
 * code was deleted, and existing `subscriptions` rows are still honoured.
 *
 * This is a UI/entitlement switch only. It does not affect the Android app,
 * which was always free.
 */
export const FREE_ACCESS_FOR_ALL = true;
