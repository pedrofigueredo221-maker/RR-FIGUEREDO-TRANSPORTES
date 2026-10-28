export default function RefreshButton({ onRefresh, loading = false }) {
  const handleRefresh = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (loading || typeof onRefresh !== "function") return;
    void onRefresh();
  };

  return (
    <button
      type="button"
      className="rr-refresh-button"
      onClick={handleRefresh}
      disabled={loading || typeof onRefresh !== "function"}
      aria-label={loading ? "Atualizando dados" : "Atualizar dados"}
      title={loading ? "Atualizando dados..." : "Atualizar dados"}
      aria-busy={loading}
    >
      <svg
        viewBox="0 0 24 24"
        width="19"
        height="19"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 9a8 8 0 0 0-14.9-2M4 3v6h6" />
        <path d="M4 15a8 8 0 0 0 14.9 2M20 21v-6h-6" />
      </svg>
    </button>
  );
}
