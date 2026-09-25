import EditorialArticle, { articleMetadata } from "../../components/EditorialArticle";
import { auctionArticle } from "../content";

export const metadata = articleMetadata(auctionArticle);

export default function ArticlePage() {
  return <EditorialArticle article={auctionArticle} />;
}
