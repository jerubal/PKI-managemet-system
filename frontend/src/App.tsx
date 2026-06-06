import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { RbacGuard } from './components/RbacGuard';
import { Layout } from './components/Layout';
import { Welcome } from './pages/Welcome';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/Users';
import { Hsm } from './pages/Hsm';
import { Keys } from './pages/Keys';
import { CAs } from './pages/CAs';
import { Csrs } from './pages/Csrs';
import { Certificates } from './pages/Certificates';
import { Revocation } from './pages/Revocation';
import { PublishingTarget } from './pages/PublishingTarget';
import { Audit } from './pages/Audit';
import { Profile } from './pages/Profile';
import { Validation } from './pages/Validation';
import { SelfSignedWizard } from './pages/SelfSignedWizard';
import { RequestManagement } from './pages/RequestManagement';

const App: React.FC = () => {
  return (
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            
            <Route
              path="/dashboard"
              element={
                <RbacGuard>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </RbacGuard>
              }
            />

            <Route
              path="/users"
              element={
                <RbacGuard allowedRoles={['ROLE_SUPER_ADMIN']}>
                  <Layout>
                    <Users />
                  </Layout>
                </RbacGuard>
              }
            />

            <Route
              path="/hsm"
              element={
                <RbacGuard allowedRoles={['ROLE_SUPER_ADMIN']}>
                  <Layout>
                    <Hsm />
                  </Layout>
                </RbacGuard>
              }
            />

            <Route
              path="/publishing-target"
              element={
                <RbacGuard allowedRoles={['ROLE_SUPER_ADMIN']}>
                  <Layout>
                    <PublishingTarget />
                  </Layout>
                </RbacGuard>
              }
            />

            <Route
              path="/keys"
              element={
                <RbacGuard allowedRoles={['ROLE_ADMIN', 'ROLE_USER', 'ROLE_HSM', 'ROLE_SELF_SIGNED']}>
                  <Layout>
                    <Keys />
                  </Layout>
                </RbacGuard>
              }
            />

            <Route
              path="/cas"
              element={
                <RbacGuard allowedRoles={['ROLE_ADMIN', 'ROLE_SUPER_ADMIN']}>
                  <Layout>
                    <CAs />
                  </Layout>
                </RbacGuard>
              }
            />

            <Route
              path="/csrs"
              element={
                <RbacGuard allowedRoles={['ROLE_ADMIN', 'ROLE_USER']}>
                  <Layout>
                    <Csrs />
                  </Layout>
                </RbacGuard>
              }
            />

            <Route
              path="/revocation"
              element={
                <RbacGuard allowedRoles={['ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_AUDITOR']}>
                  <Layout>
                    <Revocation />
                  </Layout>
                </RbacGuard>
              }
            />

            <Route
              path="/requests"
              element={
                <RbacGuard allowedRoles={['ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_AUDITOR']}>
                  <Layout>
                    <RequestManagement />
                  </Layout>
                </RbacGuard>
              }
            />

            <Route
              path="/audit"
              element={
                <RbacGuard allowedRoles={['ROLE_AUDITOR']}>
                  <Layout>
                    <Audit />
                  </Layout>
                </RbacGuard>
              }
            />

            <Route
              path="/certificates"
              element={
                <RbacGuard>
                  <Layout>
                    <Certificates />
                  </Layout>
                </RbacGuard>
              }
            />

            <Route
              path="/self-signed"
              element={
                <RbacGuard allowedRoles={['ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_SELF_SIGNED']}>
                  <Layout>
                    <SelfSignedWizard />
                  </Layout>
                </RbacGuard>
              }
            />

            <Route
              path="/profile"
              element={
                <RbacGuard>
                  <Layout>
                    <Profile />
                  </Layout>
                </RbacGuard>
              }
            />

            <Route
              path="/validation"
              element={
                <RbacGuard>
                  <Layout>
                    <Validation />
                  </Layout>
                </RbacGuard>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  );
};

export default App;
