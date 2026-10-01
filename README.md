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
- The close-up frames the whole country, including big or nearby islands (both islands of New Zealand, all of Malaysia), but not far-off territories like Alaska or French Guiana. The view matches the map window's shape, so the country is never cut off on a short or wide screen.
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

- **Practice** goes at your own pace. **Timed** gives 20 seconds per question (`multipleChoice.secondsPerQuestion` in `flashcards.json`) and adds a Pause button.
- Every game opens on a **Ready?** card — tap anywhere to begin, and the first question and timer start then.
- Cards come in rounds of 10, with an encouragement screen between rounds. These numbers, the scoring below, and the messages are set in `flashcards.json` (see [Play settings and wording](#play-settings-and-wording)).
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

Each subject has a fixed color everywhere it appears: Math red, Science green, French purple, Reading blue, History yellow, Geography orange. Colors are set in `flashcards.json` (see [Grades, subjects, and decks](#grades-subjects-and-decks)).

## Project layout

```
src/
  App.svelte                  shell, deck start/stop, URL-driven deck launching, footer
  nav.ts                      reads and writes the grade/subject/mode/unit query string
  routes/index.svelte         home: grade → subject → unit
  routes/play.svelte          typing/voice play screen (4th grade)
  modes/multiple-choice/      multiple-choice play screen
  components/                 FlashCard, CountryMap, and shared UI
  services/                   flashcardService.ts loads flashcards.json at startup
  data/flashcards.json        grades, subjects, decks, home screen text, math rules, and every written flashcard
  data/fromFlashcards.ts      turns flashcards.json entries into playable cards
  data/decks.ts               reads the grade/subject/deck catalog and builds each deck when it starts
  data/CardTypes.ts           card, deck, flashcard, and catalog types
  data/subjects/
    math/                     grade 2–3, 5, and 6 generators; rules.ts has the shared rule shapes and random draws
    geography/                map rendering (atlas.ts) and the country deck builder (countriesDeck.ts)
  nlp/                        speech recognition and spoken-answer matching
```

### Flashcard data

Everything the home screen lists (grades, subjects, units, and decks), all written flashcards, and the rules for generated math decks live in `src/data/flashcards.json`. The app fetches the file when it starts, showing "Loading flashcards…" until it arrives, or an error with a **Try again** button if it can't load. In development it reads `/src/data/flashcards.json` from the Vite server. A deployed build reads the copy on GitHub (`REMOTE_URL` in `src/services/flashcardService.ts`), so changes to the file go live once they're pushed to `main`.

```json
{
  "cards": [
    { "question": "2 + 3", "answer": "5", "category": "math-addition-grade4", "acceptedAnswers": ["five"] }
  ]
}
```

- `category` groups cards into decks (for example `science-cells-unit1`, or `geography-europe-west` for a geography unit). A deck names the categories it draws from.
- Optional fields: `acceptedAnswers` (other answers that count), `choices` (multiple-choice options including the answer), `hint`, `countryId` (ISO numeric id for the map), `continent` (what the map zooms out to: `north-america`, `south-america`, `europe`, `africa`, `asia`, or `oceania`), and `acceptableTranscripts` (words speech recognition might hear instead, like "four" for "for").
- With more than four `choices`, the answer and three random wrong ones (`multipleChoice.wrongChoices`) are picked each play (the French cards use this).
- A few cards (`math-subtraction`, `math-multiplication`, `vocabulary-*`) came from earlier data files and aren't used by any deck yet.

#### Math rules

Math problems are generated fresh every play, but the limits they follow live in the `mathRules` section of `flashcards.json`, so they can be changed without touching code:

- `wholeNumberOperations` (2nd and 3rd grade): deck size, and for each grade the allowed range for numbers and answers, the chance of negative numbers, and which operations it practices. Each operation sets how big its numbers are, and `largerFirst` keeps subtraction from going below zero.
- `grade5`: deck size, how often each topic comes up in Mixed Review, multiplication factor sizes, division divisors and remainders, fraction denominators, decimal places and sizes, and the order-of-operations expressions with a range for each letter.
- `decimalOperations` (6th grade): deck size, operations, answer range, units, and how often numbers are decimals, have two places, or divide evenly.

A number rule is either one range, `{ "min": 1, "max": 9 }`, or a list of ranges picked by weight. For example, `[{ "min": 1, "max": 9, "weight": 0.3 }, { "min": 10, "max": 99, "weight": 0.7 }]` gives a 2-digit number 70% of the time. Wherever there are weights, they're relative, so `1, 1, 2` works the same as `0.25, 0.25, 0.5`, and a weight of 0 turns that option off.

The code still decides the kinds of problems, their hints, and how wrong answers are built from common mistakes. Deck descriptions on the home screen (like "never go over 100") are written by hand, so update them if you change a rule they describe.

#### Grades, subjects, and decks

The home screen is built from three sections of `flashcards.json`:

- `home`: the `tagline` under the title and the `intro` above the grade list.
- `subjects`: each subject's `label` and tile `color` (`red`, `green`, `purple`, `blue`, `yellow`, or `orange`), keyed by a short name like `math` or `reading`.
- `grades`: one entry per grade tile, in order, with its `grade` number, `label`, tile `color` (`sky`, `violet`, `teal`, `rose`, `amber`, or any subject color), and `subjects`. Set `"pickSubject": true` to show a subject step before the decks; without it, the grade goes straight to its decks.

Each of a grade's subjects has a `subject` key, a `summary` for the grade tile, a `blurb` for the subject tile (it falls back to the summary), and `"available": false` to show it as coming soon. It lists its decks one of two ways:

- `decks`: plain decks, each badged with the subject name.
- `units`: numbered units, each with a `label` ("Unit 1", "Final"), a `title`, and a `deck`. A unit without a `deck` is listed as coming soon.

```json
{
  "unit": "addition",
  "title": "Addition",
  "description": "1- and 2-digit sums that never go over 100.",
  "build": { "type": "wholeNumberOperations", "topic": "add" }
}
```

- `unit` is the `?unit=` code: lowercase, hyphenated, and unique within its grade and subject.
- `description` can include `{count}`, which becomes the number of flashcards the deck draws from.
- `interaction` is `"multiple-choice"` (the default) or `"voice-or-type"`.
- `build` says where the cards come from:
  - `{ "type": "cards", "category": "science-cells-unit1" }`: written cards from one category. `deckType` picks the play screen's labels (it defaults to the subject, so reading decks set `"sight-words"`), and math decks need an `operation` such as `"addition"`.
  - `{ "type": "wholeNumberOperations", "topic": "add" }`: generated 2nd/3rd grade math using that grade's rules (`add`, `sub`, `mul`, `div`, or `mixed`).
  - `{ "type": "grade5", "topic": "fractions" }`: generated 5th grade math (`multiplication`, `division`, `fractions`, `decimals`, `order-of-operations`, or `mixed`).
  - `{ "type": "decimalOperations" }`: generated 6th grade decimal operations.
  - `{ "type": "countries", "categories": ["geography-europe-west"] }`: map cards for every country in those categories, with nearby countries as wrong answers. The geography Final lists all eleven categories.

#### Play settings and wording

Gameplay numbers and on-screen wording also live in `flashcards.json`:

- `multipleChoice`: `secondsPerQuestion` (the Timed limit, also shown in the home screen hint), `lowTimeSeconds` (when the timer turns to a warning), `roundSize` (cards between encouragement screens), `wrongChoices` (wrong answers shown with each written or country card), `scoring` (`firstTry` points, minus `perWrongPick` per wrong pick and `hint` for using the hint, never below `minimum`), and the `encouragement` messages shown between rounds.
- `typingAndVoice` (4th grade typing and voice decks): `cardsBeforeBreak`, how long the encouragement break lasts in `breakSeconds`, and its `encouragement` messages.
- `geography.nearbyCountries`: how many of the closest countries the wrong answers are drawn from.
- `playText`: the play screen's `title`, the cue above each question (`choiceCue` for multiple choice, `typingCue` for typing and voice), `promptName` (as in "Your problem"), and the end-of-deck `finishedTitle`, `choiceFinished`, and `typingFinished`. Every field is set in `default`. An entry named after a subject (or a deck's `deckType`, like `sight-words`) overrides some of them, and math decks then apply an entry named after their operation (like `decimal-operations`).

The math generators always offer four answers, whatever `wrongChoices` says. While a game is paused, answers show as letters A–F, so keep `wrongChoices` at 5 or below.

### Adding a deck

1. Add its cards to `src/data/flashcards.json` under a new `category`. Generated math needs a generator under `src/data/subjects/math/` and a new `build` type in `src/data/decks.ts`.
2. Add the deck to its grade and subject in `grades`, under `decks` or as a unit's `deck`. A new grade or subject is just a new entry there (and in `subjects`).

Nothing else changes in code. Deck ids are worked out as `{grade}-{subject}-{unit}`.

## Testing

Unit tests use [Vitest](https://vitest.dev/) with jsdom and [Testing Library](https://testing-library.com/docs/svelte-testing-library/intro). They live in `tests/`, mirroring `src/`:

```
tests/
  setup.ts            jest-dom matchers; resets the URL, timers, and stubs after each test
  helpers/            seeded Math.random, a fake SpeechRecognition, animation-frame stubs, and flashcards.json fetch stubs
  data/               every deck builder and generator, flashcards.json checks, the deck catalog and unit codes
  services/           loading flashcards.json
  nlp/                answer matching and speech recognition
  components/         FlashCard, CountryMap, SubjectSelector
  modes/              multiple-choice play: Ready screen, scoring, hints, timer, pause, rounds
  routes/             home navigation, and typing/voice play (one-shot and continuous mic)
  App.test.ts         flashcard loading and errors, deck launching, deep links, back/forward, footer, and main.ts
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
