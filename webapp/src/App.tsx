import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import MenuPage from './pages/MenuPage'
import DesignPage from './pages/DesignPage'
import FramingPage from './pages/FramingPage'
import ComponentsPage from './pages/ComponentsPage'
import InsulationPage from './pages/InsulationPage'
import FastenersPage from './pages/FastenersPage'
import StructuralPage from './pages/StructuralPage'
import PriceListPage from './pages/PriceListPage'
import SummaryPage from './pages/SummaryPage'
import QuotationPage from './pages/QuotationPage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<MenuPage />} />
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
