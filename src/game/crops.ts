import { CropType } from "../pixelart/sprites";

export interface CropDef {
  type: CropType;
  label: string;
  seedCost: number;
  sellPrice: number;
}

export const CROPS: Record<CropType, CropDef> = {
  wheat: { type: "wheat", label: "Wheat", seedCost: 5, sellPrice: 12 },
  carrot: { type: "carrot", label: "Carrot", seedCost: 8, sellPrice: 18 },
  tomato: { type: "tomato", label: "Tomato", seedCost: 14, sellPrice: 32 },
  corn: { type: "corn", label: "Corn", seedCost: 22, sellPrice: 50 },
};

export const CROP_ORDER: CropType[] = ["wheat", "carrot", "tomato", "corn"];
