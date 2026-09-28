# Dashboard Native Ads

## What will change
- Add two reserved native-ad spaces on the dashboard, visible only inside the Android app.
- Place the first ad after the two main study options and the second after the progress section.
- Keep both spaces hidden on the website and mobile browser, so web AdSense behavior stays unchanged.

## App connection
- Each space will have a stable ID: `dashboard_native_1` and `dashboard_native_2`.
- When a space appears, the website will call the Android WebView bridge with its ID and current screen position/size.
- Position updates will be sent while scrolling or resizing, and the app will be told to hide the ad when the space leaves the screen or page.
- Add a small development fallback label only when no native ad bridge exists, so app integration can be checked without affecting website users.

## Android app requirement
Implement a JavaScript interface named `AndroidAds` with:
- `showNativeAd(slotId, left, top, width, height)` — load/reuse an AdMob native ad and overlay it at that WebView rectangle.
- `hideNativeAd(slotId)` — hide that slot when it is off-screen or removed.

All rectangle values are CSS pixels relative to the visible WebView. The app should convert them using the WebView display density before positioning the Android native-ad view.

## Validation
- Confirm both slots appear only for app users.
- Confirm the browser dashboard has no added blank space.
- Verify slot IDs and bridge calls at desktop and mobile widths.
