import { useMemo, useState } from 'react';
import { StyleSheet, View, type NativeSyntheticEvent } from 'react-native';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { createApiClient, type ApiClient } from '#lib/api/client.ts';
import { livenessQuery } from '#lib/api/queries.ts';
import { createQueryClient } from '#lib/query/client.ts';
import { TestIDs } from '#lib/test-ids.ts';
import { apiBaseUrl, type AppProps } from './config';
import { heroModel } from './models/hero';
import { HOME_TAB, TABS } from './models/tabs';
import MPTabBar, { type SelectEvent } from './native/MPTabBarNativeComponent';
import { Hero } from './pieces/Hero';
import { probeNote } from './probe';

const TAB_ITEMS = JSON.stringify(TABS);

/** The api's state in a member's words, read through the query both doors share. */
function useApiStatus(api: ApiClient): string {
  const health = useQuery(livenessQuery(api));
  if (health.isPending) return 'Asking the api…';
  if (health.isError) return 'The api is not reachable.';
  return `The api is up, version ${health.data.version}.`;
}

function Shell({ api, probe }: Readonly<{ api: ApiClient; probe?: string }>) {
  const [tab, setTab] = useState(0);
  const status = useApiStatus(api);
  const model = useMemo(
    () =>
      heroModel({
        title: tab === HOME_TAB ? 'Household total' : (TABS[tab]?.title ?? ''),
        amount: '0',
        currency: 'GBP',
        privacy: false,
        note: probeNote(probe) ?? "The household's wealth arrives here with phase 2.",
        status,
      }),
    [tab, status, probe],
  );
  return (
    <View style={styles.page}>
      <View style={styles.content}>
        <Hero model={model} testID={TestIDs.homeHero} />
      </View>
      <MPTabBar
        items={TAB_ITEMS}
        selected={tab}
        onSelectTab={(event: NativeSyntheticEvent<SelectEvent>) => setTab(event.nativeEvent.index)}
        style={styles.tabBar}
      />
    </View>
  );
}

export default function App(props: Readonly<AppProps>) {
  const client = useMemo(() => createQueryClient(), []);
  const api = useMemo(() => createApiClient(apiBaseUrl(props)), [props]);
  return (
    <QueryClientProvider client={client}>
      <Shell api={api} probe={props.probe} />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 16 },
  tabBar: { height: 83 },
});
