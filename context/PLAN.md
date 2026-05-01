# Classic Matching Tiles Game Implementation Plan

## Project Summary

Build a classic 2D memory matching tiles game using plain HTML, CSS, and vanilla JavaScript.

The game starts with 6 pairs of tiles, for 12 total tiles. The player briefly sees all tiles at the beginning of each level attempt, then the tiles flip face down. The player taps tiles to reveal them and tries to find matching pairs.

The game has 10 fixed levels. Levels are locked at first and unlock one by one. For testing purposes, keep levels unlocked for now. Progress is saved in `localStorage`.

The first levels are relaxed. Later levels add move limits, then timers, then combined constraints.

## Core Requirements

- Use plain vanilla JavaScript.
- No frameworks.
- No images for MVP.
- Use colors as temporary tile faces.
- Support desktop and mobile.
- Use fixed levels, not endless scaling.
- Start with 6 pairs, 12 total tiles.
- Show all tiles briefly at the start of every level attempt.
- Save highest unlocked level in `localStorage`.
- Lock levels until the previous level is completed. Keep open right now for testing.
- If the player exceeds the move limit or timer, the level fails.
- On failure, show a retry screen immediately.
- No star system.
- No leaderboard.
- No user accounts.

## File Structure

```text
matching-tiles-game/
  index.html
  styles.css
  script.js
```

Keep the MVP simple with one JavaScript file. The code can be split later if needed.

## HTML Structure

Create these main areas in `index.html`:

```html
<main class="app">
  <section id="level-select-screen" class="screen">
    <h1>Tile Flip</h1>
    <p>Choose an unlocked level.</p>
    <div id="level-list" class="level-list"></div>
  </section>

  <section id="game-screen" class="screen hidden">
    <header class="game-header">
      <div>Level <span id="level-number"></span></div>
      <div>Moves: <span id="moves-used">0</span><span id="move-limit"></span></div>
      <div id="timer-display" class="hidden">Time: <span id="time-remaining"></span></div>
    </header>

    <p id="status-message" class="status-message"></p>

    <div id="game-board" class="game-board"></div>

    <div class="game-controls">
      <button id="restart-level-button">Restart Level</button>
      <button id="back-to-levels-button">Back to Levels</button>
    </div>
  </section>

  <section id="level-complete-screen" class="screen hidden">
    <h2>Level Complete</h2>
    <p id="level-complete-message"></p>
    <button id="next-level-button">Next Level</button>
    <button id="replay-level-button">Replay Level</button>
    <button id="complete-back-button">Back to Levels</button>
  </section>

  <section id="retry-screen" class="screen hidden">
    <h2>Try Again</h2>
    <p id="failure-message"></p>
    <button id="retry-button">Retry</button>
    <button id="retry-back-button">Back to Levels</button>
  </section>
</main>
```

## CSS Responsibilities

The design will be handled later, but `styles.css` should provide functional layout.

Required CSS behavior:

```text
- Hide inactive screens.
- Display the board as a responsive grid.
- Make tiles large enough to tap on mobile.
- Support a simple tile flip state.
- Support matched, hidden, locked, and face-up states.
- Keep the board centered.
- Prevent the board from becoming too wide on desktop.
```

Example structure:

```css
.hidden {
  display: none;
}

.game-board {
  display: grid;
  grid-template-columns: repeat(var(--columns), 1fr);
  gap: 0.75rem;
  width: min(100%, 640px);
  margin: 0 auto;
}

.tile {
  aspect-ratio: 1;
  border: 0;
  border-radius: 0.75rem;
  cursor: pointer;
}

.tile.is-hidden {
  background: #222;
}

.tile.is-flipped,
.tile.is-matched {
  background: var(--tile-color);
}

.tile.is-matched {
  cursor: default;
}

.tile:disabled {
  cursor: default;
}
```

## Level Configs

Add the first 10 levels as a fixed configuration array.

