# SignSenseASL 🤟

A Duolingo-style web app for learning the American Sign Language (ASL) fingerspelling alphabet, with live webcam feedback, plus a fingerspelling translator.

**Live app:** _add your Netlify or GitHub Pages link here_

## What it does

The app has two modes, switched at the top of the sidebar: **Learn** and **Translate**.

### Learn mode

- **Learn path:** 7 units covering all 26 letters plus fingerspelled words (HI, OK, YES, BYE, COW, FLY, LOVE, WOLF). Units unlock as you progress.
- **Live practice:** the webcam tracks 21 points on your hand and checks your handshape in real time. A finger checklist shows which fingers are right and which to fix.
- **Movement letters:** J and Z are checked by tracing the fingertip's path through the air.
- **Quiz:** a no-camera handshape quiz with hearts.
- **Progress:** XP, daily streaks, quests, achievements and an alphabet chart. Progress is saved in the browser.

### Translate mode

- **Sign → Text:** fingerspell to the webcam and the letters are typed out. Hold a letter still for about a second to add it; lower your hand to add a space; draw J and Z in the air. Buttons to add a space, delete, clear, read the text aloud, copy it, or send it to Text → Sign.
- **Text → Sign:** type a word or short sentence and an animated hand (just a hand, not a whole person) fingerspells it letter by letter. It moves smoothly between letters, bounces for repeated letters (like the L's in HELLO), and draws J and Z in the air. Slow, normal and fast speeds, with pause and replay.

Both translator modes work with **fingerspelling** (the 26 letters), not whole-word ASL signs or ASL grammar.

## How it works

| Part | How |
|---|---|
| Hand tracking | [MediaPipe Hands](https://github.com/google-ai-edge/mediapipe) finds 21 hand landmarks in each video frame, in the browser |
| Handshape check | Hand-written rules turn the landmarks into features (which fingers are straight, curled or hooked; where the thumb is; which way the hand points) and match them against each letter |
| Movement check | For J and Z, the fingertip's path over the last ~2 seconds is checked for the right shape |
| Sign → Text | Each frame's letter guess goes to a small "typer": a letter is added once it is held still for 0.8 s, a held letter is typed only once, a one-frame misread is ignored, and a hand that is out of view for 1.5 s adds a space |
| Text → Sign | The same 3D hand poses that draw the lesson pictures are blended joint by joint (finger bends, spread, thumb position, hand tilt) to animate from one letter to the next |
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

`tests/translator.test.js` checks the translator: when letters are typed (held long enough, typed once, repeated after relaxing, misreads ignored, moving hands ignored, spaces after a pause, J from a movement), how text is split into letters to sign, and that every pair of letters blends into a valid hand.

```bash
npm test   # runs both test files
```

## Limitations

SignSenseASL is an educational prototype, not a certified ASL assessment. Fingerspelling is a small part of ASL, which also uses movement, facial expression, grammar and context. The handshape rules are simplified and can make mistakes, especially for T, N and M, where the thumb is hidden. Learners should also study with Deaf-led resources.

## Credits

- Hand tracking: MediaPipe Hands (Google), Apache 2.0 license
- Font: Nunito (Google Fonts)
- AI assistance: the Translate mode (Sign → Text, Text → Sign and their tests) was written with help from Claude, an AI assistant by Anthropic.
- _Add team members and any other tools used during development here._

## License

MIT — see [LICENSE](LICENSE).
