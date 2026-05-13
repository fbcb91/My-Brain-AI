import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import TabBar from './components/TabBar';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { listCaptures } from './lib/db';
import { isOnboarded, markOnboarded } from './lib/onboarding';
import CaptureDetail from './screens/CaptureDetail';
import Entities from './screens/Entities';
import EntityDetail from './screens/EntityDetail';
import Heirs from './screens/Heirs';
import Memory from './screens/Memory';
import Onboarding from './screens/Onboarding';
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

/**
 * Auto-marks pre-existing users (those who already have any captures locally)
 * as onboarded, so they don't get bounced through the new flow when this
 * deploys. New accounts start with an empty IndexedDB and remain
 * "not onboarded" until they finish the screen.
 *
 * Returns `null` while still checking, true/false once known.
 */
function useOnboardedCheck(userId: string | undefined): boolean | null {
  const [state, setState] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) {
      setState(null);
      return;
    }
    if (isOnboarded(userId)) {
      setState(true);
      return;
    }
    let cancelled = false;
    void listCaptures()
      .then((caps) => {
        if (cancelled) return;
        if (caps.length > 0) {
          markOnboarded(userId);
          setState(true);
        } else {
          setState(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return state;
}

function Protected({
  children,
  requireOnboarded = true,
}: {
  children: React.ReactNode;
  requireOnboarded?: boolean;
}) {
  const { loading, user } = useAuth();
  const location = useLocation();
  const onboardingState = useOnboardedCheck(user?.id);

  if (loading) return <FullScreenSpinner />;
  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }
  if (requireOnboarded) {
    if (onboardingState === null) return <FullScreenSpinner />;
    if (!onboardingState) {
      return <Navigate to="/onboarding" replace />;
    }
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();
  const showTabBar =
    !!user &&
    !location.pathname.startsWith('/onboarding') &&
    !location.pathname.startsWith('/signin');

  return (
    <div className="relative mx-auto max-w-[640px]">
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route
          path="/onboarding"
          element={
            <Protected requireOnboarded={false}>
              <Onboarding />
            </Protected>
          }
        />
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
        <Route
          path="/capture/:id"
          element={
            <Protected>
              <CaptureDetail />
            </Protected>
          }
        />
        <Route
          path="/entities"
          element={
            <Protected>
              <Entities />
            </Protected>
          }
        />
        <Route
          path="/entities/:id"
          element={
            <Protected>
              <EntityDetail />
            </Protected>
          }
        />
        <Route
          path="/heritage/heirs"
          element={
            <Protected>
              <Heirs />
            </Protected>
          }
        />
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>
      {showTabBar && <TabBar />}
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