```js
const levels = [
  {
    id: 1,
    pairs: 6,
    columns: 4,
    previewSeconds: 4,
    maxMoves: null,
    timeLimitSeconds: null
  },
  {
    id: 2,
    pairs: 8,
    columns: 4,
    previewSeconds: 4,
    maxMoves: null,
    timeLimitSeconds: null
  },
  {
    id: 3,
    pairs: 10,
    columns: 5,
    previewSeconds: 4,
    maxMoves: null,
    timeLimitSeconds: null
  },
  {
    id: 4,
    pairs: 10,
    columns: 5,
    previewSeconds: 4,
    maxMoves: 30,
    timeLimitSeconds: null
  },
  {
    id: 5,
    pairs: 12,
    columns: 4,
    previewSeconds: 4,
    maxMoves: 34,
    timeLimitSeconds: null
  },
  {
    id: 6,
    pairs: 12,
    columns: 4,
    previewSeconds: 4,
    maxMoves: 30,
    timeLimitSeconds: null
  },
  {
    id: 7,
    pairs: 14,
    columns: 4,
    previewSeconds: 4,
    maxMoves: 38,
    timeLimitSeconds: null
  },
  {
    id: 8,
    pairs: 14,
    columns: 4,
    previewSeconds: 4,
    maxMoves: null,
    timeLimitSeconds: 120
  },
  {
    id: 9,
    pairs: 16,
    columns: 4,
    previewSeconds: 4,
    maxMoves: null,
    timeLimitSeconds: 120
  },
  {
    id: 10,
    pairs: 16,
    columns: 4,
    previewSeconds: 4,
    maxMoves: null,
    timeLimitSeconds: 120
  }
];
```

## Difficulty Curve

### Levels 1 to 3

Purpose: teach the matching mechanic and build confidence.

```text
Level 1: 6 pairs, no pressure
Level 2: 8 pairs, no pressure
Level 3: 10 pairs, no pressure
```

### Levels 4 to 7

Purpose: introduce move limits gradually.

```text
Level 4: 10 pairs, 30 moves
Level 5: 12 pairs, 34 moves
Level 6: 12 pairs, 30 moves
Level 7: 14 pairs, 38 moves
```

### Level 8

Purpose: introduce timer pressure by itself.

```text
Level 8: 14 pairs, 120 seconds, no move limit
```

### Levels 9 to 10

Purpose: combine larger boards with stronger constraints.

```text
Level 9: 16 pairs, no move limit
Level 10: 16 pairs, no move limit
```

## Color Pool

Use colors as temporary tile faces.

```js
const colorPool = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#64748b",
  "#0f766e"
];
```

There must be at least as many colors as the largest level has pairs. Level 10 uses 16 pairs, so the color pool must have at least 16 colors.

## Game State

Use one central state object.

```js
const gameState = {
  currentLevelId: null,
  phase: "levelSelect",
  tiles: [],
  firstTile: null,
  secondTile: null,
  isBoardLocked: false,
  movesUsed: 0,
  matchedPairs: 0,
  timeRemaining: null,
  timerId: null,
  highestUnlockedLevel: 1
};
```

Valid phases:

```text
levelSelect
preview
playing
won
failed
```

## Tile Model

Each tile should be an object.

```js
{
  id: "tile-1",
  pairId: "pair-1",
  color: "#ef4444",
  isFlipped: false,
  isMatched: false
}
```

Important rule:

```text
Always compare pairId to check matches.
Do not compare colors directly.
```

This makes it easy to replace colors with images later.

Future image version:

```js
{
  id: "tile-1",
  pairId: "apple",
  imageSrc: "images/apple.png",
  isFlipped: false,
  isMatched: false
}
```

## localStorage

Save the highest unlocked level.

Storage key:

```js
const STORAGE_KEY = "matchingTilesHighestUnlockedLevel";
```

Load progress:

