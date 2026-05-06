import { Navigate, Route, Routes } from 'react-router';
import TabBar from './components/TabBar';
import Today from './screens/Today';
import Memory from './screens/Memory';
import You from './screens/You';

export default function App() {
  return (
    <div className="relative mx-auto max-w-[640px]">
      <Routes>
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<Today />} />
        <Route path="/memory" element={<Memory />} />
        <Route path="/you" element={<You />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>
      <TabBar />
    </div>
  );
}
