# SignSenseASL 🤟

A Duolingo-style web app for learning the American Sign Language (ASL) fingerspelling alphabet, with live webcam feedback.

**Live app:** _add your Netlify or GitHub Pages link here_

## What it does

- **Learn path:** 7 units covering all 26 letters plus fingerspelled words (HI, OK, YES, BYE, COW, FLY, LOVE, WOLF). Units unlock as you progress.
- **Live practice:** the webcam tracks 21 points on your hand and checks your handshape in real time. A finger checklist shows which fingers are right and which to fix.
- **Movement letters:** J and Z are checked by tracing the fingertip's path through the air.
- **Quiz:** a no-camera handshape quiz with hearts.
- **Progress:** XP, daily streaks, quests, achievements and an alphabet chart. Progress is saved in the browser.

## How it works

| Part | How |
|---|---|
| Hand tracking | [MediaPipe Hands](https://github.com/google-ai-edge/mediapipe) finds 21 hand landmarks in each video frame, in the browser |
| Handshape check | Hand-written rules turn the landmarks into features (which fingers are straight, curled or hooked; where the thumb is; which way the hand points) and match them against each letter |
| Movement check | For J and Z, the fingertip's path over the last ~2 seconds is checked for the right shape |
| Storage | `localStorage`, so no account is needed and no video leaves the computer |

Everything is in one file, `index.html` (HTML, CSS and JavaScript, no build step).

## Run it locally

The camera only works on `https://` or `localhost`, so serve the folder instead of double-clicking the file:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

In GitHub Codespaces, run the same command and open the forwarded port 8000.

## Tests

`tests/classifier.test.js` generates virtual hands for each letter (left and right hands, tilted different ways, with random jitter) and checks that every letter is recognized and not confused with another. It also checks that the J and Z movement detectors accept the right motion and reject other motions.

```bash
node tests/classifier.test.js   # or: npm test
```

## Limitations

SignSenseASL is an educational prototype, not a certified ASL assessment. Fingerspelling is a small part of ASL, which also uses movement, facial expression, grammar and context. The handshape rules are simplified and can make mistakes, especially for T, N and M, where the thumb is hidden. Learners should also study with Deaf-led resources.

## Credits

- Hand tracking: MediaPipe Hands (Google), Apache 2.0 license
- Font: Nunito (Google Fonts)
- _Add team members and any tools used during development here._

## License

MIT — see [LICENSE](LICENSE).