```js
function loadProgress() {
  const savedLevel = Number(localStorage.getItem(STORAGE_KEY));
  gameState.highestUnlockedLevel = savedLevel || 1;
}
```

Save progress:

```js
function saveProgress() {
  localStorage.setItem(
    STORAGE_KEY,
    String(gameState.highestUnlockedLevel)
  );
}
```

Unlock next level:

```js
function unlockNextLevel() {
  const nextLevel = gameState.currentLevelId + 1;

  if (
    nextLevel <= levels.length &&
    nextLevel > gameState.highestUnlockedLevel
  ) {
    gameState.highestUnlockedLevel = nextLevel;
    saveProgress();
  }
}
```

Rules:

```text
- New players start with only Level 1 unlocked.
- Completing Level 1 unlocks Level 2.
- Completing Level 2 unlocks Level 3.
- Continue until Level 10.
- Replaying old levels must not reduce progress.
- Refreshing the browser must preserve progress.
```

## Main Functions

### initGame

Runs once when the page loads.

Responsibilities:

```text
- Query and store DOM elements.
- Load progress from localStorage.
- Render the level select screen.
- Attach event listeners.
- Show the level select screen.
```

Suggested function:

```js
function initGame() {
  loadProgress();
  cacheDomElements();
  attachEventListeners();
  renderLevelSelect();
  showScreen("levelSelect");
}
```

### cacheDomElements

Store DOM references in one object.

```js
const dom = {};

function cacheDomElements() {
  dom.levelSelectScreen = document.querySelector("#level-select-screen");
  dom.gameScreen = document.querySelector("#game-screen");
  dom.levelCompleteScreen = document.querySelector("#level-complete-screen");
  dom.retryScreen = document.querySelector("#retry-screen");

  dom.levelList = document.querySelector("#level-list");
  dom.gameBoard = document.querySelector("#game-board");
  dom.levelNumber = document.querySelector("#level-number");
  dom.movesUsed = document.querySelector("#moves-used");
  dom.moveLimit = document.querySelector("#move-limit");
  dom.timerDisplay = document.querySelector("#timer-display");
  dom.timeRemaining = document.querySelector("#time-remaining");
  dom.statusMessage = document.querySelector("#status-message");

  dom.restartLevelButton = document.querySelector("#restart-level-button");
  dom.backToLevelsButton = document.querySelector("#back-to-levels-button");
  dom.nextLevelButton = document.querySelector("#next-level-button");
  dom.replayLevelButton = document.querySelector("#replay-level-button");
  dom.completeBackButton = document.querySelector("#complete-back-button");
  dom.retryButton = document.querySelector("#retry-button");
  dom.retryBackButton = document.querySelector("#retry-back-button");

  dom.levelCompleteMessage = document.querySelector("#level-complete-message");
  dom.failureMessage = document.querySelector("#failure-message");
}
```

### showScreen

Controls which screen is visible.

```js
function showScreen(screenName) {
  dom.levelSelectScreen.classList.add("hidden");
  dom.gameScreen.classList.add("hidden");
  dom.levelCompleteScreen.classList.add("hidden");
  dom.retryScreen.classList.add("hidden");

  if (screenName === "levelSelect") {
    dom.levelSelectScreen.classList.remove("hidden");
  }

  if (screenName === "game") {
    dom.gameScreen.classList.remove("hidden");
  }

  if (screenName === "complete") {
    dom.levelCompleteScreen.classList.remove("hidden");
  }

  if (screenName === "retry") {
    dom.retryScreen.classList.remove("hidden");
  }
}
```

### renderLevelSelect

Render buttons for levels 1 to 10.

Responsibilities:

```text
- Show all 10 levels.
- Enable only unlocked levels.
- Disable locked levels.
- Display locked state clearly.
```

Suggested logic:

