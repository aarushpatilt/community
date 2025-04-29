import Image from "next/image";
import Profile from "./profile";

// This is the main home page of the application and entry point for the app
export default function Home() {
  return (
    // on the left side of the screen is the navigation menu bar 
    // right side of the screen is the main content area 
    <div className="flex flex-row h-screen">
      <div className="w-1/6 bg-transparent text-white p-4 flex flex-col justify-center border-r border-white border-r-[0.1]">
        <ul className="space-y-4">
          <li>
            <a
              href="#"
              className="block text-sm font-medium text-gray-400 hover:text-white hover:bg-transparent p-2 rounded"
            >
              Home
            </a>
          </li>
          <li>
            <a
              href="#"
              className="block text-sm font-medium text-gray-400 hover:text-white hover:bg-transparent p-2 rounded"
            >
              About
            </a>
          </li>
          <li>
            <a
              href="#"
              className="block text-sm font-medium text-gray-400 hover:text-white hover:bg-transparent p-2 rounded"
            >
              Services
            </a>
          </li>
          <li>
            <a
              href="#"
              className="block text-sm font-medium text-gray-400 hover:text-white hover:bg-transparent p-2 rounded"
            >
              Contact
            </a>
          </li>
        </ul>
      </div>
      <div className="flex-1">
        <Profile />
      </div>
    </div>
  );
}
