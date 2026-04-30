const STORAGE_KEY = "matchingTilesHighestUnlockedLevel";
const UNLOCK_ALL_FOR_TESTING = true;

const levels = [
  { id: 1, pairs: 6, columns: 4, previewSeconds: 4, maxMoves: null, timeLimitSeconds: null },
  { id: 2, pairs: 8, columns: 4, previewSeconds: 4, maxMoves: null, timeLimitSeconds: null },
  { id: 3, pairs: 10, columns: 5, previewSeconds: 4, maxMoves: null, timeLimitSeconds: null },
  { id: 4, pairs: 10, columns: 5, previewSeconds: 4, maxMoves: 30, timeLimitSeconds: null },
  { id: 5, pairs: 12, columns: 4, previewSeconds: 4, maxMoves: 34, timeLimitSeconds: null },
  { id: 6, pairs: 12, columns: 4, previewSeconds: 4, maxMoves: 30, timeLimitSeconds: null },
  { id: 7, pairs: 14, columns: 4, previewSeconds: 4, maxMoves: 38, timeLimitSeconds: null },
  { id: 8, pairs: 14, columns: 4, previewSeconds: 4, maxMoves: null, timeLimitSeconds: 120 },
  { id: 9, pairs: 16, columns: 4, previewSeconds: 4, maxMoves: null, timeLimitSeconds: 120 },
  { id: 10, pairs: 16, columns: 4, previewSeconds: 4, maxMoves: null, timeLimitSeconds: 120 }
];

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
  previewTimeoutId: null,
  previewIntervalId: null,
  pairResolveTimeoutId: null,
  mismatchTimeoutId: null,
  highestUnlockedLevel: 1,
  animatingTileIds: []
};

const dom = {};
const audioState = {
  context: null,
  enabled: false
};

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
  dom.gameControls = document.querySelector(".game-controls");

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

function ensureAudioContext() {
  if (audioState.context) return audioState.context;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  audioState.context = new AudioCtx();
  return audioState.context;
}

function unlockAudio() {
  if (audioState.enabled) return;
  const context = ensureAudioContext();
  if (!context) return;
  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }
  audioState.enabled = true;
}

function playTone(frequency, durationSec, volume, type) {
  const context = ensureAudioContext();
  if (!context || !audioState.enabled) return;

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const start = context.currentTime;
  const end = start + durationSec;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);

  gainNode.gain.setValueAtTime(0.0001, start);
  gainNode.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(end + 0.01);
}

function playFlipSound() {
  playTone(520, 0.05, 0.018, "square");
}

function playMatchSound() {
  playTone(640, 0.07, 0.024, "sine");
  setTimeout(() => {
    playTone(860, 0.08, 0.02, "sine");
  }, 55);
}

function playMismatchSound() {
  playTone(240, 0.08, 0.022, "triangle");
  setTimeout(() => {
    playTone(190, 0.1, 0.018, "triangle");
  }, 45);
}

function fitBoardToViewport(level) {
  if (!level || !dom.gameBoard || !dom.gameScreen) return;

  const totalTiles = level.pairs * 2;
  const isCompact = window.innerWidth <= 720;
  const gapPx = isCompact ? 8 : 12;
  const boardHorizontalPadding = 8;
  const minTileSize = isCompact ? 34 : 42;

  const screenRect = dom.gameScreen.getBoundingClientRect();
  const availableWidth = Math.max(140, screenRect.width - boardHorizontalPadding * 2);
  const boardTop = dom.gameBoard.getBoundingClientRect().top;
  const controlsHeight = dom.gameControls ? dom.gameControls.offsetHeight : 0;
  const safetyBottomSpace = isCompact ? 16 : 24;
  const availableHeight = Math.max(
    140,
    window.innerHeight - boardTop - controlsHeight - safetyBottomSpace
  );

  const widthLimitedMaxColumns = Math.max(
    level.columns,
    Math.floor((availableWidth + gapPx) / (minTileSize + gapPx))
  );
  const maxColumns = Math.min(totalTiles, widthLimitedMaxColumns);

  let bestColumns = level.columns;
  let bestTileSize = 0;

  for (let columns = level.columns; columns <= maxColumns; columns += 1) {
    const rows = Math.ceil(totalTiles / columns);
    const tileSizeByWidth = (availableWidth - gapPx * (columns - 1)) / columns;
    const tileSizeByHeight = (availableHeight - gapPx * (rows - 1)) / rows;
    const tileSize = Math.floor(Math.min(tileSizeByWidth, tileSizeByHeight));

    if (tileSize < minTileSize) continue;
    if (tileSize >= bestTileSize) {
      bestTileSize = tileSize;
      bestColumns = columns;
    }
  }

  if (bestTileSize === 0) {
    const fallbackRows = Math.ceil(totalTiles / level.columns);
    const tileSizeByWidth = (availableWidth - gapPx * (level.columns - 1)) / level.columns;
    const tileSizeByHeight = (availableHeight - gapPx * (fallbackRows - 1)) / fallbackRows;
    bestTileSize = Math.floor(Math.max(minTileSize, Math.min(tileSizeByWidth, tileSizeByHeight)));
  }

  dom.gameBoard.style.setProperty("--columns", String(bestColumns));
  dom.gameBoard.style.setProperty("--board-gap", `${gapPx}px`);
  dom.gameBoard.style.setProperty("--tile-size", `${bestTileSize}px`);
}

