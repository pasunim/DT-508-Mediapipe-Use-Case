import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, avatarColor: true },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar username={user?.username ?? ""} avatarColor={user?.avatarColor ?? "#7c3aed"} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
