import { Navigate, Route, Routes, useLocation } from 'react-router';
import TabBar from './components/TabBar';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Memory from './screens/Memory';
import SignIn from './screens/SignIn';
import Today from './screens/Today';
import You from './screens/You';

function FullScreenSpinner() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-paper">
      <div
        className="h-6 w-6 animate-spin rounded-full border-2 border-ink-3 border-t-ink"
        aria-label="Loading"
      />
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenSpinner />;
  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <div className="relative mx-auto max-w-[640px]">
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route
          path="/today"
          element={
            <Protected>
              <Today />
            </Protected>
          }
        />
        <Route
          path="/memory"
          element={
            <Protected>
              <Memory />
            </Protected>
          }
        />
        <Route
          path="/you"
          element={
            <Protected>
              <You />
            </Protected>
          }
        />
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>
      {user && <TabBar />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
