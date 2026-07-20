"use client";

import { useClerk } from "@clerk/nextjs";
import Image from "next/image";

export default function LogoutButton({ icon, label }: { icon: string; label: string }) {
  const { signOut } = useClerk();

  return (
    <button
      onClick={() => signOut()}
      className="flex items-center justify-center lg:justify-start gap-4 text-muted-foreground py-2 md:px-2 rounded-md hover:bg-card w-full"
    >
      <Image src={icon} alt="" width={20} height={20} />
      <span className="hidden lg:block">{label}</span>
    </button>
  );
}
