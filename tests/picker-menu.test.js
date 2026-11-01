import { isNewName, matchingNames } from '../js/picker-menu.js';
import { assertEqual, test } from './harness.js';

const NAMES = ['Bench press', 'Edge lifting 17 mm', 'Front squat', 'Squat'];

test('search matches names with a word starting with it, ignoring letter case and spaces around', () => {
  assertEqual(matchingNames(NAMES, ' SQU '), ['Front squat', 'Squat']);
  assertEqual(matchingNames(NAMES, '17'), ['Edge lifting 17 mm']);
  assertEqual(matchingNames(NAMES, 'front sq'), ['Front squat']);
  assertEqual(matchingNames(NAMES, ''), NAMES);
});

test('search skips names that only contain it inside a word', () => {
  assertEqual(matchingNames(['Barbell row', 'Bench press'], 'Be'), ['Bench press']);
  assertEqual(matchingNames(NAMES, 'quat'), []);
});

test('a search is a new name only when no name equals it', () => {
  assertEqual(isNewName(NAMES, 'squat'), false, 'existing name');
  assertEqual(isNewName(NAMES, 'Squ'), true, 'partial match');
  assertEqual(isNewName(NAMES, '  '), false, 'blank');
});
