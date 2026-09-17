import { PublicSite } from "../components/public-site";
import { listPublishedProjects } from "../db/projects";

export default async function HomePage() {
  try {
    const projects = await listPublishedProjects();
    return (
      <PublicSite
        projects={projects.map((project) => ({
          id: project.id,
          title: project.title,
          summary: project.summary,
          category: project.category,
          year: project.year,
          coverKey: project.coverKey,
          externalUrl: project.externalUrl,
        }))}
        archiveUnavailable={false}
      />
    );
  } catch (error) {
    console.error("Failed to load the public project archive.", error);
    return <PublicSite projects={[]} archiveUnavailable />;
  }
}
