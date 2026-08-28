import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/Home.jsx";
import SiteEditor from "./components/SiteEditor";
import SiteViewer from "./components/SiteViewer";
import "./App.css";
import PublishNewSite from "./components/PublishNewSite.jsx";
import PublicSite from "./components/PublicSite.jsx";
import Login, { Register } from "./components/Login.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Profile from "./components/Profile.jsx";
import MessagingMain from "./linkyloop/components/MessagingMain.jsx";
import BillingPage from "./Billing/BillingPage.jsx";
import PaymentComplete from "./Billing/PaymentComplete.jsx";
import ProductWorkspace from "./components/product/ProductWorkspace";
import BusinessOnboarding from "./components/product/BusinessOnboarding";
import PublicBusinessPage from "./components/product/PublicBusinessPage";
import WebsiteDashboard from "./features/websites/WebsiteDashboard";
import CreateWebsiteFlow from "./features/websites/CreateWebsiteFlow";
import WebsiteEditor from "./features/websites/WebsiteEditor";
import PublicWebsite from "./features/websites/PublicWebsite";
import { useAuth } from "./context/AuthContext";
import { LoadingScreen } from "./features/websites/components/WebiloUI";
import ProPage from "./features/plans/ProPage";
import UsagePage from "./features/plans/UsagePage";
import CommerceCheckoutComplete from "./features/commerce/CommerceCheckoutComplete";
import PublicOrderStatus from "./features/commerce/PublicOrderStatus";
import DeveloperApiPage from "./features/developerApi/DeveloperApiPage";

function EntryRoute({ children }) {
  const { user, loadingUser } = useAuth();
  if (loadingUser) return <LoadingScreen label="Restoring your Webilo session" />;
  return user ? <Navigate to="/business" replace /> : children;
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<EntryRoute><Home /></EntryRoute>} />
          <Route path="/register" element={<EntryRoute><Register /></EntryRoute>} />
          <Route path="/login" element={<EntryRoute><Login /></EntryRoute>} />
          <Route path="/studio/new" element={<RequireAuth><CreateWebsiteFlow /></RequireAuth>} />
          <Route path="/studio/edit/:siteName" element={<RequireAuth><SiteEditor /></RequireAuth>} />
          <Route path="/sites/:siteId" element={<RequireAuth><SiteViewer /></RequireAuth>} />
          <Route path="/publish" element={<RequireAuth><PublishNewSite /></RequireAuth>} />
          <Route path="/site/:siteName" element={<PublicSite />} />

          {/* LINKYLOOP */}
          <Route path="/messaging" element={<RequireAuth><MessagingMain/></RequireAuth>} />

          {/* Billing */}
          <Route path="/billing" element={<RequireAuth><BillingPage/></RequireAuth>}/>
          <Route path="/payment-complete" element={<RequireAuth><PaymentComplete/></RequireAuth>}/>
          <Route path="/checkout-complete" element={<CommerceCheckoutComplete />} />
          <Route path="/o/:slug/:publicReference" element={<PublicOrderStatus />} />
          <Route path="/app" element={<RequireAuth><Navigate to="/business" replace /></RequireAuth>} />
          <Route path="/websites" element={<RequireAuth><WebsiteDashboard /></RequireAuth>} />
          <Route path="/create" element={<RequireAuth><CreateWebsiteFlow /></RequireAuth>} />
          <Route path="/editor/:projectId" element={<RequireAuth><WebsiteEditor /></RequireAuth>} />
          <Route path="/w/:slug" element={<PublicWebsite />} />
          <Route path="/business" element={<RequireAuth><ProductWorkspace /></RequireAuth>} />
          <Route path="/pro" element={<RequireAuth><ProPage /></RequireAuth>} />
          <Route path="/webilo-apis" element={<RequireAuth><DeveloperApiPage /></RequireAuth>} />
          <Route path="/usage" element={<RequireAuth><UsagePage /></RequireAuth>} />
          <Route path="/onboarding" element={<RequireAuth><BusinessOnboarding /></RequireAuth>} />
          <Route path="/b/:slug" element={<PublicBusinessPage />} />
          <Route path="/studio" element={<RequireAuth><Navigate to="/websites" replace /></RequireAuth>} />
          <Route path="/legacy-studio" element={<RequireAuth><Dashboard /></RequireAuth>} />
<Route
  path="/profile"
  element={
    <RequireAuth>
      <Profile />
    </RequireAuth>
  }
/>


        </Routes>
      </div>
    </Router>
  );
}

export default App;
