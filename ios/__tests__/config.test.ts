import { LogBox } from 'react-native';
import { quietLogBoxUnderTest } from '../src/config';

describe('LogBox under test (MA-273)', () => {
  let ignoreAll: jest.SpyInstance;

  beforeEach(() => {
    ignoreAll = jest.spyOn(LogBox, 'ignoreAllLogs').mockImplementation(() => undefined);
  });

  afterEach(() => {
    ignoreAll.mockRestore();
  });

  it('shows nothing on a launch under test, so its toast cannot lie over the tab bar', () => {
    quietLogBoxUnderTest({ testMode: true });
    expect(ignoreAll).toHaveBeenCalledWith(true);
  });

  it('is left alone on any other launch', () => {
    quietLogBoxUnderTest({});
    quietLogBoxUnderTest({ testMode: false });
    expect(ignoreAll).not.toHaveBeenCalled();
  });
});
