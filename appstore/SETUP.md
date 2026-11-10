# Building the iPhone app

You need a Mac with Xcode (free from the Mac App Store), Node.js, CocoaPods
(`brew install cocoapods`) and an Apple Developer account ($99/year, in a
parent's name if you're under 18).

1. Get the code and the libraries
   ```
   git clone https://github.com/anish7maturu/SignSenseASL.git
   cd SignSenseASL
   npm install
   ```
2. Build the app files, copy them into the iPhone project and open Xcode
   ```
   npm run ios
   ```
   (This runs `tools/build-app.js`, which bundles MediaPipe, Tesseract, all 12
   text-reading languages, the font and Finn's voice into `www/`, then
   `npx cap sync ios` and `npx cap open ios`.)
3. In Xcode, click **App** in the left sidebar → **Signing & Capabilities** →
   pick your **Team**. If Xcode says the bundle ID is taken, change it (also in
   `capacitor.config.json`).
4. Plug in your iPhone, pick it at the top of Xcode and press **Run** (▶).
   Test everything on the real phone: the camera, Teach me with the microphone,
   Finn's voice (turn off silent mode), a photo, other languages, and
   Delete my profile.
5. To publish: **Product → Archive**, then **Distribute App → App Store Connect**.
   Test it with TestFlight first, then fill in the listing from
   `appstore/listing.md` and submit for review.

Every time the website code changes, run `npm run ios` again before building.
