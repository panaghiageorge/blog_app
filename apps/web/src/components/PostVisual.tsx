import type { CategoryId } from "../i18n/translations";
import { mediaUrl } from "../shared/media";

export const PostVisual = ({
  category,
  size = "default",
  imageUrl,
}: {
  category: Exclude<CategoryId, "all">;
  size?: "default" | "hero";
  imageUrl?: string | null;
}) => (
  <div className={`post-visual post-visual-${category} post-visual-${size}`}>
    {imageUrl && <img alt="" className="post-visual-image" src={mediaUrl(imageUrl)} />}
    <img
      alt=""
      aria-hidden="true"
      className="post-visual-logo post-visual-logo-light"
      src="/brand/logo_dark.png"
    />
    <img
      alt=""
      aria-hidden="true"
      className="post-visual-logo post-visual-logo-dark"
      src="/brand/logo-white.png"
    />
  </div>
);
