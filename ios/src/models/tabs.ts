import { TestIDs } from '#lib/test-ids.ts';

/** The iPhone's tabs (ARCHITECTURE §8.1): the app opens to the chat. Search joins as iOS 26's search tab with MA-180. */
export interface TabItem {
  title: string;
  symbol: string;
  testID: string;
}

export const TABS: readonly TabItem[] = [
  { title: 'Chat', symbol: 'bubble.left.and.bubble.right', testID: TestIDs.tabChat },
  { title: 'Home', symbol: 'house', testID: TestIDs.tabHome },
  { title: 'Activity', symbol: 'list.bullet.rectangle', testID: TestIDs.tabActivity },
  { title: 'You', symbol: 'person.crop.circle', testID: TestIDs.tabYou },
];

export const HOME_TAB = 1;
