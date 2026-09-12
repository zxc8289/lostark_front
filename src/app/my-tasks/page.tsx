import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import MyTasksClient from "./MyTasksClient";

export default async function MyTasksPage() {
  const session = await getServerSession(authOptions);

  return <MyTasksClient forceDemo={!session?.user} />;
}
