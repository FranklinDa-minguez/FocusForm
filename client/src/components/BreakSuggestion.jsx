export default function BreakSuggestion({
  visible,
  onBreakTaken,
  onDismiss
}) {
  if (!visible) return null;

  return (
    <div className="break-popup">
      <h2>Break Suggested</h2>

      <p>
        You've been focused for a while.
        Consider stretching or resting your eyes.
      </p>

      <button onClick={onBreakTaken}>
        I Took a Break
      </button>

      <button onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}