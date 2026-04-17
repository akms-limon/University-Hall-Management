import StatCard from "@/components/shared/StatCard";

function DashboardStatGrid({ stats }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => (
        <StatCard key={item.title} title={item.title} value={item.value} hint={item.hint} tone={item.tone} />
      ))}
    </section>
  );
}

export default DashboardStatGrid;

