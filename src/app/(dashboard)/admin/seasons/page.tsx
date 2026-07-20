import { listSeasons, getActiveSeason } from "@/actions/season.actions";
import { SeasonList } from "@/components/seasons/SeasonList";
import { SeasonCreateForm } from "@/components/seasons/SeasonCreateForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default async function AdminSeasonsPage() {
  const seasons = await listSeasons();
  const activeSeason = await getActiveSeason();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Trophy size={28} className="text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Season & Rank Admin</h1>
          <p className="text-muted-foreground text-sm">
            Manage seasons, ranks, point configurations, and multipliers.
          </p>
        </div>
      </div>

      {activeSeason && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Active Season</p>
              <p className="text-lg font-bold">
                {activeSeason.seasonCode}
                {activeSeason.displayName ? ` — ${activeSeason.displayName}` : ""}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {activeSeason.seasonType.toLowerCase()} ·{" "}
                {activeSeason.pointMultiplierActive
                  ? `${activeSeason.pointMultiplierValue}x multiplier active`
                  : "No active multiplier"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <SeasonCreateForm />

      <Card>
        <CardHeader>
          <CardTitle>All Seasons</CardTitle>
        </CardHeader>
        <CardContent>
          <SeasonList seasons={seasons} />
        </CardContent>
      </Card>
    </div>
  );
}
