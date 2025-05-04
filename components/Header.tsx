import { Avatar, AvatarFallback } from '@radix-ui/react-avatar';
import { Bell, Search } from 'lucide-react';
import React from 'react';
import { Button } from './ui/button';
import { signOut } from '@/auth';
import { Session } from 'next-auth';

const Header = ({ session }: { session: Session }) => {
  console.log(session?.user?.name);
  console.log(session?.user?.email);
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-white/90 backdrop-blur border-b shadow-sm">
      {/* Search Bar */}
      <div className="flex items-center space-x-2 w-full max-w-sm bg-gray-100 px-3 py-2 rounded-md shadow-inner focus-within:ring-2 ring-foreground transition">
        <Search className="w-4 h-4 text-gray-500" />
        <input
          type="search"
          placeholder="Search..."
          className="w-full bg-transparent outline-none text-sm placeholder:text-gray-400"
        />
      </div>

      <div className="flex items-center space-x-4">
        {/* Notification Bell */}
        <button className="relative p-2 rounded-full hover:bg-gray-100 transition">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full border border-white"></span>
        </button>

        {/* User Info + Logout */}
        <div className="flex items-center space-x-3 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-full transition-colors cursor-pointer">
          <Avatar className="h-8 w-8 border border-gray-200 rounded-full overflow-hidden">
            <AvatarFallback className="text-gray-700 text-sm font-medium">
              JD
            </AvatarFallback>
          </Avatar>
          <div className="text-sm leading-tight">
            <p className="font-medium text-gray-900">{session?.user?.name}</p>
            <p className="text-xs text-gray-500">{session?.user?.role}</p>
          </div>
        </div>
        <form
          action={async () => {
            'use server';

            await signOut();
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            Logout
          </Button>
        </form>
      </div>
    </header>
  );
};

export default Header;
