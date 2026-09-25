import EditorialArticle, { articleMetadata } from "../../components/EditorialArticle";
import { weeklyGoldArticle } from "../content";

export const metadata = articleMetadata(weeklyGoldArticle);

export default function ArticlePage() {
  return <EditorialArticle article={weeklyGoldArticle} />;
}
