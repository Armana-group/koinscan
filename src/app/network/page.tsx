"use client";

/**
 * The VHP producing is calculated from the difficulty of the PoB contract.
 * The PoB contract is designed in a way that, on average, each 3 seconds it
 * should create a new block. Also, the time is measured in fractions of 10
 * milliseconds. Then the total VHP produducing (let's call it VHPprod) will
 * try to mine a block each 10 milliseconds. That is, in 300 attemps the
 * VHPprod should produce 1 block (3sec/10ms = 300).
 * 
 * In the code, it is computed as a "hash" trying to reach a "target".
 * hash = random value / VHPprod
 * target = MAX_VALUE / difficulty
 * 
 * a success value is meet when hash < target.
 * 
 * The hash is computed with a random value that goes from 0 to MAX_VALUE.
 * Each 300 attemps we want a success value. Then the values from 0 to
 * MAX_VALUE/300 will trigger a valid block. Then, on average, the difficulty
 * will be adjusted to match the following formula:
 * 
 * hash = target
 * random value / VHPprod = MAX_VALUE / difficulty
 * (MAX_VALUE / 300) / VHPprod = MAX_VALUE / difficulty
 * VHPprod = difficulty / 300
 *  
 * So, in conclusion the total VHP producing is equal to difficulty / 300.
 * You can get this difficulty from the metadata of the PoB contract.
 * This is also the formula used in the block producer to compute the
 * VHP producing. https://github.com/koinos/koinos-block-producer/blob/master/src/koinos/block_production/pob_producer.cpp#L492
 * 
 * The APY is computed as:
 * APY = 2% * virtual supply / VHP producing
 * 
 * Expected time to produce a block is computed as:
 * The total VHP producing is expected to produce 1 block every 3 seconds.
 * For a particular VHP balance, the expected time to produce a block is:
 * expected time = (3000 milliseconds * VHPproducing) / VHPbalance
 * expected time = (3000 milliseconds * difficulty / 300) / VHPbalance
 * expected time = 10 * difficulty / VHPbalance milliseconds
 */

import { Abi, Contract, Provider, ProviderInterface, Serializer, SignerInterface, utils } from "koilib";
import { abiGovernance, abiPob } from "@/koinos/abis";
import tokenAbi from "@/koinos/abi";
import { getTokenImageUrl } from "@/koinos/utils";
import { useWallet } from "@/contexts/WalletContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  Title
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { useEffect, useState } from "react";
import Link from "next/link";
import { KNOWN_PRODUCERS } from "@/koinos/constants";
import { Navbar } from "@/components/Navbar";

