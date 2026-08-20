// docs/AppFlow.md step 4: async job tracking. This screen is where "Scalable"
// becomes visible to a judge — show tiles-completed/total and throughput.
export default function JobDashboardPage() {
  return (
    <div className="px-6 py-10">
      <h2 className="font-display text-xl mb-4">Jobs</h2>
      {/* TODO: poll GET /jobs/:id via React Query; list with status + progress */}
    </div>
  );
}
