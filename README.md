# flash-cards

A flash-card practice app for kids, covering 2nd through 6th grade. Pick a grade, choose a subject and unit, and work through shuffled cards in short rounds — multiple choice for most decks, typing or voice for the 4th grade decks.

Project summary: [dan-maguire.com/projects/flash-cards](https://dan-maguire.com/projects/flash-cards)

## Running it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
npm run preview  # serve the production build
npm test         # run the unit tests once
npm run coverage # run the tests with a coverage report
```

Built with Svelte 4, TypeScript, and Vite. The geography maps use `d3-geo`, `topojson-client`, and `world-atlas`.

## What's in it

### Grades and decks

| Grade | Subject | Decks |
|---|---|---|
| 2nd | Math | Addition, Subtraction (1- and 2-digit, never over 100 or below zero) |
| 3rd | Math | Addition, Subtraction, Multiplication, Division, All Four Operations (up to 3-digit numbers, including negatives; times tables through 12) |
| 4th | Reading | Sight Words (typing or microphone) |
| 4th | Math | Addition Facts (typing or microphone) |
| 5th | Math | Multi-Digit Multiplication, Long Division (with remainders), Fractions (unlike denominators, multiplying), Decimals, Order of Operations, Mixed Review |
| 6th | Math | Unit 1: Decimal Operations, including money and measurement (Units 2–10 listed as coming soon) |
| 6th | Science | Cells, Human Body, Genetics, Evolution, Environmental Science |
| 6th | French | Unit 2: Colors — 12 color words, French ↔ English plus example phrases (Communication, Food, and School listed as coming soon) |
| 6th | Geography | 11 regional country units plus a Final (see below) |

Math decks are generated fresh every time, so no two games are the same. Wrong answers are built from common mistakes — a forgotten carry, a misplaced decimal, a remainder that's too big — rather than random numbers. Every math card has a hint.

### 6th grade Geography

Each card shows a blank black-and-white map with one country lightly highlighted, and asks which country it is.

- The map opens on the whole continent and animates in to the country. The **+** and **−** buttons step between the close-up and the full continent in 25% increments.
- Tiny countries (island nations, microstates) get a dashed circle so they're findable.
- Wrong answers are the countries nearest the highlighted one. Hints give the first letter and a couple of bordering countries.
- The map data only downloads once a geography deck starts.

All 194 countries are split into units:

| Unit | Region | Countries |
|---|---|---|
| 1 | North America: Continental North & Central | 10 |
| 2 | North America: Island Nations | 13 |
| 3 | South America | 12 |
| 4 | Europe: West | 23 |
| 5 | Europe: East | 22 |
| 6 | Africa: North | 18 |
| 7 | Africa: Central | 21 |
| 8 | Africa: South | 15 |
| 9 | Asia: West | 25 |
| 10 | Asia: East | 22 |
| 11 | Oceania | 13 |
| Final | All Countries, in random order across every continent | 194 |

### Playing a multiple-choice deck

- **Practice** goes at your own pace. **Timed** gives 20 seconds per question and adds a Pause button.
- Every game opens on a **Ready?** card — tap anywhere to begin, and the first question and timer start then.
- Cards come in rounds of 10, with an encouragement screen between rounds.
- Wrong picks turn red and stay red; the right answer turns green and the next card comes up. There are no feedback messages, so the screen stays compact.
- **Scoring:** 10 points for a first-try answer, minus 3 for each wrong pick and 1 for using the hint (never below 1). Skipped and timed-out cards score 0. The percentage is points earned out of points possible.
- While paused, the question is covered by a PAUSED card of the same size and the answers show only A–D, so nothing can be peeked at.
- The play screen always fits the window without scrolling, and the answers stay in two columns on phones.

### 4th grade typing and voice

Sight Words and Addition Facts accept a typed answer or a spoken one through the browser's speech recognition. With the microphone on it keeps listening between cards, and math answers can be said as digits or words ("7" or "seven").

### Navigation and links

The URL always reflects where you are, with blank values when a step isn't chosen. This allows for easy bookmarking. For example:

```
?grade=6&subject=geography&mode=timed&unit=europe-west
```

- `grade` and `subject` are set as you navigate the home screens.
- `mode` (`practice` or `timed`; `typing` or `microphone` for the 4th grade decks) and `unit` are set when a deck starts, and cleared when you go back.
- Opening a link like the one above starts that deck directly. Browser back and forward move between the deck and the home screen.
- `unit` codes are readable names that never include the unit number, so units can be renumbered without breaking saved links. They're matched case-insensitively.

Each subject has a fixed color everywhere it appears: Math red, Science green, French purple, Reading blue, History yellow, Geography orange.

## Project layout

```
src/
  App.svelte                  shell, deck start/stop, URL-driven deck launching, footer
  nav.ts                      reads and writes the grade/subject/mode/unit query string
  routes/index.svelte         home: grade → subject → unit
  routes/play.svelte          typing/voice play screen (4th grade)
  modes/multiple-choice/      multiple-choice play screen
  components/                 FlashCard, CountryMap, and shared UI
  data/decks.ts               every grade, subject, unit, and deck (with its unit code)
  data/CardTypes.ts           card and deck types
  data/subjects/
    math/                     grade 2–3, 5, and 6 generators, plus 4th grade addition facts
    science/grade6.ts         6th grade science units
    french/grade6.ts          6th grade French colors
    geography/                country units, map rendering (atlas.ts), deck builder
    sight-words/              sight word lists
  nlp/                        speech recognition and spoken-answer matching
```

### Adding a deck

1. Write the cards (or a generator) under `src/data/subjects/<subject>/`.
2. Add an entry to `deckOptions` in `src/data/decks.ts` with a unique `id`, a `unit` code (lowercase, hyphenated, unique within its grade and subject), and `interaction: "multiple-choice"` or `"voice-or-type"`.
3. For a 6th grade unit, also add it to that subject's unit list (`sixthGradeMathUnits`, etc.) with its `deckId`.

## Testing

Unit tests use [Vitest](https://vitest.dev/) with jsdom and [Testing Library](https://testing-library.com/docs/svelte-testing-library/intro). They live in `tests/`, mirroring `src/`:

```
tests/
  setup.ts            jest-dom matchers; resets the URL, timers, and stubs after each test
  helpers/            seeded Math.random, a fake SpeechRecognition, and animation-frame stubs
  data/               every deck builder and generator, plus the deck catalog and unit codes
  nlp/                answer matching and speech recognition
  components/         FlashCard, CountryMap, SubjectSelector
  modes/              multiple-choice play: Ready screen, scoring, hints, timer, pause, rounds
  routes/             home navigation, and typing/voice play (one-shot and continuous mic)
  App.test.ts         deck launching, deep links, back/forward, footer, and main.ts
```

`npm run coverage` fails if statements, branches, functions, or lines drop below 100%. The HTML report is written to `coverage/index.html`.

A few things to know when adding tests:

- Svelte components are compiled without dev mode for tests (see `vitest.config.ts`), because dev mode adds generated code that no test can reach.
- Random decks are made repeatable with `seedRandom(seed)`, or steered to a specific case with `queueRandom([...])`, both from `tests/helpers/random.ts`.
- A few modules export a `__testing` object so their internal safety nets (such as the decimal-operations fallbacks) can be tested directly.
- Svelte creates an `{#if}` block's content with a separate code path from the one that updates it. If a condition can never be true when its block first appears, that path can't be covered. The play screens toggle `hidden` on the pause overlay, hint panel, and feedback panels instead of wrapping them in `{#if}`.

## Scaffolded for later

The original scaffold also includes child profiles (`src/profiles/`), progress, streak, and accuracy tracking (`src/progress/`), character encouragement overlays (`src/characters/`), and a stats screen. These aren't connected to the app yet.

## Credits

Map data from [world-atlas](https://github.com/topojson/world-atlas), based on [Natural Earth](https://www.naturalearthdata.com/).

© Dan Maguire
