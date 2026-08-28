import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../modules/auth/AuthContext";
import { CreatePostForm } from "../modules/posts/CreatePostForm";
import { createPostRequest } from "../modules/posts/posts.api";

export const AuthorCreatePostPage = () => {
  const { copy } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createPostRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      navigate("/author/posts");
    },
  });

  const formError =
    createMutation.error instanceof Error ? createMutation.error.message : "";

  return (
    <section className="page-stack">
      <div className="panel hero-panel">
        <div>
          <p className="eyebrow">{copy.authorStudio.createEyebrow}</p>
          <h2>{copy.authorStudio.createTitle}</h2>
        </div>
        <Link className="secondary action-link" to="/author/posts">
          {copy.authorStudio.manageTitle}
        </Link>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{copy.authorStudio.createEyebrow}</p>
            <h3>{copy.authorStudio.createTitle}</h3>
          </div>
        </div>
        <CreatePostForm
          isPending={createMutation.isPending}
          onSubmit={(payload) => createMutation.mutateAsync(payload)}
          isAdmin={user?.role === "admin"}
        />
        {formError && <p className="error">{formError}</p>}
      </section>
    </section>
  );
};