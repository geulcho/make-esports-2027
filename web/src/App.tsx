import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { TeamsLeagues } from './pages/TeamsLeagues';
import { TeamProfile } from './pages/TeamProfile';
import { Ratings } from './pages/Ratings';
import { Schedule } from './pages/Schedule';
import { Placeholder } from './pages/Placeholder';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/players" element={<Placeholder title="Players" description="Player database coming soon" />} />
          <Route path="/teams" element={<TeamsLeagues />} />
          <Route path="/teams/:id" element={<TeamProfile />} />
          <Route path="/intermatch" element={<Placeholder title="Intermatch" description="International qualifiers — coming soon" />} />
          <Route path="/ratings" element={<Ratings />} />
          <Route path="/meta" element={<Placeholder title="Meta Analysis" description="Meta trends and champion stats — coming soon" />} />
          <Route path="/tournaments" element={<Placeholder title="Tournaments" description="MM, WT, WE brackets — coming soon" />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/history" element={<Placeholder title="History" description="World championship records — coming soon" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
