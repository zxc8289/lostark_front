import EditorialArticle, { articleMetadata } from "../../components/EditorialArticle";
import { boundGoldArticle } from "../content";

export const metadata = articleMetadata(boundGoldArticle);

export default function ArticlePage() {
  return <EditorialArticle article={boundGoldArticle} />;
}
