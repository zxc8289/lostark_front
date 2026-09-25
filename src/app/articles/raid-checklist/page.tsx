import EditorialArticle, { articleMetadata } from "../../components/EditorialArticle";
import { checklistArticle } from "../content";

export const metadata = articleMetadata(checklistArticle);

export default function ArticlePage() {
  return <EditorialArticle article={checklistArticle} />;
}
