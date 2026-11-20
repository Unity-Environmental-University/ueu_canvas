import AssignmentKind from "@/content/assignments/AssignmentKind";
import {ICanvasCallConfig} from "@/canvasUtils";


export const assignmentDataGen = AssignmentKind.dataGenerator;
export const updateAssignmentData = AssignmentKind.put!;

export * from "./updateAssignmentDueDates";
