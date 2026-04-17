import { motion } from "framer-motion";
import StatCard from "@/components/shared/StatCard";

function SummaryGrid({ items = [] }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: index * 0.04 }}
        >
          <StatCard title={item.title} value={item.value} hint={item.hint} tone={item.tone} />
        </motion.div>
      ))}
    </section>
  );
}

export default SummaryGrid;
