"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingDown,
  Package,
  BarChart3,
  LucideIcon,
} from "lucide-react";
import { formatCurrency, formatQuantity } from "@/lib/utils";

interface SummaryData {
  totalCusto: number;
  totalVenda: number;
  totalQtd: number;
  mediaQtdDia: number;
  margemPerda: string;
}

interface SummaryCardsProps {
  summary: SummaryData;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const cardsData = [
    {
      title: "Total Perdas (Custo)",
      icon: DollarSign,
      mainValue: formatCurrency(summary.totalCusto),
      subText: "no período selecionado",
      iconColor: "text-muted-foreground",
      valueColor: "text-foreground",
      borderColor: "border-primary/20",
    },
    {
      title: "Perda em Venda",
      icon: TrendingDown,
      mainValue: formatCurrency(summary.totalVenda),
      subText: "receita não realizada",
      iconColor: "text-destructive",
      valueColor: "text-destructive",
      borderColor: "border-destructive/20",
    },
    {
      title: "Total de Eventos",
      icon: Package,
      mainValue: formatQuantity(summary.totalQtd),
      subText: `~${formatQuantity(summary.mediaQtdDia)} eventos/dia`,
      iconColor: "text-muted-foreground",
      valueColor: "text-foreground",
      borderColor: "border-blue-500/20",
    },
    {
      title: "Margem de Perda",
      icon: BarChart3,
      mainValue: `${summary.margemPerda}%`,
      subText: "diferença custo vs. venda",
      iconColor: "text-muted-foreground",
      valueColor: "text-foreground",
      borderColor: "border-emerald-500/20",
    },
  ];

  // Rotação automática Mobile
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCardIndex((prev) => (prev + 1) % cardsData.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [cardsData.length]);

  return (
    <>
      {/* MOBILE: STACKED DECK */}
      <div className="block md:hidden py-4 px-2">
        <div
          className="relative w-full h-40"
          onClick={() => setActiveCardIndex((prev) => (prev + 1) % 4)}
        >
          {cardsData.map((card, index) => {
            const position = (index - activeCardIndex + 4) % 4;
            let zIndex = 0,
              scale = 1,
              translateX = 0,
              opacity = 1;

            if (position === 0) {
              zIndex = 30;
              scale = 1;
              translateX = 0;
              opacity = 1;
            } else if (position === 1) {
              zIndex = 20;
              scale = 0.95;
              translateX = 12;
              opacity = 0.9;
            } else if (position === 2) {
              zIndex = 10;
              scale = 0.9;
              translateX = 24;
              opacity = 0.7;
            } else {
              zIndex = 0;
              scale = 0.85;
              translateX = 0;
              opacity = 0;
            }

            return (
              <Card
                key={index}
                className="absolute inset-0 transition-all duration-500 ease-in-out cursor-pointer shadow-lg border bg-card"
                style={{
                  zIndex,
                  transform: `translateX(${translateX}px) scale(${scale})`,
                  opacity,
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2 pl-6">
                  <CardTitle className="text-sm font-medium">
                    {card.title}
                  </CardTitle>
                  <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                </CardHeader>
                <CardContent className="pl-6">
                  <div className={`text-3xl font-bold ${card.valueColor}`}>
                    {card.mainValue}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.subText}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="text-[10px] text-center text-muted-foreground mt-2 opacity-50">
          Toque para ver o próximo
        </p>
      </div>

      {/* DESKTOP: GRID */}
      <div className="hidden md:grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cardsData.map((card, index) => (
          <Card key={index} className={`border-l-4 ${card.borderColor}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.iconColor}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.valueColor}`}>
                {card.mainValue}
              </div>
              <p className="text-xs text-muted-foreground">{card.subText}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
