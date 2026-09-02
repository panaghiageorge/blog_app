import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import type { CategoryId } from "../i18n/translations";
import { mediaUrl } from "../shared/media";
import { PostVisual } from "./PostVisual";

type PostCarouselProps = {
  category: Exclude<CategoryId, "all">;
  images?: Array<string | null | undefined>;
};

export const PostCarousel = ({ category, images = [] }: PostCarouselProps) => {
  const validImages = useMemo(
    () => Array.from(new Set(images.filter((image): image is string => Boolean(image)))).slice(0, 5),
    [images],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  if (validImages.length === 0) {
    return <PostVisual category={category} size="hero" />;
  }

  const activeImage = validImages[Math.min(activeIndex, validImages.length - 1)];
  const goTo = (nextIndex: number) => {
    setActiveIndex((nextIndex + validImages.length) % validImages.length);
  };

  return (
    <div className="post-carousel" aria-label="Galerie imagini postare">
      <div className="post-carousel-frame">
        <img src={mediaUrl(activeImage)} alt="" />
        {validImages.length > 1 && (
          <>
            <button className="carousel-nav carousel-prev" type="button" onClick={() => goTo(activeIndex - 1)} aria-label="Imaginea anterioara">
              <ChevronLeft size={20} />
            </button>
            <button className="carousel-nav carousel-next" type="button" onClick={() => goTo(activeIndex + 1)} aria-label="Imaginea urmatoare">
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>
      {validImages.length > 1 && (
        <div className="carousel-thumbnails">
          {validImages.map((image, index) => (
            <button
              key={image}
              className={index === activeIndex ? "active" : ""}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Imaginea ${index + 1}`}
            >
              <img src={mediaUrl(image)} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