function showScreen(screenName) {
  dom.levelSelectScreen.classList.add("hidden");
  dom.gameScreen.classList.add("hidden");
  dom.levelCompleteScreen.classList.add("hidden");
  dom.retryScreen.classList.add("hidden");

  if (screenName === "levelSelect") dom.levelSelectScreen.classList.remove("hidden");
  if (screenName === "game") dom.gameScreen.classList.remove("hidden");
  if (screenName === "complete") dom.levelCompleteScreen.classList.remove("hidden");
  if (screenName === "retry") dom.retryScreen.classList.remove("hidden");
}

function getUnlockedLevelThreshold() {
  if (UNLOCK_ALL_FOR_TESTING) return levels.length;
  return gameState.highestUnlockedLevel;
}

function renderLevelSelect() {
  dom.levelList.innerHTML = "";
  const unlockedThreshold = getUnlockedLevelThreshold();

  levels.forEach((level) => {
    const button = document.createElement("button");
    const isUnlocked = level.id <= unlockedThreshold;
    button.classList.add("level-button");

    button.textContent = isUnlocked ? `Level ${level.id}` : `Level ${level.id} Locked`;
    if (!isUnlocked) button.classList.add("is-locked");
    button.disabled = !isUnlocked;

    button.addEventListener("click", () => startLevel(level.id));
    dom.levelList.appendChild(button);
  });
}

function getLevelById(levelId) {
  return levels.find((level) => level.id === levelId);
}

function setAnimatingTiles(tileIds) {
  gameState.animatingTileIds = Array.isArray(tileIds) ? tileIds : [];
}

function clearActiveTimeouts() {
  if (gameState.previewTimeoutId) {
    clearTimeout(gameState.previewTimeoutId);
    gameState.previewTimeoutId = null;
  }
  if (gameState.previewIntervalId) {
    clearInterval(gameState.previewIntervalId);
    gameState.previewIntervalId = null;
  }
  if (gameState.pairResolveTimeoutId) {
    clearTimeout(gameState.pairResolveTimeoutId);
    gameState.pairResolveTimeoutId = null;
  }
  if (gameState.mismatchTimeoutId) {
    clearTimeout(gameState.mismatchTimeoutId);
    gameState.mismatchTimeoutId = null;
  }
}

function generateTiles(level) {
  const selectedColors = colorPool.slice(0, level.pairs);
  const tiles = [];

  selectedColors.forEach((color, index) => {
    const pairId = `pair-${index + 1}`;

    tiles.push({ id: `${pairId}-a`, pairId, color, isFlipped: true, isMatched: false });
    tiles.push({ id: `${pairId}-b`, pairId, color, isFlipped: true, isMatched: false });
  });

  return shuffleTiles(tiles);
}

function shuffleTiles(tiles) {
  const shuffled = [...tiles];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled;
}

function renderGameHeader(level) {
  dom.levelNumber.textContent = String(level.id);
  dom.movesUsed.textContent = String(gameState.movesUsed);

  dom.moveLimit.textContent = level.maxMoves ? ` / ${level.maxMoves}` : "";

  if (level.timeLimitSeconds) {
    dom.timerDisplay.classList.remove("hidden");
    dom.timeRemaining.textContent = String(gameState.timeRemaining);
  } else {
    dom.timerDisplay.classList.add("hidden");
    dom.timeRemaining.textContent = "";
  }
}

