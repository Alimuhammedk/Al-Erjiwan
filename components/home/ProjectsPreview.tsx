import { ar } from "@/content/ar";
import { EmptyState } from "@/components/ui/EmptyState";

// Real before/after photos arrive in phase 6.
export function ProjectsPreview() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-12">
      <h2 className="mb-5 text-2xl font-extrabold text-brand-900">{ar.home.projectsTitle}</h2>
      <EmptyState message={ar.home.emptyProjects} />
    </section>
  );
}
