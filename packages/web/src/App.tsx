import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Library from './pages/Library'
import Inbox from './pages/Inbox'
import Placeholder from './pages/Placeholder'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="library/:section" element={<Library />} />
          <Route path="library" element={<Navigate to="/library/exercises" replace />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="automation" element={<Placeholder title="Automation" description="Set up automated workflows, reminders, and check-ins for your clients." />} />
          <Route path="on-demand" element={<Placeholder title="On-demand Content" description="Create and manage on-demand video content and resources for your clients." />} />
          <Route path="community" element={<Placeholder title="Community Forums" description="Build an engaged community with group discussions and challenges." />} />
          <Route path="payments" element={<Placeholder title="Payment & Packages" description="Manage subscriptions, packages, and payment processing." />} />
          <Route path="marketplace" element={<Placeholder title="Marketplace" description="Discover and share programs and content with other coaches." />} />
          <Route path="referral" element={<Placeholder title="Referral Program" description="Earn rewards by referring other coaches to FitProto." />} />
          <Route path="teammates" element={<Placeholder title="Teammates" description="Invite and manage team members who help you coach clients." />} />
          <Route path="quick-start" element={<Placeholder title="Quick Start Guide" description="Everything you need to get started with FitProto." />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
