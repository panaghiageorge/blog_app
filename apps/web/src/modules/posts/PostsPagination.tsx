type Props = {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
};

export const PostsPagination = ({
  page,
  totalPages,
  onPrev,
  onNext,
}: Props) => {
  return (
    <div className="row">
      <button
        type="button"
        className="secondary"
        disabled={page <= 1}
        onClick={onPrev}
      >
        Prev
      </button>
      <span>
        Page {page} / {totalPages}
      </span>
      <button
        type="button"
        className="secondary"
        disabled={page >= totalPages}
        onClick={onNext}
      >
        Next
      </button>
    </div>
  );
};
