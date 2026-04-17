import { useEffect, useState } from "react";
import { useDisclosure } from "@/hooks/useDisclosure";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/shared/Sidebar";
import Topbar from "@/components/shared/Topbar";
import MobileSidebarDrawer from "@/components/shared/MobileSidebarDrawer";
import BottomTabNav from "@/components/shared/BottomTabNav";
import PageContainer from "@/components/shared/PageContainer";

function AppShell({ children }) {
  const sidebar = useDisclosure(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const role = user?.role || "guest";
    document.documentElement.dataset.role = role;
  }, [user?.role]);

  return (
    <div className="relative flex h-[100dvh] overflow-hidden">
      <div className="hidden h-full shrink-0 lg:block">
        <Sidebar
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        />
      </div>

      <MobileSidebarDrawer open={sidebar.isOpen} onClose={sidebar.close} />

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onOpenSidebar={sidebar.open} />
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <PageContainer>{children}</PageContainer>
        </div>
        <BottomTabNav />
      </div>
    </div>
  );
}

export default AppShell;
