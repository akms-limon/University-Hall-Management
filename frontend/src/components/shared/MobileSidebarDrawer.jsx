import Drawer from "@/components/ui/Drawer";
import Sidebar from "@/components/shared/Sidebar";

function MobileSidebarDrawer({ open, onClose }) {
  return (
    <Drawer open={open} onClose={onClose} widthClass="w-[88vw] max-w-[20rem]">
      <Sidebar onNavigate={onClose} mobile />
    </Drawer>
  );
}

export default MobileSidebarDrawer;
