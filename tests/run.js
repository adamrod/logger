import './setup.js';
import './entry-log.test.js';
import './sync.test.js';
import './exercises.test.js';
import './format.test.js';
import { runTests } from './harness.js';

await runTests();
