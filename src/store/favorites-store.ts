import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Image } from "@/db/schema";

interface FavoritesState {
  favorites: Image[];
  toggleFavorite: (image: Image) => void;
  isFavorite: (id: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      toggleFavorite: (image) => {
        const current = get().favorites;
        const exists = current.some((img) => img.id === image.id);
        if (exists) {
          set({ favorites: current.filter((img) => img.id !== image.id) });
        } else {
          set({ favorites: [...current, image] });
        }
      },
      isFavorite: (id) => {
        return get().favorites.some((img) => img.id === id);
      },
    }),
    {
      name: "luminaq-favorites",
    }
  )
);
