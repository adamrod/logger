const tests = [];

export const test = (name, run) => tests.push({ name, run });

export function assertEqual(actual, expected, what = 'value') {
  const shown = (value) => JSON.stringify(value);
  if (shown(actual) !== shown(expected)) throw new Error(`${what}: expected ${shown(expected)}, got ${shown(actual)}`);
}

export async function runTests() {
  const failures = [];
  for (const { name, run } of tests) {
    try {
      await run();
      print(`ok    ${name}`);
    } catch (error) {
      failures.push(name);
      print(`FAIL  ${name}\n      ${error.message}`);
    }
  }
  if (failures.length) throw new Error(`${failures.length} of ${tests.length} tests failed`);
  print(`All ${tests.length} tests passed`);
}
