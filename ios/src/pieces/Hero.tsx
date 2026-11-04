import { useCallback, useMemo, useState } from 'react';
import type { NativeSyntheticEvent } from 'react-native';
import MPHero, { type HeightEvent } from '../native/MPHeroNativeComponent';
import type { HeroModel } from '../models/hero';

const FIRST_GUESS = 188;

/** The shell's side of the hero: one JSON string down, the view's own height back. */
export function Hero({ model, testID }: Readonly<{ model: HeroModel; testID?: string }>) {
  const [height, setHeight] = useState(FIRST_GUESS);
  const json = useMemo(() => JSON.stringify(model), [model]);
  const onHeight = useCallback((event: NativeSyntheticEvent<HeightEvent>) => {
    setHeight(event.nativeEvent.height);
  }, []);
  return <MPHero model={json} onHeight={onHeight} style={{ height }} testID={testID} />;
}
