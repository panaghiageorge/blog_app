import type { ReactNode } from "react";
import { useI18n } from "../../i18n/I18nContext";
import type { PostItem } from "./posts.types";

type Props = {
  items: PostItem[];
  renderAction?: (item: PostItem) => ReactNode;
};

export const PostList = ({ items, renderAction }: Props) => {
  const { copy } = useI18n();

  return (
    <ul className="posts management-posts">
      {items.map((item) => (
        <li key={item.id}>
          <div className="management-post-heading">
            <div>
              <h3>{item.title}</h3>
              <small>
                @{item.slug} -{" "}
                {copy.home.categories[
                  item.category as keyof typeof copy.home.categories
                ] ?? item.category}{" "}
                - {item.authorName ?? `user#${item.authorId}`}
              </small>
            </div>
            <div className="management-post-actions">
              <span className={`status-pill status-${item.status}`}>
                {copy.postForm.statusOptions[item.status]}
              </span>
              {renderAction?.(item)}
            </div>
          </div>
          <p>{item.excerpt}</p>
        </li>
      ))}
    </ul>
  );
};