```js
function renderLevelSelect() {
  dom.levelList.innerHTML = "";

  levels.forEach((level) => {
    const button = document.createElement("button");
    const isUnlocked = level.id <= gameState.highestUnlockedLevel;

    button.textContent = isUnlocked
      ? `Level ${level.id}`
      : `Level ${level.id} Locked`;

    button.disabled = !isUnlocked;

    button.addEventListener("click", () => {
      startLevel(level.id);
    });

    dom.levelList.appendChild(button);
  });
}
```

### getLevelById

```js
function getLevelById(levelId) {
  return levels.find((level) => level.id === levelId);
}
```

### startLevel

Starts or restarts a level attempt.

Responsibilities:

```text
- Stop any existing timer.
- Load level config.
- Reset state.
- Generate tiles.
- Render board.
- Show game screen.
- Start preview phase.
```

Suggested logic:

```js
function startLevel(levelId) {
  stopTimer();

  const level = getLevelById(levelId);

  gameState.currentLevelId = level.id;
  gameState.phase = "preview";
  gameState.tiles = generateTiles(level);
  gameState.firstTile = null;
  gameState.secondTile = null;
  gameState.isBoardLocked = true;
  gameState.movesUsed = 0;
  gameState.matchedPairs = 0;
  gameState.timeRemaining = level.timeLimitSeconds;

  renderGameHeader(level);
  renderBoard(level);
  showScreen("game");
  startPreview(level);
}
```

### generateTiles

Creates tile pairs for the current level.

```js
function generateTiles(level) {
  const selectedColors = colorPool.slice(0, level.pairs);
  const tiles = [];

  selectedColors.forEach((color, index) => {
    const pairId = `pair-${index + 1}`;

    tiles.push({
      id: `${pairId}-a`,
      pairId,
      color,
      isFlipped: true,
      isMatched: false
    });

    tiles.push({
      id: `${pairId}-b`,
      pairId,
      color,
      isFlipped: true,
      isMatched: false
    });
  });

  return shuffleTiles(tiles);
}
```

### shuffleTiles

Use Fisher-Yates shuffle.

```js
function shuffleTiles(tiles) {
  const shuffled = [...tiles];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[i]
    ];
  }

  return shuffled;
}
```

### renderGameHeader

```js
function renderGameHeader(level) {
  dom.levelNumber.textContent = level.id;
  dom.movesUsed.textContent = gameState.movesUsed;

  dom.moveLimit.textContent = level.maxMoves
    ? ` / ${level.maxMoves}`
    : "";

  if (level.timeLimitSeconds) {
    dom.timerDisplay.classList.remove("hidden");
    dom.timeRemaining.textContent = gameState.timeRemaining;
  } else {
    dom.timerDisplay.classList.add("hidden");
    dom.timeRemaining.textContent = "";
  }
}
```

### renderBoard

Responsibilities:

```text
- Set CSS column count from level config.
- Create one button per tile.
- Add tile state classes.
- Use color for flipped and matched tiles.
- Attach click event for each tile.
```

Suggested logic:

```js
function renderBoard(level) {
  dom.gameBoard.innerHTML = "";
  dom.gameBoard.style.setProperty("--columns", level.columns);

  gameState.tiles.forEach((tile) => {
    const tileButton = document.createElement("button");
    tileButton.classList.add("tile");
    tileButton.dataset.tileId = tile.id;
    tileButton.style.setProperty("--tile-color", tile.color);

    if (tile.isFlipped) {
      tileButton.classList.add("is-flipped");
    } else {
      tileButton.classList.add("is-hidden");
    }

    if (tile.isMatched) {
      tileButton.classList.add("is-matched");
    }

    tileButton.disabled =
      gameState.phase !== "playing" ||
      gameState.isBoardLocked ||
      tile.isMatched ||
      tile.isFlipped;

    tileButton.addEventListener("click", () => {
      handleTileClick(tile.id);
    });

    dom.gameBoard.appendChild(tileButton);
  });
}
```

### updateBoard

Re-render the board using the current state.

```js
function updateBoard() {
  const level = getLevelById(gameState.currentLevelId);
  renderBoard(level);
}
```

