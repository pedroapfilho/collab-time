import { notFound } from "next/navigation";
import { validateTeam } from "@/lib/actions";
import { TeamPageClient } from "./client";

type TeamPageProps = {
  params: Promise<{ teamId: string }>;
};

const TeamPage = async ({ params }: TeamPageProps) => {
  const { teamId } = await params;
  const exists = await validateTeam(teamId);
  if (!exists) {
    notFound();
  }

  return <TeamPageClient teamId={teamId} />;
};

export default TeamPage;
