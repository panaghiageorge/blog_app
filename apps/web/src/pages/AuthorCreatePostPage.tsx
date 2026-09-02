import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../modules/auth/AuthContext";
import { CreatePostForm } from "../modules/posts/CreatePostForm";
import { createPostRequest } from "../modules/posts/posts.api";
import type { PostPayload } from "../modules/posts/posts.types";

export const AuthorCreatePostPage = () => {
  const { copy } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const localDraftKey = `field-notes:new-post:${user?.id ?? "guest"}`;
  const [autosaveStatus, setAutosaveStatus] = useState(copy.postForm.autosaveIdle);
  const localDraft = useMemo(() => {
    try {
      const saved = window.localStorage.getItem(localDraftKey);
      return saved ? (JSON.parse(saved) as PostPayload) : undefined;
    } catch {
      return undefined;
    }
  }, [localDraftKey]);

  const createMutation = useMutation({
    mutationFn: createPostRequest,
    onSuccess: () => {
      window.localStorage.removeItem(localDraftKey);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      navigate("/author/posts");
    },
  });

  const saveLocalDraft = useCallback((payload: PostPayload) => {
    window.localStorage.setItem(localDraftKey, JSON.stringify(payload));
    setAutosaveStatus(copy.postForm.autosaveSavedLocal);
  }, [copy.postForm.autosaveSavedLocal, localDraftKey]);

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
          initialValue={localDraft}
          isNewPost
          isPending={createMutation.isPending}
          onDraftChange={saveLocalDraft}
          autosaveStatus={autosaveStatus}
          warnOnUnsavedChanges
          onSubmit={(payload) => createMutation.mutateAsync(payload)}
          isAdmin={user?.role === "admin"}
        />
        {formError && <p className="error">{formError}</p>}
      </section>
    </section>
  );
};