export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#f5f7f4] p-5 text-[#17211b] lg:pl-[285px] lg:pt-10">
      <div className="mx-auto max-w-[1320px] animate-pulse space-y-6">
        <div className="h-8 w-48 rounded-lg bg-[#dfe9df]" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-32 rounded-2xl border border-[#e2e9e2] bg-white" />)}
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.45fr_0.8fr]">
          <div className="h-80 rounded-2xl border border-[#e2e9e2] bg-white" />
          <div className="h-80 rounded-2xl border border-[#e2e9e2] bg-white" />
        </div>
      </div>
    </div>
  )
}
