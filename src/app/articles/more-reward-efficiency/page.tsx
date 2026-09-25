import EditorialArticle, { articleMetadata } from "../../components/EditorialArticle";
import { moreRewardArticle } from "../content";

export const metadata = articleMetadata(moreRewardArticle);

export default function ArticlePage() {
  return <EditorialArticle article={moreRewardArticle} />;
}
