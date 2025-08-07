"use client";

import { Abi, BlockHeaderJson, Contract, Provider, ProviderInterface, Serializer, SignerInterface, utils } from "koilib";
import { abiGovernance, abiPob } from "@/koinos/abis";
import { useWallet } from "@/contexts/WalletContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Hash, TrendingUp, Vote } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { KNOWN_PRODUCERS } from "@/koinos/constants";
import { Navbar } from "@/components/Navbar";

interface ProducerStats {
  address: string;
  name: string;
  lastBlockHeight?: number;
  lastBlockTime?: Date;
  vhpBalance?: number;
  vhpPercentage?: number;
  effectiveness?: number;
  totalBlocksProduced?: number;
  averageTimeToProduce?: number;
  timeToProduce?: number;
  governanceProposals?: Array<{
    id: string;
    title: string;
    status: string;
    votedAt: Date;
  }>;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

function formatVHP(amount: number): string {
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(2)}B VHP`;
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(2)}M VHP`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(2)}K VHP`;
  return `${amount.toFixed(2)} VHP`;
}

async function getVhpBalance(provider: ProviderInterface, address: string): Promise<number> {
  const resultInvoke = await provider.invokeGetContractAddress!("vhp");
  const id = resultInvoke!.value.address;
  const vhpContract = new Contract({ id, provider, abi: utils.tokenAbi });
  const { result } = await vhpContract.functions.balanceOf({ owner: address });
  if (!result) return 0;
  return Number(result.value) / 1e8;
}

async function getDifficulty(provider: ProviderInterface): Promise<number> {
  const resultInvoke = await provider.invokeGetContractAddress!("pob");
  const id = resultInvoke!.value.address;
  const pobContract = new Contract({ id, provider, abi: abiPob });
  const { result } = await pobContract.functions.get_metadata();
  if (!result) return 0;
  return Number(
    "0x" + utils.toHexString(utils.decodeBase64url(result.value.difficulty))
  );
}

async function getLastBlocksProduced(provider: ProviderInterface, address: string) {
  const regsPerCall = 30;
  let seqNum = null;
  const result = await provider.call<{
    values: {
      seq_num: string;
      block: {
        header: BlockHeaderJson;
      };
    }[];
  }>("account_history.get_account_history", {
    address,
    ascending: false,
    limit: regsPerCall,
    irreversible: false,
    seq_num: seqNum,
  });
  if (!result || !result.values) return undefined;
  const blocks = result.values
    .filter((val) => {
      return !!val.block;
    })
    .map((val) => val.block);
  if (blocks.length > 0) return blocks;
  seqNum = result.values[result.values.length - 1].seq_num;
  if (Number(seqNum) === 0) return undefined;
}

async function getProducerStats(provider: ProviderInterface, address: string): Promise<ProducerStats> {
  const knownProducer = KNOWN_PRODUCERS.find(p => p.address === address);
  
  const vhpBalance = await getVhpBalance(provider, address);
  const difficulty = await getDifficulty(provider);
  const timeToProduce = Math.floor((10 * difficulty) / (vhpBalance * 1e8));
  const blocks = await getLastBlocksProduced(provider, address);
  if (!blocks) return {
    address,
    name: knownProducer?.name || address,
    lastBlockHeight: undefined,
    lastBlockTime: undefined,
    vhpBalance,
    vhpPercentage: 0,
    effectiveness: 0,
    totalBlocksProduced: 0,
    averageTimeToProduce: undefined,
    timeToProduce,
    governanceProposals: []
  };

  const firstBlock = blocks[blocks.length - 1]; // oldest block
  const lastBlock = blocks[0]; // most recent block
  const firstTime = Number(firstBlock.header.timestamp);
  const lastTime = Number(lastBlock.header.timestamp);
  const now = Date.now();

  // distance to actual time
  const deltaTime = now - lastTime;

  let averageTimeToProduce: number;
  if (deltaTime > timeToProduce) {
    // it should have produced a block already.
    // this is penalized by assuming a new block after deltaTime
    averageTimeToProduce = (now - firstTime) / blocks.length;
  } else {
    averageTimeToProduce = (lastTime - firstTime) / (blocks.length - 1);
  }

  const effectiveness = (timeToProduce * 100) / averageTimeToProduce;
  
  // Calculate effectiveness (blocks produced vs expected)
  const totalBlocks = 0;
  const blocksProduced = 0;
  
  // Mock VHP data (in a real implementation, this would come from the blockchain)
  const vhpProducing = 10 * difficulty / 3000 / 1e8;
  const vhpPercentage = (vhpBalance / vhpProducing) * 100;
  
  // Mock governance proposals (in a real implementation, this would query governance contract)
  const mockProposals = [
    {
      id: "PROP-001",
      title: "Increase block reward by 10%",
      status: "Approved",
      votedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
    },
    {
      id: "PROP-002", 
      title: "Implement new consensus mechanism",
      status: "Approved",
      votedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    },
    {
      id: "PROP-003",
      title: "Update network parameters",
      status: "Approved", 
      votedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    }
  ];
  
  return {
    address,
    name: knownProducer?.name || address,
    lastBlockHeight: lastBlock ? Number(lastBlock.header.height) : undefined,
    lastBlockTime: lastBlock ? new Date(Number(lastBlock.header.timestamp)) : undefined,
    vhpBalance,
    vhpPercentage,
    effectiveness,
    totalBlocksProduced: blocksProduced,
    averageTimeToProduce,
    timeToProduce,
    governanceProposals: mockProposals
  };
}

export default function ProducerPage() {
  const { provider } = useWallet();
  const params = useParams();
  const address = params.address as string;
  const [producerStats, setProducerStats] = useState<ProducerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (provider && address) {
      setLoading(true);
      getProducerStats(provider, address).then((stats) => {
        setProducerStats(stats);
        setLoading(false);
      }).catch((error) => {
        console.error("Error fetching producer stats:", error);
        setLoading(false);
      });
    }
  }, [provider, address]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-[calc(100vh-4rem)] bg-background">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center space-x-4 mb-8">
              <Link href="/network">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Network
                </Button>
              </Link>
            </div>
            <div className="text-center py-12">
              <div className="text-muted-foreground">Loading producer details...</div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!producerStats) {
    return (
      <>
        <Navbar />
        <main className="min-h-[calc(100vh-4rem)] bg-background">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center space-x-4 mb-8">
              <Link href="/network">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Network
                </Button>
              </Link>
            </div>
            <div className="text-center py-12">
              <div className="text-muted-foreground">Producer not found</div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)] bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header with back button */}
          <div className="flex items-center space-x-4 mb-8">
            <Link href="/network">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Network
              </Button>
            </Link>
          </div>

      {/* Producer Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{producerStats.name}</h1>
        <p className="text-muted-foreground mt-2 font-mono text-sm">
          {producerStats.address}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VHP Amount</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVHP(producerStats.vhpBalance || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {producerStats.vhpPercentage?.toFixed(2)}% of network
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Time to Produce</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {producerStats.averageTimeToProduce ? 
                `${Math.floor(producerStats.averageTimeToProduce / 1000)}s` : 
                "N/A"
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Expected {producerStats.timeToProduce ? 
                `${Math.floor(producerStats.timeToProduce / 1000)}s` : 
                "N/A"
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Effectiveness</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{producerStats.effectiveness?.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Based on expected time to produce
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Block</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {producerStats.lastBlockHeight ? (
                <Link href={`/blocks/${producerStats.lastBlockHeight}`} className="hover:underline">
                  #{producerStats.lastBlockHeight}
                </Link>
              ) : (
                "N/A"
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {producerStats.lastBlockTime ? formatTimeAgo(producerStats.lastBlockTime) : "Never"}
            </p>
          </CardContent>
        </Card>

        {/*
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Governance</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{producerStats.governanceProposals?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Proposals approved
            </p>
          </CardContent>
        </Card>
        */}
      </div>

      {/* Governance Proposals */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Governance Proposals Approved</CardTitle>
          <CardDescription>
            List of governance proposals that this producer has approved
          </CardDescription>
        </CardHeader>
        <CardContent>
          {producerStats.governanceProposals && producerStats.governanceProposals.length > 0 ? (
            <div className="space-y-4">
              {producerStats.governanceProposals.map((proposal, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="text-xs">
                        {proposal.id}
                      </Badge>
                      <Badge variant="default" className="text-xs">
                        {proposal.status}
                      </Badge>
                    </div>
                    <h4 className="font-medium mt-2">{proposal.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Voted {formatTimeAgo(proposal.votedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No governance proposals found for this producer
            </div>
          )}
        </CardContent>
      </Card> */}
        </div>
      </main>
    </>
  );
} 