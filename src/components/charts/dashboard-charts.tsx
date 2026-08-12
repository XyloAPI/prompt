"use client";

import { useMemo } from "react";
import type { EChartsCoreOption } from "echarts/core";
import { EChart } from "@/components/charts/echart";
import type { DashboardData } from "@/lib/dashboard-data";

const ACCENT = "hsl(240 5.9% 10%)";
const MUTED = "hsl(240 3.8% 46.1%)";

export function UploadsChart({ data }: { data: DashboardData["uploadsByDay"] }) {
  const option = useMemo<EChartsCoreOption>(
    () => ({
      grid: { left: 8, right: 8, top: 24, bottom: 8, containLabel: true },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: data.map((d) => d.date.slice(5)),
        axisLine: { lineStyle: { color: "hsl(240 5.9% 90%)" } },
        axisLabel: { color: MUTED, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: { color: MUTED, fontSize: 11 },
        splitLine: { lineStyle: { color: "hsl(240 5.9% 94%)" } },
      },
      series: [
        {
          name: "Uploads",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          data: data.map((d) => d.count),
          lineStyle: { color: ACCENT, width: 2 },
          itemStyle: { color: ACCENT },
          areaStyle: { color: "hsla(240 5.9% 10% / 0.08)" },
        },
      ],
    }),
    [data]
  );
  return <EChart option={option} style={{ height: 280 }} />;
}

export function CategoryChart({ data }: { data: DashboardData["byCategory"] }) {
  const option = useMemo<EChartsCoreOption>(
    () => ({
      tooltip: { trigger: "item" },
      legend: { bottom: 0, textStyle: { color: MUTED, fontSize: 11 } },
      series: [
        {
          name: "Category",
          type: "pie",
          radius: ["45%", "72%"],
          center: ["50%", "45%"],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 6, borderColor: "#fff", borderWidth: 2 },
          label: { show: false },
          data: data,
          color: [
            "hsl(240 5.9% 10%)",
            "hsl(220 90% 56%)",
            "hsl(160 84% 39%)",
          ],
        },
      ],
    }),
    [data]
  );
  return <EChart option={option} style={{ height: 260 }} />;
}

export function TopTagsChart({ data }: { data: DashboardData["topTags"] }) {
  const option = useMemo<EChartsCoreOption>(
    () => ({
      grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: { color: MUTED, fontSize: 11 },
        splitLine: { lineStyle: { color: "hsl(240 5.9% 94%)" } },
      },
      yAxis: {
        type: "category",
        data: data.map((d) => `#${d.name}`),
        axisLabel: { color: ACCENT, fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "bar",
          data: data.map((d) => d.value),
          barWidth: "55%",
          itemStyle: {
            color: ACCENT,
            borderRadius: [0, 6, 6, 0],
          },
          label: { show: true, position: "right", color: MUTED, fontSize: 11 },
        },
      ],
    }),
    [data]
  );
  return <EChart option={option} style={{ height: 240 }} />;
}

export function TopDownloadsChart({ data }: { data: DashboardData["topDownloaded"] }) {
  const rows = data.slice(0, 7).reverse();
  const option = useMemo<EChartsCoreOption>(
    () => ({
      grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: { color: MUTED, fontSize: 11 },
        splitLine: { lineStyle: { color: "hsl(240 5.9% 94%)" } },
      },
      yAxis: {
        type: "category",
        data: rows.map((d) => d.name),
        axisLabel: { color: ACCENT, fontSize: 11, formatter: (v: string) => (v.length > 18 ? `${v.slice(0, 18)}…` : v) },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "bar",
          data: rows.map((d) => d.value),
          barWidth: "55%",
          itemStyle: { color: "hsl(220 90% 56%)", borderRadius: [0, 6, 6, 0] },
          label: { show: true, position: "right", color: MUTED, fontSize: 11 },
        },
      ],
    }),
    [rows]
  );
  return <EChart option={option} style={{ height: 260 }} />;
}

export function BucketUsageChart({ data }: { data: DashboardData["bucketUsage"] }) {
  const option = useMemo<EChartsCoreOption>(
    () => ({
      grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: unknown) => {
          const p = (params as { value: number; name: string }[])[0];
          return `${p.name}: ${p.value.toFixed(1)}%`;
        },
      },
      xAxis: {
        type: "value",
        max: 100,
        axisLabel: { color: MUTED, fontSize: 11, formatter: "{value}%" },
        splitLine: { lineStyle: { color: "hsl(240 5.9% 94%)" } },
      },
      yAxis: {
        type: "category",
        data: data.map((d) => d.name),
        axisLabel: { color: ACCENT, fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "bar",
          data: data.map((d) => d.pct),
          barWidth: "55%",
          itemStyle: {
            color: "hsl(160 84% 39%)",
            borderRadius: [0, 6, 6, 0],
          },
          label: { show: true, position: "right", color: MUTED, fontSize: 11, formatter: "{c}%" },
        },
      ],
    }),
    [data]
  );
  return <EChart option={option} style={{ height: Math.max(120, data.length * 48) }} />;
}