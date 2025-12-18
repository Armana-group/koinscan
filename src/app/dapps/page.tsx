import Image from "next/image";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const dapps = [
  {
    name: "Fogata v1",
    slug: "fogata1",
    description: "Fogata mining pools",
    imageUrl:
      "https://images.unsplash.com/photo-1526407706864-79a107a36efe?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Fogata 2",
    slug: "fogata2",
    description: "Track Fogata 2 mining pools and join to start earning rewards on Koinos.",
    imageUrl:
      "https://images.unsplash.com/photo-1526407706864-79a107a36efe?auto=format&fit=crop&w=600&q=80",
  },
];

export default function DappsPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Discover dApps</h1>
        <p className="mt-3 text-muted-foreground">
          Explore decentralized applications built on Koinos. Find tools and services created by the community.
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {dapps.map((dapp) => (
          <Link key={dapp.slug} href={`/dapps/${dapp.slug}`} className="group">
            <Card className="h-full overflow-hidden border border-border/60 transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:border-border">
              <div className="relative h-48 w-full overflow-hidden">
                <Image
                  src={dapp.imageUrl}
                  alt={dapp.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">{dapp.name}</CardTitle>
                <CardDescription>{dapp.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-primary">View details →</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

