import { isNewName, matchingNames } from '../js/picker-menu.js';
import { assertEqual, test } from './harness.js';

const NAMES = ['Bench press', 'Edge lifting 17 mm', 'Front squat', 'Squat'];

test('search matches any part of a name, ignoring letter case and spaces around', () => {
  assertEqual(matchingNames(NAMES, ' SQU '), ['Front squat', 'Squat']);
  assertEqual(matchingNames(NAMES, '17'), ['Edge lifting 17 mm']);
  assertEqual(matchingNames(NAMES, ''), NAMES);
});

test('a search is a new name only when no name equals it', () => {
  assertEqual(isNewName(NAMES, 'squat'), false, 'existing name');
  assertEqual(isNewName(NAMES, 'Squ'), true, 'partial match');
  assertEqual(isNewName(NAMES, '  '), false, 'blank');
});
