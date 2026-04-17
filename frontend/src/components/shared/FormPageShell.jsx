import DetailPageShell from "@/components/shared/DetailPageShell";
import SectionCard from "@/components/shared/SectionCard";

function FormPageShell({
  eyebrow,
  title,
  description,
  actions,
  formTitle = "Form",
  formDescription = "",
  children,
}) {
  return (
    <DetailPageShell eyebrow={eyebrow} title={title} description={description} actions={actions}>
      <SectionCard title={formTitle} description={formDescription}>
        {children}
      </SectionCard>
    </DetailPageShell>
  );
}

export default FormPageShell;
