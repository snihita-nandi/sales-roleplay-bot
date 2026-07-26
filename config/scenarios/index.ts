import { expandedIndustryCategories } from "@/config/scenarios/categories/industry-catalog";
import { difficultyProfiles } from "@/config/scenarios/difficulties";
import { createScenarioRegistry } from "@/domain/scenarios/registry";

export const practiceCategories = expandedIndustryCategories;

export const scenarioRegistry = createScenarioRegistry(practiceCategories, difficultyProfiles);
