import { motion } from "framer-motion";
import SectionCard from "@/components/shared/SectionCard";

function ContentSection({ title, description, action, children, className }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <SectionCard title={title} description={description} action={action} className={className}>
        {children}
      </SectionCard>
    </motion.div>
  );
}

export default ContentSection;
