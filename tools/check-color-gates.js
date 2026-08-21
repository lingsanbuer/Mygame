const fs = require('fs');

const endpoint = process.argv[2] || 'http://127.0.0.1:9223';

async function connect() {
  const pages = await fetch(`${endpoint}/json`).then((response) => response.json());
  const page = pages.find((item) => item.type === 'page');
  if (!page) throw new Error('No browser page is available through the debugging endpoint.');

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const handler = pending.get(message.id);
    if (!handler) return;
    pending.delete(message.id);
    if (message.error) handler.reject(new Error(message.error.message));
    else handler.resolve(message.result);
  });

  function send(method, params = {}) {
    const id = ++nextId;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  }

  return { socket, send };
}

async function evaluate(send, expression) {
  const response = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
}

async function main() {
  const { socket, send } = await connect();
  try {
    const viewportWidth = Number(process.argv[3] || 0);
    if (viewportWidth) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: viewportWidth,
        height: viewportWidth <= 760 ? 844 : 900,
        deviceScaleFactor: 1,
        mobile: viewportWidth <= 760,
      });
    }
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const ready = await evaluate(send, `document.readyState === 'complete' && typeof makeLevel === 'function'`);
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const result = await evaluate(send, `(async () => {
      makeLevel(14);
      const redGate = board.children[4];
      const redInitiallyClosed = !redGate.classList.contains('open');
      [1, 2, 3].forEach(enter);
      const redOpened = redGate.classList.contains('open');
      const redEntered = enter(4);
      document.querySelector('#undo').click();
      document.querySelector('#undo').click();
      const redClosedAfterUndo = !redGate.classList.contains('open');

      makeLevel(15);
      const blueGate = board.querySelector('[data-gate-type="book"]');
      const blueGateIndex = Number(blueGate.dataset.i);
      const routeToBlueGate = levels[15].solution.slice(1, levels[15].solution.indexOf(blueGateIndex));
      routeToBlueGate.forEach(enter);
      const blueOpened = blueGate.classList.contains('open');
      const blueEntered = enter(blueGateIndex);

      const challengeWins = [];
      for (let levelIndex = 14; levelIndex <= 20; levelIndex += 1) {
        completeModal.classList.remove('show');
        makeLevel(levelIndex);
        const accepted = levels[levelIndex].solution.slice(1).every(enter);
        challengeWins.push({ level: levelIndex + 1, accepted, won: state.done && completed.has(levelIndex) });
      }

      const challengeRatings = challengeWins.map((item) => ({ level: item.level, stars: ratings[item.level - 1]?.stars, perfect: ratings[item.level - 1]?.perfect }));
      completeModal.classList.remove('show');
      makeLevel(0);
      enter(levels[0].solution[1]);
      document.querySelector('#undo').click();
      levels[0].solution.slice(1).forEach(enter);
      const undoKeepsThreeWithoutPerfect = ratingStars.textContent === '★★★'
        && ratings[0]?.stars === 3
        && ratings[0]?.perfect === false
        && perfectBadge.hidden;

      completeModal.classList.remove('show');
      makeLevel(3);
      [1, 2, 3, 4, 9, 14].forEach(enter);
      const overflowRecorded = state.mistakes === 1;
      while (state.path.length > 1) document.querySelector('#undo').click();
      levels[3].solution.slice(1).forEach(enter);
      const recoveredFailureRatesOne = overflowRecorded && ratingStars.textContent === '★☆☆' && ratings[3]?.stars === 1;

      completeModal.classList.remove('show');
      makeLevel(2);
      enter(1);
      enter(2);
      const shelfWarnsAtOneSlot = document.querySelector('.shelf').classList.contains('critical');
      document.querySelector('#undo').click();
      const shelfWarningClears = !document.querySelector('.shelf').classList.contains('critical');

      makeLevel(14);
      levels[14].solution.slice(1).forEach(enter);
      const stateBeforeReplay = JSON.stringify({
        path: state.path,
        shelf: state.shelf,
        gates: [...state.gates],
        undos: state.undos,
        mistakes: state.mistakes,
        ratings,
        completed: [...completed],
      });
      const replayFinished = await startReplay(0);
      const stateAfterReplay = JSON.stringify({
        path: state.path,
        shelf: state.shelf,
        gates: [...state.gates],
        undos: state.undos,
        mistakes: state.mistakes,
        ratings,
        completed: [...completed],
      });
      const replayLeavesStateUntouched = replayFinished && stateBeforeReplay === stateAfterReplay && !replay.active;

      const originalSound = soundEnabled;
      document.querySelector('#soundToggle').click();
      const soundTogglePersists = soundEnabled !== originalSound
        && localStorage.getItem(soundKey) === (soundEnabled ? 'on' : 'off')
        && soundToggle.getAttribute('aria-pressed') === String(soundEnabled);
      document.querySelector('#soundToggle').click();

      document.querySelector('#retryButton').click();
      const retryResetsAttempt = state.path.length === 1 && state.undos === 0 && state.mistakes === 0 && !state.done;
      levels[14].solution.slice(1).forEach(enter);
      const modalVisible = completeModal.classList.contains('show');

      const modalRect = document.querySelector('.complete-card').getBoundingClientRect();
      const layout = {
        innerWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        boardRight: Math.round(board.getBoundingClientRect().right),
        statsRight: Math.round(document.querySelector('.run-stats').getBoundingClientRect().right),
        modalLeft: Math.round(modalRect.left),
        modalRight: Math.round(modalRect.right),
      };
      return { redInitiallyClosed, redOpened, redEntered, redClosedAfterUndo, blueOpened, blueEntered, challengeWins, challengeRatings, undoKeepsThreeWithoutPerfect, recoveredFailureRatesOne, shelfWarnsAtOneSlot, shelfWarningClears, replayLeavesStateUntouched, soundTogglePersists, retryResetsAttempt, modalVisible, layout };
    })()`);

    const failed = Object.entries(result)
      .filter(([key, value]) => !['challengeWins', 'challengeRatings', 'layout'].includes(key) && value !== true);
    if (result.challengeWins.some((item) => !item.accepted || !item.won)) failed.push(['challengeWins', result.challengeWins]);
    if (result.challengeRatings.some((item) => item.stars !== 3 || item.perfect !== true)) failed.push(['challengeRatings', result.challengeRatings]);
    if (result.layout.scrollWidth > result.layout.clientWidth || result.layout.boardRight > result.layout.clientWidth || result.layout.statsRight > result.layout.clientWidth || result.layout.modalLeft < 0 || result.layout.modalRight > result.layout.clientWidth) failed.push(['layout', result.layout]);
    if (failed.length) throw new Error(`Color gate checks failed: ${JSON.stringify(result)}`);
    if (process.argv[4]) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(process.argv[4], Buffer.from(screenshot.data, 'base64'));
    }
    console.log(`Color gate runtime checks passed: ${JSON.stringify(result)}`);
  } finally {
    socket.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