function formatAmount(amount: number): string {
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(2)}B`;
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(2)}M`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(2)}K`;
  return `${amount.toFixed(2)}`;
}

ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  Title
);

// Generate colors for dynamic data
const generateColors = (count: number) => {
  const colors = [
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 99, 132, 0.8)',
    'rgba(255, 205, 86, 0.8)',
    'rgba(75, 192, 192, 0.8)',
    'rgba(153, 102, 255, 0.8)',
    'rgba(255, 159, 64, 0.8)',
    'rgba(199, 199, 199, 0.8)',
    'rgba(83, 102, 255, 0.8)',
    'rgba(78, 252, 3, 0.8)',
    'rgba(252, 3, 244, 0.8)',
  ];
  
  const borderColors = colors.map(color => color.replace('0.8', '1'));
  
  return {
    backgroundColor: colors.slice(0, count),
    borderColor: borderColors.slice(0, count),
  };
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 20,
        usePointStyle: true,
        font: {
          size: 12,
        },
      },
    },
    tooltip: {
      callbacks: {
        label: function(context: any) {
          const label = context.label || '';
          const value = context.parsed;
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return `${label}: ${value} (${percentage}%)`;
        }
      }
    }
  },
};

/* let networkStats = [
  {
    title: "Total Nodes",
    value: "1,247",
    change: "+12",
    changeType: "positive" as const,
    description: "Active network nodes"
  },
  {
    title: "Total Staked",
    value: "2.4B KOIN",
    change: "+5.2%",
    changeType: "positive" as const,
    description: "Total staked tokens"
  },
  {
    title: "Network Hash Rate",
    value: "847 TH/s",
    change: "+3.1%",
    changeType: "positive" as const,
    description: "Current network hash rate"
  },
  {
    title: "Block Time",
    value: "2.3s",
    change: "-0.1s",
    changeType: "negative" as const,
    description: "Average block time"
  }
];
networkStats = []; */

async function getNetworkData(provider: ProviderInterface) {
  const numberOfBlocks = 100;
  const head = await provider.getHeadInfo();
  const blocks = await provider.getBlocks(Number(head.head_topology.height) - numberOfBlocks, numberOfBlocks, "", {
    returnBlock: true,
    returnReceipt: false,
  });
  const producers: {
    address: string;
    name: string;
    percentage: number;
  }[] = KNOWN_PRODUCERS.map((p) => ({
    address: p.address,
    name: p.name,
    percentage: 0,
  }));
  for (const block of blocks) {
    const signer = block.block.header!.signer!;
    const producer = producers.find((p) => p.address === signer);
    if (producer) {
      producer.percentage += 100 / numberOfBlocks;
    } else {
      const knownProducer = KNOWN_PRODUCERS.find((p) => p.address === signer);
      producers.push({
        address: signer,
        name: knownProducer?.name || signer,
        percentage: 100 / numberOfBlocks,
      });
    }
  }
  producers.sort((a, b) => b.percentage - a.percentage);
  
  const firstBlock = blocks[0];
  const lastBlock = blocks[blocks.length - 1];
  const averageBlockTime = (Number(lastBlock.block.header!.timestamp) - Number(firstBlock.block.header!.timestamp)) / (numberOfBlocks - 1) / 1000;

  let resultInvoke = await provider.invokeGetContractAddress!("vhp");
  let id = resultInvoke!.value.address;
  const vhpContract = new Contract({ id, provider, abi: tokenAbi });
  const { result: resultVhp } = await vhpContract.functions.totalSupply();
  const totalVhp = Number(resultVhp!.value) / 1e8;

  resultInvoke = await provider.invokeGetContractAddress!("koin");
  id = resultInvoke!.value.address;
  const koinContract = new Contract({ id, provider, abi: tokenAbi });
  const { result: resultKoin } = await koinContract.functions.totalSupply();
  const totalKoin = Number(resultKoin!.value) / 1e8;

  resultInvoke = await provider.invokeGetContractAddress!("pob");
  id = resultInvoke!.value.address;
  const pobContract = new Contract({ id, provider, abi: abiPob });
  const { result: resultPob } = await pobContract.functions.get_metadata();
  const difficulty = Number(
    "0x" + utils.toHexString(utils.decodeBase64url(resultPob!.value.difficulty))
  );
  const timeToProduce = 10 * difficulty / (totalVhp * 1e8) / 1000;
  const vhpProducing = 10 * difficulty / 3000 / 1e8;
  const apy = 2 * (totalVhp + totalKoin) / vhpProducing;

  return {
    producers,
    averageBlockTime,
    totalVhp,
    totalKoin,
    difficulty,
    timeToProduce,
    vhpProducing,
    apy,
  };
}

export default function NetworkPage() {
  const { provider } = useWallet();
  const [networkData, setNetworkData] = useState<{
    address: string;
    name: string;
    percentage: number;
  }[]>([]);
  const [networkStats, setNetworkStats] = useState<{
    title: string;
    value: string;
    change: string;
    changeType: "positive" | "negative";
    description: string;
  }[]>([]);

  useEffect(() => {
    if (provider) {
      getNetworkData(provider).then((data) => {
        setNetworkData(data.producers);
        setNetworkStats([
          {
            title: "Block Time",
            value: `${data.averageBlockTime.toFixed(2)}s`,
            change: "",
            changeType: "negative" as const,
            description: "Average block time"
          },
          {
            title: "VHP Producing",
            value: `${formatAmount(data.vhpProducing)} VHP`,
            change: "",
            changeType: "positive" as const,
            description: "Average VHP producing"
          },
          {
            title: "Virtual Supply",
            value: `${formatAmount(data.totalVhp + data.totalKoin)} VHP+KOIN`,
            change: "",
            changeType: "positive" as const,
            description: `${formatAmount(data.totalVhp)} VHP + ${formatAmount(data.totalKoin)} KOIN`
          },
          {
            title: "APY",
            value: `${data.apy.toFixed(2)}%`,
            change: "",
            changeType: "positive" as const,
            description: "Annual percentage yield"
          },
        ])
      });
    }
  }, [provider]);

  // Transform network data for pie chart
  const chartData = {
    labels: networkData.map(item => item.name || item.address.slice(0, 8) + '...'),
    datasets: [
      {
        data: networkData.map(item => item.percentage),
        backgroundColor: generateColors(networkData.length).backgroundColor,
        borderColor: generateColors(networkData.length).borderColor,
        borderWidth: 2,
      },
    ],
  };

  // Enhanced chart options with click handling
  const enhancedChartOptions = {
    ...chartOptions,
    onClick: (event: any, elements: any) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const producer = networkData[index];
        if (producer) {
          window.location.href = `/network/${producer.address}`;
        }
      }
    },
    plugins: {
      ...chartOptions.plugins,
      legend: {
        ...chartOptions.plugins.legend,
        onClick: (event: any, legendItem: any) => {
          const producer = networkData[legendItem.index];
          if (producer) {
            window.location.href = `/network/${producer.address}`;
          }
        }
      }
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)] bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Network Overview</h1>
            <p className="text-muted-foreground mt-2">
              Real-time statistics and distribution of the Koinos network
            </p>
          </div>

      {/* Network Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {networkStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              {/* <Badge 
                variant={stat.changeType === "positive" ? "default" : "secondary"}
                className="text-xs"
              >
                {stat.change}
              </Badge> */}
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold truncate">{stat.value}</div>
              <p className="text-xs text-muted-foreground truncate">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Block Producer Distribution</CardTitle>
            <CardDescription>
              Distribution of block production across network nodes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 cursor-pointer">
              {networkData.length > 0 ? (
                <Pie data={chartData} options={enhancedChartOptions} />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Loading network data...
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Block Producer Details</CardTitle>
            <CardDescription>
              Key metrics and information about block producers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {networkData.map((item, index) => (
                <div key={index} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: generateColors(networkData.length).backgroundColor[index] }}
                    />
                    <Link
                      href={`/network/${item.address}`}
                      className="font-medium font-mono text-sm hover:underline cursor-pointer truncate"
                    >
                      {item.name || item.address.slice(0, 8) + '...'}
                    </Link>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-semibold whitespace-nowrap">{item.percentage === 0 ? "<1.0" : item.percentage.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      Block producer
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
        </div>
      </main>
    </>
  );
} 