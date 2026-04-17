import { motion } from "framer-motion";
import { Outlet } from "react-router-dom";
import AppShell from "@/components/shared/AppShell";

function DashboardLayout() {
  return (
    <AppShell>
      <motion.div
        key="dashboard-content"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="h-full"
      >
        <Outlet />
      </motion.div>
    </AppShell>
  );
}

export default DashboardLayout;
