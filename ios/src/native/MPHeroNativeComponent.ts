import { codegenNativeComponent, type CodegenTypes, type HostComponent, type ViewProps } from 'react-native';

/** The first SwiftUI piece (MA-165), and the pattern for every piece after it: the whole picture crosses as one
 * formatted JSON string, so nothing native formats a figure, and the host redraws only when the string differs. A
 * Fabric view cannot size itself, so the piece reports its height. */
export type HeightEvent = Readonly<{ height: CodegenTypes.Double }>;

export interface NativeProps extends ViewProps {
  /** A `HeroModel` as JSON (`src/models/hero.ts`). */
  model: string;
  onHeight?: CodegenTypes.DirectEventHandler<HeightEvent>;
}

export default codegenNativeComponent<NativeProps>('MPHero') as HostComponent<NativeProps>;
