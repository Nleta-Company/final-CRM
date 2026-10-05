"use client";

import React from "react";
import MetricCard from "./MetricCard";

export interface MetricGroupItem {
  id: string;
  title: string;
  value: string;
  change: string;
  changeType: "increase" | "decrease" | "neutral";
  period?: string;
  icon?: React.ReactNode;
}

interface MetricGroupProps {
  metrics?: MetricGroupItem[];
}

const defaultMetrics: MetricGroupItem[] = [
  {
    id: "customers",
    title: "Total Clients",
    value: "3,782",
    change: "+11.01%",
    changeType: "increase",
    period: "vs last month",
    icon: (
      <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" fill="none">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    ),
  },
  {
    id: "revenue",
    title: "Total Revenue",
    value: "$284,500",
    change: "+18.45%",
    changeType: "increase",
    period: "vs last month",
    icon: (
      <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" fill="none">
        <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
      </svg>
    ),
  },
  {
    id: "orders",
    title: "Active Deals",
    value: "1,248",
    change: "-2.35%",
    changeType: "decrease",
    period: "vs last month",
    icon: (
      <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" fill="none">
        <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
      </svg>
    ),
  },
  {
    id: "growth",
    title: "Conversion Rate",
    value: "24.6%",
    change: "+4.15%",
    changeType: "increase",
    period: "vs last month",
    icon: (
      <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" fill="none">
        <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
      </svg>
    ),
  },
];

export default function MetricGroup({ metrics = defaultMetrics }: MetricGroupProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6 mb-6">
      {metrics.map((metric) => (
        <MetricCard key={metric.id} {...metric} />
      ))}
    </div>
  );
}