### startPreview

Every attempt gets a preview, including retries.

```js
function startPreview(level) {
  gameState.phase = "preview";
  gameState.isBoardLocked = true;
  dom.statusMessage.textContent = "Memorize the tiles";

  gameState.tiles.forEach((tile) => {
    tile.isFlipped = true;
  });

  updateBoard();

  setTimeout(() => {
    gameState.tiles.forEach((tile) => {
      if (!tile.isMatched) {
        tile.isFlipped = false;
      }
    });

    gameState.phase = "playing";
    gameState.isBoardLocked = false;
    dom.statusMessage.textContent = "Find all matching pairs";

    updateBoard();

    if (level.timeLimitSeconds) {
      startTimer();
    }
  }, level.previewSeconds * 1000);
}
```

## Event Handling

### attachEventListeners

```js
function attachEventListeners() {
  dom.restartLevelButton.addEventListener("click", () => {
    startLevel(gameState.currentLevelId);
  });

  dom.backToLevelsButton.addEventListener("click", () => {
    stopTimer();
    gameState.phase = "levelSelect";
    renderLevelSelect();
    showScreen("levelSelect");
  });

  dom.nextLevelButton.addEventListener("click", () => {
    const nextLevelId = gameState.currentLevelId + 1;

    if (nextLevelId <= levels.length) {
      startLevel(nextLevelId);
    } else {
      renderLevelSelect();
      showScreen("levelSelect");
    }
  });

  dom.replayLevelButton.addEventListener("click", () => {
    startLevel(gameState.currentLevelId);
  });

  dom.completeBackButton.addEventListener("click", () => {
    renderLevelSelect();
    showScreen("levelSelect");
  });

  dom.retryButton.addEventListener("click", () => {
    startLevel(gameState.currentLevelId);
  });

  dom.retryBackButton.addEventListener("click", () => {
    renderLevelSelect();
    showScreen("levelSelect");
  });
}
```

### handleTileClick

Main click handler.

Rules:

```text
- Ignore clicks unless phase is playing.
- Ignore clicks if board is locked.
- Ignore clicks on matched tiles.
- Ignore clicks on already flipped tiles.
- First tile selection flips the tile.
- Second tile selection flips the tile, counts one move, then checks match.
```

Suggested logic:

```js
function handleTileClick(tileId) {
  if (gameState.phase !== "playing") return;
  if (gameState.isBoardLocked) return;

  const tile = gameState.tiles.find((item) => item.id === tileId);

  if (!tile) return;
  if (tile.isMatched) return;
  if (tile.isFlipped) return;

  tile.isFlipped = true;

  if (!gameState.firstTile) {
    gameState.firstTile = tile;
    updateBoard();
    return;
  }

  gameState.secondTile = tile;
  gameState.movesUsed += 1;
  dom.movesUsed.textContent = gameState.movesUsed;

  updateBoard();
  checkSelectedTiles();
}
```

### checkSelectedTiles

```js
function checkSelectedTiles() {
  const firstTile = gameState.firstTile;
  const secondTile = gameState.secondTile;

  if (!firstTile || !secondTile) return;

  if (firstTile.pairId === secondTile.pairId) {
    handleMatch();
  } else {
    handleMismatch();
  }
}
```

### handleMatch

```js
function handleMatch() {
  gameState.firstTile.isMatched = true;
  gameState.secondTile.isMatched = true;
  gameState.matchedPairs += 1;

  clearSelectedTiles();
  updateBoard();

  if (hasWonLevel()) {
    completeLevel();
    return;
  }

  checkMoveLimitFailure();
}
```

### handleMismatch

```js
function handleMismatch() {
  gameState.isBoardLocked = true;
  updateBoard();

  setTimeout(() => {
    gameState.firstTile.isFlipped = false;
    gameState.secondTile.isFlipped = false;

    clearSelectedTiles();
    gameState.isBoardLocked = false;

    updateBoard();
    checkMoveLimitFailure();
  }, 700);
}
```

