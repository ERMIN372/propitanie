import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router';
import { TabBar } from './ui/TabBar';
import { ToastHost } from './ui/Toast';
import { TopBar } from './features/shell/TopBar';
import { ConnectScreen } from './features/connect/ConnectScreen';
import { PlanScreen } from './features/plan/PlanScreen';
import { ShoppingScreen } from './features/shopping/ShoppingScreen';
import { PrepScreen } from './features/prep/PrepScreen';
import { RecipesScreen } from './features/recipes/RecipesScreen';
import { ProfileScreen } from './features/profile/ProfileScreen';
import { useSession } from './stores/session';
import { startSync, stopSync } from './sync/runtime';

export function App() {
  const { token, branch, profileId } = useSession();

  // синк работает, как только есть токен, даже на экране выбора профиля
  useEffect(() => {
    if (!token || !branch) return;
    startSync(token, branch);
    return () => stopSync();
  }, [token, branch]);

  if (!token || !branch || !profileId) {
    return (
      <>
        <ConnectScreen />
        <ToastHost />
      </>
    );
  }

  return (
    <HashRouter>
      <TopBar />
      <Routes>
        <Route path="/" element={<PlanScreen />} />
        <Route path="/shopping" element={<ShoppingScreen />} />
        <Route path="/prep" element={<PrepScreen />} />
        <Route path="/recipes" element={<RecipesScreen />} />
        <Route path="/me" element={<ProfileScreen />} />
        <Route path="*" element={<PlanScreen />} />
      </Routes>
      <ToastHost />
      <TabBar />
    </HashRouter>
  );
}
