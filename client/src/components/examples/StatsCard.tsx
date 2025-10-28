import { Calendar } from "lucide-react";
import { StatsCard } from "../StatsCard";

export default function StatsCardExample() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total de Agendamentos"
        value="124"
        icon={Calendar}
        trend={{ value: "12%", positive: true }}
      />
    </div>
  );
}
