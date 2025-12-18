import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const miningPools = [
  {
    name: "Fogata Collective",
    description: "Community-driven pool focusing on long-term stability and transparent reward distribution.",
  },
  {
    name: "Ember Squad",
    description: "High-performance pool optimized for consistent payout cycles with active governance involvement.",
  },
  {
    name: "Ignite Labs",
    description: "Research-oriented pool experimenting with new strategies to maximize Fogata 2 rewards.",
  },
];

export default function Fogata2Page() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Fogata 2 Mining Pools</h1>
        <p className="mt-4 text-muted-foreground">
          Fogata 2 empowers the Koinos community with decentralized mining pools. Choose a pool to join, contribute your resources, and earn rewards for helping secure the network.
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {miningPools.map((pool) => (
          <Card key={pool.name} className="border border-border/60">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">{pool.name}</CardTitle>
              <CardDescription>{pool.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled>
                Join pool (coming soon)
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

