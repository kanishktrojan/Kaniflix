import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';
import { Layout, AdminLayout } from '@/components/layout';
import {
  HomePage,
  BrowsePage,
  MovieDetailsPage,
  TVDetailsPage,
  SearchPage,
  LoginPage,
  SignupPage,
  MyListPage,
  ProfilePage,
  NotFoundPage,
  SportsPage,
  SportsPlayerPage,
} from '@/pages';
import {
  AdminDashboard,
  AdminUsers,
  AdminAnalytics,
  AdminActivity,
  AdminSports,
  AdminSettings,
  AdminSubscriptions,
} from '@/pages/admin';
import { useAuthStore } from '@/store';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Admin Route Component
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// Guest Route Component (redirect authenticated users)
const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// Router configuration
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'movies',
        element: <BrowsePage mediaType="movie" />,
      },
      {
        path: 'tv',
        element: <BrowsePage mediaType="tv" />,
      },
      {
        path: 'movie/:id',
        element: <MovieDetailsPage />,
      },
      {
        path: 'tv/:id',
        element: <TVDetailsPage />,
      },
      {
        path: 'search',
        element: <SearchPage />,
      },
      {
        path: 'my-list',
        element: (
          <ProtectedRoute>
            <MyListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'sports',
        element: <SportsPage />,
      },
      {
        path: 'sports/:id',
        element: <SportsPlayerPage />,
      },
    ],
  },
  {
    path: '/login',
    element: (
      <GuestRoute>
        <LoginPage />
      </GuestRoute>
    ),
  },
  {
    path: '/signup',
    element: (
      <GuestRoute>
        <SignupPage />
      </GuestRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      {
        index: true,
        element: <AdminDashboard />,
      },
      {
        path: 'users',
        element: <AdminUsers />,
      },
      {
        path: 'sports',
        element: <AdminSports />,
      },
      {
        path: 'analytics',
        element: <AdminAnalytics />,
      },
      {
        path: 'activity',
        element: <AdminActivity />,
      },
      {
        path: 'settings',
        element: <AdminSettings />,
      },
      {
        path: 'subscriptions',
        element: <AdminSubscriptions />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
