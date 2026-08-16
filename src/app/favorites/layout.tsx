import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Favorites",
  description: "Browse your favorited AI photography, illustrations and 3D renders on Luminaq.",
};

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
