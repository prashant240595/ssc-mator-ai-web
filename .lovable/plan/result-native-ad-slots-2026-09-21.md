# Result Native Ad Slots

## Changes
- Add one app-only native ad slot to the exam/mock-test analysis screen with ID `result_analysis_native_ad`.
- Add one app-only native ad slot to the answer-key/solutions screen with ID `result_answer_key_native_ad`.
- Reuse the existing native-ad bridge, rectangle lookup, scroll visibility handling, and ad-free entitlement behavior.
- Keep both slots completely absent from website and mobile-browser views.

## Placement
- Analysis slot: after subject/topic performance and before charts/rankings.
- Answer-key slot: below the answer-key header and before the question solutions.

## Validation
- Confirm both Exam and Mock Test results use these shared slots.
- Confirm each slot calls `showNativeAd` once when visible and `hideNativeAd` once when hidden or removed.
- Confirm web users and ad-free app users see no slot or blank space.
