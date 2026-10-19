import { requireStaff } from "@/lib/auth";
import { auctionSnapshot } from "@/lib/auction/admin";
import { AuctionAdmin } from "@/components/auction-admin";
import "./auction.css";
export const dynamic = "force-dynamic";
export default async function AuctionPage(): Promise<React.JSX.Element> {
  const staff = await requireStaff(["owner", "admin", "moderator"]);
  const initial = await auctionSnapshot();
  return (
    <AuctionAdmin initial={initial} canManage={staff.role !== "moderator"} />
  );
}
