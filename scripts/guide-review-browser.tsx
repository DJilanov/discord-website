import { hydrateRoot } from "react-dom/client";
import { GuideReviewPage } from "./guide-review-page";
import { GuideLibrary } from "../components/guide-library";
import { starterResources } from "../content/starter-resources";
import { editorialGuides } from "../content/editorial";

const root = document.getElementById("guide-root");
if (root?.dataset.guide)
  hydrateRoot(root, <GuideReviewPage slug={root.dataset.guide} />);
const library = document.getElementById("library-root");
if (library)
  hydrateRoot(
    library,
    <GuideLibrary
      guides={library.dataset.public ? editorialGuides : starterResources}
      privateReview={!library.dataset.public}
      assetBase="assets"
    />,
  );
