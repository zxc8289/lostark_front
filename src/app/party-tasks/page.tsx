import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import PartyTasksClient from "./PartyTasksClient";
import PartyDemoPage from "./demo/page";

export default async function PartyTasksPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return <PartyDemoPage />;
    }

    return <PartyTasksClient />;
}
