import React from 'react';
import { SignIn } from "@clerk/nextjs";

function Page() {
  return (
    <div className="flex items-center justify-center h-full">
      <SignIn afterSignOutUrl="/" />
    </div>
  );
}

export default Page;