import { RoleplayApp } from "@/components/roleplay/roleplay-app";
import { scenarioRegistry } from "@/config/scenarios";

export default function Home() {
  return <RoleplayApp initialCatalog={scenarioRegistry.getCatalog()} />;
}
