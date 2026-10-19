import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import MyVaults from './pages/MyVaults'
import CreateVault from './pages/CreateVault'
import VaultOverview from './pages/VaultOverview'
import Activity from './pages/Activity'
import PayPage from './pages/PayPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pay page — no nav */}
        <Route
          path="/pay/:id"
          element={
            <Layout hideNav>
              <PayPage />
            </Layout>
          }
        />

        {/* App pages — with nav */}
        <Route
          path="/"
          element={
            <Layout>
              <MyVaults />
            </Layout>
          }
        />
        <Route
          path="/vault/:id"
          element={
            <Layout>
              <VaultOverview />
            </Layout>
          }
        />
        <Route
          path="/create"
          element={
            <Layout>
              <CreateVault />
            </Layout>
          }
        />
        <Route
          path="/activity"
          element={
            <Layout>
              <Activity />
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
