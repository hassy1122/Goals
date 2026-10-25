import { useEffect } from 'react';
import { lazy } from 'react';
import { Navigate, createBrowserRouter, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useGetMeQuery } from './api/auth.api';
import { userLoaded } from './stores/authSlice';
import AppLayout from './layouts/AppLayout.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';

const LoginPage = lazy(() => import('./features/auth/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage.jsx'));
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage.jsx'));
const ResetPasswordPage = lazy(() => import('./features/auth/ResetPasswordPage.jsx'));
const VerifyEmailPage = lazy(() => import('./features/auth/VerifyEmailPage.jsx'));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage.jsx'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage.jsx'));

// Phase 2 — life planning
const OnboardingWizard = lazy(() => import('./features/life/OnboardingWizard.jsx'));
const AreasPage = lazy(() => import('./features/life/AreasPage.jsx'));
const VisionPage = lazy(() => import('./features/life/VisionPage.jsx'));
const RoadmapPage = lazy(() => import('./features/life/RoadmapPage.jsx'));
const DecisionsPage = lazy(() => import('./features/life/DecisionsPage.jsx'));

// Phase 2 — goals
const GoalsPage = lazy(() => import('./features/goals/GoalsPage.jsx'));
const GoalDetailPage = lazy(() => import('./features/goals/GoalDetailPage.jsx'));
const OkrPage = lazy(() => import('./features/goals/OkrPage.jsx'));
const BucketListPage = lazy(() => import('./features/goals/BucketListPage.jsx'));
const TemplatesPage = lazy(() => import('./features/goals/TemplatesPage.jsx'));

function FullScreenLoader() {
  return (
    <div className="grid min-h-dvh place-items-center bg-slate-100 dark:bg-slate-950" role="status" aria-live="polite">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="grid place-items-center py-24 text-center">
      <p className="text-5xl font-bold text-slate-300 dark:text-slate-700">404</p>
      <p className="mt-2 text-slate-500 dark:text-slate-400">That page does not exist yet.</p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const location = useLocation();
  const dispatch = useDispatch();
  const { data, isLoading, isError, error } = useGetMeQuery();

  useEffect(() => {
    if (data?.user) dispatch(userLoaded(data.user));
  }, [data?.user, dispatch]);

  if (isLoading) return <FullScreenLoader />;
  if (error?.status > 400 && error?.status <= 403) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (isError || !data?.user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

function PublicOnlyRoute({ children }) {
  const { data, isLoading } = useGetMeQuery();
  if (isLoading) return <FullScreenLoader />;
  if (data?.user) return <Navigate to="/" replace />;
  return children;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'onboarding', element: <OnboardingWizard /> },
      // Life areas & vision
      { path: 'areas', element: <AreasPage /> },
      { path: 'vision', element: <VisionPage /> },
      { path: 'vision/roadmap', element: <RoadmapPage /> },
      { path: 'decisions', element: <DecisionsPage /> },
      // Goals — static paths must be listed before /goals/:goalId (v6 ranks them anyway)
      { path: 'goals', element: <GoalsPage /> },
      { path: 'goals/okr', element: <OkrPage /> },
      { path: 'goals/bucket', element: <BucketListPage /> },
      { path: 'goals/templates', element: <TemplatesPage /> },
      { path: 'goals/:goalId', element: <GoalDetailPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  {
    path: '/',
    element: (
      <PublicOnlyRoute>
        <AuthLayout />
      </PublicOnlyRoute>
    ),
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
    ],
  },
]);
