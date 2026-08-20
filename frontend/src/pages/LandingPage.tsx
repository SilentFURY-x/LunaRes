// docs/AppFlow.md step 1: orient the user, set expectations, build credibility
// with a short, honest explainer before they upload anything.
export default function LandingPage() {
  return (
    <div className="px-6 py-16 max-w-2xl">
      <h1 className="font-display text-3xl mb-4">LunaRes</h1>
      <p className="text-regolith/80">
        AI-enhanced resolution for satellite and planetary imagery — trained on
        real paired Chandrayaan-2 TMC-2/OHRC data, with a confidence map shipped
        alongside every output so you know what to trust.
      </p>
      {/* TODO: add data-source acknowledgement + limitations note per
          docs/AppFlow.md and docs/DataSources.md section 6 */}
    </div>
  );
}
