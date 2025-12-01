import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/studio/new" element={<RequireAuth><SiteEditor /></RequireAuth>} />
          <Route path="/studio/edit/:siteName" element={<RequireAuth><SiteEditor /></RequireAuth>} />
          <Route path="/sites/:siteId" element={<RequireAuth><SiteViewer /></RequireAuth>} />
          <Route path="/publish" element={<RequireAuth><PublishNewSite /></RequireAuth>} />
          <Route path="/site/:siteName" element={<PublicSite />} />
          <Route
  path="/studio"
  element={
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  }
/>
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
