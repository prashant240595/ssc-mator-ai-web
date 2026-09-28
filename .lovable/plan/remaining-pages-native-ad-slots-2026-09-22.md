# Remaining Pages Native Ad Slots

## Changes
- Add one reusable app-only native ad slot to every remaining user-facing page that does not already contain a native ad.
- Keep chat surfaces ad-free: direct chat, inbox, and study-group conversation pages.
- Do not add duplicate slots to Dashboard, Practice, Daily Quiz, or Exam/Mock Test result screens because those already have dedicated placements.
- Keep every added slot absent from normal web browsers and hidden for ad-free app users.

## Placement and IDs
- Render the slot near the end of each page’s main content, before the footer/navigation area.
- Generate a stable route-based ID such as `page_native_ad_exams`, `page_native_ad_profile`, and `page_native_ad_blog`.
- Dynamic detail pages use a stable page-type ID rather than IDs based on article, job, or user data.

## App connection
- Reuse the existing `window.getAdSlotRect(slotId)` and `AndroidAds.showNativeAd`, `updateSlotRect`, and `hideNativeAd` bridge behavior.
- Show once when visible, update its rectangle while moving, and hide once when it leaves the screen or the page changes.
- The Android app should discover slots through `[data-native-ad-slot]` instead of maintaining a fixed list.

## Validation
- Verify an app WebView gets exactly one slot on representative remaining pages.
- Verify chat pages and pages with existing native placements do not get this extra slot.
- Verify normal website visitors and ad-free app users get no slot or blank space.
