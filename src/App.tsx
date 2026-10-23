import { HashRouter, Route, Routes } from 'react-router';
import { TabBar } from './ui/TabBar';
import { ToastHost } from './ui/Toast';
import { PlanScreen } from './features/plan/PlanScreen';
import { ShoppingScreen } from './features/shopping/ShoppingScreen';
import { PrepScreen } from './features/prep/PrepScreen';
import { RecipesScreen } from './features/recipes/RecipesScreen';
import { ProfileScreen } from './features/profile/ProfileScreen';

export function App() {
  return (
    <HashRouter>
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
