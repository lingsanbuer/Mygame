const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(new URL('../index.html', `file:///${__filename.replace(/\\/g, '/')}`), 'utf8');
const start = html.indexOf('const levels=[');
const end = html.indexOf('];', start);

if (start < 0 || end < 0) throw new Error('Could not locate the levels array in index.html.');

const source = html.slice(start + 'const levels='.length, end + 1);
const levels = vm.runInNewContext(source);
const packageChars = new Set(['a', 'b', 'c', 'd']);
const errors = [];

function addError(levelIndex, message) {
  errors.push(`Level ${levelIndex + 1}: ${message}`);
}

levels.forEach((level, levelIndex) => {
  if (level.layout.length !== level.rows) addError(levelIndex, 'row count does not match rows.');
  level.layout.forEach((row, rowIndex) => {
    if (row.length !== level.cols) addError(levelIndex, `row ${rowIndex + 1} width does not match cols.`);
  });

  const flat = level.layout.join('');
  if ([...flat].filter((char) => char === 'S').length !== 1) addError(levelIndex, 'must contain exactly one start.');
  if ([...flat].filter((char) => char === 'E').length !== 1) addError(levelIndex, 'must contain exactly one exit.');

  for (const char of packageChars) {
    const count = [...flat].filter((item) => item === char).length;
    if (count % 3 !== 0) addError(levelIndex, `package ${char} count ${count} is not divisible by 3.`);
  }

  const shelf = [];
  const openedGates = new Set();
  const visited = new Set();
  let validRoute = true;

  level.solution.forEach((index, step) => {
    if (index < 0 || index >= flat.length) {
      addError(levelIndex, `step ${step + 1} is outside the board.`);
      validRoute = false;
      return;
    }
    if (visited.has(index)) {
      addError(levelIndex, `step ${step + 1} revisits cell ${index}.`);
      validRoute = false;
    }
    visited.add(index);

    if (flat[index] === '#') {
      addError(levelIndex, `step ${step + 1} enters a wall.`);
      validRoute = false;
    }
    if (step > 0) {
      const previous = level.solution[step - 1];
      const distance = Math.abs(index % level.cols - previous % level.cols)
        + Math.abs(Math.floor(index / level.cols) - Math.floor(previous / level.cols));
      if (distance !== 1) {
        addError(levelIndex, `step ${step + 1} is not adjacent to the previous cell.`);
        validRoute = false;
      }
    }

    const char = flat[index];
    if (char === 'R' && !openedGates.has('a')) addError(levelIndex, `step ${step + 1} enters a closed red gate.`);
    if (char === 'B' && !openedGates.has('b')) addError(levelIndex, `step ${step + 1} enters a closed blue gate.`);

    if (packageChars.has(char)) {
      shelf.push(char);
      if (shelf.filter((item) => item === char).length === 3) {
        for (let i = shelf.length - 1; i >= 0; i -= 1) if (shelf[i] === char) shelf.splice(i, 1);
        if (char === 'a' || char === 'b') openedGates.add(char);
      }
      if (shelf.length > level.cap) addError(levelIndex, `step ${step + 1} exceeds shelf capacity.`);
    }
  });

  if (flat[level.solution[0]] !== 'S') addError(levelIndex, 'solution does not start at S.');
  if (flat[level.solution.at(-1)] !== 'E') addError(levelIndex, 'solution does not end at E.');
  if (shelf.length !== 0) addError(levelIndex, 'solution ends with packages on the shelf.');
  for (let index = 0; index < flat.length; index += 1) {
    if (packageChars.has(flat[index]) && !visited.has(index)) addError(levelIndex, `solution misses package at cell ${index}.`);
  }
  if (!validRoute) addError(levelIndex, 'reference route is invalid.');
});

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Validated ${levels.length} levels and their reference routes.`);
