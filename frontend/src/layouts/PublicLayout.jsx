import { Outlet } from "react-router-dom";

function PublicLayout() {
  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  );
}

export default PublicLayout;

