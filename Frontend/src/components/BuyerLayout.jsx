
import BuyerHeader from "./BuyerHeader";
import BuyerSidebar from "./BuyerSidebar";
import { Outlet } from "react-router-dom";
import { useState } from "react";

export default function BuyerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-green-200">
      <BuyerSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <BuyerHeader setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-y-auto scrollbar-hide bg-green-200 p-4  md:p-6">
          <Outlet /> {/* 👈 renders nested routes here */}
        </main>
      </div>
    </div>
  );
}
