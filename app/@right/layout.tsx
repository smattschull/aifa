// @/app/@right/layout.tsx

import React, { Children } from "react";

import { Footer } from "./(_service)/(_components)/footer";
import { NavigationMenuProvider } from "./(_service)/(_context)/nav-bar-provider";
import { NavBar } from "./(_service)/(_components)/nav-bar/nav-bar";
import { GeneratedWebsitePanel } from "@/components/generated-website-panel";

export default function RightLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GeneratedWebsitePanel>
      <NavigationMenuProvider>
        <div className="flex flex-col h-svh pb-6 relative">
          <NavBar />

          <main className="flex-1 overflow-y-auto hide-scrollbar">
            {Children.toArray(children)}

            <Footer />
          </main>
        </div>
      </NavigationMenuProvider>
    </GeneratedWebsitePanel>
  );
}
