import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../Common/Sidebar";
import Header from "../Common/Header";

export const MainLayout: React.FC = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
