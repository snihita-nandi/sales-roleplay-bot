import { b2bSalesCategory } from "@/config/scenarios/categories/b2b-sales";
import { insuranceCategory } from "@/config/scenarios/categories/insurance";
import { realEstateCategory } from "@/config/scenarios/categories/real-estate";
import { retailCategory } from "@/config/scenarios/categories/retail";
import { difficultyProfiles } from "@/config/scenarios/difficulties";
import { createScenarioRegistry } from "@/domain/scenarios/registry";

export const practiceCategories = [
  b2bSalesCategory,
  insuranceCategory,
  retailCategory,
  realEstateCategory,
] as const;

export const scenarioRegistry = createScenarioRegistry(practiceCategories, difficultyProfiles);

