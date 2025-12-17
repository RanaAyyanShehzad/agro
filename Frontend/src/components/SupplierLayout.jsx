
import SupplierHeader from "./SupplierHeader";
import SupplierSidebar from "./SupplierSidebar";
import { Outlet } from "react-router-dom";
import { useState } from "react";

export default function SupplierLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-green-200">
      <SupplierSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <SupplierHeader setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-y-auto scrollbar-hide bg-green-200 p-4  md:p-6">
          <Outlet /> {/* 👈 renders nested routes here */}
        </main>
      </div>
    </div>
  );
}
