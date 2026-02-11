import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import RegisterPage from './pages/RegisterPage.tsx';
import LauncherPage from './pages/LauncherPage.tsx';
import AccountPage from './pages/AccountPage.tsx';
import AdminPage from './pages/AdminPage.tsx';
import CreateClusterPage from './pages/CreateClusterPage.tsx';
import AccessDeniedPage from './pages/AccessDeniedPage.tsx';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import RoleRoute from './components/RoleRoute';
import { SystemRole } from './types/rbac';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/launcher" element={<PrivateRoute><LauncherPage /></PrivateRoute>} />
          <Route path="/account" element={<PrivateRoute><AccountPage /></PrivateRoute>} />
          <Route path="/access-denied" element={<PrivateRoute><AccessDeniedPage /></PrivateRoute>} />
          <Route path="/admin" element={<RoleRoute minRole={SystemRole.Admin}><AdminPage /></RoleRoute>} />
          <Route path="/create-cluster" element={<RoleRoute minRole={SystemRole.Admin}><CreateClusterPage /></RoleRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