### clearSelectedTiles

```js
function clearSelectedTiles() {
  gameState.firstTile = null;
  gameState.secondTile = null;
}
```

## Win and Failure Logic

### hasWonLevel

```js
function hasWonLevel() {
  const level = getLevelById(gameState.currentLevelId);
  return gameState.matchedPairs === level.pairs;
}
```

### completeLevel

```js
function completeLevel() {
  stopTimer();

  gameState.phase = "won";
  gameState.isBoardLocked = true;

  unlockNextLevel();

  dom.levelCompleteMessage.textContent =
    gameState.currentLevelId === levels.length
      ? "You completed all levels."
      : `Level ${gameState.currentLevelId} complete.`;

  if (gameState.currentLevelId === levels.length) {
    dom.nextLevelButton.classList.add("hidden");
  } else {
    dom.nextLevelButton.classList.remove("hidden");
  }

  showScreen("complete");
}
```

### checkMoveLimitFailure

Important rule:

```text
If the final match happens on the final allowed move, the player wins.
Only fail if the move limit is reached and the level is not complete.
```

```js
function checkMoveLimitFailure() {
  const level = getLevelById(gameState.currentLevelId);

  if (!level.maxMoves) return;
  if (hasWonLevel()) return;

  if (gameState.movesUsed >= level.maxMoves) {
    failLevel("You ran out of moves.");
  }
}
```

### failLevel

```js
function failLevel(reason) {
  stopTimer();

  gameState.phase = "failed";
  gameState.isBoardLocked = true;

  dom.failureMessage.textContent = reason;
  showScreen("retry");
}
```

## Timer Logic

### startTimer

The timer starts after the preview phase, not during preview.

```js
function startTimer() {
  stopTimer();

  dom.timeRemaining.textContent = gameState.timeRemaining;

  gameState.timerId = setInterval(() => {
    gameState.timeRemaining -= 1;
    dom.timeRemaining.textContent = gameState.timeRemaining;

    if (gameState.timeRemaining <= 0) {
      if (hasWonLevel()) {
        completeLevel();
      } else {
        failLevel("Time is up.");
      }
    }
  }, 1000);
}
```

### stopTimer

```js
function stopTimer() {
  if (gameState.timerId) {
    clearInterval(gameState.timerId);
    gameState.timerId = null;
  }
}
```

## Game Startup

At the bottom of `script.js`:

```js
document.addEventListener("DOMContentLoaded", initGame);
```

## Full Level Behavior

### Level 1

```text
Pairs: 6
Total tiles: 12
Grid: 4 columns
Preview: 3 seconds
Move limit: none
Timer: none
Goal: teach the base matching mechanic
```

### Level 2

```text
Pairs: 8
Total tiles: 16
Grid: 4 columns
Preview: 3 seconds
Move limit: none
Timer: none
Goal: increase memory load slightly
```

### Level 3

```text
Pairs: 10
Total tiles: 20
Grid: 5 columns
Preview: 3 seconds
Move limit: none
Timer: none
Goal: larger board without pressure
```

### Level 4

```text
Pairs: 10
Total tiles: 20
Grid: 5 columns
Preview: 2 seconds
Move limit: 30
Timer: none
Goal: introduce limited moves gently
```

### Level 5

```text
Pairs: 12
Total tiles: 24
Grid: 4 columns
Preview: 2 seconds
Move limit: 34
Timer: none
Goal: larger board with a forgiving move limit
```

### Level 6

```text
Pairs: 12
Total tiles: 24
Grid: 4 columns
Preview: 2 seconds
Move limit: 30
Timer: none
Goal: same board size as Level 5, stricter move limit
```

### Level 7

```text
Pairs: 14
Total tiles: 28
Grid: 4 columns
Preview: 2 seconds
Move limit: 38
Timer: none
Goal: bigger board with move pressure
```

