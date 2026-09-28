# Practice Native Ad Breaks

## Changes
- Enable native ad breaks only in the Android app's Practice quiz.
- After submitting question 7, 14, 21, and every following seventh question, replace the question, answers, and explanation with one native-ad space.
- Keep the current question number and navigation visible; tapping Next removes the ad and opens the following question.
- Skip the break for ad-free users and do not add native-ad spaces to normal web browsers.

## App connection
- Use one reusable slot ID: `practice_native_ad`.
- Keep the existing `AndroidAds.showNativeAd(slotId, x, y, width, height)`, `AndroidAds.hideNativeAd(slotId)`, and `window.getAdSlotRect(slotId)` contract.
- The slot is mounted only during the break, so removal automatically calls `hideNativeAd("practice_native_ad")`.

## Validation
- Confirm question 7 submission mounts the slot and calls the bridge once.
- Confirm Next hides the slot and opens question 8.
- Confirm ordinary browsers do not receive the practice ad break.
