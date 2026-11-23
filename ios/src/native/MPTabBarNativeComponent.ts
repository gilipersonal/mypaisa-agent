import { codegenNativeComponent, type CodegenTypes, type HostComponent, type ViewProps } from 'react-native';

/** The system's own `UITabBar` (ARCHITECTURE §8.1), Liquid Glass on iOS 26, hosted through Fabric. */
export type SelectEvent = Readonly<{ index: CodegenTypes.Int32 }>;

export interface NativeProps extends ViewProps {
  /** `TabItem[]` as JSON (`src/models/tabs.ts`). */
  items: string;
  selected: CodegenTypes.Int32;
  onSelectTab?: CodegenTypes.DirectEventHandler<SelectEvent>;
}

export default codegenNativeComponent<NativeProps>('MPTabBar') as HostComponent<NativeProps>;
