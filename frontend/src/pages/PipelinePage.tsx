// docs/AppFlow.md secondary flow: ISRO pipeline integration demo.
// Aimed at the judge/pipeline-operator persona — shows the documented
// Bhoonidhi-style contract and a live/mock run against it.
export default function PipelinePage() {
  return (
    <div className="px-6 py-10">
      <h2 className="font-display text-xl mb-4">ISRO Pipeline Integration</h2>
      {/* TODO: display adapter contract (search/fetch/push), "Run live example"
          button hitting /pipeline/search -> /pipeline/fetch -> job -> /pipeline/push.
          Clearly label mock vs live results — see backend/adapters/bhoonidhi/. */}
    </div>
  );
}