### Level 8

```text
Pairs: 14
Total tiles: 28
Grid: 4 columns
Preview: 2 seconds
Move limit: none
Timer: 120 seconds
Goal: introduce timer pressure without move pressure
```

### Level 9

```text
Pairs: 16
Total tiles: 32
Grid: 4 columns
Preview: 2 seconds
Move limit: none
Timer: 120 sec
Goal: largest board with timer
```

### Level 10

```text
Pairs: 16
Total tiles: 32
Grid: 4 columns
Preview: 2 seconds
Move limit: none
Timer: 120 seconds
Goal: final challenge combining largest board, and timer
```

## Edge Cases to Handle

The implementation must handle these cases:

```text
- User taps during preview.
- User taps the same tile twice.
- User taps an already matched tile.
- User taps an already flipped tile.
- User taps while two mismatched tiles are waiting to flip back.
- User finishes the level on the final allowed move.
- User finishes the level as the timer reaches zero.
- User restarts a timer level.
- User goes back to level select during a timer level.
- User refreshes the page after unlocking a level.
- User replays an earlier completed level.
- User completes Level 10.
```

## Acceptance Criteria

### General

```text
- The app runs with only HTML, CSS, and vanilla JavaScript.
- The app works on desktop and mobile.
- The game uses colors as temporary tile faces.
- The board renders correctly for all 10 levels.
- No framework or build step is required.
```

### Level Select

```text
- Level 1 is unlocked for new users.
- Levels 2 to 10 are locked for new users.
- Completing a level unlocks the next level.
- Locked levels cannot be started.
- Unlocked levels can be replayed.
- Progress survives page refresh through localStorage.
```

### Preview

```text
- Every level attempt starts with a preview phase.
- Every retry also starts with a preview phase.
- Tiles are visible during preview.
- User cannot interact with tiles during preview.
- Timer does not start until preview ends.
```

### Matching

```text
- User can flip one tile at a time.
- A move is counted only after the second tile is flipped.
- Matching tiles stay revealed.
- Non-matching tiles flip back after a short delay.
- User cannot tap other tiles during the mismatch delay.
- Level completes when all pairs are matched.
```

### Move Limits

```text
- Levels without maxMoves do not fail from moves.
- Levels with maxMoves show the move limit.
- If the player uses all allowed moves and still has unmatched pairs, the level fails.
- If the player completes the final pair on the final allowed move, the level succeeds.
```

### Timer

```text
- Levels without timeLimitSeconds do not show a timer.
- Levels with timeLimitSeconds show the timer.
- Timer starts after preview.
- Timer stops when the level is completed.
- Timer stops when the level fails.
- Timer resets on retry.
- If time reaches zero before completion, the level fails.
```

### Failure

```text
- Failure immediately shows the retry screen.
- Retry restarts the same level.
- Retry includes the preview phase again.
- Back to Levels returns to the level select screen.
```

### Completion

```text
- Completing a level shows the completion screen.
- Next Level starts the next unlocked level.
- Replay Level restarts the same level.
- Completing Level 10 shows that all levels are complete.
- Completing Level 10 does not try to unlock Level 11.
```

## Suggested Implementation Order

```text
1. Build the static HTML screens.
2. Add minimal CSS for layout, hidden screens, board grid, and tile states.
3. Add the level config array.
4. Add the color pool.
5. Add the game state object.
6. Add DOM caching.
7. Add screen switching.
8. Add localStorage loading and saving.
9. Add level select rendering with locked levels.
10. Add tile generation.
11. Add Fisher-Yates shuffle.
12. Add board rendering
13. Add preview phase.
14. Add tile click handling.
15. Add matching logic.
16. Add mismatch delay and board lock.
17. Add win detection.
18. Add next level unlocking.
19. Add retry flow.
20. Add move limits.
21. Add timer logic.
22. Test all 10 levels.
23. Test refresh persistence.
24. Test mobile tap behavior.

```
