import './setup.js';
import './entry-log.test.js';
import './sync.test.js';
import './exercises.test.js';
import './format.test.js';
import './set-history.test.js';
import './screens.test.js';
import { runTests } from './harness.js';

await runTests();
