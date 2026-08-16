"use client";

import { useMemo } from "react";
import type { EChartsCoreOption } from "echarts/core";
import { EChart } from "@/components/charts/echart";
import type { DashboardData } from "@/lib/dashboard-data";

// Premium Dark Mode Color Palette
const TEXT_MAIN = "#f4f4f5";     // zinc-100 (Bright off-white)
const TEXT_MUTED = "#a1a1aa";    // zinc-400 (Soft muted gray)
const GRID_LINE = "#27272a";     // zinc-800 (Subtle dark grid line)
const BORDER_COLOR = "#09090b";  // zinc-950 (Dark card background match)

const COLOR_PRIMARY = "#6366f1";   // Vibrant Indigo
const COLOR_SECONDARY = "#06b6d4"; // Cyan
const COLOR_TERTIARY = "#10b981";  // Emerald
const COLOR_QUATERNARY = "#f59e0b"; // Amber

export function UploadsChart({ data }: { data: DashboardData["uploadsByDay"] }) {
  const option = useMemo<EChartsCoreOption>(
    () => ({
      grid: { left: 8, right: 8, top: 24, bottom: 8, containLabel: true },
      tooltip: { 
        trigger: "axis",
        backgroundColor: "rgba(9, 9, 11, 0.95)",
        borderColor: "rgba(63, 63, 70, 0.4)",
        textStyle: { color: TEXT_MAIN }
      },
      xAxis: {
        type: "category",
        data: data.map((d) => d.date.slice(5)),
        axisLine: { lineStyle: { color: GRID_LINE } },
        axisLabel: { color: TEXT_MUTED, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: { color: TEXT_MUTED, fontSize: 11 },
        splitLine: { lineStyle: { color: GRID_LINE, type: "dashed" } },
      },
      series: [
        {
          name: "Uploads",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 8,
          data: data.map((d) => d.count),
          lineStyle: { color: COLOR_PRIMARY, width: 3 },
          itemStyle: { color: COLOR_PRIMARY, borderColor: BORDER_COLOR, borderWidth: 1.5 },
          areaStyle: { 
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(99, 102, 241, 0.25)" },
                { offset: 1, color: "rgba(99, 102, 241, 0.01)" }
              ]
            }
          },
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
      tooltip: { 
        trigger: "item",
        backgroundColor: "rgba(9, 9, 11, 0.95)",
        borderColor: "rgba(63, 63, 70, 0.4)",
        textStyle: { color: TEXT_MAIN }
      },
      legend: { bottom: 0, textStyle: { color: TEXT_MUTED, fontSize: 11 } },
      series: [
        {
          name: "Category",
          type: "pie",
          radius: ["45%", "72%"],
          center: ["50%", "45%"],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 6, borderColor: BORDER_COLOR, borderWidth: 2 },
          label: { show: false },
          data: data,
          color: [
            COLOR_PRIMARY,
            COLOR_SECONDARY,
            COLOR_TERTIARY,
            COLOR_QUATERNARY,
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
      grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
      tooltip: { 
        trigger: "axis", 
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(9, 9, 11, 0.95)",
        borderColor: "rgba(63, 63, 70, 0.4)",
        textStyle: { color: TEXT_MAIN }
      },
      xAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: { color: TEXT_MUTED, fontSize: 11 },
        splitLine: { lineStyle: { color: GRID_LINE, type: "dashed" } },
      },
      yAxis: {
        type: "category",
        data: data.map((d) => `#${d.name}`),
        axisLabel: { color: TEXT_MAIN, fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "bar",
          data: data.map((d) => d.value),
          barWidth: "50%",
          itemStyle: {
            color: COLOR_PRIMARY,
            borderRadius: [0, 4, 4, 0],
          },
          label: { show: true, position: "right", color: TEXT_MUTED, fontSize: 10, offset: [5, 0] },
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
      grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
      tooltip: { 
        trigger: "axis", 
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(9, 9, 11, 0.95)",
        borderColor: "rgba(63, 63, 70, 0.4)",
        textStyle: { color: TEXT_MAIN }
      },
      xAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: { color: TEXT_MUTED, fontSize: 11 },
        splitLine: { lineStyle: { color: GRID_LINE, type: "dashed" } },
      },
      yAxis: {
        type: "category",
        data: rows.map((d) => d.name),
        axisLabel: { color: TEXT_MAIN, fontSize: 11, formatter: (v: string) => (v.length > 18 ? `${v.slice(0, 18)}…` : v) },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "bar",
          data: rows.map((d) => d.value),
          barWidth: "50%",
          itemStyle: { color: COLOR_SECONDARY, borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: "right", color: TEXT_MUTED, fontSize: 10, offset: [5, 0] },
        },
      ],
    }),
    [rows]
  );
  return <EChart option={option} style={{ height: 260 }} />;
}
