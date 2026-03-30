import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './authContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import MenuPage from './pages/MenuPage'
import QuotesPage from './pages/QuotesPage'
import DesignPage from './pages/DesignPage'
import FramingPage from './pages/FramingPage'
import ComponentsPage from './pages/ComponentsPage'
import InsulationPage from './pages/InsulationPage'
import FastenersPage from './pages/FastenersPage'
import StructuralPage from './pages/StructuralPage'
import PriceListPage from './pages/PriceListPage'
import SummaryPage from './pages/SummaryPage'
import QuotationPage from './pages/QuotationPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<MenuPage />} />
        <Route path="quotes" element={<QuotesPage />} />
        <Route path="design" element={<DesignPage />} />
        <Route path="pricelist" element={<PriceListPage />} />
        <Route path="framing" element={<FramingPage />} />
        <Route path="components" element={<ComponentsPage />} />
        <Route path="insulation" element={<InsulationPage />} />
        <Route path="fasteners" element={<FastenersPage />} />
        <Route path="structural" element={<StructuralPage />} />
        <Route path="summary" element={<SummaryPage />} />
        <Route path="quotation" element={<QuotationPage />} />
      </Route>
    </Routes>
  )
}

export default App
