# Car Cards

A FIFA Ultimate Team-style pack opening app, but for cars. Spend euros on packs,
tear them open, and collect cards of real cars sorted into bronze, silver and gold,
non-rare and rare, plus special cards for limited-edition machines.

You start with **€10,000,000**.

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
```

```bash
npm test             # game logic (pack odds, guarantees, quick-sell)
npm run build        # production build
npm run fetch:images # re-fetch car photos from Wikimedia Commons
```

## Building for Android (APK)

The app runs as a native Android app via [Capacitor](https://capacitorjs.com).

### GitHub Actions (automatic)

Every push to `main` or `claude/car-pack-opening-app-u3u8dw` triggers an APK build. Download APKs from:
- **Actions** tab → latest workflow run → **Artifacts**
- Both debug (`app-debug.apk`) and release (`app-release-unsigned.apk`) builds are generated
- Main branch pushes also create GitHub Releases with APK downloads

### Local builds

Requires: Node.js, Android SDK, Java 17+

```bash
# Debug APK (faster, for testing)
npm run apk:debug

# Release APK (unsigned, for distribution)
npm run apk:release

# Just sync web changes to Android
npm run apk:sync

# Open Android Studio
npm run apk:open
```

APKs are built to `android/app/build/outputs/apk/`.

There is no backend and no account. Your balance and collection live in
`localStorage`, so they survive a reload and stay on your machine.

## How cards work

Each car has six stats — **ACC**, **SPD**, **PWR**, **HAN**, **BRK**, **STY** —
and its overall rating is a weighted mean of them. The rating decides the tier:

| Rating | Tier |
| --- | --- |
| below 70 | Bronze |
| 70–83 | Silver |
| 84+ | Gold |

**Rare** is authored per car rather than derived, exactly as FIFA treats it: a
Renault 5 Turbo is a rare bronze, a BMW M340i is a common gold. Rare cards get
the diagonal sheen, and rare golds trigger a walkout.

**Special** cards are limited-edition cars — F40, McLaren F1, Carrera GT, Chiron
Super Sport 300+, Zonda Cinque and friends. They have their own black-and-gold
artwork with the production run printed on the card, and they only ever arrive
through a pack's special roll, never from a normal slot.

The roster is 100 cars: 36 bronze, 34 silver, 30 gold, of which 10 are specials.

## Packs

Prices come straight from the FUT coin store. Sizes do not: FIFA's 12/24/30-card
packs assume a pool of thousands of players, so a 30-card gold pack here would
have to hand you the same car three times. Each pack is sized to what its pool
can fill with distinct cars, and no pack ever repeats a car.

| Pack | Price | Contents |
| --- | --- | --- |
| Bronze Pack | €400 | 12 bronze |
| Premium Bronze Pack | €750 | 12 bronze, ≥3 rare |
| Silver Pack | €2,500 | 12 silver |
| Premium Silver Pack | €3,750 | 12 silver, ≥3 rare |
| Gold Pack | €5,000 | 10 gold |
| Premium Gold Pack | €7,500 | 10 gold, ≥3 rare |
| Jumbo Premium Gold Pack | €15,000 | 16 gold, ≥5 rare |
| Rare Players Pack | €25,000 | 8 rare gold |
| Mega Pack | €35,000 | 18 gold, ≥6 rare |
| Prime Gold Players Pack | €50,000 | 10 gold rated 86+, ≥4 rare |
| Rare Mega Pack | €55,000 | 18 gold, ≥8 rare |
| Ultimate Pack | €125,000 | 20 gold rated 84+, ≥8 rare |

Every pack publishes its drop rates in the store, and the store renders the same
`odds` object that the puller reads — a test asserts they cannot drift apart.

Quick-sell, from the garage, pays 40% of a car's book value and only ever takes
a spare. The market pays far more and will take any car you own, including your
last copy of one — it asks first when that is what you are doing.

## Photos

Every car photograph is a freely-licensed image from
[Wikimedia Commons](https://commons.wikimedia.org), fetched by
`scripts/fetch-images.ts` and committed to `public/cars/`.

The script scores search results rather than taking the first hit, so it rejects
close-ups of wheels, race-liveried versions and the wrong body style; stubborn
cases pin an exact file via `imageFile` on the car. Only CC0, CC BY, CC BY-SA and
public-domain images are accepted.

CC BY and CC BY-SA require attribution, so every photographer and licence is
recorded in [CREDITS.md](CREDITS.md) and shown in the app on each card's detail
view.

## Layout

```
src/
  data/cars.ts          the 100-car roster
  data/packs.ts         pack catalogue and published odds
  game/rating.ts        overall rating and tier cut-offs
  game/pack.ts          pack opening, guarantees, special rolls
  game/economy.ts       quick-sell values, euro formatting
  store/useGame.ts      balance and collection, persisted to localStorage
  components/           cards, store, garage, the opening animation
scripts/fetch-images.ts Wikimedia Commons image pipeline
```
# APK builds are automated via GitHub Actions
