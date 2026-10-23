import source from "@/content/simulation-evidence.json";
import { simulationEvidenceSchema } from "./simulation-evidence-schema";

export const simulationEvidence = simulationEvidenceSchema.parse(source);