function renderBoard(level) {
  dom.gameBoard.innerHTML = "";
  fitBoardToViewport(level);

  gameState.tiles.forEach((tile) => {
    const tileButton = document.createElement("button");
    tileButton.classList.add("tile");
    tileButton.dataset.tileId = tile.id;
    tileButton.setAttribute("aria-label", "Memory tile");
    tileButton.style.setProperty("--tile-color", tile.color);

    if (tile.isFlipped) {
      tileButton.classList.add("is-flipped");
    } else {
      tileButton.classList.add("is-hidden");
    }

    if (tile.isMatched) {
      tileButton.classList.add("is-matched");
    }
    if (gameState.animatingTileIds.includes(tile.id)) {
      tileButton.classList.add("is-just-flipped");
    }

    tileButton.disabled =
      gameState.phase !== "playing" ||
      gameState.isBoardLocked ||
      tile.isMatched ||
      tile.isFlipped;

    tileButton.addEventListener("click", () => handleTileClick(tile.id));
    dom.gameBoard.appendChild(tileButton);
  });

  setAnimatingTiles([]);
}

function updateBoard() {
  const level = getLevelById(gameState.currentLevelId);
  if (!level) return;
  renderBoard(level);
}

function startPreview(level) {
  gameState.phase = "preview";
  gameState.isBoardLocked = true;
  let previewSecondsRemaining = level.previewSeconds;
  dom.statusMessage.textContent = `Memorize the tiles (${previewSecondsRemaining})`;

  gameState.tiles.forEach((tile) => {
    tile.isFlipped = true;
  });

  setAnimatingTiles([]);
  updateBoard();

  gameState.previewIntervalId = setInterval(() => {
    previewSecondsRemaining -= 1;
    if (previewSecondsRemaining > 0) {
      dom.statusMessage.textContent = `Memorize the tiles (${previewSecondsRemaining})`;
    }
  }, 1000);

  gameState.previewTimeoutId = setTimeout(() => {
    gameState.previewTimeoutId = null;
    if (gameState.previewIntervalId) {
      clearInterval(gameState.previewIntervalId);
      gameState.previewIntervalId = null;
    }

    gameState.tiles.forEach((tile) => {
      if (!tile.isMatched) tile.isFlipped = false;
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

function startLevel(levelId) {
  stopTimer();
  clearActiveTimeouts();

  const level = getLevelById(levelId);
  if (!level) return;

  gameState.currentLevelId = level.id;
  gameState.phase = "preview";
  gameState.tiles = generateTiles(level);
  gameState.firstTile = null;
  gameState.secondTile = null;
  gameState.isBoardLocked = true;
  gameState.movesUsed = 0;
  gameState.matchedPairs = 0;
  gameState.timeRemaining = level.timeLimitSeconds;
  setAnimatingTiles([]);

  renderGameHeader(level);
  renderBoard(level);
  showScreen("game");
  startPreview(level);
}

function clearSelectedTiles() {
  gameState.firstTile = null;
  gameState.secondTile = null;
}

function hasWonLevel() {
  const level = getLevelById(gameState.currentLevelId);
  if (!level) return false;
  return gameState.matchedPairs === level.pairs;
}

function failLevel(reason) {
  stopTimer();
  clearActiveTimeouts();
  gameState.phase = "failed";
  gameState.isBoardLocked = true;
  dom.failureMessage.textContent = reason;
  showScreen("retry");
}

function checkMoveLimitFailure() {
  const level = getLevelById(gameState.currentLevelId);
  if (!level || !level.maxMoves) return;
  if (hasWonLevel()) return;

  if (gameState.movesUsed >= level.maxMoves) {
    failLevel("You ran out of moves.");
  }
}

function unlockNextLevel() {
  const nextLevel = gameState.currentLevelId + 1;
  if (nextLevel <= levels.length && nextLevel > gameState.highestUnlockedLevel) {
    gameState.highestUnlockedLevel = nextLevel;
    saveProgress();
  }
}

function completeLevel() {
  stopTimer();
  clearActiveTimeouts();
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

function handleMatch() {
  playMatchSound();
  gameState.firstTile.isMatched = true;
  gameState.secondTile.isMatched = true;
  gameState.matchedPairs += 1;
  gameState.isBoardLocked = false;

  clearSelectedTiles();
  updateBoard();

  if (hasWonLevel()) {
    completeLevel();
    return;
  }

  checkMoveLimitFailure();
}

function handleMismatch() {
  playMismatchSound();
  gameState.isBoardLocked = true;
  updateBoard();

  gameState.mismatchTimeoutId = setTimeout(() => {
    gameState.mismatchTimeoutId = null;
    if (!gameState.firstTile || !gameState.secondTile) return;

    gameState.firstTile.isFlipped = false;
    gameState.secondTile.isFlipped = false;
    setAnimatingTiles([gameState.firstTile.id, gameState.secondTile.id]);
    clearSelectedTiles();
    gameState.isBoardLocked = false;

    updateBoard();
    checkMoveLimitFailure();
  }, 700);
}

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

function handleTileClick(tileId) {
  unlockAudio();
  if (gameState.phase !== "playing") return;
  if (gameState.isBoardLocked) return;

  const tile = gameState.tiles.find((item) => item.id === tileId);
  if (!tile) return;
  if (tile.isMatched || tile.isFlipped) return;

  tile.isFlipped = true;
  playFlipSound();
  setAnimatingTiles([tile.id]);

  if (!gameState.firstTile) {
    gameState.firstTile = tile;
    updateBoard();
    return;
  }

  gameState.secondTile = tile;
  gameState.movesUsed += 1;
  dom.movesUsed.textContent = String(gameState.movesUsed);
  gameState.isBoardLocked = true;

  updateBoard();
  gameState.pairResolveTimeoutId = setTimeout(() => {
    gameState.pairResolveTimeoutId = null;
    checkSelectedTiles();
  }, 220);
}

function startTimer() {
  stopTimer();
  dom.timeRemaining.textContent = String(gameState.timeRemaining);

  gameState.timerId = setInterval(() => {
    gameState.timeRemaining -= 1;
    dom.timeRemaining.textContent = String(gameState.timeRemaining);

    if (gameState.timeRemaining <= 0) {
      if (hasWonLevel()) {
        completeLevel();
      } else {
        failLevel("Time is up.");
      }
    }
  }, 1000);
}

function stopTimer() {
  if (gameState.timerId) {
    clearInterval(gameState.timerId);
    gameState.timerId = null;
  }
}

function loadProgress() {
  const savedLevel = Number(localStorage.getItem(STORAGE_KEY));
  gameState.highestUnlockedLevel = savedLevel || 1;
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, String(gameState.highestUnlockedLevel));
}

function backToLevelSelect() {
  stopTimer();
  clearActiveTimeouts();
  gameState.phase = "levelSelect";
  gameState.isBoardLocked = false;
  dom.statusMessage.textContent = "";
  renderLevelSelect();
  showScreen("levelSelect");
}

function attachEventListeners() {
  document.addEventListener("pointerdown", unlockAudio, { once: true });
  document.addEventListener("keydown", unlockAudio, { once: true });
  dom.restartLevelButton.addEventListener("click", () => {
    if (gameState.currentLevelId) startLevel(gameState.currentLevelId);
  });

  dom.backToLevelsButton.addEventListener("click", backToLevelSelect);

  dom.nextLevelButton.addEventListener("click", () => {
    const nextLevelId = gameState.currentLevelId + 1;
    if (nextLevelId <= levels.length) {
      startLevel(nextLevelId);
    } else {
      backToLevelSelect();
    }
  });

  dom.replayLevelButton.addEventListener("click", () => {
    if (gameState.currentLevelId) startLevel(gameState.currentLevelId);
  });

  dom.completeBackButton.addEventListener("click", backToLevelSelect);

  dom.retryButton.addEventListener("click", () => {
    if (gameState.currentLevelId) startLevel(gameState.currentLevelId);
  });

  dom.retryBackButton.addEventListener("click", backToLevelSelect);

  window.addEventListener("resize", () => {
    if (gameState.phase === "levelSelect") return;
    const level = getLevelById(gameState.currentLevelId);
    if (!level) return;
    fitBoardToViewport(level);
  });
}

function initGame() {
  cacheDomElements();
  loadProgress();
  attachEventListeners();
  renderLevelSelect();
  showScreen("levelSelect");
}

document.addEventListener("DOMContentLoaded", initGame);
