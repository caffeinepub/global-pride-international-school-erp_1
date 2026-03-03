import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import Layout from "./components/Layout";
import AttendancePage from "./pages/AttendancePage";
import DashboardPage from "./pages/DashboardPage";
import FeeBillingPage from "./pages/FeeBillingPage";
import FeeReportPage from "./pages/FeeReportPage";
import FeeUpdatePage from "./pages/FeeUpdatePage";
import LoginPage from "./pages/LoginPage";
import ReportCardPage from "./pages/ReportCardPage";
import StudentsPage from "./pages/StudentsPage";
import TransportPage from "./pages/TransportPage";

export type Page =
  | "dashboard"
  | "students"
  | "attendance"
  | "fee-billing"
  | "fee-update"
  | "fee-report"
  | "transport"
  | "report-card";

const AUTH_KEY = "gpis_auth";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem(AUTH_KEY) === "true";
  });
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  useEffect(() => {
    localStorage.setItem(AUTH_KEY, isLoggedIn ? "true" : "false");
  }, [isLoggedIn]);

  const handleLogin = () => setIsLoggedIn(true);
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPage("dashboard");
  };

  if (!isLoggedIn) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster position="bottom-right" richColors />
      </>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage />;
      case "students":
        return <StudentsPage />;
      case "attendance":
        return <AttendancePage />;
      case "fee-billing":
        return <FeeBillingPage />;
      case "fee-update":
        return <FeeUpdatePage />;
      case "fee-report":
        return <FeeReportPage />;
      case "transport":
        return <TransportPage />;
      case "report-card":
        return <ReportCardPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <>
      <Layout
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
      >
        <div className="page-transition">{renderPage()}</div>
      </Layout>
      <Toaster position="bottom-right" richColors />
    </>
  );
}
