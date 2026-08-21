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

    let ready = false;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const pageReady = await evaluate(send, `document.readyState === 'complete' && typeof makeLevel === 'function'`);
      if (pageReady) {
        ready = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!ready) throw new Error('Game page did not become ready. Check index.html for script errors.');

    const result = await evaluate(send, `(async () => {
      completed.clear();
      ratings = {};
      localStorage.removeItem(progressKey);
      localStorage.removeItem(ratingsKey);
      localStorage.setItem('oneStrokePackedV2', 'production-progress-sentinel');
      localStorage.setItem('oneStrokeRatingsV2', 'production-ratings-sentinel');

      const experimentKeysAreIsolated = progressKey === 'oneStrokePackedRescueExpV1'
        && ratingsKey === 'oneStrokeRatingsRescueExpV1';
      const level = levels[3];
      const experimentLevelIsScoped = level.title === '绝处逢生实验'
        && level.cols === 6
        && level.rows === 4
        && level.cap === 3
        && level.layout.join('') === 'Saa#####bbcb##a.c.####cE';

      makeLevel(3);
      const rescueCounts = [];
      let correctRouteAccepted = true;
      let rescueFeedbackSeen = false;
      for (const index of level.solution.slice(1)) {
        if (!enter(index)) correctRouteAccepted = false;
        rescueCounts.push(state.rescues);
        if (state.rescues > 0
          && feedbackFloat.classList.contains('rescue')
          && feedbackFloat.textContent === '绝处逢生！'
          && shelfElement.classList.contains('rescue')
          && board.classList.contains('rescue')) rescueFeedbackSeen = true;
      }
      const correctRouteRescuesTwice = correctRouteAccepted
        && state.done
        && completed.has(3)
        && state.rescues === 2
        && rescueCounts.filter((count, index) => count > (rescueCounts[index - 1] || 0)).length === 2
        && resultRescues.textContent === '绝处逢生 ×2';
      const feedbackIsDistinct = rescueFeedbackSeen;
      const rescuesBeforeReplay = state.rescues;
      const replayFinished = await startReplay(0);
      const replayPreservesRescues = replayFinished && state.rescues === rescuesBeforeReplay;

      completeModal.classList.remove('show');
      makeLevel(3);
      [1, 2, 8].forEach(enter);
      const firstChoiceStartsFull = state.shelf.join(',') === 'apple,apple,book';
      const firstTrapRejected = enter(9) === false
        && state.done
        && state.shelf.length === 4
        && state.mistakes === 1;
      undo.click();
      const firstUndoRestoresState = !state.done
        && state.shelf.join(',') === 'apple,apple,book'
        && state.rescues === 0;

      [14, 15, 9, 10].forEach(enter);
      const firstRescueSurvives = state.rescues === 1
        && state.shelf.join(',') === 'book,book,cup';
      const secondTrapRejected = enter(16) === false
        && state.done
        && state.shelf.length === 4
        && state.mistakes === 2;
      undo.click();
      const secondUndoRestoresRescue = !state.done
        && state.shelf.join(',') === 'book,book,cup'
        && state.rescues === 1;
      [11, 17, 16, 22, 23].forEach(enter);
      const recoveredRunCompletes = state.done
        && state.rescues === 2
        && resultRescues.textContent === '绝处逢生 ×2';

      completeModal.classList.remove('show');
      makeLevel(0);
      levels[0].solution.slice(1).forEach(enter);
      const ordinaryMatchIsNotRescue = state.rescues === 0
        && resultRescues.textContent === '绝处逢生 ×0';

      const productionStorageUntouched = localStorage.getItem('oneStrokePackedV2') === 'production-progress-sentinel'
        && localStorage.getItem('oneStrokeRatingsV2') === 'production-ratings-sentinel';
      const modalRect = document.querySelector('.complete-card').getBoundingClientRect();
      const layout = {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        boardRight: Math.round(board.getBoundingClientRect().right),
        modalLeft: Math.round(modalRect.left),
        modalRight: Math.round(modalRect.right),
      };

      localStorage.removeItem('oneStrokePackedV2');
      localStorage.removeItem('oneStrokeRatingsV2');
      return {
        experimentKeysAreIsolated,
        experimentLevelIsScoped,
        correctRouteRescuesTwice,
        feedbackIsDistinct,
        replayPreservesRescues,
        firstChoiceStartsFull,
        firstTrapRejected,
        firstUndoRestoresState,
        firstRescueSurvives,
        secondTrapRejected,
        secondUndoRestoresRescue,
        recoveredRunCompletes,
        ordinaryMatchIsNotRescue,
        productionStorageUntouched,
        layout,
      };
    })()`);

    const failed = Object.entries(result)
      .filter(([key, value]) => key !== 'layout' && value !== true);
    if (result.layout.scrollWidth > result.layout.clientWidth
      || result.layout.boardRight > result.layout.clientWidth
      || result.layout.modalLeft < 0
      || result.layout.modalRight > result.layout.clientWidth) {
      failed.push(['layout', result.layout]);
    }
    if (failed.length) throw new Error(`Rescue rhythm checks failed: ${JSON.stringify(result)}`);
    console.log(`Rescue rhythm runtime checks passed: ${JSON.stringify(result)}`);
  } finally {
    socket.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
