"use client";

import { Abi, Contract, Provider, ProviderInterface, Serializer, SignerInterface, utils } from "koilib";
import { abiGovernance } from "@/koinos/abis";
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

let networkStats = [
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
networkStats = [];

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
  return producers;
}

export default function NetworkPage() {
  const { provider } = useWallet();
  const [networkData, setNetworkData] = useState<{
    address: string;
    name: string;
    percentage: number;
  }[]>([]);

  useEffect(() => {
    if (provider) {
      getNetworkData(provider).then((data) => {
        setNetworkData(data);
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
              <Badge 
                variant={stat.changeType === "positive" ? "default" : "secondary"}
                className="text-xs"
              >
                {stat.change}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
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
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: generateColors(networkData.length).backgroundColor[index] }}
                    />
                    <Link 
                      href={`/network/${item.address}`}
                      className="font-medium font-mono text-sm hover:underline cursor-pointer"
                    >
                      {item.name || item.address.slice(0, 8) + '...'}
                    </Link>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{item.percentage.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">
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
  );
} 