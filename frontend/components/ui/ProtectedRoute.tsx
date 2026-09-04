import React from 'react';
import { useAuth } from '@/hooks/useAuth';

type Role = 'Aluno' | 'Portaria' | 'Administrador';

interface ProtectedRouteProps {
  /** Roles that are allowed to see this content */
  allowedRoles: Role[];
  children: React.ReactNode;
  /** Optional fallback UI when access is denied. Defaults to null (hidden). */
  fallback?: React.ReactNode;
}

/**
 * A generic RBAC component that renders children only if the
 * authenticated user's role is within the allowedRoles list.
 *
 * Usage:
 *   <ProtectedRoute allowedRoles={['Administrador']}>
 *     <AdminOnlyPanel />
 *   </ProtectedRoute>
 */
export const ProtectedRoute = ({
  allowedRoles,
  children,
  fallback = null,
}: ProtectedRouteProps) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
