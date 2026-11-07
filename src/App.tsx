import type { ReactNode } from 'react';
import { AppProvider, useApp } from './state/AppContext.tsx';
import { useRoute } from './router/router.ts';
import { HomeScreen } from './screens/HomeScreen.tsx';
import { LevelScreen } from './screens/LevelScreen.tsx';
import { PuzzleScreen } from './screens/PuzzleScreen.tsx';
import { SettingsScreen } from './screens/SettingsScreen.tsx';
import { HelpScreen } from './screens/HelpScreen.tsx';
import { UpdateBanner } from './pwa/UpdateBanner.tsx';
import type { Store } from './storage/storage.ts';
import type { PuzzleLoader } from './data/loader.ts';

function Screens() {
  const route = useRoute();
  const { store } = useApp();
  let screen: ReactNode;
  switch (route.name) {
    case 'home':
      screen = <HomeScreen />;
      break;
    case 'level':
      screen = <LevelScreen key={route.level} level={route.level} page={route.page} />;
      break;
    case 'puzzle':
      screen = <PuzzleScreen key={route.id} id={route.id} />;
      break;
    case 'settings':
      screen = <SettingsScreen />;
      break;
    case 'help':
      screen = <HelpScreen />;
      break;
  }
  return (
    <>
      <UpdateBanner />
      {!store.isPersistent() && (
        <p className="bg-surface border-b-2 border-error text-base p-3 text-center" role="alert">
          Внимание: браузер не разрешает сохранять данные, поэтому прогресс не запомнится после закрытия страницы.
        </p>
      )}
      {screen}
    </>
  );
}

export interface AppProps {
  store?: Store;
  loader?: PuzzleLoader;
}

export function App({ store, loader }: AppProps) {
  return (
    <AppProvider store={store} loader={loader}>
      <Screens />
    </AppProvider>
  );
}
