const STORAGE_KEY = "matchingTilesHighestUnlockedLevel";
const COMPLETED_KEY = "matchingTilesCompletedLevels";
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

const symbolPool = [
  "★", "●", "▲", "■", "◆", "♠",
  "♣", "♥", "♦", "◉", "▼", "▶",
  "◀", "⬡", "✦", "◈"
];

const colorPool = [
  "#2d1515", "#2d1f0d", "#2a2710", "#132913",
  "#0d2420", "#0d1e29", "#0d1429", "#150d29",
  "#1e0d29", "#260d2a", "#290d22", "#290d14",
  "#1a1a2a", "#0d2419", "#23200d", "#2a150d"
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
  autoAdvanceTimeoutId: null,
  highestUnlockedLevel: 1,
  completedLevels: new Set(),
  animatingTileIds: [],
  displayPairs: null
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

  dom.howToPlayButton = document.querySelector("#how-to-play-button");
  dom.howToPlayModal = document.querySelector("#how-to-play-modal");
  dom.closeModalButton = document.querySelector("#close-modal-button");
}

function openModal() {
  dom.howToPlayModal.classList.remove("hidden");
  dom.closeModalButton.focus();
}

function closeModal() {
  dom.howToPlayModal.classList.add("hidden");
  dom.howToPlayButton.focus();
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

const TILE_ASPECT = 4 / 3; // height / width (portrait)
const MIN_TILE_WIDTH_DESKTOP = 90;
const MIN_TILE_WIDTH_COMPACT = 62;

function getViewportMetrics() {
  const isCompact = window.innerWidth <= 720;
  const gapPx = isCompact ? 8 : 12;
  const minTileWidth = isCompact ? MIN_TILE_WIDTH_COMPACT : MIN_TILE_WIDTH_DESKTOP;
  const screenStyle = getComputedStyle(dom.gameScreen);
  const screenPaddingH = parseFloat(screenStyle.paddingLeft) + parseFloat(screenStyle.paddingRight);
  const availableWidth = Math.max(140, dom.gameScreen.clientWidth - screenPaddingH - 2);
  const boardTop = dom.gameBoard.getBoundingClientRect().top;
  const controlsHeight = dom.gameControls ? dom.gameControls.offsetHeight : 0;
  const safetyBottomSpace = isCompact ? 16 : 24;
  const availableHeight = Math.max(140, window.innerHeight - boardTop - controlsHeight - safetyBottomSpace);
  return { isCompact, gapPx, minTileWidth, availableWidth, availableHeight };
}

function findBestColumns(pairs, metrics) {
  const { gapPx, minTileWidth, availableWidth, availableHeight } = metrics;
  const totalTiles = pairs * 2;
  const maxColumns = Math.floor(totalTiles / 2); // at least 2 rows

  let bestColumns = 0;
  let bestTileWidth = 0;

  for (let columns = 2; columns <= maxColumns; columns++) {
    if (totalTiles % columns !== 0) continue;
    const rows = totalTiles / columns;
    const tileWidthByWidth = (availableWidth - gapPx * (columns - 1)) / columns;
    const tileWidthByHeight = (availableHeight - gapPx * (rows - 1)) / (rows * TILE_ASPECT);
    const tileWidth = Math.floor(Math.min(tileWidthByWidth, tileWidthByHeight));
    if (tileWidth < minTileWidth) continue;
    if (tileWidth > bestTileWidth) {
      bestTileWidth = tileWidth;
      bestColumns = columns;
    }
  }

  return bestColumns > 0 ? { columns: bestColumns, tileWidth: bestTileWidth } : null;
}

function computeLayout(level) {
  if (!dom.gameBoard || !dom.gameScreen) return null;
  const metrics = getViewportMetrics();
  for (let pairs = level.pairs; pairs >= 2; pairs--) {
    const result = findBestColumns(pairs, metrics);
    if (result) return { displayPairs: pairs, ...result };
  }
  return { displayPairs: 2, columns: 2, tileWidth: metrics.minTileWidth };
}

function fitBoardToViewport() {
  if (!dom.gameBoard || !dom.gameScreen) return;
  const level = getLevelById(gameState.currentLevelId);
  if (!level) return;
  const displayPairs = gameState.displayPairs ?? level.pairs;
  const metrics = getViewportMetrics();
  let result = findBestColumns(displayPairs, metrics);
  if (!result) {
    result = { columns: 2, tileWidth: metrics.minTileWidth };
  }
  const tileHeight = Math.floor(result.tileWidth * TILE_ASPECT);
  dom.gameBoard.style.setProperty("--columns", String(result.columns));
  dom.gameBoard.style.setProperty("--board-gap", `${metrics.gapPx}px`);
  dom.gameBoard.style.setProperty("--tile-width", `${result.tileWidth}px`);
  dom.gameBoard.style.setProperty("--tile-height", `${tileHeight}px`);
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

    const isCompleted = gameState.completedLevels.has(level.id);
    button.textContent = isUnlocked ? `Level ${level.id}` : `Level ${level.id} Locked`;
    if (!isUnlocked) button.classList.add("is-locked");
    if (isCompleted) button.classList.add("is-completed");
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
  if (gameState.autoAdvanceTimeoutId) {
    clearTimeout(gameState.autoAdvanceTimeoutId);
    gameState.autoAdvanceTimeoutId = null;
  }
}

function generateTiles(level, pairs) {
  const selectedSymbols = symbolPool.slice(0, pairs ?? level.pairs);
  const tiles = [];

  selectedSymbols.forEach((symbol, index) => {
    const pairId = `pair-${index + 1}`;
    const color = colorPool[index];

    tiles.push({ id: `${pairId}-a`, pairId, symbol, color, isFlipped: true, isMatched: false });
    tiles.push({ id: `${pairId}-b`, pairId, symbol, color, isFlipped: true, isMatched: false });
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
  fitBoardToViewport();

  gameState.tiles.forEach((tile) => {
    const tileButton = document.createElement("button");
    tileButton.classList.add("tile");
    tileButton.dataset.tileId = tile.id;
    tileButton.setAttribute("aria-label", "Memory tile");
    tileButton.textContent = tile.isFlipped ? tile.symbol : "";
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
  dom.statusMessage.classList.add("is-preview");

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
    dom.statusMessage.classList.remove("is-preview");
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
  gameState.firstTile = null;
  gameState.secondTile = null;
  gameState.isBoardLocked = true;
  gameState.movesUsed = 0;
  gameState.matchedPairs = 0;
  gameState.timeRemaining = level.timeLimitSeconds;
  setAnimatingTiles([]);

  renderGameHeader(level);
  showScreen("game");

  const layout = computeLayout(level);
  gameState.displayPairs = layout ? layout.displayPairs : level.pairs;
  gameState.tiles = generateTiles(level, gameState.displayPairs);

  renderBoard(level);
  startPreview(level);
}

function clearSelectedTiles() {
  gameState.firstTile = null;
  gameState.secondTile = null;
}

function hasWonLevel() {
  const level = getLevelById(gameState.currentLevelId);
  if (!level) return false;
  return gameState.matchedPairs === (gameState.displayPairs ?? level.pairs);
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

  gameState.completedLevels.add(gameState.currentLevelId);
  unlockNextLevel();
  saveProgress();

  const isLastLevel = gameState.currentLevelId === levels.length;

  if (!isLastLevel) {
    const nextLevelId = gameState.currentLevelId + 1;
    gameState.autoAdvanceTimeoutId = setTimeout(() => {
      gameState.autoAdvanceTimeoutId = null;
      startLevel(nextLevelId);
    }, 800);
    return;
  }

  dom.levelCompleteMessage.textContent = "You completed all levels.";
  dom.nextLevelButton.classList.add("hidden");
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
  const savedCompleted = JSON.parse(localStorage.getItem(COMPLETED_KEY) || "[]");
  gameState.completedLevels = new Set(savedCompleted);
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, String(gameState.highestUnlockedLevel));
  localStorage.setItem(COMPLETED_KEY, JSON.stringify([...gameState.completedLevels]));
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
  document.addEventListener("keydown", (e) => {
    unlockAudio();
    if (e.key === "Escape" && !dom.howToPlayModal.classList.contains("hidden")) {
      closeModal();
    }
  }, { once: false });

  dom.howToPlayButton.addEventListener("click", openModal);
  dom.closeModalButton.addEventListener("click", closeModal);
  dom.howToPlayModal.addEventListener("click", (e) => {
    if (e.target === dom.howToPlayModal) closeModal();
  });
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
    fitBoardToViewport();
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
